/** Fresh scaffold creation and release ownership; never execute adapters. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { canonical_json as canonical } from '../io/canonical.js';
import type { Release } from '../cli/types.js';
export const KIT_VERSION = '3.0.0';
export function digest(raw: Uint8Array): string {
  return 'sha256:' + createHash('sha256').update(raw).digest('hex');
}
export function walk(root: string): string[] {
  const result: string[] = [];
  for (const item of fs
    .readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(root, item.name);
    if (item.isSymbolicLink()) throw new Error('Symlink kit resource refused: ' + file);
    if (item.isDirectory()) {
      if (item.name !== '__pycache__') result.push(...walk(file));
    } else if (item.isFile()) result.push(file);
  }
  return result;
}
export function payload(kit: string): Record<string, Buffer> {
  kit = fs.realpathSync(kit);
  const files: Record<string, Buffer> = {};
  // Original kit baselines remain usable for ownership checks.
  const source = path.join(
    kit,
    fs.existsSync(path.join(kit, 'harness')) ? 'harness' : 'templates/runtime',
  );
  for (const file of walk(source)) {
    if (/\.pyc?$/.test(file) || path.basename(file) === 'requirements.lock') continue;
    const name = path.relative(source, file).split(path.sep).join('/');
    // npm omits .gitignore files from tarballs; retain its installed name here.
    files[name === 'gitignore.template' ? '.gitignore' : name] = fs.readFileSync(file);
  }
  for (const name of ['check', 'report', 'journal', 'command', 'context', 'source', 'view']) {
    const file = path.join(kit, 'dist/helpers', name + '.cjs');
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Symlink kit resource refused');
    files['framework/tools/' + name + '.cjs'] = fs.readFileSync(file);
  }
  return files;
}
export function release_info(kit: string, files: Record<string, Buffer>): Release {
  const value = JSON.parse(fs.readFileSync(path.join(kit, 'release.json'), 'utf8')) as {
    version?: unknown;
    formats?: unknown;
    runtime_api?: unknown;
  };
  if (
    typeof value.version !== 'string' ||
    JSON.stringify(value.formats) !== '["2.0.0"]' ||
    value.runtime_api !== 2
  )
    throw new Error('Unsupported kit release or record format');
  const managed = Object.fromEntries(
    Object.entries(files)
      .filter(
        ([p]) =>
          !['framework/config/', 'docs/', 'artifacts/'].some((prefix) => p.startsWith(prefix)),
      )
      .map(([p, b]) => [p, digest(b)]),
  );
  const data = { version: value.version, formats: ['2.0.0'], runtime_api: 2, managed };
  return { ...data, identity: digest(canonical(data)) };
}
export function install(
  repo: string,
  options: {
    kit: string;
  },
): {
  harness_root: string;
  kit_version: string;
  structure: string;
  activation: string;
  entry_point: string;
} {
  if (Number(process.versions.node.split('.')[0]) < 22)
    throw new Error('Node.js 22 or later is required');
  if (!path.isAbsolute(repo) || !fs.statSync(repo).isDirectory())
    throw new Error('--repo-root must be an existing absolute directory');
  repo = fs.realpathSync(repo);
  const harness = path.join(repo, '.harness');
  if (
    fs.existsSync(harness) ||
    (fs.existsSync(path.dirname(harness)) && fs.readdirSync(repo).includes('.harness'))
  )
    throw new Error('.harness already exists; use bh status or bh update');
  const files = payload(options.kit),
    receipt = release_info(options.kit, files);
  const profile = files['framework/config/repo-profile.yaml']!.toString('utf8'),
    marker = 'repository: example-repository';
  if (profile.split(marker).length !== 2) throw new Error('Kit profile template is invalid');
  files['framework/config/repo-profile.yaml'] = Buffer.from(
    profile.replace(marker, 'repository: ' + JSON.stringify(path.basename(repo))),
  );
  for (const name of Object.keys(files))
    if (
      name.startsWith('/') ||
      /[\\:]/.test(name) ||
      name.split('/').some((p) => ['', '.', '..'].includes(p))
    )
      throw new Error('Invalid kit path');
  fs.mkdirSync(harness);
  for (const [name, raw] of Object.entries(files)) {
    const file = path.join(harness, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, raw);
  }
  for (const name of [
    'docs/development',
    'artifacts/installation',
    'artifacts/configurations',
    'artifacts/development',
    'artifacts/maintenance',
  ])
    fs.mkdirSync(path.join(harness, name), { recursive: true });
  const record = {
    schema_version: '2.0.0',
    record_type: 'Installation',
    kit_version: receipt.version,
    configuration_id: 'cfg-1',
    status: 'PENDING',
    activation: 'PENDING',
    created_at: new Date().toISOString(),
    files: [...Object.keys(files), 'artifacts/installation/installation-record.yaml'].sort(),
    checks: [],
  };
  fs.writeFileSync(
    path.join(harness, 'artifacts/installation/installation-record.yaml'),
    JSON.stringify(record, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(harness, 'artifacts/installation/kit-receipt.json'),
    JSON.stringify(receipt, null, 2) + '\n',
  );
  return {
    harness_root: harness,
    kit_version: receipt.version,
    structure: 'NOT_CHECKED',
    activation: 'PENDING',
    entry_point: path.join(harness, 'README.md'),
  };
}
