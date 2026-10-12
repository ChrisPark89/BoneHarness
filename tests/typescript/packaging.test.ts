import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname, delimiter } from 'node:path';
import { mkdirSync, existsSync, copyFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { temp, clean, run, KIT, json, files, read, put } from './support.js';
function npmArgs(): string[] {
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
    ...(process.env.PATH ?? '').split(delimiter).map((p) => join(p, 'npm')),
  ];
  const file = candidates.find((p): p is string => !!p && existsSync(p) && !p.endsWith('.cmd'));
  if (!file) throw new Error('Run packaging checks with npm test so npm_execpath is available');
  return [process.execPath, realpathSync(file)];
}
test('Packaging.test_wheel_contains_kit_and_runs_outside_checkout', () => {
  const root = temp('bh npm ü ');
  try {
    const packed = JSON.parse(
      run(
        [
          ...npmArgs(),
          'pack',
          '--cache',
          join(root, 'cache'),
          '--ignore-scripts',
          '--json',
          '--pack-destination',
          root,
        ],
        KIT,
      ),
    )[0];
    const names = packed.files.map((f: { path: string }) => f.path);
    for (const expected of [
      'harness/gitignore.template',
      'harness/framework/schemas/records.schema.json',
      'harness/framework/workflows/setup/setup.md',
      'harness/framework/workflows/shared/adapter-interface.md',
      'dist/helpers/report.cjs',
      'dist/helpers/check.cjs',
      'release.json',
      'dist/helpers/view.cjs',
      'dist/bh.cjs',
    ])
      assert.ok(names.includes(expected), expected);
    assert.equal(
      names.some(
        (n: string) =>
          n.startsWith('tests/') ||
          n.includes('__pycache__') ||
          n.includes('docs/research/') ||
          n.endsWith('.py'),
      ),
      false,
    );
    const target = join(root, 'installed');
    mkdirSync(target);
    put(join(target, 'package.json'), '{"private":true}');
    run(
      [
        ...npmArgs(),
        'install',
        '--cache',
        join(root, 'cache'),
        '--offline',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--omit=dev',
        join(root, packed.filename),
      ],
      target,
    );
    const executable = join(target, 'node_modules/boneharness/dist/bh.cjs');
    assert.match(run([process.execPath, executable, '--version'], root), /bh 3\.0\.0/);
    const bin = join(target, 'node_modules/.bin', process.platform === 'win32' ? 'bh.cmd' : 'bh');
    assert.ok(existsSync(bin));
    if (process.platform === 'win32') {
      const launch = spawnSync(
        process.env.ComSpec ?? 'cmd.exe',
        ['/d', '/s', '/c', `""${bin}" --help"`],
        { cwd: root, encoding: 'utf8' },
      );
      assert.equal(launch.status, 0, launch.stdout + launch.stderr);
      assert.match(launch.stdout, /doctor/);
    } else assert.match(run([bin, '--help'], root), /doctor/);
    const repo = join(root, 'repo');
    mkdirSync(repo);
    const result = JSON.parse(
      run([process.execPath, executable, 'init', '--repo', repo, '--json'], root),
    );
    assert.equal(result.can_start, true);
    assert.ok(existsSync(join(repo, '.harness/framework/tools/view.cjs')));
    // Installed bundles work with PATH empty: no Python/npm/global package lookup at runtime.
    const isolated = spawnSync(process.execPath, [executable, 'doctor', '--repo', repo, '--json'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, PATH: '' },
    });
    assert.equal(isolated.status, 0, isolated.stdout + isolated.stderr);
    assert.equal(JSON.parse(isolated.stdout).can_start, true);
  } finally {
    clean(root);
  }
});
