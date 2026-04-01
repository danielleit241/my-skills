Fix: $ARGUMENTS

---

## Core Principles

**Order > Content** — Scout before Diagnose. Understand before hypothesizing. Establish a baseline before fixing.

**Conditional is a trap** — If a skill prevents repeated errors, it's mandatory, not optional.

**Verification needs teeth** — Always compare before/after, run regression tests, and apply defense-in-depth.

**Prevention is not optional** — Every fix must include a mechanism to prevent the same error from recurring.

---

## Mandatory Skills

Always activate these — do not skip based on perceived simplicity:

- **`/ck:scout`** — runs first, before any analysis
- **`/ck:debug` + `/sequential-thinking`** — used together during diagnosis
- **`/problem-solving`** — auto-activate when 2 or more hypotheses have failed

---

## Pipeline

### 1. Mode Selection

Identify the working mode before doing anything else:

- **Fast fix** — single wrong line/value/condition, scope is clear, low risk
- **Bug / regression** — behavior broke, root cause unclear
- **CI failure** — build error, test failure, workflow config, or flaky test
- **Log-driven** — error surfaced via logs or monitoring
- **Test fix** — test(s) failing; determine whether the test or implementation is wrong
- **Refactor / improvement** — no breakage, but code quality or structure needs work

---

### 2. Scout _(mandatory — always runs first)_

Use `/ck:scout` to understand the system before forming any hypothesis:

- Trace the relevant call path: endpoint → handler → service → repository → DB
- Identify context, dependencies, and main execution flow
- For CI failures: `gh run view <run-id> --log-failed`
- For log-driven issues: read the producing service _before_ reading the log
- For test failures: read the full test and the implementation under test

Do not form hypotheses yet. Most bugs only become obvious after you've seen the whole picture.

---

### 3. Diagnose _(mandatory — `/ck:debug` + `/sequential-thinking`)_

Structured analysis using both skills together:

- State each assumption explicitly, test it against the code, revise
- Identify the exact root cause: specific file, line, incorrect assumption, or broken invariant
- Explain _why_ it isn't obvious (hidden coupling, async timing, ORM tracking, auth logic, etc.)
- For CI failures: classify — build error / test failure / workflow config / flaky
- For test failures: is the test wrong, or is the implementation wrong? Never delete or weaken a test to make it pass

**If 2+ hypotheses fail** → activate `/problem-solving` before continuing.

---

### 4. Complexity Assessment

Before writing any code:

- Single targeted change → proceed
- Spans multiple files or layers → list every file that needs to change; identify side effects (migration? contract change? permission mapping? seed data?)
- Unexpectedly complex → restate the full plan before implementing

Break into ordered subtasks if needed. Confirm the sequence is safe before starting.

---

### 5. Fix Implementation

- Stay scoped to the root cause — don't fix unrelated issues in the same change
- Fix in the correct layer (domain logic ≠ persistence ≠ transport)
- For CI config: follow existing workflow patterns — never use `--no-verify` or bypass hooks
- For log-driven: minimal fix — don't refactor surrounding code unless it is the root cause
- For test fixes: fix the implementation if it's broken; update the test only if behavior intentionally changed

Code must be clean, correct, and not break anything outside its scope.

---

### 6. Verify + Prevent _(mandatory)_

**Before/after comparison** — confirm the behavior changed exactly as intended, nothing more.

**Regression test:**

```bash
<run-tests-for-affected-class>   # targeted
<run-full-test-suite>            # if fix touches shared code
```

**Defense-in-depth** — does this fix prevent the _class_ of error from recurring, or just this instance? If just this instance, add a guard, validator, or invariant to close the gap. This is not optional.

Every fix ends with a green test run. If a test fails, investigate — don't skip it.

---

### 7. Finalize

- Remove debug artifacts and exploratory code
- Add a comment only if the fix encodes a non-obvious business rule or invariant
- Confirm: clean, tested, scoped, no regressions, ready for merge/deploy
