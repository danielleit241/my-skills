---
paths:
  - ".claude/skills/**/*.md"
---

# Skill Design Rules

## YAGNI
Skills are behavioral guidance, not documentation. Only include guidance that changes Claude's behavior without it. If removing a section wouldn't affect output, remove it.

## KISS
Under 500 lines. Under 300 is better. If approaching the limit, the skill is doing too much — extract to `references/` or split into sub-skills.

## DRY
The description frontmatter is the trigger. The body is the behavior. Don't restate the trigger in the body. Don't duplicate guidance already in CLAUDE.md or rules/.

## Verification
If the skill produces output (documents, plans, reviews), define what "correct output" looks like. Include a concrete example or success criteria.

## Challenge
Is this a new skill or a patch for a broken existing one? Fix the root cause. Does this skill overlap with an existing skill's domain?
