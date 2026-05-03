# /ck:cook Benchmark Report

**Model:** `claude-sonnet-4-6`  
**Date:** 2026-05-03  
**Changes tested:** Rigor scoring (Step 0.5), pipeline tier selection, phase gates, sub-agent routing

## Token & Timing Summary

| Eval          | Task                       | Tier     | Score | Tokens     | Duration   | Tool uses |
| ------------- | -------------------------- | -------- | ----- | ---------- | ---------- | --------- |
| 0 — nano-tier | Add docstring to `add()`   | Nano     | 0     | 15,974     | 38.3s      | 5         |
| 1 — fast-flag | `--fast` add `subtract()`  | Fast     | N/A   | 15,121     | 33.8s      | 3         |
| 2 — standard  | `divide()` + README update | Standard | 3     | 17,099     | 57.1s      | 4         |
| **Mean**      |                            |          |       | **16,065** | **43.1s**  | **4**     |
| **Total**     |                            |          |       | **48,194** | **129.2s** | **12**    |

## Assertion Results

| Eval        | Assertion                                  | Pass             |
| ----------- | ------------------------------------------ | ---------------- |
| Nano        | Rigor comment block `// [Step 0.5` present | ✅               |
| Nano        | Tier = Nano, score = 0                     | ✅               |
| Nano        | Tester skipped                             | ✅               |
| Nano        | git-manager ran (mandatory)                | ✅               |
| Nano        | Docstring added to code                    | ✅               |
| Fast        | `--fast` flag detected, tier override      | ✅               |
| Fast        | Tester skipped                             | ✅               |
| Fast        | code-reviewer skipped                      | ✅               |
| Fast        | `subtract()` implemented                   | ✅               |
| Standard    | Score ≥ 3 (files=2 → +1, public API → +2)  | ✅               |
| Standard    | Tier = Standard                            | ✅               |
| Standard    | Tester invoked (10/10 tests passed)        | ✅               |
| Standard    | `ZeroDivisionError` handling in `divide()` | ✅               |
| Standard    | README.md updated                          | ✅               |
| **Overall** |                                            | **14/14 (100%)** |

## Notes

- Token cost scales with tier: Fast (15,121) < Nano (15,974) < Standard (17,099) — Standard costs ~13% more than Fast
- `--fast` flag bypasses rigor scoring matrix entirely and locks Fast tier (correct behavior)
- Nano tier correctly ran **only** git-manager in Step 5 — no project-manager/docs-manager leakage
- Standard tier (eval 2): agent judged README.md + calculator.py as NOT cross-module (same feature domain) → score 3, not 5 — conservative and correct per spec
- Step 0.5 rigor comment block format was consistent across all 3 traces
