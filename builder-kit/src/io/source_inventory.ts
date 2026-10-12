import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentError, read_bytes, scoped_path, within } from './loader.js';
import { canonical_json, digest, unicode_compare } from './canonical.js';

export interface SourceScope {
  roots: string[];
  exclude: string[];
}
export interface SourceFile {
  path: string;
  identity: string;
}
export interface SourceInventory {
  schema_version: string;
  record_type: 'SourceInventory';
  task_id: string;
  revision: string;
  scope: SourceScope;
  files: SourceFile[];
}
function fail(message: string): never {
  throw new DocumentError('SOURCE_INVENTORY_INVALID', 'source inventory', message);
}
function validPath(value: unknown, root = false): string {
  if (root && value === '.') return value;
  if (
    typeof value !== 'string' ||
    !value ||
    /[\\:*?<>"|\x00-\x1f]/.test(value) ||
    value.split('/').some((p) => ['', '.', '..'].includes(p) || /[ .]$/.test(p))
  )
    fail('Use exact repository-relative paths; only a root may be .');
  return value;
}
const inside = (value: string, parent: string): boolean =>
  parent === '.' || value === parent || value.startsWith(parent + '/');
export function source_scope(value: unknown): SourceScope {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== 'exclude,roots'
  )
    fail('Scope requires roots and exclude lists');
  const input = value as Record<string, unknown>;
  const result: SourceScope = { roots: [], exclude: [] };
  for (const key of ['roots', 'exclude'] as const) {
    const items = input[key];
    if (!Array.isArray(items) || (key === 'roots' && !items.length))
      fail('Scope needs nonempty roots and explicit exclusions');
    const checked = items.map((item) => validPath(item, key === 'roots'));
    if (new Set(checked).size !== checked.length) fail('Duplicate scope paths');
    if (checked.some((a) => checked.some((b) => a !== b && inside(a, b))))
      fail('Overlapping roots or exclusions');
    result[key] = checked.sort(unicode_compare);
  }
  for (const excluded of result.exclude)
    if (!result.roots.some((root) => inside(excluded, root) && excluded !== root))
      fail('Exclusions must be inside a selected directory root');
  return result;
}
export function inventory_identity(scope: unknown, files: SourceFile[]): string {
  return digest(canonical_json({ scope: source_scope(scope), files }));
}
export function collect_files(
  repo_root: string,
  harness_root: string,
  input: unknown,
  options: { allow_missing?: boolean } = {},
): SourceFile[] {
  const repo = fs.realpathSync(repo_root);
  const harness = fs.realpathSync(path.resolve(repo, harness_root));
  if (!within(harness, repo)) fail('Harness must be inside the repository');
  const scope = source_scope(input);
  const files: SourceFile[] = [];
  function visit(relative: string): void {
    if (scope.exclude.some((excluded) => inside(relative, excluded))) return;
    const candidate = relative === '.' ? repo : path.join(repo, relative);
    for (let node = candidate; node !== repo; node = path.dirname(node)) {
      try {
        if (fs.lstatSync(node).isSymbolicLink())
          fail(`Source scope contains a symlink: ${relative}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    if (within(candidate, harness)) fail('Exclude the harness directory from source scope');
    if (options.allow_missing && !fs.existsSync(candidate)) return;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      const directory = scoped_path(candidate, repo, { directory: true });
      for (const child of fs.readdirSync(directory).sort(unicode_compare))
        visit(path.relative(repo, path.join(directory, child)).split(path.sep).join('/'));
    } else {
      validPath(relative);
      const safe = scoped_path(candidate, repo);
      files.push({ path: relative, identity: digest(read_bytes(safe, repo)) });
    }
  }
  for (const root of scope.roots) visit(root);
  if (!files.length && !options.allow_missing) fail('Source scope contains no regular files');
  return files.sort((a, b) => unicode_compare(a.path, b.path));
}
export function capture_inventory(
  repo: string,
  harness: string,
  task_id: string,
  input: unknown,
): SourceInventory {
  if (typeof task_id !== 'string' || !task_id) fail('A task ID is required');
  const scope = source_scope(input);
  const files = collect_files(repo, harness, scope);
  if (JSON.stringify(collect_files(repo, harness, scope)) !== JSON.stringify(files))
    fail('Source changed during capture; retry after changes stop');
  return {
    schema_version: '2.0.0',
    record_type: 'SourceInventory',
    task_id,
    revision: inventory_identity(scope, files),
    scope,
    files,
  };
}
export function validate_inventory(value: SourceInventory): SourceScope {
  const scope = source_scope(value.scope);
  const paths = value.files.map((row) => row.path);
  if (
    !paths.length ||
    JSON.stringify(paths) !== JSON.stringify([...new Set(paths)].sort(unicode_compare))
  )
    fail('Source files must be nonempty, unique and sorted by path');
  for (const name of paths) {
    validPath(name);
    if (
      !scope.roots.some((root) => inside(name, root)) ||
      scope.exclude.some((excluded) => inside(name, excluded))
    )
      fail('Recorded file is outside the declared scope');
  }
  if (value.revision !== inventory_identity(scope, value.files))
    fail('Source revision does not match the inventory contents');
  return scope;
}
