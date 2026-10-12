import fs from 'node:fs';
import { parse, option } from '../cli/arguments.js';
import { inspect, render } from '../cli/views.js';
import { message } from '../cli/types.js';
try {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(
      'Read recorded harness status: --repo-root PATH [--task-id ID | --update-id ID] [--json]',
    );
    process.exit(0);
  }
  const args = parse(
    process.argv.slice(2),
    ['--repo-root', '--task-id', '--update-id'],
    ['--json'],
  );
  const repo = option(args, '--repo-root');
  if (!repo) throw new Error('--repo-root is required');
  if (args['--task-id'] && args['--update-id']) throw new Error('Choose --task-id or --update-id');
  const value = inspect(fs.realpathSync(repo), {
    task_id: option(args, '--task-id'),
    update_id: option(args, '--update-id'),
  });
  console.log(args['--json'] ? JSON.stringify(value) : render(value));
} catch (error) {
  console.log(JSON.stringify({ error: message(error) }));
  process.exitCode = 2;
}
