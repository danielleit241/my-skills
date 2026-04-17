---
description: Generate a concise FE handoff doc for changed endpoints — branch, APIs, request/response contracts, search params, error codes
argument-hint:
  [blank = git changes | feature/<name> | path/to/endpoints.cs | "keyword"]
---

Generate a frontend handoff document.

**Input:** `$ARGUMENTS`

## Mode Selection

Parse `$ARGUMENTS`:

| Input                                                    | Mode        | Scope                                                                           |
| -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| blank                                                    | **git**     | staged + unstaged changes (`git diff HEAD`)                                     |
| starts with `feature/` or `feat/`                        | **feature** | all endpoint files matching that feature name under `src/ResearchHub.Api/Apis/` |
| ends with `.cs`                                          | **file**    | that specific endpoint file                                                     |
| any other text (e.g. `assignable-lead`, `course member`) | **keyword** | search `src/ResearchHub.Api/Apis/` for files matching the keyword               |

## Steps

### 1. Resolve scope

**git mode:** run `git diff --name-only HEAD` + `git diff --cached --name-only`. Filter to `.cs` files changed under `src/ResearchHub.Api/Apis/`.

**feature mode:** glob `src/ResearchHub.Api/Apis/**/*{keyword}*.cs` where keyword is the part after `feature/` or `feat/`.

**file mode:** use the given path directly.

**keyword mode:** glob `src/ResearchHub.Api/Apis/**/*.cs`, then grep content for the keyword to find relevant endpoint files.

If no endpoint files found in any mode, stop and report: "No changed endpoint files found. Pass a feature name, file path, or keyword."

### 2. Determine commit type and title

From the resolved scope and (if git mode) recent commits `git log --oneline -5`, determine:

- **commit type**: `feat`, `refactor`, or `fix`
- **short title in kebab-case** (e.g. `assignable-lead`, `course-member-bulk`)
- **date**: today's date in `YYYY-MM-DD`

File will be saved as: `docs/fe/{YYYY-MM-DD}-{type}-{short-title}.md`

### 3. Identify changed endpoints

Read the resolved endpoint files to list every endpoint added or modified:

- HTTP method + path
- Auth requirement (roles)
- Brief purpose (1 line)

### 4. Collect contracts

For each changed endpoint, read the relevant Dto, Validator, and Service files to extract:

**Request:**

- Route params
- Query params (search, pagination)
- Body fields (name, type, required/optional, constraints from validator)

**Response:**

- `data` type and fields
- Pagination metadata if paged

### 4. Collect error codes

Scan changed Service files and `AppMessages.cs` for new/changed `AppMessage` entries used in this feature. Build a table:

| HTTP | code | message (Vietnamese) |
| ---- | ---- | -------------------- |

### 5. Write the document

Save to `docs/fe/{date}-{type}-{title}.md` using this template:

---

````markdown
# FE Handoff: {Human-readable title}

> Branch: `{current git branch}`  
> Date: {YYYY-MM-DD}

## 1) Endpoint map

List all affected endpoints grouped by resource. Use relative base paths.

- `METHOD /path` — one-line description
- ...

## 2) Contracts

### {endpoint title}

`METHOD /full/path`

**Auth:** {roles or "any authenticated user"}

**Query params:** (if applicable)
| Param | Type | Default | Note |
|---|---|---|---|

**Body:** (if applicable)

```json
{ "field": "example" }
```
````

Validator rules:

- ...

**Response `data`:**

- `field` — type, description

### ... (repeat per endpoint)

## 3) Error codes

| HTTP | code | message |
| ---- | ---- | ------- |

Notes:

- Validation errors: `code = validation_error`, details in `metadata.errors[{ field, message, code }]`
- (any feature-specific notes)

## 4) FE notes

Short bullet list of gotchas, suggested call order, or UX considerations.

```

---

Keep the document concise — no filler text, no repeating information already obvious from the contract. Use Vietnamese for field descriptions and error messages (matching backend).
```
