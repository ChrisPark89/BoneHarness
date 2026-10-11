"""Check current documentation only; historical records keep their original bytes."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def check():
    documents = [ROOT / 'README.md', ROOT / 'AGENTS.md', ROOT / 'tests/README.md']
    documents += sorted((ROOT / 'docs').glob('*.md'))
    documents += sorted((ROOT / 'builder-kit').rglob('*.md'))
    issues = []
    links = 0
    for path in documents:
        text = path.read_text(encoding='utf-8')
        if text.count('```') % 2:
            issues.append(f'{path.relative_to(ROOT)}: unbalanced code fences')
        # Literal template output paths are code, not navigational links.
        for target in re.findall(r'\]\(([^)]+)\)', text):
            if target.startswith(('http:', 'https:', 'mailto:', '#')):
                continue
            target = target.split('#', 1)[0]
            destination = (path.parent / target).resolve()
            runtime = ROOT / 'builder-kit/templates/runtime'
            if destination == runtime / 'docs/setup.md':
                destination = runtime / 'framework/templates/setup.md'
            if not destination.exists():
                issues.append(f'{path.relative_to(ROOT)}: missing link {target}')
            links += 1
        # These are the pages intended to be read in one sitting by humans.
        if path.parent == ROOT / 'docs' or path.name in ('README.md', 'AGENTS.md'):
            words = len(text.split())
            if words > 200:
                issues.append(f'{path.relative_to(ROOT)}: {words} words (maximum 200)')
    if issues:
        raise SystemExit('\n'.join(issues))
    print(f'PASS: {len(documents)} current documents; {links} local links; human-page word limits.')

if __name__ == '__main__':
    check()
