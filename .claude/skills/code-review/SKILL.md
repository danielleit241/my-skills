---
name: code-review
description: >
  Use when reviewing a PR, commit, pending diff, or codebase area; when receiving
  review feedback; before claiming work is done, fixed, passing, or complete;
  before committing, merging, or shipping; and from cook/fix pipelines after
  implementation. This is the only code review skill. The /ck:code-review command
  loads this skill for standalone review modes.
---

# Code Review

Use one review discipline everywhere: receive feedback rigorously, request adversarial review, and make completion claims only with fresh evidence.

There is no separate ck-prefixed review skill. `/ck:code-review` is only a command alias that loads this skill.

## Support Skill Triggers

Load a support skill as a review lens when the diff contains the trigger:

| Trigger | Load |
| --- | --- |
| weak or missing test evidence | `testing-strategy` |
| auth, user input, secrets, PII, webhook, external integration | `security-hardening` |
| framework/library/API behavior depends on version or current docs | `source-grounding` |
| production behavior lacks logs, metrics, traces, or alerting | `observability` |
| schema/data/API migration, deprecation, backward compatibility | `migration-safety` |
| public docs, setup, API docs, or ADR should change | `documentation-adrs` |

## References

| Practice | Load When | File |
| --- | --- | --- |
| Receiving feedback | Reviewer comments are unclear, risky, or conflict with local context | `references/code-review-reception.md` |
| Requesting review | Cook/fix finished a phase, before merge, or standalone review is requested | `references/requesting-code-review.md` |
| Verification gates | Before any done/fixed/passing/complete claim | `references/verification-before-completion.md` |

## Standalone Review Protocol

Use this protocol when invoked by `/ck:code-review`.

| Mode | Resolve Diff With |
| --- | --- |
| `#123` | `gh pr diff 123` after confirming `gh` exists and is authenticated |
| `<commit-hash>` | `git show <hash>` |
| `--pending` | `git diff HEAD` plus staged/unstaged awareness |
| `codebase parallel` | scoped module audits with separate review lenses |

If the mode's tool is unavailable, stop and report the missing dependency. Do not silently fall back to another mode.

### Step 1 - Resolve Diff And Scope

1. Resolve the diff for the selected mode.
2. Record changed files, line counts, and risky file categories.
3. Find the governing plan/spec/intent. If none exists, review against the stated intent and flag "no governing artifact".

### Step 2 - Scout Review Context

Run `ck-scout --review` over the diff. The scout report must identify:

- changed files and adjacent contracts
- governing plan/spec/intent, if found
- data/auth/migration/concurrency/boundary risks
- edge-case probes for adversarial review

### Step 3 - Spec Compliance Gate

Handle this inline before delegating:

- Does each meaningful change map to a plan/spec/intent item?
- Is anything outside declared scope?
- Does any change violate acceptance criteria or public contract?

Any critical spec violation forces final verdict `BLOCK`, even if the code quality pass is clean.

### Step 4 - Code Quality And Adversarial Review

Spawn `code-reviewer` with minimal context:

- diff or review package path
- spec compliance findings
- `ck-scout --review` report
- explicit acceptance criteria or stated intent

For broad diffs, split by clear ownership and deduplicate findings after reviewers return.

Run the adversarial pass unless the strict exemption applies: `<=2 files`, `<=30 changed lines`, and no security-sensitive code. Record the exemption with measured file/line counts.

### Step 5 - Derived Verdict

Use the evidence table mechanically:

| Evidence | Verdict |
| --- | --- |
| Critical spec violation, CRITICAL finding, or critical adversarial break | `BLOCK` |
| HIGH finding or non-critical broken edge case with no user-data risk | `REQUEST CHANGES` |
| No spec violation, no CRITICAL/HIGH, adversarial probes held or exempted | `APPROVE` |

Map `code-reviewer` output into the public verdict:

- `APPROVED` -> `APPROVE`
- `WARNING` -> `REQUEST CHANGES`
- `BLOCK` -> `BLOCK`

Output findings first, grouped by severity, then the verdict line.

## Receiving Feedback Protocol

Load `references/code-review-reception.md` when feedback arrives.

Use this sequence:

```text
READ -> UNDERSTAND -> VERIFY -> EVALUATE -> RESPOND -> IMPLEMENT
```

Rules:

- No performative agreement.
- Verify technical claims before editing.
- Ask for clarification on all unclear items before implementation.
- Push back with evidence when feedback is wrong or conflicts with accepted constraints.

## Verification Gate

Load `references/verification-before-completion.md` before any completion claim.

Use this function:

```text
IDENTIFY command -> RUN full command -> READ output -> VERIFY claim -> THEN state claim with evidence
```

Red flags: "should", "probably", "seems to", "looks good", "I think", or any completion claim based only on reasoning.

## Fix-Review Cycle

When review blocks and the user asks to fix:

1. Fix the highest-severity actionable findings first.
2. Re-run focused verification for the changed area.
3. Re-run review on the updated diff.
4. Stop after 3 failed cycles and report the remaining blocker.

Use a different repair approach each cycle. Repeating the same fix with different wording is not a new approach.
