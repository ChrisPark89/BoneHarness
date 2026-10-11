"""One installed CLI walkthrough with real Node commands in a disposable app."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which('node'), 'Node.js is required for the actual command walkthrough')
class InstalledWalkthrough(unittest.TestCase):
    def test_documented_commands_and_actual_build_test(self):
        with tempfile.TemporaryDirectory(prefix='harness walkthrough ') as directory:
            repo = Path(directory).resolve()
            for name in ('src/calculator.js', 'scripts/build.mjs', 'test/calculator.test.mjs', 'package.json'):
                destination = repo / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / 'tests/demo' / name, destination)
            result = subprocess.run([sys.executable, '-B', str(ROOT / 'builder-kit/installer/install.py'),
                                     '--repo-root', str(repo)], capture_output=True, text=True)
            self.assertEqual(0, result.returncode, result.stderr)
            harness = repo / '.harness'
            tools = harness / 'framework/tools'
            run = harness / 'artifacts/development/check'
            docs = harness / 'docs/development/check'
            run.mkdir(); docs.mkdir()
            (run / 'request.md').write_text(
                'Builder cleanup verification: inspect the existing calculator and verify its packaged behavior.\n')
            (docs / 'spec.md').write_text(
                '# Existing calculator verification\n\n'
                '| Criterion | Requirement | Proof |\n|---|---|---|\n'
                '| sums | Packaged add(2,3)=5 and add(-2,3)=1 | Build then run the existing Node assertions |\n')
            (run / 'compatibility.md').write_text(
                'Reviewed the local commands: finite processes with captured output and exit status. '
                'Build writes dist/calculator.js; tests import that artifact. No claim about tool quality.\n')
            profile_path = harness / 'framework/config/repo-profile.yaml'
            profile = yaml.safe_load(profile_path.read_text())
            commands = {'preflight': ['node', '--check', 'src/calculator.js'],
                        'build': ['node', 'scripts/build.mjs'], 'testing': ['node', '--test', 'test/calculator.test.mjs']}
            for phase, command in commands.items():
                profile['adapters']['test' if phase == 'testing' else phase] = dict(
                    connection=' '.join(command), status='COMPATIBLE', reason='Invocation and evidence interpretation reviewed.',
                    evidence=['artifacts/installation/installation-record.yaml'])
            profile_path.write_text(yaml.safe_dump(profile, sort_keys=False))
            record_path = harness / 'artifacts/installation/installation-record.yaml'
            installation = yaml.safe_load(record_path.read_text())
            installation['checks'] = [dict(name=phase+'-interface',
                adapter='test' if phase == 'testing' else phase, connection=' '.join(command),
                method='REVIEW', observations='Inspected local invocation; exit status and output can be retained.',
                result='PASS', reason='Interface is usable; no tool-quality claim.',
                evidence=['artifacts/development/check/compatibility.md']) for phase, command in commands.items()]
            record_path.write_text(yaml.safe_dump(installation, sort_keys=False))

            def cli(tool, *arguments):
                result = subprocess.run([sys.executable, '-B', str(tools / tool), '--repo-root', str(repo), *arguments],
                                        cwd=repo, capture_output=True, text=True)
                self.assertIn(result.returncode, (0, 1) if tool == 'context.py' else (0,), result.stderr + result.stdout)
                return result.stdout

            cli('check.py')

            def evidence(path, provenance='REVIEW', scope='HARNESS'):
                return dict(reference=dict(kind='LOCAL', scope=scope, path=path), provenance=provenance,
                            summary='Inspected source or actual captured command output.')

            request = evidence('artifacts/development/check/request.md')
            specification = evidence('docs/development/check/spec.md')
            source = evidence('src/calculator.js', scope='REPOSITORY')
            tests = evidence('test/calculator.test.mjs', scope='REPOSITORY')

            def context():
                page = json.loads(cli('context.py', '--task-id', 'check', '--format', 'json'))
                token, pieces = page['context_id'], [page['excerpt']]
                while page['next_page']:
                    page = json.loads(cli('context.py', '--task-id', 'check', '--format', 'json',
                                          '--page', str(page['next_page']), '--context-id', token))
                    pieces.append(page['excerpt'])
                return json.loads(''.join(pieces))

            def write(step):
                arguments = [] if step['action'] == 'start' else ['--context-id', context()['context_id']]
                path = run / 'step.yaml'
                path.write_text(yaml.safe_dump(step, sort_keys=False))
                return json.loads(cli('journal.py', '--task-id', 'check', '--actor', 'walkthrough-reviewer',
                                      '--step', str(path), *arguments))

            def phase(name, summary, references, **extra):
                return write(dict(action='phase', phase=name, status='PASS', summary=summary,
                                  evidence=references, **extra))

            write(dict(action='start', request=request,
                       source_scope=dict(roots=['src', 'scripts', 'test', 'package.json'], exclude=[])))
            phase('initialization', 'Inspected the request, commands and selected input files.', [request])
            phase('research', 'The calculator exports add; the build copies it and tests import the package.', [source, tests])
            phase('pattern_review', 'Existing ES modules and Node assertions fit this verification task.', [source, tests])
            write(dict(action='specification', document=specification,
                       acceptance=dict(authority=request, review='Verification scope follows the requested builder check.'),
                       criteria=[dict(id='sums', description='Packaged positive and negative addition match expectations.',
                                      required=True, methods=['EXECUTION'])],
                       source_scope=dict(roots=['src', 'scripts', 'test', 'package.json'], exclude=[]), reconcile_skips=[]))
            phase('verification_plan', 'Run syntax validation, build, then the two existing assertions.', [tests])
            phase('implementation_plan', 'Existing implementation needs no changes for this verification task.', [source])
            phase('implementation', 'Reviewed the existing addition expression against both required outcomes.', [source])
            artifact = evidence('dist/calculator.js', 'EXECUTION', 'REPOSITORY')
            for name, command in commands.items():
                inputs = {'target': 'dist/calculator.js', 'environment': 'local Node.js', 'artifact': artifact} if name == 'testing' else {}
                write(dict(action='operation', operation_id=name, phase=name, status='INTENT',
                           connection=' '.join(command), evidence=[], **({'inputs': inputs} if inputs else {})))
                result = subprocess.run(command, cwd=repo, capture_output=True, text=True)
                self.assertEqual(0, result.returncode, result.stdout + result.stderr)
                log = run / (name + '.log')
                log.write_text('Command: ' + ' '.join(command) + '\nExit: ' + str(result.returncode) + '\n'
                               + result.stdout + result.stderr)
                output = evidence(log.relative_to(harness).as_posix(), 'EXECUTION')
                write(dict(action='operation', operation_id=name, status='COMPLETED', outcome='PASS', evidence=[output, artifact] if name == 'build' else [output]))
                phase(name, 'Reviewed actual command output and successful exit.', [output], operation=name)
            phase('specification_verification', 'Reviewed the two assertions and their successful execution against the packaged module.',
                  [tests, output], criteria=[dict(criterion_id='sums', result='PASS', method='EXECUTION',
                                                reason='Both required assertions passed against dist/calculator.js.',
                                                evidence=[output], operation='testing')])
            phase('final_review', 'Source remains unchanged; actual build and test evidence covers the accepted requirement.', [source, specification])
            self.assertEqual('COMPLETE', context()['status'])
            cli('report.py', '--task-id', 'check')
            report = json.loads((run / 'report.json').read_text())
            self.assertEqual('COMPLETE', report['status'])
            self.assertIn('**COMPLETE**', (docs / 'report.md').read_text())
            self.assertEqual({'spec.md', 'report.md'}, {p.name for p in docs.iterdir()})
            self.assertFalse((run / 'state.json').exists())
            (repo / 'dist/calculator.js').write_text('export function add() { return 0; }\n')
            self.assertNotEqual('COMPLETE', context()['status'])
            self.assertEqual((ROOT / 'tests/demo/src/calculator.js').read_bytes(), (repo / 'src/calculator.js').read_bytes())
