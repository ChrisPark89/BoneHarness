import { isAbsolute } from 'node:path';
import { capture_inventory } from '../io/source_inventory.js';
import { canonical_json } from '../io/canonical.js';
import { arguments_for, base_options } from './arguments.js';
try {
  const args = arguments_for(
    {
      ...base_options,
      'task-id': { type: 'string' },
      root: { type: 'string', multiple: true },
      exclude: { type: 'string', multiple: true },
    },
    ['repo-root', 'task-id', 'root'],
  );
  const repo = args['repo-root'] as string;
  if (!isAbsolute(repo)) throw new Error('repo-root must be absolute');
  const record = capture_inventory(
    repo,
    args['harness-root'] as string,
    args['task-id'] as string,
    { roots: args.root, exclude: args.exclude ?? [] },
  );
  console.log(canonical_json(record).toString('utf8'));
} catch (error) {
  console.error('SOURCE_INVENTORY_UNAVAILABLE: ' + String(error));
  process.exitCode = 2;
}
