#!/usr/bin/env python3
"""Install the current kit and run two controlled examples with real Node commands."""
from pathlib import Path
import json
import shutil
import subprocess
import sys

import yaml

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
REPO = Path(__file__).resolve().parent
HARNESS = REPO / '.harness'
SCOPE = dict(roots=['src', 'scripts', 'test', 'package.json'], exclude=[])
COMMANDS = {'preflight': ['node', '--check', 'src/calculator.js'],
            'build': ['node', 'scripts/build.mjs'],
            'testing': ['node', '--test', 'test/calculator.test.mjs']}


def evidence(path, provenance='REVIEW', scope='HARNESS'):
    return dict(reference=dict(kind='LOCAL', scope=scope, path=path),
                provenance=provenance, summary='Retained demo review or actual command output.')


def execute(command):
    return subprocess.run(command, cwd=REPO, capture_output=True, text=True, timeout=60)


def install():
    if HARNESS.exists() or HARNESS.is_symlink():
        raise ValueError('Existing .harness refused. Preserve it before removing it for another trial.')
    if not shutil.which('node'):
        raise ValueError('Node.js is required.')
    subprocess.run([sys.executable, '-B', str(ROOT / 'builder-kit/installer/install.py'),
                    '--repo-root', str(REPO)], check=True)
    notes = HARNESS / 'artifacts/installation/demo-review.md'
    notes.write_text(
        '# Controlled demo review\n\n'
        'Purpose: verify the existing packaged calculator, then demonstrate a test failure and repair. '
        'Running this demo requests both scenarios. No phase skips or production approvals are claimed.\n\n'
        'Reviewed source: add returns a + b. Build checks syntax and copies the module to dist. '
        'Tests import dist and assert add(2,3)=5 and add(-2,3)=1. Existing ES modules and Node assertions fit.\n\n'
        'Connections: three local finite commands return exit codes and capturable output; build writes dist. '
        'Each invocation has a 60-second timeout. Compatibility does not prove tool quality.\n\n'
        'These are scripted examples with real executions, not an independent LLM usability trial. '
        'A reviewer must load the installed entry guides before confirming setup activation.\n', encoding='utf-8')
    profile_path = HARNESS / 'framework/config/repo-profile.yaml'
    profile = yaml.safe_load(profile_path.read_text())
    for phase, command in COMMANDS.items():
        profile['adapters']['test' if phase == 'testing' else phase] = dict(
            connection=' '.join(command), status='COMPATIBLE',
            reason='Local command, output and exit status reviewed.',
            evidence=['artifacts/installation/demo-review.md'])
    profile_path.write_text(yaml.safe_dump(profile, sort_keys=False), encoding='utf-8')


def scenario(task, repair=False):
    from harness_io.journal import record_step
    from reporting.evidence import capture_task
    from report import generate

    run = HARNESS / 'artifacts/development' / task
    docs = HARNESS / 'docs/development' / task
    run.mkdir(); docs.mkdir()
    (docs / 'spec.md').write_text(
        '# Calculator verification\n\n'
        + ('Exercise a deliberate subtraction defect, retain the failure, restore addition and recheck.\n\n'
           if repair else 'Verify the existing calculator without changing its source.\n\n')
        + '| Criterion | Required result | Evidence |\n|---|---|---|\n'
        '| sums | Packaged add(2,3)=5 and add(-2,3)=1 | Actual Node assertions after building |\n\n'
        'All phases remain visible. Completion requires current source and packaged-output evidence.\n', encoding='utf-8')
    review = evidence('artifacts/installation/demo-review.md')
    spec = evidence(f'docs/development/{task}/spec.md')
    source = evidence('src/calculator.js', scope='REPOSITORY')
    tests = evidence('test/calculator.test.mjs', scope='REPOSITORY')

    def write(step):
        context = None if step['action'] == 'start' else capture_task(REPO, HARNESS, task)['context_id']
        return record_step(REPO, HARNESS, task, step, actor='controlled-demo', context_id=context)

    def phase(name, summary, refs, status='PASS', **extra):
        return write(dict(action='phase', phase=name, status=status, summary=summary, evidence=refs, **extra))

    def attempt(number, expected_test_exit):
        last = None
        for name, command in COMMANDS.items():
            operation = f'{name}-{number}'
            # Preserve each built output before a later repair replaces dist.
            artifact = evidence(f'artifacts/development/{task}/build-{number}.js', 'EXECUTION')
            inputs = dict(target='dist/calculator.js', environment='local Node.js', artifact=artifact) if name == 'testing' else {}
            write(dict(action='operation', operation_id=operation, phase=name, status='INTENT',
                       connection=' '.join(command), evidence=[], **({'inputs': inputs} if inputs else {})))
            result = execute(command)
            log = run / f'{operation}.log'
            log.write_text('Command: ' + ' '.join(command) + '\nExit: ' + str(result.returncode)
                           + '\n' + result.stdout + result.stderr, encoding='utf-8')
            last = evidence(log.relative_to(HARNESS).as_posix(), 'EXECUTION')
            refs = [last]
            if name == 'build' and result.returncode == 0:
                shutil.copyfile(REPO / 'dist/calculator.js', run / f'build-{number}.js')
                refs.append(artifact)
                if expected_test_exit == 0:
                    refs.append(evidence('dist/calculator.js', 'EXECUTION', 'REPOSITORY'))
            outcome = 'PASS' if result.returncode == 0 else 'FAIL'
            write(dict(action='operation', operation_id=operation, status='COMPLETED', outcome=outcome, evidence=refs))
            phase(name, f'Actual command exited {result.returncode}.', [last], status=outcome, operation=operation)
            expected = expected_test_exit if name == 'testing' else 0
            if (result.returncode == 0) != (expected == 0):
                raise ValueError(f'Unexpected {operation} result; inspect {log}')
        return last, operation

    write(dict(action='start', request=review, source_scope=SCOPE))
    phase('initialization', 'Demo request and repository inputs inspected.', [review])
    phase('research', 'Build copies the calculator; tests execute its packaged output.', [review, tests])
    phase('pattern_review', 'Existing ES modules and Node assertions fit this task.', [review, tests])
    write(dict(action='specification', document=spec,
               acceptance=dict(authority=review, review='Scope follows the explicit request to run this demo.'),
               criteria=[dict(id='sums', description='Packaged positive and negative sums match the assertions.',
                              required=True, methods=['EXECUTION'])], source_scope=SCOPE, reconcile_skips=[]))
    phase('verification_plan', 'Run syntax check, build and the existing packaged-module assertions.', [tests])
    phase('implementation_plan', 'Exercise a controlled defect then restore the existing implementation.' if repair
          else 'Inspect the existing implementation; no source edit is needed.', [review])
    original = (REPO / 'src/calculator.js').read_bytes()
    try:
        if repair:
            (REPO / 'src/calculator.js').write_bytes(original.replace(b'a + b', b'a - b'))
            shutil.copyfile(REPO / 'src/calculator.js', run / 'faulted-source.js')
            phase('implementation', 'Deliberate subtraction candidate prepared for the failure trial.',
                  [evidence(f'artifacts/development/{task}/faulted-source.js')])
            attempt(1, 1)
            (REPO / 'src/calculator.js').write_bytes(original)
        phase('implementation', 'Existing addition expression matches the specified positive and negative sums.', [source])
        output, operation = attempt(2 if repair else 1, 0)
        phase('specification_verification', 'Both required assertions passed against the current packaged module.',
              [tests, output], criteria=[dict(criterion_id='sums', result='PASS', method='EXECUTION',
                                            reason='Actual assertions cover both required sums.', evidence=[output], operation=operation)])
        phase('final_review', 'Current source and retained execution evidence cover the accepted specification.', [source, spec])
        report, path = generate(REPO, HARNESS, task)
        if report['status'] != 'COMPLETE':
            raise ValueError(f'{task}: {report["status"]}; inspect {path}')
        print(f'{task}: COMPLETE')
    finally:
        if (REPO / 'src/calculator.js').read_bytes() != original:
            (REPO / 'src/calculator.js').write_bytes(original)
            result = execute(COMMANDS['build'])
            if result.returncode:
                print('Restored source; rebuilding dist failed: ' + result.stderr, file=sys.stderr)


def main():
    original = (REPO / 'src/calculator.js').read_bytes()
    if original.count(b'a + b') != 1:
        raise ValueError('Demo expects one original a + b expression.')
    install()
    sys.path.insert(0, str(HARNESS / 'framework/tools'))
    scenario('success')
    scenario('failure-repair', repair=True)
    from report import generate
    for task in ('success', 'failure-repair'):
        report, _ = generate(REPO, HARNESS, task)
        if report['status'] != 'COMPLETE':
            raise ValueError(f'{task}: final evidence became stale')
    if (REPO / 'src/calculator.js').read_bytes() != original:
        raise ValueError('Demo source was not restored')
    (HARNESS / 'docs/trial.md').write_text(
        '# Demo results\n\n'
        '| Scenario | Result | Review |\n|---|---|---|\n'
        '| Existing calculator | Build and tests passed | [Report](development/success/report.md) |\n'
        '| Failure and repair | Subtraction failed; restored addition passed | [Report](development/failure-repair/report.md) |\n\n'
        'Both reports derive from recorded phases and actual command evidence. Source is restored.\n\n'
        'Inspect the [failed test](../artifacts/development/failure-repair/testing-1.log) if needed. '
        'Machine records stay under `artifacts/`; daily review starts here and in `docs/`.\n\n'
        'This is a controlled scripted demonstration, not an independent LLM usability trial. '
        'Setup activation needs a separate reviewer; see [setup](setup.md).\n', encoding='utf-8')


if __name__ == '__main__':
    main()
