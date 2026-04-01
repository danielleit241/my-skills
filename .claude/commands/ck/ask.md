Answer the following technical or architectural question: $ARGUMENTS

## Mode
- **Read-only.** No file edits unless the user explicitly asks for a change.
- Search only what's needed to answer well — don't explore the whole codebase.

## How to answer

1. If answerable from repo knowledge (models, services, patterns) — read the relevant 1–3 files and answer directly.
2. If it's a best-practice / "what's the right way" question — check the `skills/backend-development/references/` files for guidance first.
3. If it's a quick factual question — answer directly without deep exploration.

Keep the answer focused:
- Lead with the answer, not the reasoning
- Use bullet lists for comparisons or options
- Cite a specific file and line only when it adds value (e.g. "see `OrderService.ts:42`")
- If the answer depends on context you don't have, say so clearly

## What not to do
- Don't suggest code changes unless asked
- Don't explore files that aren't relevant to the question
- Don't add caveats about things that aren't in question
