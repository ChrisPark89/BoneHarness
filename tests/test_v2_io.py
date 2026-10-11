"""Adversarial parser and local schema boundary tests."""
import importlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

CHECKER = Path(__file__).resolve().parents[1] / 'builder-kit/templates/runtime/framework/tools'
sys.path.insert(0, str(CHECKER))

class LoaderTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue((CHECKER / 'harness_io/loader.py').exists(), 'restricted loader not implemented')
        self.loader = importlib.import_module('harness_io.loader')
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()

    def load(self, body, suffix='.yaml'):
        p = self.root / ('input' + suffix)
        p.write_text(body, encoding='utf-8')
        return self.loader.load_document(p, self.root)

    def test_forbidden_yaml_constructs_and_ambiguous_scalars(self):
        invalid = ['a: 1\na: 2', 'a: &a {b: 1}\nc: {<<: *a}', 'a: !custom x',
                   'a: !!str x', 'a: &a [*a]', '1: x', '? [a,b]\n: x',
                   'a: 2026-10-04', 'a: 2026-10-04T12:00:00Z', 'a: yes', 'a: NO',
                   'a: On', 'a: True', 'a: FALSE', 'a: .nan', 'a: -.inf',
                   'a: 012', 'a: 0x12', 'a: 1:20', 'a: 1_000', 'a: +1',
                   'a: ~', 'a: Null', 'a:', '---\na: 1\n---\na: 2', '[unterminated']
        for body in invalid:
            with self.subTest(body=body), self.assertRaises(self.loader.DocumentError) as err:
                self.load(body)
            self.assertTrue(err.exception.code.startswith('PARSE_'))

    def test_json_duplicate_nonfinite_overflow_and_root_scalars(self):
        for body in ['{"a":1,"a":2}', '{"a":NaN}', '{"a":Infinity}', '{"a":1e999}', 'null', '"a"']:
            with self.subTest(body=body), self.assertRaises(self.loader.DocumentError):
                self.load(body, '.json')

    def test_utf8_crlf_quoted_dates_explicit_types_and_acyclic_alias(self):
        value = self.load('name: "日本語 café"\r\ndate: "2026-10-04"\r\nflag: true\r\n"no": "no"\r\na: &a [1, 2]\r\nb: *a\r\n')
        self.assertEqual(value['a'], value['b'])
        self.assertIs(value['flag'], True)
        self.assertEqual(value['date'], '2026-10-04')

    def test_paths_rejected_before_outside_content_read(self):
        with tempfile.TemporaryDirectory() as outside:
            sentinel = Path(outside).resolve() / 'sentinel.yaml'
            sentinel.write_text('secret: sentinel')
            (self.root / 'escape').symlink_to(sentinel)
            (self.root / 'Case.yaml').write_text('ok: true')
            original = Path.read_bytes
            seen = []
            def read(path):
                seen.append(path)
                self.assertNotEqual(path.resolve(), sentinel)
                return original(path)
            with patch.object(Path, 'read_bytes', read):
                for path in [self.root / '../sentinel.yaml', self.root / 'escape', self.root / 'case.yaml', sentinel]:
                    with self.subTest(path=path), self.assertRaises(self.loader.DocumentError) as err:
                        self.loader.load_document(path, self.root)
                    self.assertTrue(err.exception.code.startswith('PATH_'))
            self.assertEqual(seen, [])

    def test_unreadable_file_distinct_from_malformed(self):
        p = self.root / 'unreadable.yaml'; p.write_text('a: 1')
        with patch.object(Path, 'read_bytes', side_effect=PermissionError('denied')):
            with self.assertRaises(self.loader.DocumentError) as err:
                self.loader.load_document(p, self.root)
        self.assertEqual(err.exception.exit_code, 2)

    def test_schema_remote_reference_is_never_retrieved(self):
        schemas = importlib.import_module('harness_io.schemas')
        p = self.root / 'test.schema.json'
        for ref in ['https://invalid.example/secret', '../outside.schema.json', 'file:///tmp/outside.schema.json']:
            p.write_text(json.dumps({'$schema': 'https://json-schema.org/draft/2020-12/schema', '$ref': ref}))
            result = schemas.validate_document({}, p)
            self.assertTrue(result)
            self.assertTrue(result[0]['code'].startswith(('SCHEMA_', 'PATH_')))

    def test_schema_datetime_checks_calendar(self):
        schemas = importlib.import_module('harness_io.schemas')
        p = self.root / 'test.schema.json'
        p.write_text(json.dumps({'$schema': 'https://json-schema.org/draft/2020-12/schema', 'type':'object', 'properties': {'time':{'type':'string','format':'date-time'}}}))
        self.assertTrue(schemas.validate_document({'time':'2026-02-30T00:00:00Z'}, p))
        self.assertFalse(schemas.validate_document({'time':'2026-02-28T00:00:00Z'}, p))

    def test_unused_local_schema_reference_must_resolve_fragment(self):
        schemas=importlib.import_module('harness_io.schemas')
        p=self.root/'test.schema.json'
        p.write_text(json.dumps({'$schema':'https://json-schema.org/draft/2020-12/schema','$defs':{'unused':{'$ref':'#/$defs/missing'}}}))
        self.assertTrue(schemas.validate_document({},p))

    def test_invalid_schema_definition_is_classified_as_input_error(self):
        schemas=importlib.import_module('harness_io.schemas')
        p=self.root/'test.schema.json';p.write_text(json.dumps({'$schema':'https://json-schema.org/draft/2020-12/schema','type':42}))
        with self.assertRaises(self.loader.DocumentError) as err:
            schemas.local_validator(p)
        self.assertEqual(err.exception.code,'SCHEMA_DEFINITION')
        self.assertEqual(err.exception.exit_code,1)

    def test_transitive_schema_refs_resolve_relative_to_declaring_file(self):
        schemas=importlib.import_module('harness_io.schemas')
        nested=self.root/'nested';nested.mkdir()
        p=self.root/'test.schema.json';p.write_text(json.dumps({'$schema':'https://json-schema.org/draft/2020-12/schema','$ref':'nested/child.schema.json'}))
        (nested/'child.schema.json').write_text(json.dumps({'$ref':'leaf.schema.json'}))
        (nested/'leaf.schema.json').write_text(json.dumps({'type':'object','required':['value']}))
        self.assertFalse(schemas.validate_document({'value':True},p))
        self.assertTrue(schemas.validate_document({},p))


# Source-content invariants are unchanged by the record-format cleanup.
from copy import deepcopy
from harness_io.source_inventory import capture_inventory, collect_files, source_scope, validate_inventory
from harness_io.loader import DocumentError
HASH = "sha256:" + "a" * 64

class SourceInventoryTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix='source scope ü ')
        self.addCleanup(temp.cleanup)
        self.repo = Path(temp.name).resolve()
        self.harness = self.repo / '.harness'
        self.harness.mkdir()
        (self.repo / 'src').mkdir()
        self.file = self.repo / 'src/a.js'
        self.file.write_text('export const answer = 42;\n')
        self.scope = dict(roots=['src'], exclude=[])

    def capture(self):
        return capture_inventory(self.repo, self.harness, 'task-1', self.scope)

    def test_stable_capture_is_read_only_and_valid(self):
        before = {p: p.read_bytes() for p in self.repo.rglob('*') if p.is_file()}
        first = self.capture()
        self.assertEqual(first, self.capture())
        self.assertEqual(self.scope, validate_inventory(first))
        self.assertEqual(before, {p: p.read_bytes() for p in self.repo.rglob('*') if p.is_file()})

    def test_changes_additions_and_deletions_change_identity(self):
        original = self.capture()
        self.file.write_text('changed')
        self.assertNotEqual(original['revision'], self.capture()['revision'])
        (self.repo / 'src/new.js').write_text('new')
        added = self.capture()
        self.assertEqual(2, len(added['files']))
        self.file.unlink()
        self.assertNotEqual(added['revision'], self.capture()['revision'])

    def test_comparison_accepts_empty_and_missing_scope_but_capture_refuses(self):
        self.file.unlink()
        self.assertEqual([], collect_files(self.repo, self.harness, self.scope, allow_missing=True))
        with self.assertRaises(DocumentError):
            self.capture()
        (self.repo / 'src').rmdir()
        self.assertEqual([], collect_files(self.repo, self.harness, self.scope, allow_missing=True))
        with self.assertRaises(DocumentError):
            self.capture()

    def test_explicit_exclusions_are_stable(self):
        self.scope['exclude'] = ['src/generated']
        first = self.capture()
        (self.repo / 'src/generated').mkdir()
        (self.repo / 'src/generated/out.js').write_text('ignored')
        self.assertEqual(first, self.capture())

    def test_unsafe_and_ambiguous_scopes_are_rejected(self):
        for scope in [dict(roots=['../outside'], exclude=[]), dict(roots=['src','src/a.js'], exclude=[]),
                      dict(roots=['src'], exclude=['elsewhere']), dict(roots=['src/*'], exclude=[]),
                      dict(roots=[], exclude=[])]:
            with self.subTest(scope=scope), self.assertRaises(DocumentError):
                source_scope(scope)
        self.scope = dict(roots=['.'], exclude=[])
        with self.assertRaises(DocumentError):
            self.capture()

    def test_external_symlink_is_not_read(self):
        with tempfile.TemporaryDirectory() as temp:
            outside = Path(temp) / 'secret'
            outside.write_text('outside scope')
            (self.repo / 'src/link').symlink_to(outside)
            with self.assertRaises(DocumentError):
                self.capture()

    def test_bad_digest_and_duplicate_paths_are_rejected(self):
        inventory = self.capture()
        inventory['revision'] = HASH
        with self.assertRaises(DocumentError):
            validate_inventory(inventory)
        inventory = self.capture()
        inventory['files'].append(deepcopy(inventory['files'][0]))
        with self.assertRaises(DocumentError):
            validate_inventory(inventory)

