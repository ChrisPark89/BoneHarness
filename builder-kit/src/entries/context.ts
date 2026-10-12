import { arguments_for, base_options } from './arguments.js';
import { extract_context, context_page, render_text } from '../context.js';
let json = false;
try {
  const args = arguments_for(
    {
      ...base_options,
      situation: { type: 'string', default: 'development' },
      'task-id': { type: 'string' },
      'update-id': { type: 'string' },
      record: { type: 'string' },
      page: { type: 'string', default: '1' },
      'context-id': { type: 'string' },
      format: { type: 'string', default: 'text' },
    },
    ['repo-root'],
  );
  json = args.format === 'json';
  if (!['text', 'json'].includes(args.format as string))
    throw new Error('format must be text or json');
  const context = extract_context(args['repo-root'] as string, args['harness-root'] as string, {
    situation: args.situation as string,
    task_id: args['task-id'] as string | undefined,
    update_id: args['update-id'] as string | undefined,
    record_id: args.record as string | undefined,
  });
  const page = context_page(context, Number(args.page), {
    expected_context_id: args['context-id'] as string | undefined,
  });
  console.log(json ? JSON.stringify(page, null, 2) : render_text(page));
  process.exitCode = context.issues.length ? 1 : 0;
} catch (error) {
  const result = { code: 'CONTEXT_UNAVAILABLE', message: String(error) };
  console.log(json ? JSON.stringify(result) : `${result.code}: ${result.message}`);
  process.exitCode = 2;
}
