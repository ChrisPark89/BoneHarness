import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { writing } from '../../builder-kit/src/io/guard.js';
import { Task, implementation } from './support.js';
import { parse_history, canonical_json, make_entry } from '../../builder-kit/src/io/journal.js';

function withHarness(body: (harness: string) => void): void {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'bh-guard-')));
  try {
    body(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
test('RuntimeExtra.writer rejects competing process and releases on failure', () =>
  withHarness((harness) => {
    const guard = new URL('../../builder-kit/src/io/guard.js', import.meta.url).href;
    writing(harness, () => {
      const child = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import {writing} from ${JSON.stringify(guard)}; writing(${JSON.stringify(harness)},()=>{});`,
        ],
        { encoding: 'utf8' },
      );
      assert.notEqual(child.status, 0);
      assert.match(child.stderr, /Another harness writer is active/);
    });
    assert.throws(
      () =>
        writing(harness, () => {
          throw new Error('intentional failure');
        }),
      /intentional failure/,
    );
    assert.equal(
      writing(harness, () => 42),
      42,
    );
  }));
test('RuntimeExtra.abandoned writer is recovered only after owner exits', () =>
  withHarness((harness) => {
    const guard = new URL('../../builder-kit/src/io/guard.js', import.meta.url).href;
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import {writing} from ${JSON.stringify(guard)}; writing(${JSON.stringify(harness)},()=>process.exit(0));`,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(child.status, 0, child.stderr);
    const lock = path.join(harness, 'artifacts/.writer.lock');
    assert.ok(fs.existsSync(lock));
    writing(harness, () => assert.ok(fs.existsSync(lock)));
    assert.ok(!fs.existsSync(lock));
  }));
test('RuntimeExtra.uncertain lock ownership refuses automatic removal', () =>
  withHarness((harness) => {
    fs.mkdirSync(path.join(harness, 'artifacts'));
    const lock = path.join(harness, 'artifacts/.writer.lock');
    fs.writeFileSync(lock, '{');
    assert.throws(() => writing(harness, () => assert.fail('must not enter')), /incomplete/);
    assert.equal(fs.readFileSync(lock, 'utf8'), '{');
  }));
test('RuntimeExtra.interrupted publication blocks journal but permits explicit recovery', () =>
  withHarness((harness) => {
    const publication = path.join(harness, 'artifacts/maintenance/update-1/publication.json');
    fs.mkdirSync(path.dirname(publication), { recursive: true });
    fs.writeFileSync(publication, JSON.stringify({ status: 'PUBLISHING' }));
    assert.throws(
      () => writing(harness, () => assert.fail('must not enter')),
      /Interrupted kit update/,
    );
    assert.equal(
      writing(harness, () => 42, { recovery: true }),
      42,
    );
  }));
test('RuntimeExtra.operation IDs cannot collide with JavaScript prototype properties', () => {
  const t = new Task();
  try {
    implementation(t);
    const operation = t.execute('preflight', '__proto__');
    t.phase('preflight', 'PASS', { operation });
    assert.equal(
      t.report().phases.find((p: { id: string }) => p.id === 'preflight')!.status,
      'PASS',
    );
    assert.equal(t.capture().operations['__proto__'].payload.status, 'COMPLETED');
  } finally {
    t.cleanup();
  }
});
test('RuntimeExtra.journal rejects invalid UTF-8 rather than replacing bytes', () => {
  const t = new Task();
  try {
    const first = t.capture().entries[0];
    const row = make_entry(first.payload, '�', undefined, first.timestamp);
    const raw = canonical_json(row),
      replacement = Buffer.from('�'),
      start = raw.indexOf(replacement);
    const damaged = Buffer.concat([
      raw.subarray(0, start),
      Buffer.from([0xff]),
      raw.subarray(start + replacement.length),
      Buffer.from('\n'),
    ]);
    assert.throws(() => parse_history(damaged, 'task'));
  } finally {
    t.cleanup();
  }
});
