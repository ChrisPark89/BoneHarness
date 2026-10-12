import { main } from '../cli/main.js';
void main().then((code) => {
  process.exitCode = code;
});
