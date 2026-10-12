import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { temp, clean, put, ROOT, helper } from './support.js';
import { setupDemo, scenario, contextFromCli } from '../demo/run.js';
test('InstalledWalkthrough.test_documented_commands_and_actual_build_test', () => {
  const repo = temp('harness walkthrough ');
  try {
    for (const name of [
      'src/calculator.js',
      'scripts/build.mjs',
      'test/calculator.test.mjs',
      'package.json',
    ])
      put(join(repo, name), readFileSync(join(ROOT, 'tests/demo', name)));
    setupDemo(repo);
    helper(repo, 'check', ['--format', 'json']);
    const report = scenario(repo, 'check', false, true);
    assert.equal(report.status, 'COMPLETE');
    const docs = join(repo, '.harness/docs/development/check');
    assert.equal(existsSync(join(docs, 'report.md')), false);
    assert.deepEqual(readdirSync(docs), ['spec.md']);
    assert.equal(existsSync(join(repo, '.harness/artifacts/development/check/state.json')), false);
    put(join(repo, 'dist/calculator.js'), 'export function add() { return 0; }\n');
    assert.notEqual(contextFromCli(repo, 'check').status, 'COMPLETE');
    assert.deepEqual(
      readFileSync(join(ROOT, 'tests/demo/src/calculator.js')),
      readFileSync(join(repo, 'src/calculator.js')),
    );
  } finally {
    clean(repo);
  }
});
