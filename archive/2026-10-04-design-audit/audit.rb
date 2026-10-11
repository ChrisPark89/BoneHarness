# Read-only audit of the saved candidate, not an implementation of the harness.
# Guard cases below are explicit scenario traces; no natural-language guard is evaluated as code.
require 'yaml'
require 'json'

root = File.join(__dir__, 'candidate')
load_yaml = ->(relative) { YAML.safe_load(File.read(File.join(root, relative)), aliases: false) }
dev_path = 'templates/runtime/development/workflow.yaml'
maint_path = 'templates/runtime/maintenance/maintenance-workflow.yaml'
dev = load_yaml.call(dev_path)
maint = load_yaml.call(maint_path)
profile = load_yaml.call('templates/runtime/shared/repo-profile.yaml')
results = []
record = lambda do |id, kind, verdict, observation, evidence|
  results << {id: id, kind: kind, verdict: verdict, observation: observation, evidence: evidence}
end

yaml_files = Dir.glob(File.join(root, '**', '*.yaml')).sort
yaml_files.each { |p| YAML.safe_load(File.read(p), aliases: false) }
record.call('V-01', 'static', 'PASS', "All #{yaml_files.size} YAML files parse.", yaml_files.map { |p| p.delete_prefix(root + '/') })

[[dev_path, dev], [maint_path, maint]].each_with_index do |(path, workflow), index|
  states = workflow.fetch('states')
  edges = workflow.fetch('transitions').map { |t| [t['from'], t['to']] }
  %w[routes failure_routes].each do |section|
    workflow.fetch(section, {}).each_value { |r| edges << [r['from'], r['to']] }
  end
  workflow.fetch('resumption', {}).each { |from, r| edges << [from, r['to']] }
  unknown = edges.flatten.compact.reject { |state| states.include?(state) }.uniq
  ids = workflow.fetch('transitions').map { |t| t.fetch('id') }
  duplicates = ids.group_by(&:itself).select { |_, values| values.length > 1 }.keys
  okay = unknown.empty? && duplicates.empty? && states.uniq == states
  record.call("V-0#{index + 2}", 'static', okay ? 'PASS' : 'GAP',
              "Declared endpoints and IDs: unknown=#{unknown.inspect}, duplicate transition IDs=#{duplicates.inspect}.", [path])
end

core = %w[NEW BASELINED RESEARCHED PATTERN_VERIFIED SPEC_READY TEST_READY PLAN_READY IMPLEMENTED PREFLIGHT PREFLIGHT_PASSED BUILDING BUILD_PASSED TESTING TEST_PASSED SPEC_VERIFIED READY_FOR_REVIEW COMPLETE]
missing = core.each_cons(2).reject { |from, to| dev['transitions'].any? { |t| t['from'] == from && t['to'] == to } }
record.call('V-04', 'static', missing.empty? ? 'PASS' : 'GAP',
            'The preferred main path has declared edges. This does not establish guard executability or result validity.', [dev_path])

duplicates = dev.fetch('capability_bindings').keys & profile.fetch('capabilities').keys
record.call('V-05', 'static', duplicates.empty? ? 'PASS' : 'GAP',
            "Separate mutable binding declarations exist for: #{duplicates.join(', ')}. No canonical resolution rule is declared in these maps.",
            [dev_path, 'templates/runtime/shared/repo-profile.yaml'])

%w[build test].each_with_index do |capability, index|
  from = "#{capability.upcase}_FAILED"
  facts = {"repair_loops.#{capability}.enabled" => true, "not repair_loops.#{capability}.enabled" => false}
  requirements = {"failure_origin_#{capability}" => true, 'attempts_remaining' => false, 'new_evidence' => true,
                  'failure_record' => true, 'resolution_needed' => true}
  eligible = dev['transitions'].select { |t| t['from'] == from }.select do |t|
    # Fail rather than invent semantics if the snapshot changes outside this explicit scenario.
    raise "Unmodeled guard: #{t['when']}" unless facts.key?(t['when'])
    reqs = t.fetch('requires')
    raise 'Unmodeled requirement' unless reqs.all? { |key| requirements.key?(key) }
    facts.fetch(t['when']) && reqs.all? { |key| requirements.fetch(key) }
  end
  record.call("V-0#{index + 6}", 'scenario_trace', eligible.empty? ? 'GAP' : 'PASS',
              "#{from}, valid FAIL evidence, repair enabled, no attempts remaining: eligible declared transitions=#{eligible.map { |t| t['id'] }.inspect}. General tool-unavailability routes do not apply to this case.", [dev_path])
end

m04 = maint['transitions'].find { |t| t['id'] == 'M-04' }
unknown_route = maint.fetch('routes').fetch('unknown_or_malformed_adapter_result')
unknown_gap = m04.fetch('when').include?('adapter_result_status != UNKNOWN') && unknown_route.fetch('requires')['result_format'] == 'ABSENT_OR_MALFORMED'
record.call('V-08', 'scenario_trace', unknown_gap ? 'GAP' : 'REVIEW_REQUIRED',
            'A well-formed representative UNKNOWN result is excluded by M-04, while the explicit UNKNOWN route requires an absent/malformed result. Structural compatibility and reported outcome need separate verdicts.', [maint_path])

m08 = maint['transitions'].find { |t| t['id'] == 'M-08' }
human_resume = maint.fetch('resumption').fetch('HUMAN_REQUIRED')
approval_gap = m08.fetch('when').include?('no_permission_expansion') && human_resume['to'] == 'PLANNED'
record.call('V-09', 'scenario_trace', approval_gap ? 'GAP' : 'REVIEW_REQUIRED',
            'After recorded human approval for permission expansion, resumption returns to PLANNED. M-08 still requires no_permission_expansion; its guard has no approval alternative.', [maint_path])

checklist_path = 'installer/installation-checklist.md'
checklist = File.read(File.join(root, checklist_path))
structural_id = checklist.match(/\| (I-\d+) \| Structural checks/)[1]
range = checklist.match(/STRUCTURE_COMPLETE\*\* when I-(\d+) through I-(\d+) pass/)
raise 'Structure calculation text changed: review manually' unless range
included = (range[1].to_i..range[2].to_i).include?(structural_id.delete_prefix('I-').to_i)
record.call('V-10', 'static', included ? 'PASS' : 'GAP',
            "The structure-completion formula includes I-#{range[1]}..I-#{range[2]}, but the parse/link/transition criterion is #{structural_id}.", [checklist_path])

record.call('V-11', 'static', dev.key?('resumption') ? 'REVIEW_REQUIRED' : 'UNSPECIFIED',
            'No development resumption section declares how BLOCKED or HUMAN_REQUIRED resumes, reconciles an existing invocation, or revalidates evidence.', [dev_path])

output = {
  scope: 'Saved candidate after Task 3 plus interrupted Task 4 edits; review date 2026-10-04.',
  method: 'YAML parsing, declared-graph inspection, and explicit traces through named guards.',
  limits: ['No installed harness runner exists here.', 'No internal LLM, product build, or product test was executed.',
           'English verifier predicates are not executable semantics; this audit does not invent their implementations.',
           'PASS means only that the named static check passed; GAP identifies a documented inconsistency, not a measured production failure.'],
  counts: results.group_by { |r| r[:verdict] }.transform_values(&:length),
  checks: results
}
File.write(File.join(__dir__, 'audit-results.json'), JSON.pretty_generate(output) + "\n")
puts JSON.pretty_generate(output)
