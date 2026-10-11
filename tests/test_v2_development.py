import json
from pathlib import Path
import re
import sys
import unittest
from copy import deepcopy
from v2_support import Task,TOOLS
from harness_io.journal import parse_history,canonical_json,make_entry,record_step,content_identity
from report import generate


class DevelopmentTests(unittest.TestCase):
    def setUp(self):self.task=Task();self.addCleanup(self.task.cleanup)
    def preparatory(self):
        for phase in ('initialization','research','pattern_review'):self.task.phase(phase)
    def implementation(self):
        self.preparatory();self.task.accept()
        for phase in ('verification_plan','implementation_plan','implementation'):self.task.phase(phase)
    def test_standard_route_completes(self):
        report=self.task.complete();self.assertEqual(report['status'],'COMPLETE')
        self.assertTrue(all(p['status']=='PASS' for p in report['phases']))
    def test_explicit_skips_complete_without_fabricating_success(self):
        report=self.task.complete(skipped=True);self.assertEqual(report['status'],'COMPLETE')
        self.assertEqual(sum(p['status']=='USER_SKIPPED' for p in report['phases']),10)
        self.assertFalse(self.task.capture()['operations'])
    def test_required_phases_cannot_skip(self):
        self.preparatory()
        with self.assertRaises(ValueError):self.task.skip('specification')
        self.task.accept()
        for p in ('verification_plan','implementation_plan','implementation','preflight','build','testing'):self.task.skip(p)
        with self.assertRaises(ValueError):self.task.skip('specification_verification')
    def test_pre_spec_skips_need_explicit_acceptance_reconciliation(self):
        for p in ('initialization','research','pattern_review'):self.task.skip(p)
        with self.assertRaisesRegex(ValueError,'reconcile'):self.task.accept(reconcile_skips=[])
        self.task.accept()
    def test_skip_does_not_waive_accepted_criterion(self):
        for p in ('initialization','research','pattern_review'):self.task.skip(p)
        self.task.accept()
        for p in ('verification_plan','implementation_plan','implementation','preflight','build','testing'):self.task.skip(p)
        with self.assertRaisesRegex(ValueError,'criterion'):self.task.phase('specification_verification')
    def test_fixtures_and_missing_approval_refused(self):
        approval=self.task.approval();approval['instruction']['provenance']='FIXTURE'
        with self.assertRaises(ValueError):self.task.phase('initialization','USER_SKIPPED',approval=approval)
        with self.assertRaises(ValueError):self.task.phase('initialization','USER_SKIPPED')
    def test_unknown_operation_blocks_skip_until_actual_reconciliation(self):
        self.implementation()
        self.task.write(dict(action='operation',operation_id='p1',phase='preflight',status='INTENT',connection='local:preflight',evidence=[]))
        self.task.write(dict(action='operation',operation_id='p1',status='UNKNOWN',evidence=[]))
        with self.assertRaisesRegex(ValueError,'Reconcile'):self.task.skip('preflight')
        with self.assertRaises(ValueError):self.task.write(dict(action='operation',operation_id='p1',status='CANCELLED',evidence=[]))
        self.task.write(dict(action='operation',operation_id='p1',status='CANCELLED',evidence=[self.task.ev('output.log','EXECUTION')]))
        self.task.skip('preflight')
    def test_closed_operation_cannot_replace_failure(self):
        self.implementation();self.task.execute('preflight',outcome='FAIL')
        with self.assertRaisesRegex(ValueError,'Closed'):self.task.write(dict(action='operation',operation_id='preflight-1',status='COMPLETED',outcome='PASS',evidence=[self.task.ev('output.log','EXECUTION')]))
    def test_operation_cannot_satisfy_another_phase(self):
        self.implementation();op=self.task.execute('preflight');self.task.phase('preflight',operation=op)
        with self.assertRaisesRegex(ValueError,'matching successful'):self.task.phase('build',operation=op)
    def test_wrong_adapter_cannot_dispatch(self):
        self.implementation()
        with self.assertRaisesRegex(ValueError,'adapter'):self.task.write(dict(action='operation',operation_id='wrong',phase='preflight',status='INTENT',connection='local:build',evidence=[]))
    def test_source_change_invalidates_prerequisites_and_completion(self):
        self.task.complete();(self.task.repo/'src/app.txt').write_text('changed')
        self.assertNotEqual(self.task.report()['status'],'COMPLETE')
        with self.assertRaisesRegex(ValueError,'stale'):self.task.write(dict(action='operation',operation_id='new-build',phase='build',status='INTENT',connection='local:build',evidence=[]))
    def test_stale_context_is_refused(self):
        context=self.task.capture()['context_id'];(self.task.repo/'src/new.txt').write_text('new')
        with self.assertRaisesRegex(ValueError,'STALE_CONTEXT'):record_step(self.task.repo,self.task.harness,'task',dict(action='source'),actor='reviewer',context_id=context)
    def test_spec_revision_reopens_work_without_reusing_old_success(self):
        self.task.complete()
        (self.task.docs/'spec.md').write_text('Revised accepted specification: same source, new explicit acceptance.\n')
        self.assertNotEqual(self.task.report()['status'],'COMPLETE')
        self.assertFalse(self.task.report()['open_operations'])
        self.task.accept()
        report=self.task.report()
        self.assertEqual(next(p['status'] for p in report['phases'] if p['id']=='build'),'NOT_STARTED')
        for phase in ('verification_plan','implementation_plan','implementation'):self.task.phase(phase)
        with self.assertRaisesRegex(ValueError,'matching successful'):self.task.phase('preflight',operation='preflight-1')
        for phase in ('preflight','build','testing'):self.task.phase(phase,operation=self.task.execute(phase,phase+'-2'))
        self.task.verify();self.task.phase('final_review')
        self.assertEqual(self.task.report()['status'],'COMPLETE')

    def test_timestamp_requires_valid_string(self):
        entry=self.task.capture()['entries'][0]
        for timestamp in (123,{},'2026-02-31T00:00:00Z'):
            row=make_entry(entry['payload'],'reviewer',timestamp=timestamp)
            with self.assertRaises(ValueError):parse_history(canonical_json(row)+b'\n','task')
    def test_report_retains_failure_links_and_original_bytes(self):
        self.task.phase('initialization','FAIL');self.task.skip('initialization')
        for p in ('research','pattern_review'):self.task.skip(p)
        self.task.accept()
        for p in ('verification_plan','implementation_plan','implementation','preflight','build','testing'):self.task.skip(p)
        self.task.verify();self.task.skip('final_review')
        history=self.task.harness/'artifacts/development/task/history.jsonl';before=history.read_bytes()
        report,path=generate(self.task.repo,self.task.harness,'task');text=path.read_text()
        self.assertEqual(report['status'],'COMPLETE');self.assertEqual(history.read_bytes(),before)
        self.assertIn('USER_SKIPPED | [approval](request.md)',text)
        self.assertIn('Prior failure/uncertainty records: 1',text)
        visible=re.sub(r'<!--.*?-->|\([^)]*\)','',text,flags=re.S)
        self.assertLessEqual(len(visible.split()),200)
    def test_unknown_phase_refused_without_append(self):
        before=(self.task.harness/'artifacts/development/task/history.jsonl').read_bytes()
        for status in ('PASS','FAIL','UNKNOWN'):
            with self.assertRaisesRegex(ValueError,'Unknown phase'):self.task.phase('bogus',status)
        self.assertEqual((self.task.harness/'artifacts/development/task/history.jsonl').read_bytes(),before)

    def test_format_one_explicitly_refused(self):
        with self.assertRaisesRegex(ValueError,'UNSUPPORTED_FORMAT'):parse_history(b'{"journal_version":"1.0.0"}\n','task')
    def test_terminal_reconciliation_can_arrive_after_specification_changes(self):
        self.implementation()
        self.task.write(dict(action='operation',operation_id='late',phase='preflight',status='INTENT',connection='local:preflight',evidence=[]))
        (self.task.docs/'spec.md').write_text('Changed specification requires fresh acceptance.\n')
        self.task.write(dict(action='operation',operation_id='late',status='COMPLETED',outcome='PASS',evidence=[self.task.ev('output.log','EXECUTION')]))
        self.assertFalse(self.task.report()['open_operations'])
        self.task.accept()
        self.assertEqual(next(p['status'] for p in self.task.report()['phases'] if p['id']=='preflight'),'NOT_STARTED')

    def test_configuration_is_pinned_per_task(self):
        import yaml
        before=self.task.capture()['task']['configuration']
        profile=self.task.harness/'framework/config/repo-profile.yaml'
        value=yaml.safe_load(profile.read_text());value['configuration_id']='cfg-next'
        profile.write_text(yaml.safe_dump(value,sort_keys=False))
        self.assertEqual(self.task.capture()['task']['configuration'],before)
        record_step(self.task.repo,self.task.harness,'next',dict(action='start',request=self.task.ev('request.md')),actor='reviewer')
        from reporting.evidence import capture_task
        after=capture_task(self.task.repo,self.task.harness,'next')['task']['configuration']
        self.assertEqual(after['id'],'cfg-next');self.assertNotEqual(after['bundle'],before['bundle'])

    def test_storage_symlinks_refused_before_external_directory_creation(self):
        for directory in ('development','configurations'):
            original=self.task.harness/'artifacts'/directory
            retained=original.with_name(directory+'-retained');original.rename(retained)
            escaped=self.task.repo/('escaped-'+directory);escaped.mkdir()
            original.symlink_to(escaped,target_is_directory=True)
            try:
                with self.assertRaises(ValueError):
                    record_step(self.task.repo,self.task.harness,'fresh-'+directory,dict(action='start',request=self.task.ev('request.md')),actor='reviewer')
                self.assertEqual(list(escaped.iterdir()),[])
            finally:original.unlink();retained.rename(original)

    def test_initial_source_is_captured(self):
        self.assertEqual(self.task.capture()['entries'][1]['payload']['record_type'],'SourceInventory')
    def test_all_optional_specification_refused(self):
        self.preparatory()
        with self.assertRaisesRegex(ValueError,'required'):self.task.accept(criteria=[dict(id='optional',description='Optional.',required=False,methods=['REVIEW'])])
    def test_unsupported_intent_cannot_be_laundered_by_terminal_record(self):
        self.implementation();capture=self.task.capture();spec=capture['specification']['entry_id']
        payload=dict(schema_version='2.0.0',record_type='Operation',operation_id='bad',phase='preflight',status='INTENT',source=capture['current_source'],specification=spec,connection='local:build',evidence=[])
        self.task.append(payload)
        evidence=self.task.ev('output.log','EXECUTION');evidence['identity']=content_identity(self.task.log.read_bytes())
        payload=deepcopy(payload);payload.update(status='COMPLETED',outcome='PASS',evidence=[evidence])
        self.task.append(payload)
        report=self.task.report();self.assertTrue(any('origin' in i['message'] for i in report['issues']))
        self.assertNotEqual(report['status'],'COMPLETE')


if __name__=='__main__':unittest.main()
