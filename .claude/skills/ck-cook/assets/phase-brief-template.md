# Phase Brief: Phase {N} - {Name}

Plan: `{plan_path}`
Phase: `{phase_path}`
Report Path: `{report_path}`

## Where This Fits

{One line describing the phase's role in the plan}

## Design Contract Excerpt

Objective:
{objective}

Acceptance Criteria:
- {criterion}

Not Doing:
- {scope boundary}

Constraints:
- {constraint}

## Phase Outcome

{Observable outcome}

## Work

- {plain-language requirement}

## Verification

- Build:
- Test:
- Runtime/manual:

## Support Checks

- {support skill}: {check/evidence or "N/A"}

## Likely Touchpoints

- `{path}` - {purpose or reason it may be touched}

## Report Contract

Write the implementer report to `{report_path}` and return only:

```text
Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
Report: {report_path}
Changed files: {short list}
Tests: {short result or "not run"}
Concerns: {none or short list}
```
