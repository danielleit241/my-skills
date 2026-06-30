---
name: security-hardening
description: >
  Reviews and hardens security-sensitive changes. Use when work touches
  authentication, authorization, user input, secrets, PII, payments, webhooks,
  file upload/download, SSRF-prone URL fetching, external integrations, or any
  public boundary that can receive untrusted data.
---

# Security Hardening

Security checks are most useful at design, implementation, review, and ship
time. Use this skill when a change crosses a trust boundary or handles
sensitive data, and scale the depth to the risk.

## Process

1. Map trust boundaries:
   - caller identity
   - data source
   - sensitive fields
   - external service or filesystem access
   - privilege needed for each operation
2. Check access control:
   - authentication required or explicitly anonymous
   - authorization scoped to tenant/user/resource
   - admin paths separated from normal user paths
   - webhooks verify signatures and replay windows
3. Validate and constrain input:
   - schema validation at the boundary
   - size limits, timeouts, allowlists
   - parameterized SQL and safe shell/template usage
   - URL fetching blocks private IPs unless explicitly allowed
4. Protect data and secrets:
   - no secrets in source, logs, artifacts, or examples
   - no PII/token logging
   - API responses expose only intended fields
   - errors do not leak stack traces or internals
5. Add adversarial tests or probes:
   - unauthorized user
   - wrong tenant/resource
   - malformed input
   - duplicate/replayed request
   - oversized payload or timeout

## STRIDE Pass

For auth, payments, webhooks, external APIs, or multi-tenant data, run a short
STRIDE pass:

| Threat | Ask |
| --- | --- |
| Spoofing | Can a user/service impersonate another? |
| Tampering | Can request/data be altered without detection? |
| Repudiation | Is there an audit trail for sensitive action? |
| Information disclosure | Can private data leak via response/log/error? |
| Denial of service | Are limits, timeouts, and retries bounded? |
| Elevation of privilege | Can normal users reach privileged behavior? |

## Red Flags

- Auth is implied by route grouping instead of verified in the changed path.
- Validation exists only on the client.
- Logs include tokens, raw payloads, stack traces, or PII.
- Tests cover success but not unauthorized/wrong-tenant/error paths.
- Security risk is deferred to ship without owner or mitigation.

## Verification

- [ ] Trust boundaries and sensitive data are named.
- [ ] Access control and validation are enforced server-side.
- [ ] Secrets and sensitive data are protected.
- [ ] At least one adversarial check matches the risk.
- [ ] Residual risk is documented for ship review.
