---
description: Initialize or reconfigure .ck.json — coding level, compaction cadence, and simplify thresholds
---

# /ck:init — Configure Skills Settings

## Usage

```
/ck:init           # interactive setup
/ck:init --reset   # wipe .ck.json and start fresh
/ck:init --show    # print current config without changing anything
```

---

## How to execute this command

Read `$ARGUMENTS`.

### `--show`

Read `.ck.json` at the project root and print a formatted summary. If the file does not exist, say so and suggest running `/ck:init`.

---

### `--reset`

Delete `.ck.json` if it exists. Confirm: `Config reset. Run /ck:init to reconfigure.`

---

### Interactive (no flag or unrecognized flag)

**Step 1 — Load existing config**

Read `.ck.json` if it exists; use its values as defaults for each prompt below. If it does not exist, use the system defaults shown in brackets.

**Step 2 — Ask each question in order** (one at a time, wait for answer):

1. **Coding level** `[default: 3]`
   > Explanation depth: 0 = ELI5, 3 = Senior, 5 = God Mode (terse, code-first)
   > Enter 0–5:

2. **Compact day** `[default: 3]`
   > How many days between manual context compactions. Enter a number:

3. **Enable simplify threshold?** `[default: yes]`
   > Auto-trigger /simplify when edit volume gets large. (yes/no):

   If yes, ask sub-questions:

   3a. **Total LOC threshold** `[default: 400]`
       > Cumulative lines edited across session before triggering:

   3b. **File count threshold** `[default: 8]`
       > Number of distinct files edited before triggering:

   3c. **Single-file LOC threshold** `[default: 200]`
       > Lines edited in one file before triggering:

**Step 3 — Confirm**

Print a summary table of chosen values and ask:
> Write these to `.ck.json`? (yes/no)

**Step 4 — Write**

If confirmed, write `.ck.json` at the project root:

```json
{
  "codingLevel": <N>,
  "compactDay": <N>,
  "simplify": {
    "threshold": {
      "enabled": <true|false>,
      "totalLoc": <N>,
      "fileCount": <N>,
      "singleFileLoc": <N>
    }
  }
}
```

Confirm with: `Config saved to .ck.json.`

If not confirmed, say: `Aborted. No changes made.`
