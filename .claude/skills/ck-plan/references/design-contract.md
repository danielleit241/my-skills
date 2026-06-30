# Design Contract

The Design Contract replaces the standalone specification step. For non-trivial
work, it lives inside `plan.md` and gives later plan/cook/fix/ship decisions a
shared source of truth.

## Core Fields

| Field | Purpose | Quality Bar |
| --- | --- | --- |
| Objective | What will exist after implementation | One concrete outcome, not a vague theme |
| User / operator value | Who benefits and why now | Names the pain or operational gain |
| Success metrics | How success is recognized | Testable or observable |
| Acceptance criteria | Expected behavior | Each item can be verified |
| Not Doing | Explicit scope boundary | Prevents opportunistic expansion |
| Constraints | Hard technical/product limits | Includes commands, versions, public contracts, security rules |
| Assumptions | Bets made without proof | Mark Must / Should / Might |
| Open questions | Unknowns needing resolution | Material unknowns are resolved or recorded as assumptions |
| Verification strategy | Build/test/review/runtime checks | Commands or evidence source named |
| Support checks | Specialist risk checks | Names triggered support skills and evidence expectations |
| Ship criteria | Conditions before merge/release | Maps to `ck-ship` readiness checks |

## Assumption Tiers

- **Must be true**: plan fails if wrong; validate before implementation.
- **Should be true**: changes approach if wrong; validate before or during early phases.
- **Might be true**: secondary bet; track as risk.

## Material Unknowns

Avoid detailed phase design while an unresolved question materially affects:

- data model or migration
- public API or CLI contract
- authentication, authorization, privacy, or user data
- release/rollback feasibility
- acceptance criteria

If the user wants to continue anyway, keep the question visible as an assumption
or accepted risk.

## Contract Quality Check

Before handoff to planner, confirm:

- Acceptance criteria map to success metrics.
- Not Doing excludes at least one tempting expansion.
- Verification strategy includes fresh evidence, not reasoning.
- Support checks are named for security, source, observability, migration, docs, or testing risk.
- Ship criteria can be checked by `ck-ship`.
