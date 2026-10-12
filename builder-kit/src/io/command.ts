/** Execute an intent once and bind original output bytes to its journal result. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { constants } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse_document } from './loader.js';
import { roots, ordinary, name, locked, _record_step } from './journal.js';
import { canonical_json, digest } from './canonical.js';
import { capture_task, evidence_key } from '../reporting/evidence.js';
import { derive_report } from '../reporting/summary.js';
import type {
  OperationRecord,
  Capture,
  EvidenceCheck,
  Entry,
  Evidence,
} from '../reporting/types.js';

type Output = string | { base64: string };
interface CommandResult {
  task_id: string;
  operation_id: string;
  command: string[];
  cwd: string;
  exit_code: number | null;
  stdout: Output;
  stderr: Output;
  error?: { kind: 'TIMEOUT' | 'LAUNCH_ERROR'; message: string };
}
export function output_value(raw: Uint8Array): Output {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
  } catch {
    return { base64: Buffer.from(raw).toString('base64') };
  }
}
export function result_status(result: CommandResult): [string, string] {
  if (result.error) {
    if (result.exit_code !== null || typeof result.error.message !== 'string')
      throw new Error('Invalid command error');
    if (result.error.kind === 'TIMEOUT') return ['UNKNOWN', 'UNKNOWN'];
    if (result.error.kind === 'LAUNCH_ERROR') return ['COMPLETED', 'BLOCKED'];
    throw new Error('Unknown command error');
  }
  if (!Number.isSafeInteger(result.exit_code)) throw new Error('Missing command exit code');
  return ['COMPLETED', result.exit_code === 0 ? 'PASS' : 'FAIL'];
}
export function valid_result(
  operation: OperationRecord,
  capture: Capture,
  checks: Record<string, EvidenceCheck>,
  contents: Record<string, string>,
): boolean {
  const expected = {
    kind: 'LOCAL',
    scope: 'HARNESS',
    path: `artifacts/development/${capture.task_id}/${operation.operation_id}.command.json`,
  };
  for (const evidence of operation.evidence) {
    if (
      !canonical_json(evidence.reference).equals(canonical_json(expected)) ||
      evidence.provenance !== 'EXECUTION'
    )
      continue;
    const key = evidence_key(evidence);
    if (!checks[key]?.valid) continue;
    try {
      const result = parse_document(contents[key], 'command.json') as CommandResult;
      const required = [
        'task_id',
        'operation_id',
        'command',
        'cwd',
        'exit_code',
        'stdout',
        'stderr',
      ];
      if (
        !required.every((key) => Object.hasOwn(result, key)) ||
        Object.keys(result).some((key) => ![...required, 'error'].includes(key))
      )
        continue;
      if (
        result.task_id !== capture.task_id ||
        result.operation_id !== operation.operation_id ||
        !canonical_json(result.command).equals(canonical_json(operation.command)) ||
        result.cwd !== capture.repo_root
      )
        continue;
      for (const stream of [result.stdout, result.stderr]) {
        if (typeof stream === 'string') continue;
        if (
          !stream ||
          Object.keys(stream).join(',') !== 'base64' ||
          typeof stream.base64 !== 'string' ||
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(stream.base64)
        )
          throw new Error('Invalid output');
      }
      const [status, outcome] = result_status(result);
      if (status === operation.status && outcome === operation.outcome) return true;
    } catch {
      /* Invalid captured results never support completion. */
    }
  }
  return false;
}
export function run_command(
  repo_root: string,
  harness_root: string,
  task_id: string,
  operation_id: string,
  options: { actor: string; context_id: string },
): Entry {
  const [repo, harness, run] = roots(repo_root, harness_root, task_id);
  ordinary(path.join(run, 'history.jsonl'), harness);
  const result_path = ordinary(path.join(run, name(operation_id) + '.command.json'), harness, {
    missing: true,
  });
  return locked(run, () => {
    const capture = capture_task(repo, harness, task_id);
    if (capture.context_id !== options.context_id)
      throw new Error('STALE_CONTEXT: read current task context');
    const entry = capture.operations[operation_id];
    if (!entry || entry.payload.status !== 'INTENT')
      throw new Error('Only a fresh INTENT may dispatch; reconcile prior activity');
    const operation = entry.payload;
    if (!operation.command?.length) throw new Error('Record command arguments in the intent');
    const report = derive_report(capture);
    if (
      capture.structural_issues.length ||
      report.issues.some((issue) => issue.record === entry.entry_id)
    )
      throw new Error('Operation intent is unsupported; reconcile before dispatch');
    const index = report.phases.findIndex((phase) => phase.id === operation.phase);
    if (
      index < 0 ||
      report.phases
        .slice(0, index)
        .some((phase) => !['PASS', 'USER_SKIPPED'].includes(phase.status))
    )
      throw new Error(
        'Earlier prerequisites are unresolved or source evidence is stale; reconcile before dispatch',
      );
    if (report.open_operations.length !== 1 || report.open_operations[0] !== operation_id)
      throw new Error('Reconcile other operations before dispatch');
    if (operation.source !== capture.current_source)
      throw new Error('Source changed after intent; reconcile before dispatch');
    const deadline = operation.deadline ? Date.parse(operation.deadline) : undefined;
    if (deadline !== undefined && (!Number.isFinite(deadline) || deadline <= Date.now()))
      throw new Error('Command deadline expired before dispatch');
    const resultFile = fs.openSync(result_path, 'wx');
    let result: CommandResult;
    try {
      _record_step(
        repo,
        harness,
        task_id,
        { action: 'operation', operation_id, status: 'RUNNING', evidence: [] },
        { ...options, _lock_held: true, _command_capture: true },
      );
      result = {
        task_id,
        operation_id,
        command: operation.command,
        cwd: repo,
        exit_code: null,
        stdout: '',
        stderr: '',
      };
      // Files avoid spawnSync's output-buffer limit. They are temporary capture inputs,
      // removed after exact bytes are embedded in the single result artifact.
      const temporary = fs.mkdtempSync(path.join(run, '.capture-'));
      const stdout = path.join(temporary, 'stdout');
      const stderr = path.join(temporary, 'stderr');
      const out = fs.openSync(stdout, 'wx'),
        err = fs.openSync(stderr, 'wx');
      try {
        const processResult = spawnSync(operation.command[0], operation.command.slice(1), {
          cwd: repo,
          stdio: ['ignore', out, err],
          shell: false,
          ...(deadline === undefined
            ? {}
            : { timeout: Math.max(1, deadline - Date.now()), killSignal: 'SIGKILL' as const }),
        });
        result.stdout = output_value(fs.readFileSync(stdout));
        result.stderr = output_value(fs.readFileSync(stderr));
        if (processResult.error)
          result.error = {
            kind:
              (processResult.error as NodeJS.ErrnoException).code === 'ETIMEDOUT'
                ? 'TIMEOUT'
                : 'LAUNCH_ERROR',
            message: processResult.error.message,
          };
        else
          result.exit_code =
            processResult.status ??
            (processResult.signal ? -constants.signals[processResult.signal] : null);
      } finally {
        fs.closeSync(out);
        fs.closeSync(err);
        fs.rmSync(temporary, { recursive: true });
      }
      fs.writeFileSync(resultFile, Buffer.concat([canonical_json(result), Buffer.from('\n')]));
      fs.fsyncSync(resultFile);
    } finally {
      fs.closeSync(resultFile);
    }
    const [status, outcome] = result_status(result);
    const raw = fs.readFileSync(result_path);
    const evidence: Evidence = {
      reference: {
        kind: 'LOCAL',
        scope: 'HARNESS',
        path: path.relative(harness, result_path).split(path.sep).join('/'),
      },
      provenance: 'EXECUTION',
      identity: digest(raw),
      summary: `Captured command result; exit ${result.exit_code}. Review phase requirements separately.`,
    };
    const current = capture_task(repo, harness, task_id);
    return _record_step(
      repo,
      harness,
      task_id,
      { action: 'operation', operation_id, status, outcome, evidence: [evidence] },
      {
        actor: options.actor,
        context_id: current.context_id,
        _lock_held: true,
        _command_capture: true,
      },
    );
  });
}
