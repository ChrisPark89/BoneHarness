"""Small, stdlib-only checker report; reported adapter status is not verified quality."""
import json


def new_report():
    return dict(schema_version='2.0.0', configuration_id=None, structure='FAIL', activation='PENDING',
                adapters={}, checks=[], diagnostics=[], limitations=[
                    'Read-only structure and local-reference checks; no adapter is executed.',
                    'Compatibility meaning, current permissions, activation and task completion need actual review.',
                    'Adapter status and activation are recorded claims; this checker does not authenticate them.'
                ], exit_code=0)


def emit(report, output_format):
    if output_format == 'json':
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return
    print('Configuration:', report['configuration_id'] or 'UNAVAILABLE')
    print('Structure:', report['structure'], '| Recorded activation:', report['activation'])
    for capability, adapter in report['adapters'].items():
        print(capability + ':', adapter['connection'] or 'not connected', '|', adapter['status'], '|', adapter['reason'])
    for diagnostic in report['diagnostics']:
        print(diagnostic['code'], diagnostic['path'], diagnostic['message'])
    for limitation in report['limitations']:
        print('Scope:', limitation)
