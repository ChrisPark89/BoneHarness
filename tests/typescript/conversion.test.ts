import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, temp, put, clean, json, read } from './support.js';
import {
  canonical_json,
  content_identity,
  parse_history,
} from '../../builder-kit/src/io/journal.js';
import { load_document } from '../../builder-kit/src/io/loader.js';
test('Conversion.python_canonical_bytes_and_unicode_order', () => {
  const fixtures = JSON.parse(read(join(ROOT, 'tests/typescript/fixtures/python-canonical.json')));
  for (const f of fixtures) {
    const raw = canonical_json(f.value);
    assert.equal(raw.toString('hex'), f.utf8_hex);
    assert.equal(content_identity(raw), f.identity);
  }
});
test('Conversion.python_historical_journal_chain_is_readable', () => {
  const root = join(ROOT, 'tests/typescript/fixtures'),
    bytes = readFileSync(join(root, 'python-history.jsonl')),
    expected = json(join(root, 'python-history-expectation.json'));
  const entries = parse_history(bytes, 'task');
  assert.equal(entries.length, expected.entries);
  assert.equal(entries.at(-1)!.entry_hash, expected.last_hash);
  assert.deepEqual(
    Buffer.concat(entries.flatMap((e) => [canonical_json(e), Buffer.from('\n')])),
    bytes,
  );
});
test('Conversion.lossy_numbers_fail_closed', () => {
  for (const n of [NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, 1.5, -0])
    assert.throws(() => canonical_json({ number: n }));
});
test('Conversion.prototype_keys_are_data_without_pollution', () => {
  const root = temp();
  try {
    const p = join(root, 'keys.json');
    put(
      p,
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"toString":"literal"}',
    );
    const value = load_document(p, root) as Record<string, unknown>;
    assert.ok(Object.hasOwn(value, '__proto__'));
    assert.equal(value.toString, 'literal');
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
    assert.match(canonical_json(value).toString(), /"__proto__"/);
  } finally {
    clean(root);
  }
});
test('Conversion.coverage_map_has_exact_original_inventory_and_runnable_equivalents', () => {
  const mapping = JSON.parse(read(join(ROOT, 'tests/typescript/coverage-map.json'))) as {
    original: string;
    typescript: string;
  }[];
  assert.equal(mapping.length, 137);
  assert.equal(new Set(mapping.map((x) => x.original)).size, 137);
  assert.equal(new Set(mapping.map((x) => x.typescript)).size, 137);
  const source = readdirSync(join(ROOT, 'tests/typescript'))
    .filter((p) => p.endsWith('.test.ts'))
    .map((p) => read(join(ROOT, 'tests/typescript', p)))
    .join('\n');
  for (const row of mapping) {
    const [group, name] = row.typescript.split('.');
    assert.ok(source.includes(name!), row.original);
    assert.ok(source.includes(group!), row.original);
  }
});
test('Conversion.integral_float_tokens_cannot_silently_change_historical_hashes', () => {
  const root = temp();
  try {
    for (const suffix of ['.json', '.yaml'])
      for (const token of ['1.0', '-0.0', '1.0e+0']) {
        const p = join(root, 'input' + suffix);
        put(p, suffix === '.json' ? `{"value":${token}}` : `value: ${token}\n`);
        assert.throws(() => load_document(p, root), `${suffix} ${token}`);
      }
    for (const token of ['1e0', '1E+3']) {
      const p = join(root, 'input.json');
      put(p, `{"value":${token}}`);
      assert.throws(() => load_document(p, root), token);
    }
  } finally {
    clean(root);
  }
});
test('Conversion.yaml_unresolved_exponent_scalars_remain_strings', () => {
  const root = temp();
  try {
    for (const token of ['1e0', '1E+3', '1.0e0', '1.2e3']) {
      const p = join(root, 'input.yaml');
      put(p, `value: ${token}\n`);
      assert.deepEqual(load_document(p, root), { value: token });
    }
  } finally {
    clean(root);
  }
});
test('Conversion.json_literal_merge_key_is_ordinary_data', () => {
  const root = temp();
  try {
    const p = join(root, 'input.json');
    put(p, '{"<<":{"literal":true}}');
    assert.deepEqual(load_document(p, root), { '<<': { literal: true } });
  } finally {
    clean(root);
  }
});
test('Conversion.unpaired_unicode_surrogates_cannot_change_bytes', () => {
  for (const text of ['\ud800', '\udc00', 'prefix\udfff'])
    assert.throws(() => canonical_json({ text }), /surrogate/i);
  assert.equal(canonical_json({ text: '😀' }).toString(), '{"text":"😀"}');
});
