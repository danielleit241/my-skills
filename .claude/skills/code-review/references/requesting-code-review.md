---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements - dispatches code-reviewer subagent to review implementation against plan or requirements before proceeding
---

# Requesting Code Review

Dispatch code-reviewer subagent to catch issues before they cascade.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)   # or origin/main for branch comparison
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code-reviewer subagent via Agent tool:**

Provide:
- `WHAT_WAS_IMPLEMENTED` — What you just built
- `PLAN_OR_REQUIREMENTS` — What it should do (link to plan or summarize)
- `BASE_SHA` — Starting commit
- `HEAD_SHA` — Ending commit
- `DESCRIPTION` — Brief summary

**3. Act on feedback:**
- Fix **Critical** issues immediately
- Fix **Important** issues before proceeding
- Note **Minor** issues for later
- Push back if reviewer is wrong (with reasoning)

## Example

```
[Just completed Task 2: Add user authentication service]

BASE_SHA=$(git log --oneline | grep "Task 1" | head -1 | awk '{print $1}')
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch code-reviewer subagent]
  WHAT_WAS_IMPLEMENTED: JWT auth service with login, refresh, and logout
  PLAN_OR_REQUIREMENTS: Task 2 from docs/plans/auth-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661
  DESCRIPTION: Added AuthService with token issuance, refresh token rotation, and revocation

[Subagent returns]:
  Strengths: Clean separation, refresh token stored hashed
  Issues:
    Critical: Refresh token not invalidated on logout
    Minor: Magic number 7 (days) for token expiry — use constant
  Assessment: Fix critical before proceeding

[Fix: invalidate refresh token on logout]
[Continue to Task 3]
```

## Integration with Workflows

**Subagent-Driven Development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after each logical batch of changes
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer is wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification
