# Fix Report: {Bug}

Date: {YYYY-MM-DD HH:MM}
Mode: {fast | auto | hard}

## Symptom

{Exact user-visible or test-visible failure}

## Reproduction

- Command / steps:
- Pre-fix result:

## Root Cause

{Confirmed cause, not symptom}

## Why Now

{Recent change, drift, data condition, or "unknown after checking"}

## Blast Radius

- `{path or contract}` - {impact}

## Fix Applied

- `{path}` - {change}

## Attempt History

| Attempt | Result | Evidence | Next Approach |
| --- | --- | --- | --- |
| 1 | {passed/failed} | {verification or review output} | {if failed} |

## Problem-Solving Handoff

Triggered: {yes/no}
Reason: {two failed repairs | two rejected hypothesis cycles | N/A}
New approach: {different framing or N/A}

## Prevention Guard

Guard: {regression test | assertion | type/lint constraint | not feasible}
Evidence:

## Verification Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Repro | {PASS/FAIL} | {output/path} |
| Positive path | {PASS/FAIL} | {output/path} |
| Blast radius | {PASS/FAIL} | {output/path} |

## Review

Verdict: {APPROVED | WARNING | BLOCK}
Findings:

## Residual Risk

- {risk or "None"}
