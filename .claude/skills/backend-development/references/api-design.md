# API Design Reference — REST / HTTP

Universal REST API conventions, auth patterns, validation flow, and response contract. Adapt code examples to your stack.

---

## Endpoint Structure

One module per resource. Keep handlers thin: validate → delegate to service → return result.

```
Module structure (adapt naming to your language):

XxxEndpoints / XxxRouter / XxxController
  ├── registerRoutes()       — route declarations + metadata (auth, rate limit, docs)
  └── private handlers       — each: validate input → call service → return response
```

**Handler rule:** No business logic in handlers. They only wire HTTP in/out to the service layer.

---

## REST Route Summary

| Operation    | Method | Pattern                                    |
| ------------ | ------ | ------------------------------------------ |
| List (paged) | GET    | `/api/v1/{resources}`                      |
| Get one      | GET    | `/api/v1/{resources}/{id}`                 |
| Create       | POST   | `/api/v1/{resources}`                      |
| Update       | PUT    | `/api/v1/{resources}/{id}`                 |
| Partial update | PATCH | `/api/v1/{resources}/{id}`               |
| Delete       | DELETE | `/api/v1/{resources}/{id}`                 |
| Sub-action   | POST   | `/api/v1/{resources}/{id}/{action}`        |

---

## URL Depth (max 3 levels after base)

Keep nested routes when depth ≤ 3. When depth > 3, flatten under a separate top-level resource.

| Wrong (too deep)                                     | Correct (flattened)                                   |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `POST /courses/{courseId}/lessons/{lessonId}/comments` | `POST /lesson-comments?lessonId={id}`              |
| `DELETE /users/{id}/roles/{roleId}/permissions/{pid}` | `DELETE /user-permissions/{pid}`                    |

Resolve parent IDs in the service layer; enforce authorization there.

---

## Authorization

- Apply auth checks on every non-public route
- **Route-level:** check that the caller has the required role
- **Resource-level:** check ownership inside the service (e.g., "does this user own this resource?")
- Use constants for roles — never inline strings like `"admin"`

```
// Generic pattern:
router.POST("/resources", handler)
  .requireAuth()
  .requireRole(Roles.EDITOR)

// Service ownership check:
if (resource.ownerId !== currentUser.id) return forbidden()
```

---

## Validation Flow

Two separate layers — do not mix them:

```
1. Structural validation (handler level)
   → required fields, format (email, UUID), length, type
   → on failure: 400 { code: "VALIDATION_ERROR", errors: [{ field, message }] }

2. Business validation (service level)
   → uniqueness, FK existence, state transitions, ownership
   → on failure: appropriate status code + error code constant
```

Never put business logic in validators. Never put structural validation in services.

---

## Pagination

All list endpoints must paginate. Never return unbounded collections.

```
// Request (query params):
GET /api/v1/resources?page=1&pageSize=20&search=foo&status=active

// Response metadata:
{
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 145,
    "totalPages": 8,
    "hasNext": true
  }
}
```

Clamp `pageSize` to a max (e.g. 100). Default to a sensible value (e.g. 20).

For filter/search params, define a dedicated request object that includes pagination fields — do not mix positional parameters with filters.

---

## Response Contract

Every endpoint returns a consistent envelope shape:

```json
{
  "isSuccess": true,
  "statusCode": 200,
  "code": null,
  "message": "Resource created successfully.",
  "data": { ... },
  "meta": null
}
```

On failure:

```json
{
  "isSuccess": false,
  "statusCode": 404,
  "code": "RESOURCE_NOT_FOUND",
  "message": "The requested resource was not found.",
  "data": null,
  "meta": null
}
```

On validation failure, add `meta.errors`:

```json
{
  "isSuccess": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed.",
  "data": null,
  "meta": {
    "errors": [{ "field": "email", "message": "Email is required.", "code": "EMAIL_REQUIRED" }]
  }
}
```

**Rules:**
- Always use constants for `code` — never inline strings
- Always provide a human-readable `message`
- Never expose stack traces or internal IDs in error responses

---

## HTTP Status Codes

| Situation                          | Code |
| ---------------------------------- | ---- |
| Success                            | 200  |
| Created                            | 201  |
| No content (delete, etc.)          | 204  |
| Validation / business rule         | 400  |
| Unauthenticated                    | 401  |
| Forbidden (wrong role / ownership) | 403  |
| Not found                          | 404  |
| Conflict (duplicate)               | 409  |
| Unhandled exception                | 500  |

---

## Rules Summary

- Handlers are thin: validate → service → return
- URL depth: max 3 levels after base path; if deeper, flatten
- Auth on every non-public route
- Resource ownership checked in service, not in handler
- Always paginate list endpoints
- Use constants for roles, error codes, status values
- Provide explicit `message` on every response
