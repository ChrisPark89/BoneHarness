import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseDocument, isScalar, isMap, visit } from 'yaml';

export interface Diagnostic {
  code: string;
  path: string;
  message: string;
  criterion_id?: string;
}
export class DocumentError extends Error {
  constructor(
    public code: string,
    public path: string,
    message: string,
    public exit_code = 1,
  ) {
    super(message);
  }
  diagnostic(criterion_id?: string): Diagnostic {
    return {
      code: this.code,
      path: this.path,
      message: this.message,
      ...(criterion_id ? { criterion_id } : {}),
    };
  }
}
export interface PathOptions {
  directory?: boolean;
}
export function within(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}
export function scoped_path(input: string, scope_root: string, options: PathOptions = {}): string {
  const root = fs.realpathSync(scope_root);
  const original = path.isAbsolute(input) ? input : `${root}${path.sep}${input}`;
  // Check spelling before path.resolve can erase traversal.
  const tail = original.slice(root.length + 1);
  if (!original.startsWith(root + path.sep) && original !== root)
    throw new DocumentError('PATH_SCOPE', input, 'Path is outside its declared root');
  if (original === root && options.directory) return root;
  if (
    !tail ||
    tail
      .split(path.sep)
      .some((p) => p === '..' || p === '.' || !p || p.includes(':') || p.includes('\\'))
  ) {
    throw new DocumentError('PATH_TRAVERSAL', input, 'Require a canonical root-relative path');
  }
  let current = root;
  try {
    for (const part of tail.split(path.sep)) {
      const names = fs.readdirSync(current);
      if (!names.includes(part)) {
        const code = names.some((n) => n.toLowerCase() === part.toLowerCase())
          ? 'PATH_CASE'
          : 'PATH_MISSING';
        throw new DocumentError(code, input, 'Exact-case path component not present');
      }
      current = path.join(current, part);
      if (!within(fs.realpathSync(current), root))
        throw new DocumentError('PATH_SYMLINK', input, 'Symlink escapes declared root');
    }
    const stat = fs.statSync(current);
    if (!(options.directory ? stat.isDirectory() : stat.isFile()))
      throw new DocumentError('PATH_TYPE', input, 'Expected a regular file or directory');
    return current;
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError('PATH_UNREADABLE', input, String(error), 2);
  }
}
export function relative_path(value: string, root: string, options: PathOptions = {}): string {
  if (
    typeof value !== 'string' ||
    !value ||
    /[\\:\x00-\x1f]/.test(value) ||
    value.startsWith('/') ||
    value.split('/').some((p) => ['', '.', '..'].includes(p))
  ) {
    throw new DocumentError(
      'PATH_TRAVERSAL',
      String(value),
      'Require a canonical relative path using /',
    );
  }
  return scoped_path(path.join(root, ...value.split('/')), root, options);
}
export function read_bytes(input: string, scope_root = path.dirname(input)): Buffer {
  const safe = scoped_path(input, scope_root);
  try {
    return fs.readFileSync(safe);
  } catch (error) {
    throw new DocumentError('PATH_UNREADABLE', input, String(error), 2);
  }
}
const number = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;
function compatible(value: unknown, ancestors = new Set<object>()): void {
  if (value !== null && typeof value === 'object') {
    if (ancestors.has(value)) throw new Error('Cyclic aliases are forbidden');
    ancestors.add(value);
    for (const child of Object.values(value)) compatible(child, ancestors);
    ancestors.delete(value);
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
      throw new Error('Number cannot be represented safely');
  } else if (value !== null && !['string', 'boolean'].includes(typeof value))
    throw new Error('Only JSON-compatible values are permitted');
}
export function parse_document(content: Uint8Array | string, source = 'input.yaml'): unknown {
  try {
    const text =
      typeof content === 'string'
        ? content
        : new TextDecoder('utf-8', { fatal: true }).decode(content);
    const json = path.extname(source).toLowerCase() === '.json';
    if (json) JSON.parse(text); // YAML is not a substitute for JSON grammar validation.
    const document = parseDocument(text, {
      version: '1.1',
      uniqueKeys: true,
      merge: false,
      strict: true,
    });
    if (document.errors.length) throw document.errors[0];
    visit(document, (_key, node) => {
      if (node && typeof node === 'object' && 'tag' in node && node.tag)
        throw new Error('Explicit YAML tags are forbidden');
      if (isMap(node)) {
        for (const pair of node.items) {
          if (!isScalar(pair.key) || typeof pair.key.value !== 'string')
            throw new Error('Mapping keys must be strings');
          if (!json && pair.key.value === '<<') throw new Error('Merge keys are forbidden');
        }
      }
      if (isScalar(node) && node.type === 'PLAIN' && typeof node.value === 'number') {
        const spelling = node.source ?? '';
        // Match the prior YAML 1.1 resolver: unsuffixed exponents are strings.
        if (
          !json &&
          /[eE]/.test(spelling) &&
          number.test(spelling) &&
          !(spelling.includes('.') && /[eE][+-][0-9]+$/.test(spelling))
        ) {
          node.value = spelling;
        } else if (/[.eE]/.test(spelling)) {
          throw new Error(
            'Floating-point spelling is unsupported for record identity; use an integer or quoted string',
          );
        }
      }
      if (!json && isScalar(node) && node.type === 'PLAIN') {
        const spelling = node.source ?? '';
        if (
          !spelling ||
          (/^(yes|no|on|off|true|false|null|~)$/i.test(spelling) &&
            !['true', 'false', 'null'].includes(spelling))
        )
          throw new Error('Ambiguous YAML scalar; quote strings');
        if (/^\d{4}-\d{1,2}-\d{1,2}(?:$|[Tt\s])/.test(spelling))
          throw new Error('Dates and timestamps must be quoted strings');
        if (typeof node.value === 'number' && !number.test(spelling))
          throw new Error('Use JSON-compatible decimal number spelling');
      }
    });
    const value: unknown = json ? JSON.parse(text) : document.toJS({ maxAliasCount: 100 });
    compatible(value);
    if (value === null || typeof value !== 'object')
      throw new Error('Document root must be an object or array');
    return value;
  } catch (error) {
    throw new DocumentError(
      'PARSE_INVALID',
      source,
      error instanceof Error ? error.message : String(error),
    );
  }
}
export function load_document(input: string, scope_root = path.dirname(input)): unknown {
  return parse_document(read_bytes(input, scope_root), input);
}
