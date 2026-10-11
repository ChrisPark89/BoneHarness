"""Format 2 setup and profile checks; temporary repositories only."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

import yaml

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / 'builder-kit'
spec = importlib.util.spec_from_file_location('v2_installer', KIT / 'installer/install.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        (self.repo / 'AGENTS.md').write_text('Keep my instructions.\n')
        installer.install(self.repo)
        self.harness = self.repo / '.harness'
        self.profile_path = self.harness / 'framework/config/repo-profile.yaml'

    def profile(self):
        return yaml.safe_load(self.profile_path.read_text())

    def save_profile(self, value):
        self.profile_path.write_text(yaml.safe_dump(value, sort_keys=False))

    def check(self, *args):
        result = subprocess.run([sys.executable, '-B', str(self.harness / 'framework/tools/check.py'),
                                 '--repo-root', str(self.repo), '--format', 'json', *args],
                                text=True, capture_output=True)
        self.assertIn(result.returncode, (0, 1), result.stderr + result.stdout)
        return result.returncode, json.loads(result.stdout)

    def test_fresh_install_is_compact_and_has_no_readiness_claim(self):
        profile = self.profile()
        self.assertEqual('2.0.0', profile['schema_version'])
        self.assertEqual({'schema_version', 'repository', 'configuration_id', 'adapters'}, set(profile))
        self.assertLessEqual(len(self.profile_path.read_text().split()), 200)
        self.assertEqual(6, len(profile['adapters']))
        self.assertTrue(all(row['status'] == 'NOT_CONNECTED' for row in profile['adapters'].values()))
        code, report = self.check()
        self.assertEqual(0, code, report)
        self.assertEqual('PASS', report['structure'])
        self.assertEqual('PENDING', report['activation'])
        self.assertEqual('Keep my instructions.\n', (self.repo / 'AGENTS.md').read_text())

    def test_existing_harness_is_never_overwritten(self):
        before = self.profile_path.read_bytes()
        with self.assertRaises(ValueError):
            installer.install(self.repo)
        self.assertEqual(before, self.profile_path.read_bytes())

    def test_checker_is_read_only(self):
        before = {p.relative_to(self.repo): p.read_bytes() for p in self.repo.rglob('*') if p.is_file()}
        self.check()
        after = {p.relative_to(self.repo): p.read_bytes() for p in self.repo.rglob('*') if p.is_file()}
        self.assertEqual(before, after)

    def test_format_one_profile_is_rejected(self):
        profile = self.profile(); profile['schema_version'] = '1.0.0'
        self.save_profile(profile)
        code, report = self.check()
        self.assertEqual(1, code)
        self.assertIn('FORMAT_UNSUPPORTED', [d['code'] for d in report['diagnostics']])

    def test_compatible_requires_connection_and_evidence(self):
        profile = self.profile(); profile['adapters']['test']['status'] = 'COMPATIBLE'
        self.save_profile(profile)
        self.assertEqual(1, self.check()[0])

    def connect_assessed(self, method='REVIEW', maintenance=False):
        path = self.harness / ('artifacts/maintenance/adapter/update.yaml' if maintenance
                               else 'artifacts/installation/installation-record.yaml')
        path.parent.mkdir(parents=True, exist_ok=True)
        if maintenance:
            value = dict(schema_version='2.0.0', record_type='Update', id='adapter',
                         request='Review adapter interface', base_configuration='old',
                         candidate_configuration='cfg-1', status='PUBLISHED', changes=[], checks=[])
        else:
            value = yaml.safe_load(path.read_text())
        check = dict(name='test-interface', adapter='test', connection='do-not-execute-this',
                     method=method, observations='Inspected invocation and interpretable output; fixture review.',
                     result='PASS', reason='Interface fits; no tool-quality claim.')
        if method == 'EXECUTION':
            check['execution'] = dict(command='do-not-execute-this', exit_code=1, output='Fixture failure output')
        value['checks'] = [check]
        path.write_text(yaml.safe_dump(value, sort_keys=False))
        profile = self.profile()
        profile['adapters']['test'] = dict(connection='do-not-execute-this', status='COMPATIBLE',
            reason='Interface reviewed.', evidence=[path.relative_to(self.harness).as_posix()])
        self.save_profile(profile)
        return path, value

    def test_compatible_evidence_is_checked_without_executing_adapter(self):
        self.connect_assessed()
        code, report = self.check()
        self.assertEqual(0, code, report)
        self.assertEqual('COMPATIBLE', report['adapters']['test']['status'])
        self.assertEqual('PENDING', report['activation'])

    def test_compatible_profile_cannot_cite_itself(self):
        profile = self.profile()
        profile['adapters']['test'] = dict(connection='test', status='COMPATIBLE', reason='Claim',
                                         evidence=['framework/config/repo-profile.yaml'])
        self.save_profile(profile)
        code, report = self.check()
        self.assertEqual(1, code, report)
        self.assertIn('ADAPTER_ASSESSMENT', [d['code'] for d in report['diagnostics']])

    def test_plain_note_is_not_a_structured_assessment(self):
        path, _ = self.connect_assessed()
        path.write_text('A check supposedly happened.')
        self.assertEqual(1, self.check()[0])

    def test_assessment_must_match_adapter_and_connection(self):
        for field, wrong in [('adapter', 'build'), ('connection', 'different-command')]:
            with self.subTest(field=field):
                path, value = self.connect_assessed()
                value['checks'][0][field] = wrong
                path.write_text(yaml.safe_dump(value))
                self.assertEqual(1, self.check()[0])

    def test_assessment_needs_observations_and_passing_conclusion(self):
        for field, wrong in [('observations', '  '), ('result', 'FAIL')]:
            with self.subTest(field=field):
                path, value = self.connect_assessed()
                value['checks'][0][field] = wrong
                path.write_text(yaml.safe_dump(value))
                self.assertEqual(1, self.check()[0])

    def test_execution_requires_command_exit_and_output(self):
        for field in ('command', 'exit_code', 'output'):
            with self.subTest(field=field):
                path, value = self.connect_assessed('EXECUTION')
                del value['checks'][0]['execution'][field]
                path.write_text(yaml.safe_dump(value))
                self.assertEqual(1, self.check()[0])

    def test_failed_command_can_have_compatible_interface(self):
        self.connect_assessed('EXECUTION')
        self.assertEqual(0, self.check()[0])

    def test_silent_command_output_is_recorded_explicitly(self):
        path, value = self.connect_assessed('EXECUTION')
        value['checks'][0]['execution']['output'] = ''
        path.write_text(yaml.safe_dump(value))
        self.assertEqual(0, self.check()[0])

    def test_review_cannot_include_execution_fields(self):
        path, value = self.connect_assessed()
        value['checks'][0]['execution'] = dict(command='test', exit_code=0, output='')
        path.write_text(yaml.safe_dump(value))
        self.assertEqual(1, self.check()[0])

    def test_published_maintenance_assessment_is_supported(self):
        self.connect_assessed(maintenance=True)
        self.assertEqual(0, self.check()[0])

    def test_assessment_does_not_cite_itself_or_profile_as_support(self):
        for target in ('framework/config/repo-profile.yaml', 'artifacts/installation/installation-record.yaml'):
            with self.subTest(target=target):
                path, value = self.connect_assessed()
                value['checks'][0]['evidence'] = [target]
                path.write_text(yaml.safe_dump(value))
                self.assertEqual(1, self.check()[0])

    def test_empty_or_duplicate_assessments_are_rejected(self):
        for mode in ('empty', 'duplicate'):
            with self.subTest(mode=mode):
                path, value = self.connect_assessed()
                value['checks'] = [] if mode == 'empty' else value['checks'] * 2
                path.write_text(yaml.safe_dump(value))
                self.assertEqual(1, self.check()[0])

    def test_unchecked_maintenance_cannot_support_compatible(self):
        path, value = self.connect_assessed(maintenance=True)
        value['status'] = 'STAGED'
        path.write_text(yaml.safe_dump(value))
        self.assertEqual(1, self.check()[0])

    def test_unassessed_connection_does_not_need_assessment(self):
        profile = self.profile()
        profile['adapters']['test'] = dict(connection='test', status='NOT_ASSESSED', reason='Review pending.')
        self.save_profile(profile)
        self.assertEqual(0, self.check()[0])

    def test_captured_user_installation_fails_evidence_checks(self):
        archive = ROOT / 'archive/verification/2026-10-11-installation-user-test.zip'
        with zipfile.ZipFile(archive) as saved:
            for name in ('framework/config/repo-profile.yaml', 'artifacts/installation/installation-record.yaml'):
                (self.harness / name).write_bytes(saved.read('demo/.harness/' + name))
        code, report = self.check()
        self.assertEqual(1, code, report)
        self.assertIn('ADAPTER_ASSESSMENT', [d['code'] for d in report['diagnostics']])

    def test_evidence_cannot_escape_harness(self):
        profile = self.profile()
        profile['adapters']['test'] = dict(connection='test', status='COMPATIBLE', reason='Claim', evidence=['../AGENTS.md'])
        self.save_profile(profile)
        self.assertEqual(1, self.check()[0])

    def test_evidence_symlink_cannot_escape_harness(self):
        (self.harness / 'external').symlink_to(self.repo / 'AGENTS.md')
        profile = self.profile()
        profile['adapters']['test'] = dict(connection='test', status='COMPATIBLE', reason='Claim', evidence=['external'])
        self.save_profile(profile)
        self.assertEqual(1, self.check()[0])

    def test_missing_runtime_file_fails_structure(self):
        (self.harness / 'framework/workflows/development/HARNESS.md').unlink()
        code, report = self.check()
        self.assertEqual(1, code)
        self.assertEqual('FAIL', report['structure'])

    def test_duplicate_profile_keys_are_rejected(self):
        with self.profile_path.open('a') as stream:
            stream.write('repository: duplicate\n')
        self.assertEqual(1, self.check()[0])

    def test_legacy_profile_fields_are_not_silently_accepted(self):
        profile = self.profile(); profile['assessments'] = []
        self.save_profile(profile)
        self.assertEqual(1, self.check()[0])

    def save_update(self, changes, status='STAGED', evidence=None):
        path = self.harness / 'artifacts/maintenance/change/update.yaml'
        path.parent.mkdir(parents=True, exist_ok=True)
        value = dict(schema_version='2.0.0', record_type='Update', id='change', request='Update test adapter',
                     base_configuration='cfg-1', candidate_configuration='cfg-2', status=status,
                     changes=changes, checks=[])
        if evidence:
            value['evidence'] = [evidence]
            value['checks'] = [dict(name='changed-files', result='PASS', reason='Reviewed change', evidence=[evidence])]
        path.write_text(yaml.safe_dump(value, sort_keys=False))
        return path.relative_to(self.harness).as_posix()

    def test_runtime_modules_remain_required_after_configuration_change(self):
        profile = self.profile(); profile['configuration_id'] = 'cfg-2'; self.save_profile(profile)
        (self.harness / 'framework/tools/context_reader.py').unlink()
        self.assertEqual(1, self.check()[0])

    def test_staged_addition_does_not_require_future_file(self):
        update = self.save_update([dict(path='framework/adapters/new.md', after='sha256:' + 'a' * 64)])
        self.assertEqual(0, self.check('--update', update)[0])

    def test_malformed_update_path_is_a_diagnostic(self):
        update = self.save_update([dict(path='framework/bad\x00file', after='sha256:' + 'a' * 64)])
        code, report = self.check('--update', update)
        self.assertEqual(1, code)
        self.assertIn('UPDATE_PATH', [d['code'] for d in report['diagnostics']])

    def test_staged_update_checks_base_bytes(self):
        update = self.save_update([dict(path='framework/config/repo-profile.yaml', before='sha256:' + 'a' * 64,
                                       after='sha256:' + 'b' * 64)])
        code, report = self.check('--update', update)
        self.assertEqual(1, code)
        self.assertIn('UPDATE_BYTES', [d['code'] for d in report['diagnostics']])

    def test_publication_checks_actual_after_bytes(self):
        before = 'sha256:' + hashlib.sha256(self.profile_path.read_bytes()).hexdigest()
        profile = self.profile(); profile['configuration_id'] = 'cfg-2'; self.save_profile(profile)
        after = 'sha256:' + hashlib.sha256(self.profile_path.read_bytes()).hexdigest()
        proof = self.harness / 'artifacts/maintenance/proof.txt'; proof.write_text('Retained review and publication receipt')
        changes = [dict(path='framework/config/repo-profile.yaml', before=before, after=after)]
        update = self.save_update(changes, 'PUBLISHED', 'artifacts/maintenance/proof.txt')
        self.assertEqual(0, self.check('--update', update)[0])
        self.profile_path.write_text(self.profile_path.read_text() + '# concurrent change\n')
        code, report = self.check('--update', update)
        self.assertEqual(1, code)
        self.assertIn('UPDATE_BYTES', [d['code'] for d in report['diagnostics']])

    def test_update_cannot_mutate_pinned_task_configuration(self):
        update = self.save_update([dict(path='artifacts/configurations/cfg-1/profile.yaml', after='sha256:' + 'a' * 64)])
        code, report = self.check('--update', update)
        self.assertEqual(1, code)
        self.assertIn('UPDATE_SCOPE', [d['code'] for d in report['diagnostics']])

    def test_activation_requires_observation_evidence(self):
        path = self.harness / 'artifacts/installation/installation-record.yaml'
        record = yaml.safe_load(path.read_text()); record['activation'] = 'CONFIRMED'
        path.write_text(yaml.safe_dump(record))
        self.assertEqual(1, self.check()[0])

    def test_mandatory_phases_cannot_be_relabeled_optional(self):
        path = self.harness / 'framework/workflows/development/workflow.yaml'
        workflow = yaml.safe_load(path.read_text())
        for phase in workflow['phases']:
            phase.pop('mandatory', None)
        path.write_text(yaml.safe_dump(workflow))
        code, report = self.check()
        self.assertEqual(1, code)
        self.assertIn('WORKFLOW_PHASES', [d['code'] for d in report['diagnostics']])

    def context(self, *args):
        return subprocess.run([sys.executable, '-B', str(self.harness / 'framework/tools/context.py'),
                               '--repo-root', str(self.repo), '--format', 'json', *args],
                              text=True, capture_output=True)

    def test_setup_context_is_concise_read_only_and_format_two(self):
        before = {p:p.read_bytes() for p in self.repo.rglob('*') if p.is_file()}
        result = self.context('--situation', 'setup')
        self.assertEqual(0, result.returncode, result.stderr + result.stdout)
        context = json.loads(result.stdout)
        self.assertEqual('2.0.0', context['context_version'])
        self.assertIn('configuration_id', context['excerpt'])
        self.assertEqual(context['pages'], 1)
        self.assertLessEqual(len(context['excerpt']), 8000)
        self.assertEqual(before, {p:p.read_bytes() for p in self.repo.rglob('*') if p.is_file()})

    def test_long_context_has_explicit_bounded_continuation(self):
        profile = self.profile(); profile['adapters']['test']['reason'] = 'A long discovered reason. ' * 1000
        self.save_profile(profile)
        first = json.loads(self.context('--situation', 'setup').stdout)
        self.assertGreater(first['pages'], 1)
        pieces = [first['excerpt']]
        for number in range(2, first['pages'] + 1):
            result = self.context('--situation', 'setup', '--page', str(number), '--context-id', first['context_id'])
            self.assertEqual(0, result.returncode, result.stderr + result.stdout)
            page = json.loads(result.stdout)
            self.assertLessEqual(len(page['excerpt']), 8000)
            pieces.append(page['excerpt'])
        parsed = json.loads(''.join(pieces))
        self.assertEqual(profile['adapters']['test']['reason'], parsed['adapters']['test']['reason'])
        profile['adapters']['test']['reason'] = 'Changed'; self.save_profile(profile)
        stale = self.context('--situation', 'setup', '--page', '2', '--context-id', first['context_id'])
        self.assertEqual(2, stale.returncode)
        self.assertIn('STALE_CONTEXT', stale.stdout)

    def test_started_task_context_selects_initialization(self):
        request = self.harness / 'artifacts/installation/request.txt'; request.write_text('Inspect this temporary protocol fixture.')
        step = self.repo / 'start.yaml'
        step.write_text(yaml.safe_dump(dict(action='start', request=dict(
            reference=dict(kind='LOCAL', scope='HARNESS', path='artifacts/installation/request.txt'),
            provenance='REVIEW', summary='Original test request'), source_scope=dict(roots=['AGENTS.md'], exclude=[]))))
        started = subprocess.run([sys.executable, '-B', str(self.harness / 'framework/tools/journal.py'),
                                  '--repo-root', str(self.repo), '--task-id', 'example', '--actor', 'test-reviewer',
                                  '--step', str(step)], text=True, capture_output=True)
        self.assertEqual(0, started.returncode, started.stderr + started.stdout)
        result = self.context('--task-id', 'example')
        self.assertEqual(0, result.returncode, result.stderr + result.stdout)
        page = json.loads(result.stdout)
        self.assertEqual('IN_PROGRESS', page['status'])
        self.assertIn('initialization', page['excerpt'])
        self.assertRegex(page['context_id'], r'^sha256:[0-9a-f]{64}$')

    def test_context_rejects_old_profile(self):
        profile = self.profile(); profile['schema_version'] = '1.0.0'; self.save_profile(profile)
        result = self.context('--situation', 'setup')
        self.assertEqual(2, result.returncode, result.stderr)
        self.assertEqual('CONTEXT_UNAVAILABLE', json.loads(result.stdout)['code'])

    def test_context_missing_task_is_controlled(self):
        result = self.context('--task-id', 'missing')
        self.assertEqual(2, result.returncode, result.stderr)
        self.assertEqual('CONTEXT_UNAVAILABLE', json.loads(result.stdout)['code'])

    def test_context_entry_selection_requires_task(self):
        result = self.context('--record', 'e000001')
        self.assertEqual(2, result.returncode, result.stderr)
        self.assertEqual('CONTEXT_UNAVAILABLE', json.loads(result.stdout)['code'])

    def test_human_entry_pages_are_short(self):
        for name in ('README.md', 'docs/setup.md', 'framework/templates/setup.md',
                     'framework/workflows/setup.md', 'framework/adapters/adapter-interface.md',
                     'framework/workflows/maintenance/harness-maintenance.md',
                     'framework/workflows/development/HARNESS.md', 'framework/workflows/recovery.md',
                     'framework/workflows/verification-rules.md', 'framework/workflows/context.md'):
            self.assertLessEqual(len((self.harness / name).read_text().split()), 200, name)


if __name__ == '__main__':
    unittest.main()
