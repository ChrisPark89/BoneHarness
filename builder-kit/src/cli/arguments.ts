/** Small strict parser shared by CLI entry points; no command framework. */
export function parse(
  argv: string[],
  valued: string[],
  flags: string[],
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (flags.includes(arg)) {
      if (arg in out) throw new Error('Repeated option: ' + arg);
      out[arg] = true;
    } else if (valued.includes(arg)) {
      if (arg in out) throw new Error('Repeated option: ' + arg);
      const value = argv[++i];
      if (value === undefined || value.startsWith('--'))
        throw new Error('Missing value for ' + arg);
      out[arg] = value;
    } else throw new Error('Unknown argument: ' + arg);
  }
  return out;
}
export function option(args: Record<string, string | boolean>, name: string): string | undefined {
  const value = args[name];
  return typeof value === 'string' ? value : undefined;
}
