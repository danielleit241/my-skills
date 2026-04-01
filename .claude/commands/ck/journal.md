Write a development log entry for today's work.

## What to include

Read recent git history and summarize what was done:

```bash
git log --oneline --since="24 hours ago"
git diff HEAD~5..HEAD --stat
```

Structure the entry as:

---
**Date**: YYYY-MM-DD

**What was done**
- Brief bullets: what features were added, bugs fixed, refactors done
- Reference PRs or commits if notable (e.g. `feat: add order checkout endpoint`)

**Decisions made**
- Any architectural or design choices made today and the reasoning behind them
- Only include if something non-obvious was decided

**Blockers / open questions**
- Anything that's blocking progress
- Questions that need answers before continuing

**Next steps**
- What to pick up next session
---

## Where to save

Append to `docs/journal.md` (create if absent). Each entry separated by `---`.

Keep entries concise — this is a dev log, not a report. Bullet points preferred over prose.
