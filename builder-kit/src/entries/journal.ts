/** Record one semantic step; supply bookkeeping without inventing judgments. */
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { parse_document, read_bytes } from '../io/loader.js';
import { record_step, canonical_json } from '../io/journal.js';
export function main(argv = process.argv.slice(2)): number {
  try {
    const { values } = parseArgs({
      args: argv,
      options: {
        'repo-root': { type: 'string' },
        'harness-root': { type: 'string', default: '.harness' },
        'task-id': { type: 'string' },
        actor: { type: 'string' },
        step: { type: 'string' },
        'context-id': { type: 'string' },
        help: { type: 'boolean' },
      },
    });
    if (values.help) {
      console.log(
        'journal.cjs --repo-root PATH --task-id ID --actor NAME --step FILE [--context-id ID]',
      );
      return 0;
    }
    if (!values['repo-root'] || !values['task-id'] || !values.actor || !values.step)
      throw new Error('--repo-root, --task-id, --actor and --step are required');
    const stepFile = path.resolve(values.step),
      step = parse_document(read_bytes(stepFile, path.dirname(stepFile)), stepFile);
    const result = record_step(
      values['repo-root'],
      values['harness-root'],
      values['task-id'],
      step,
      { actor: values.actor, context_id: values['context-id'] },
    );
    console.log(canonical_json(result).toString('utf8'));
    return 0;
  } catch (error) {
    console.error(
      'RECORD_UNAVAILABLE: ' + (error instanceof Error ? error.message : String(error)),
    );
    return 2;
  }
}
if (typeof require !== 'undefined' && require.main === module) process.exitCode = main();
