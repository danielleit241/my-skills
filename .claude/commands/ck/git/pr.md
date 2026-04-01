Create a pull request for the current branch. Arguments: $ARGUMENTS (optional: target branch, defaults to main)

1. Run `git log main..HEAD --oneline` to see all commits in this branch
2. Run `git diff main...HEAD` to understand all changes
3. Push the branch to origin if not already pushed
4. Create a PR with:
   - **Title**: concise, imperative, under 70 chars (e.g., `feat: add order checkout endpoint`)
   - **Body** sections:
     - `## What` — what changed (bullet list of key changes)
     - `## Why` — the business/technical reason for the change
     - `## How to test` — steps to verify the change works manually or via tests

Use `gh pr create` with the above content. Return the PR URL when done.
