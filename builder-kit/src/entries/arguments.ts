import { parseArgs, type ParseArgsConfig } from 'node:util';
/** Parse helper flags consistently; all value flags return strings. */
export function arguments_for(
  options: NonNullable<ParseArgsConfig['options']>,
  required: string[] = [],
): Record<string, string | boolean | string[] | undefined> {
  const parsed = parseArgs({ options: { help: { type: 'boolean' }, ...options }, strict: true });
  const values = parsed.values as Record<string, string | boolean | string[] | undefined>;
  if (values.help) {
    console.log(
      'Options:\n' +
        Object.entries(options)
          .map(
            ([name, option]) =>
              `  --${name}${option.type === 'string' ? ' VALUE' : ''}${required.includes(name) ? ' (required)' : ''}`,
          )
          .join('\n'),
    );
    process.exit(0);
  }
  for (const name of required) if (!values[name]) throw new Error(`Missing --${name}`);
  return values;
}
export const base_options = {
  'repo-root': { type: 'string' },
  'harness-root': { type: 'string', default: '.harness' },
} as const;
