---
paths:
  - ".claude/commands/**/*.md"
---

# Command Design Rules

## YAGNI
Commands orchestrate. They do not contain review checklists, fix logic, or business rules — that belongs in agents or skills.

## KISS
A command must be readable top-to-bottom in under a minute. If it isn't, extract to agents.

## DRY
If two commands share a multi-step process, that process belongs in a shared agent, not copy-pasted in both. If a new command is just a flag variation, make it a flag on an existing command.

## Verification
Every command must end with a verifiable outcome — a report, a file written, a test result, a commit hash. "Done" is not verifiable. Define what success looks like before the first step.

## Challenge
Does this command duplicate something an existing command already does? Could it be a `--flag` instead?
