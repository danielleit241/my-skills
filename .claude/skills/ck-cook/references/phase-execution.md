# Phase Execution

Run one phase at a time. The phase brief is the unit of context, evidence, and
review.

## Phase Brief

The phase brief is the implementer's compact requirements source. It should include:

- plan path and phase path
- Design Contract excerpt
- phase outcome and acceptance criteria
- Not Doing constraints
- likely touchpoints
- verification commands or evidence sources
- report path the implementer should write

Use `assets/phase-brief-template.md`.

## Implementer Dispatch

The dispatch prompt should contain only:

1. one line explaining where the phase fits
2. the phase brief path
3. context not available in the brief
4. report file path
5. expected status enum

Do not paste the full plan or accumulated session history.

## Review Package

For each reviewed phase, capture the diff from the recorded base to current
HEAD or working tree. If a formal diff file cannot be generated, give the task
reviewer enough context to inspect the change:

- changed files
- `git diff --stat`
- focused diff or file paths to read
- implementer report
- test evidence

## Retry Rules

- Fix critical/high task-reviewer findings before the next phase.
- Use a different repair approach each retry.
- After 3 failed review cycles, pause and report the remaining blocker.
- Minor findings go into the phase evidence file and final review context.

## Session Notes

Overwrite `## Session Notes` in `plan.md` after each phase:

```markdown
## Session Notes
**Last active:** {YYYY-MM-DD HH:MM}
**Phase in progress:** {phase path or none}
**Status:** {one-line state}
### Completed this session
- {phase} - {evidence path}
### Decisions made this session
- {decision or "(none)"}
### Next immediate action
{what ck-cook should do next}
```
