# Root-Cause Contract

A good fix closes the cause, not just the symptom.

## Proof To Collect

| Proof | Question |
| --- | --- |
| Symptom | What exact failure did the user report? |
| Reproduction | How was the failure reproduced before the fix? |
| Root cause | What violated the expected contract? |
| Why now | What changed or drifted to expose it now? |
| Blast radius | Which callers, data shapes, jobs, or UI paths depend on this? |
| Fix | What changed at the root-cause location? |
| Guard | What will fail loudly if this regresses? |
| Verification | Which commands or runtime checks prove the fix? |

## Invalid Fix Signals

- try/catch that hides the error without restoring expected behavior
- default value that masks invalid data
- test expectation changed to match broken behavior
- no answer to "why now"
- no blast-radius check for callers
- no prevention guard unless explicitly justified

## Completion Check

Before finalizing, confirm the original symptom is gone, expected positive
behavior works, and the regression guard exists or the report explains why no
guard is feasible.
