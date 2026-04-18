---
paths:
  - ".claude/agents/**/*.md"
---

# Agent Design Rules

## YAGNI
Only list tools the agent actually uses. No `Write` if it never writes files. No `Bash` if it only reads.

## KISS
One job per agent. If the description needs "and also", split or simplify.

## DRY
Before creating a new agent, check if an existing one covers it. The finalize trio (project-manager, docs-manager, git-manager) and code-reviewer are shared across pipelines — never duplicate them.

## Model tiering
- haiku: bookkeeping agents (scout, git-manager, docs-manager, project-manager)
- sonnet: reasoning agents (debugger, tester, code-reviewer, planner, plan-researcher, plan-reviewer)

## Verification
Every agent that produces output must include a way to verify it worked. Tests run and report pass/fail. Commits confirm staged files. Reviews state their verdict explicitly.

## Challenge
Does this agent need to exist? Can the main agent handle it inline? What's the blast radius if it fails mid-pipeline?
