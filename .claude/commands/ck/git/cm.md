Stage all changed files and create a git commit with a well-formed commit message.

1. Run `git status` to see what changed
2. Run `git diff` to understand the actual changes
3. Run `git log --oneline -5` to match existing commit message style
4. Stage relevant files (avoid secrets, generated files, build artifacts)
5. Write a commit message that:
   - Starts with a type prefix: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `perf:`
   - Summarizes *what changed and why* in one line (under 72 chars)
   - Adds a body paragraph if the change is non-obvious or affects multiple areas

**Do not commit:**
- `.env`, `*.env.*`, or any file containing secrets or credentials
- Build artifacts (`bin/`, `dist/`, `__pycache__/`, `*.pyc`, `node_modules/`)
- Generated files that are not meant to be tracked (check `.gitignore`)
- Large binary files unless explicitly tracked by the project
