Scout the codebase to locate specific code, files, or patterns: $ARGUMENTS

## Mode
Read-only. No edits. Fast, targeted search — not a full exploration.

## How to scout

1. **Start with a glob** — if you know a filename pattern or directory:
   - Models/Entities: look in `domain/`, `models/`, `entities/`, `src/models/`
   - Services: look in `application/services/`, `services/`, `src/services/`
   - Endpoints/Routes: look in `api/`, `routes/`, `controllers/`, `handlers/`
   - Validators: look in `validators/`, `schemas/`, `dtos/`
   - Repositories: look in `infrastructure/repositories/`, `repositories/`, `data/`

2. **Search by keyword** — if you're looking for a class name, function, or string:
   - Grep across `src/` for the class/function name
   - Follow imports to find related files

3. **Follow references** — if you find one piece, read it and trace to the next:
   - Entity/model → repository interface → implementation → service → endpoint

## Output

Report:
- **Found**: file path(s) and line number(s) where the target lives
- **Structure**: brief description of what the code does (1–2 sentences per file)
- **Related**: other files closely related to the target (e.g. the validator for a DTO, the test for a service)

Do not suggest changes. Just report what you found and where.
