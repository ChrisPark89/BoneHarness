import { arguments_for, base_options } from './arguments.js';
import { run_command } from '../io/command.js';
import { canonical_json } from '../io/canonical.js';
try {
  const args = arguments_for(
    {
      ...base_options,
      'task-id': { type: 'string' },
      'operation-id': { type: 'string' },
      actor: { type: 'string' },
      'context-id': { type: 'string' },
    },
    ['repo-root', 'task-id', 'operation-id', 'actor', 'context-id'],
  );
  const result = run_command(
    args['repo-root'] as string,
    args['harness-root'] as string,
    args['task-id'] as string,
    args['operation-id'] as string,
    { actor: args.actor as string, context_id: args['context-id'] as string },
  );
  console.log(canonical_json(result).toString('utf8'));
  process.exitCode =
    result.payload.record_type === 'Operation' && result.payload.outcome === 'PASS' ? 0 : 1;
} catch (error) {
  console.error(
    'CAPTURE_UNAVAILABLE: ' + String(error) + '; inspect the operation before retrying',
  );
  process.exitCode = 2;
}
