import { build } from 'esbuild';
import { mkdirSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const kit = resolve(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(resolve(kit, 'dist/helpers'), { recursive: true });
for (const name of ['bh', 'check', 'report', 'journal', 'command', 'context', 'source', 'view']) {
  const outfile = resolve(kit, name === 'bh' ? 'dist/bh.cjs' : `dist/helpers/${name}.cjs`);
  await build({
    entryPoints: [resolve(kit, `src/entries/${name}.ts`)],
    outfile,
    absWorkingDir: kit,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    banner: { js: '#!/usr/bin/env node' },
    sourcemap: false,
  });
  chmodSync(outfile, 0o755);
}
