/** Check active navigation and short human pages; historical artifacts stay untouched. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
function markdown(root: string, recursive = false): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() && recursive && !['node_modules', 'dist'].includes(e.name)
      ? markdown(join(root, e.name), true)
      : e.isFile() && e.name.endsWith('.md')
        ? [join(root, e.name)]
        : [],
  );
}
export function check(root = resolve(process.env.BH_TEST_ROOT ?? process.cwd())): void {
  const documents = [
      join(root, 'README.md'),
      join(root, 'AGENTS.md'),
      join(root, 'tests/README.md'),
      ...markdown(join(root, 'docs')),
      ...markdown(join(root, 'builder-kit'), true),
      ...markdown(join(root, 'docs/cli-mvp')),
      ...markdown(join(root, 'docs/typescript')),
    ],
    issues: string[] = [];
  let links = 0;
  for (const p of documents) {
    const text = readFileSync(p, 'utf8');
    if ((text.match(/```/g) ?? []).length % 2)
      issues.push(relative(root, p) + ': unbalanced code fences');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1]!;
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const destination = resolve(dirname(p), target.split('#')[0]!);
      if (!existsSync(destination)) issues.push(relative(root, p) + ': missing link ' + target);
      links++;
    }
    if (
      p === join(root, 'docs/cli-mvp/spec.md') ||
      p === join(root, 'docs/typescript/spec.md') ||
      dirname(p) === join(root, 'docs') ||
      ['README.md', 'AGENTS.md'].includes(p.split(/[\\/]/).at(-1)!)
    ) {
      const words = text.trim().split(/\s+/).length;
      if (words > 200) issues.push(relative(root, p) + ': ' + words + ' words (maximum 200)');
    }
  }
  if (issues.length) throw new Error(issues.join('\n'));
  console.log(
    `PASS: ${documents.length} current documents; ${links} local links; human-page word limits.`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) check();
