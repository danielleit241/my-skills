# Evidence Contract

Durable evidence helps cook resume after compaction and helps reviewers verify
without trusting conversation memory. Scale the artifact depth to the phase
risk.

## Implementer Status

When using an implementer subagent, ask for one status:

| Status | Meaning | Controller Action |
| --- | --- | --- |
| `DONE` | Phase implemented and report written | Continue to tests/review |
| `DONE_WITH_CONCERNS` | Work completed but concerns remain | Read concerns, resolve blockers, then review |
| `NEEDS_CONTEXT` | Missing information prevents safe work | Provide context or ask user; re-dispatch |
| `BLOCKED` | Cannot complete with current plan/tools | Split phase, revise plan, or ask user |

Do not ignore `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.

## Phase Evidence

Use `assets/phase-evidence-template.md`.

Recommended fields:

- phase path
- brief path
- implementer status
- changed files
- verification commands and results
- support check results when any support skill was triggered
- task-reviewer verdict
- unresolved concerns
- plan updates
- next action

## Completion Check

A phase is ready to mark complete when:

- implementer report exists
- verification evidence exists
- triggered support checks have evidence or documented skip reason
- task-reviewer returns approved or only accepted minor findings
- plan checkbox and Session Notes are updated

Conversation summaries do not count as evidence.
