import { copyFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source = new URL('../src/calculator.js', import.meta.url);
const output = new URL('../dist/', import.meta.url);

// A deliberately small build: validate JavaScript, then publish the module.
execFileSync(process.execPath, ['--check', fileURLToPath(source)], { stdio: 'inherit' });
await mkdir(output, { recursive: true });
await copyFile(source, new URL('calculator.js', output));
console.log('Built dist/calculator.js');
