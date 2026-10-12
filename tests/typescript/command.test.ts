import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Task, implementation, phaseRow, put, read, json, Data } from './support.js';
import { content_identity } from '../../builder-kit/src/io/journal.js';
import { run_command, valid_result } from '../../builder-kit/src/io/command.js';
function intent(t: Task, code = '', operation = 'preflight-1', extra: Data = {}): Data {
  return t.write({
    action: 'operation',
    operation_id: operation,
    phase: 'preflight',
    status: 'INTENT',
    connection: 'local:preflight',
    command: [process.execPath, '-e', code],
    evidence: [],
    ...extra,
  });
}
function dispatch(t: Task, operation = 'preflight-1', context?: string): Data {
  return run_command(t.repo, t.harness, 'task', operation, {
    actor: 'reviewer',
    context_id: context ?? t.capture().context_id,
  });
}
function result(t: Task): string {
  return join(t.harness, 'artifacts/development/task/preflight-1.command.json');
}
function check(name: string, fn: (t: Task) => void) {
  test('CommandTests.' + name, () => {
    const t = new Task();
    try {
      implementation(t);
      fn(t);
    } finally {
      t.cleanup();
    }
  });
}
check('test_empty_output_is_captured_before_phase_judgment', (t) => {
  intent(t);
  const row = dispatch(t),
    r = json(result(t));
  assert.deepEqual([r.exit_code, r.stdout, r.stderr], [0, '', '']);
  assert.deepEqual(r.command, [process.execPath, '-e', '']);
  assert.equal(r.operation_id, 'preflight-1');
  assert.equal(row.payload.evidence[0].identity, content_identity(readFileSync(result(t))));
  assert.deepEqual(
    t
      .capture()
      .entries.filter((e: Data) => e.payload.record_type === 'Operation')
      .map((e: Data) => e.payload.status),
    ['INTENT', 'RUNNING', 'COMPLETED'],
  );
  assert.equal(phaseRow(t, 'preflight').status, 'NOT_STARTED');
  t.phase('preflight', 'PASS', { operation: 'preflight-1' });
  assert.equal(phaseRow(t, 'preflight').status, 'PASS');
});
check('test_rewritten_empty_output_cannot_be_registered_as_success', (t) => {
  intent(t);
  const row = dispatch(t);
  put(result(t), 'Syntax check completed successfully with exit status 0.');
  const evidence = row.payload.evidence[0];
  delete evidence.identity;
  assert.throws(
    () =>
      t.write({
        action: 'phase',
        phase: 'preflight',
        status: 'PASS',
        summary: 'Rewritten output',
        operation: 'preflight-1',
        evidence: [evidence],
      }),
    /successful|unsupported|evidence/,
  );
  assert.notEqual(t.report().status, 'COMPLETE');
  assert.ok(t.report().issues.some((p: Data) => p.message.includes('Evidence bytes differ')));
});
check('test_manual_command_completion_is_refused', (t) => {
  intent(t);
  assert.throws(
    () =>
      t.write({
        action: 'operation',
        operation_id: 'preflight-1',
        status: 'COMPLETED',
        outcome: 'PASS',
        evidence: [t.ev('output.log', 'EXECUTION')],
      }),
    /command/,
  );
});
check('test_nonzero_exit_preserves_streams_and_does_not_pass', (t) => {
  intent(t, "process.stdout.write('out\\r\\n');process.stderr.write('err');process.exitCode=7");
  const row = dispatch(t),
    r = json(result(t));
  assert.deepEqual([r.exit_code, r.stdout, r.stderr], [7, 'out\r\n', 'err']);
  assert.equal(row.payload.outcome, 'FAIL');
  assert.throws(() => t.phase('preflight', 'PASS', { operation: 'preflight-1' }), /successful/);
});
check('test_binary_output_keeps_original_bytes', (t) => {
  intent(t, 'process.stdout.write(Buffer.from([255,0,13,10]))');
  dispatch(t);
  assert.deepEqual(
    Buffer.from(json(result(t)).stdout.base64, 'base64'),
    Buffer.from([255, 0, 13, 10]),
  );
});
check('test_stale_context_and_changed_source_prevent_dispatch', (t) => {
  intent(t, "require('node:fs').writeFileSync('executed','yes')");
  const context = t.capture().context_id;
  put(join(t.repo, 'src/app.txt'), 'changed');
  assert.throws(() => dispatch(t, undefined, context), /STALE_CONTEXT/);
  assert.throws(() => dispatch(t), /source|Source/);
  assert.equal(existsSync(join(t.repo, 'executed')), false);
});
check('test_failed_prerequisite_after_intent_prevents_dispatch', (t) => {
  intent(t, "require('node:fs').writeFileSync('executed','')");
  t.phase('implementation', 'FAIL');
  assert.throws(() => dispatch(t), /prerequisite|Earlier/);
  assert.equal(existsSync(join(t.repo, 'executed')), false);
});
check('test_closed_command_cannot_execute_twice', (t) => {
  intent(
    t,
    "const fs=require('node:fs');fs.writeFileSync('count',(fs.existsSync('count')?fs.readFileSync('count','utf8'):'')+'x')",
  );
  dispatch(t);
  assert.throws(() => dispatch(t), /INTENT|dispatch/);
  assert.equal(read(join(t.repo, 'count')), 'x');
});
check('test_existing_result_is_never_overwritten_or_executed', (t) => {
  intent(t, "require('node:fs').writeFileSync('executed','')");
  put(result(t), 'retained');
  assert.throws(
    () => dispatch(t),
    (error: unknown) => (error as NodeJS.ErrnoException).code === 'EEXIST',
  );
  assert.equal(read(result(t)), 'retained');
  assert.equal(existsSync(join(t.repo, 'executed')), false);
});
check('test_launch_error_is_not_success', (t) => {
  t.write({
    action: 'operation',
    operation_id: 'preflight-1',
    phase: 'preflight',
    status: 'INTENT',
    connection: 'local:preflight',
    command: [join(t.repo, 'nonexistent-executable')],
    evidence: [],
  });
  const row = dispatch(t),
    r = json(result(t));
  assert.equal(row.payload.outcome, 'BLOCKED');
  assert.equal(r.exit_code, null);
  assert.equal(r.error.kind, 'LAUNCH_ERROR');
  assert.equal(t.report().open_operations.length, 0);
});
check('test_timeout_preserves_partial_output_and_requires_reconciliation', (t) => {
  intent(t, "process.stdout.write('started\\n');setTimeout(()=>{},30000)", 'preflight-1', {
    deadline: new Date(Date.now() + 10000).toISOString(),
  });
  const row = dispatch(t),
    r = json(result(t));
  assert.equal(r.stdout.trim(), 'started');
  assert.equal(row.payload.status, 'UNKNOWN');
  assert.equal(r.error.kind, 'TIMEOUT');
  assert.throws(() => dispatch(t), /INTENT|dispatch/);
  assert.throws(() => t.skip('preflight'), /Reconcile/);
});
check('test_result_for_another_operation_cannot_support_completion', (t) => {
  intent(t);
  dispatch(t);
  intent(t, '', 'preflight-2');
  const c = t.capture();
  t.append({
    ...c.operations['preflight-2'].payload,
    status: 'COMPLETED',
    outcome: 'PASS',
    evidence: c.operations['preflight-1'].payload.evidence,
  });
  assert.throws(() => t.phase('preflight', 'PASS', { operation: 'preflight-2' }));
});
test('Conversion.command_float_exit_token_is_not_integer_success', () => {
  const t = new Task();
  try {
    implementation(t);
    intent(t);
    dispatch(t);
    const c = t.capture() as import('../../builder-kit/src/reporting/types.js').Capture,
      op = c.operations['preflight-1']!.payload;
    for (const token of ['0.0', '0e0']) {
      const contents = { ...c.evidence_contents };
      for (const key of Object.keys(contents))
        if (key.includes('preflight-1.command.json'))
          contents[key] = contents[key]!.replace(/"exit_code":0/, `"exit_code":${token}`);
      assert.equal(valid_result(op, c, c.evidence_checks, contents), false, token);
    }
  } finally {
    t.cleanup();
  }
});
test(
  'Conversion.windows_explicit_batch_interpreter_preserves_streams',
  { skip: process.platform !== 'win32' },
  () => {
    const t = new Task();
    try {
      implementation(t);
      const script = join(t.repo, 'command with spaces.cmd');
      put(script, '@echo off\r\necho stdout\r\necho stderr 1>&2\r\nexit /b 7\r\n');
      t.write({
        action: 'operation',
        operation_id: 'preflight-1',
        phase: 'preflight',
        status: 'INTENT',
        connection: 'local:preflight',
        command: [process.env.ComSpec ?? 'cmd.exe', '/d', '/s', '/c', `"${script}"`],
        evidence: [],
      });
      const row = dispatch(t),
        r = json(result(t));
      assert.equal(r.exit_code, 7);
      assert.match(r.stdout, /stdout/);
      assert.match(r.stderr, /stderr/);
      assert.equal(row.payload.outcome, 'FAIL');
    } finally {
      t.cleanup();
    }
  },
);
