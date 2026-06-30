---
name: testing-strategy
description: >
  Defines test strategy and proof requirements for behavior changes. Use when
  planning tests, using --tdd, writing regression guards for bugs, choosing
  unit/integration/e2e coverage, handling flaky tests, or deciding what evidence
  proves a change works.
---

# Testing Strategy

Tests are evidence, not decoration. Use this skill to choose the smallest test
set that proves the behavior and catches regressions at the right boundary.

## Process

1. Identify the behavior under test:
   - acceptance criteria or bug symptom
   - public contract or caller affected
   - edge cases and error paths
   - blast radius from changed files
2. Choose the test level:
   - Unit: pure logic, validation, formatting, small branching behavior.
   - Integration: database, API boundary, service composition, auth, migrations.
   - E2E/browser: user-visible workflow, routing, forms, cross-layer behavior.
   - Regression: bug fix that should fail before the fix and pass after.
3. For `--tdd`, collect red-green evidence:
   - write the failing test from the contract
   - confirm it fails for the right reason
   - implement until it passes
   - run adjacent and full suite checks
4. For bug fixes, install one prevention guard:
   - regression test preferred
   - assertion/invariant when a test is impractical
   - type/lint constraint when it prevents the bug class
5. Record evidence in the calling workflow artifact:
   - command
   - result
   - failures
   - skipped checks and why

## Selection Rules

| Change | Minimum Test Evidence |
| --- | --- |
| Pure function or mapper | Unit test with boundary cases |
| API endpoint or service boundary | Integration test for success, auth/error path |
| UI workflow | Component or browser test for primary path |
| Data migration | Forward, rollback, and data preservation checks |
| Bug fix | Repro/regression guard plus blast-radius check |
| Refactor | Existing suite plus focused behavior check |

## Red Flags

- Test only proves implementation details, not user-visible behavior.
- New test would pass before the change.
- Only happy path is tested for auth, payments, data, or external input.
- Failing test is flaky but treated as a real regression.
- "No tests needed" is accepted without written risk.

## Verification

- [ ] Test level matches risk and blast radius.
- [ ] Evidence includes exact commands and results.
- [ ] Bug fixes include a prevention guard or written infeasibility reason.
- [ ] `--tdd` work includes red-green evidence.
- [ ] Skipped tests are explicit risk, not silence.
