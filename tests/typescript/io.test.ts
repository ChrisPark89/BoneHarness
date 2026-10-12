import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { temp, put, clean, inventory } from './support.js';
import { load_document, DocumentError } from '../../builder-kit/src/io/loader.js';
import { validate_document, local_validator } from '../../builder-kit/src/io/schemas.js';
import {
  capture_inventory,
  collect_files,
  source_scope,
  validate_inventory,
} from '../../builder-kit/src/io/source_inventory.js';
function loaderTest(
  name: string,
  fn: (root: string, load: (body: string, suffix?: string) => any) => void,
) {
  test('LoaderTests.' + name, () => {
    const root = temp();
    try {
      fn(root, (body, suffix = '.yaml') => {
        const path = join(root, 'input' + suffix);
        put(path, body);
        return load_document(path, root);
      });
    } finally {
      clean(root);
    }
  });
}
loaderTest('test_forbidden_yaml_constructs_and_ambiguous_scalars', (_, load) => {
  for (const body of [
    'a: 1\na: 2',
    'a: &a {b: 1}\nc: {<<: *a}',
    'a: !custom x',
    'a: !!str x',
    'a: &a [*a]',
    '1: x',
    '? [a,b]\n: x',
    'a: 2026-10-04',
    'a: 2026-10-04T12:00:00Z',
    'a: yes',
    'a: NO',
    'a: On',
    'a: True',
    'a: FALSE',
    'a: .nan',
    'a: -.inf',
    'a: 012',
    'a: 0x12',
    'a: 1:20',
    'a: 1_000',
    'a: +1',
    'a: ~',
    'a: Null',
    'a:',
    '---\na: 1\n---\na: 2',
    '[unterminated',
  ])
    assert.throws(
      () => load(body),
      (e: any) => e instanceof DocumentError && e.code.startsWith('PARSE_'),
      body,
    );
});
loaderTest('test_json_duplicate_nonfinite_overflow_and_root_scalars', (_, load) => {
  for (const body of ['{"a":1,"a":2}', '{"a":NaN}', '{"a":Infinity}', '{"a":1e999}', 'null', '"a"'])
    assert.throws(() => load(body, '.json'), DocumentError, body);
});
loaderTest('test_utf8_crlf_quoted_dates_explicit_types_and_acyclic_alias', (_, load) => {
  const v = load(
    'name: "日本語 café"\r\ndate: "2026-10-04"\r\nflag: true\r\n"no": "no"\r\na: &a [1, 2]\r\nb: *a\r\n',
  );
  assert.deepEqual(v.a, v.b);
  assert.equal(v.flag, true);
  assert.equal(v.date, '2026-10-04');
});
loaderTest('test_paths_rejected_before_outside_content_read', (root) => {
  const outside = temp(),
    sentinel = join(outside, 'sentinel.yaml');
  put(sentinel, 'secret: sentinel');
  fs.symlinkSync(sentinel, join(root, 'escape'));
  put(join(root, 'Case.yaml'), 'ok: true');
  const original = fs.readFileSync,
    seen: string[] = [];
  const spy = mock.method(fs, 'readFileSync', ((p: any, ...args: any[]) => {
    seen.push(String(p));
    assert.notEqual(String(p), sentinel);
    return (original as any)(p, ...args);
  }) as any);
  syncBuiltinESMExports();
  try {
    for (const p of [
      root + '/../sentinel.yaml',
      join(root, 'escape'),
      join(root, 'case.yaml'),
      sentinel,
    ])
      assert.throws(
        () => load_document(p, root),
        (e: any) => e instanceof DocumentError && e.code.startsWith('PATH_'),
      );
    assert.deepEqual(seen, []);
  } finally {
    spy.mock.restore();
    syncBuiltinESMExports();
    clean(outside);
  }
});
loaderTest('test_unreadable_file_distinct_from_malformed', (root) => {
  const path = join(root, 'unreadable.yaml');
  put(path, 'a: 1');
  const spy = mock.method(fs, 'readFileSync', () => {
    throw Object.assign(new Error('denied'), { code: 'EACCES' });
  });
  syncBuiltinESMExports();
  try {
    assert.throws(
      () => load_document(path, root),
      (e: any) => e instanceof DocumentError && e.exit_code === 2,
    );
  } finally {
    spy.mock.restore();
    syncBuiltinESMExports();
  }
});
loaderTest('test_schema_remote_reference_is_never_retrieved', (root) => {
  const p = join(root, 'test.schema.json');
  for (const ref of [
    'https://invalid.example/secret',
    '../outside.schema.json',
    'file:///tmp/outside.schema.json',
  ]) {
    put(p, JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', $ref: ref }));
    const r = validate_document({}, p);
    assert.ok(r.length);
    assert.match(r[0]!.code, /^(SCHEMA_|PATH_)/);
  }
});
loaderTest('test_schema_datetime_checks_calendar', (root) => {
  const p = join(root, 'test.schema.json');
  put(
    p,
    JSON.stringify({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: { time: { type: 'string', format: 'date-time' } },
    }),
  );
  assert.ok(validate_document({ time: '2026-02-30T00:00:00Z' }, p).length);
  assert.equal(validate_document({ time: '2026-02-28T00:00:00Z' }, p).length, 0);
});
loaderTest('test_unused_local_schema_reference_must_resolve_fragment', (root) => {
  const p = join(root, 'test.schema.json');
  put(
    p,
    JSON.stringify({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: { unused: { $ref: '#/$defs/missing' } },
    }),
  );
  assert.ok(validate_document({}, p).length);
});
loaderTest('test_invalid_schema_definition_is_classified_as_input_error', (root) => {
  const p = join(root, 'test.schema.json');
  put(p, JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 42 }));
  assert.throws(
    () => local_validator(p),
    (e: any) => e instanceof DocumentError && e.code === 'SCHEMA_DEFINITION' && e.exit_code === 1,
  );
});
loaderTest('test_transitive_schema_refs_resolve_relative_to_declaring_file', (root) => {
  const p = join(root, 'test.schema.json');
  put(
    p,
    JSON.stringify({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $ref: 'nested/child.schema.json',
    }),
  );
  put(join(root, 'nested/child.schema.json'), JSON.stringify({ $ref: 'leaf.schema.json' }));
  put(
    join(root, 'nested/leaf.schema.json'),
    JSON.stringify({ type: 'object', required: ['value'] }),
  );
  assert.equal(validate_document({ value: true }, p).length, 0);
  assert.ok(validate_document({}, p).length);
});
function sourceTest(
  name: string,
  fn: (repo: string, harness: string, file: string, scope: any, capture: () => any) => void,
) {
  test('SourceInventoryTests.' + name, () => {
    const repo = temp(),
      harness = join(repo, '.harness'),
      file = join(repo, 'src/a.js'),
      scope = { roots: ['src'], exclude: [] as string[] };
    fs.mkdirSync(harness);
    put(file, 'export const answer = 42;\n');
    try {
      fn(repo, harness, file, scope, () => capture_inventory(repo, harness, 'task-1', scope));
    } finally {
      clean(repo);
    }
  });
}
sourceTest('test_stable_capture_is_read_only_and_valid', (r, _h, _f, s, capture) => {
  const before = inventory(r),
    first = capture();
  assert.deepEqual(first, capture());
  assert.deepEqual(validate_inventory(first), s);
  assert.deepEqual(inventory(r), before);
});
sourceTest('test_changes_additions_and_deletions_change_identity', (r, _h, f, _s, capture) => {
  const original = capture();
  put(f, 'changed');
  assert.notEqual(original.revision, capture().revision);
  put(join(r, 'src/new.js'), 'new');
  const added = capture();
  assert.equal(added.files.length, 2);
  fs.unlinkSync(f);
  assert.notEqual(added.revision, capture().revision);
});
sourceTest(
  'test_comparison_accepts_empty_and_missing_scope_but_capture_refuses',
  (r, h, f, s, capture) => {
    fs.unlinkSync(f);
    assert.deepEqual(collect_files(r, h, s, { allow_missing: true }), []);
    assert.throws(capture, DocumentError);
    fs.rmdirSync(join(r, 'src'));
    assert.deepEqual(collect_files(r, h, s, { allow_missing: true }), []);
    assert.throws(capture, DocumentError);
  },
);
sourceTest('test_explicit_exclusions_are_stable', (r, _h, _f, s, capture) => {
  s.exclude = ['src/generated'];
  const first = capture();
  put(join(r, 'src/generated/out.js'), 'ignored');
  assert.deepEqual(capture(), first);
});
sourceTest('test_unsafe_and_ambiguous_scopes_are_rejected', (r, h) => {
  for (const s of [
    { roots: ['../outside'], exclude: [] },
    { roots: ['src', 'src/a.js'], exclude: [] },
    { roots: ['src'], exclude: ['elsewhere'] },
    { roots: ['src/*'], exclude: [] },
    { roots: [], exclude: [] },
  ])
    assert.throws(() => source_scope(s), DocumentError);
  assert.throws(
    () => capture_inventory(r, h, 'task-1', { roots: ['.'], exclude: [] }),
    DocumentError,
  );
});
sourceTest('test_external_symlink_is_not_read', (r, _h, _f, _s, capture) => {
  const outside = temp();
  try {
    put(join(outside, 'secret'), 'outside scope');
    fs.symlinkSync(join(outside, 'secret'), join(r, 'src/link'));
    assert.throws(capture, DocumentError);
  } finally {
    clean(outside);
  }
});
sourceTest('test_bad_digest_and_duplicate_paths_are_rejected', (_r, _h, _f, _s, capture) => {
  let i = capture();
  i.revision = 'sha256:' + 'a'.repeat(64);
  assert.throws(() => validate_inventory(i), DocumentError);
  i = capture();
  i.files.push(structuredClone(i.files[0]));
  assert.throws(() => validate_inventory(i), DocumentError);
});
