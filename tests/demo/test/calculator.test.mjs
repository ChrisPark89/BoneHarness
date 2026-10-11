import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

test('the built calculator adds positive and negative numbers', async () => {
  const output = new URL('../dist/calculator.js', import.meta.url);
  assert.ok(existsSync(output), 'Build the app first: npm run build');
  const { add } = await import(output.href);
  assert.equal(add(2, 3), 5);
  assert.equal(add(-2, 3), 1);
});
