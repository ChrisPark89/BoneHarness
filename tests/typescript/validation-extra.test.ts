import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { canonical_json } from '../../builder-kit/src/io/canonical.js';
import { validate_document } from '../../builder-kit/src/io/schemas.js';
import { temp, clean, put } from './support.js';

test('Conversion.cached_schema_rechecks_transitive_bytes', () => {
  const root = temp();
  try {
    const schema = join(root, 'root.schema.json');
    const child = join(root, 'child.schema.json');
    put(schema, JSON.stringify({ $ref: 'child.schema.json' }));
    put(child, JSON.stringify({ type: 'object', required: ['before'] }));
    assert.equal(validate_document({ before: true }, schema).length, 0);
    put(child, JSON.stringify({ type: 'object', required: ['after'] }));
    assert.ok(validate_document({ before: true }, schema).length > 0);
    assert.equal(validate_document({ after: true }, schema).length, 0);
    put(child, JSON.stringify({ $ref: 'https://invalid.example/remote' }));
    assert.equal(validate_document({}, schema)[0]?.code, 'SCHEMA_REFERENCE');
  } finally {
    clean(root);
  }
});

test('Conversion.canonical_rejects_non_json_objects_and_sparse_arrays', () => {
  for (const value of [new Date(), new Map(), new Set(), new Array(2), { value: undefined }]) {
    assert.throws(() => canonical_json(value));
  }
  const record = Object.create(null) as Record<string, unknown>;
  record['__proto__'] = 'literal';
  assert.equal(canonical_json(record).toString(), '{"__proto__":"literal"}');
});
