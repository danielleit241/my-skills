---
name: observability
description: >
  Designs and verifies production visibility. Use when adding or shipping
  production behavior, diagnosing production issues, changing critical paths,
  adding background jobs, external integrations, migrations, or any feature that
  needs logs, metrics, traces, alerts, or runbook evidence.
---

# Observability

Production behavior should be diagnosable without guessing. Add enough signal
to answer what happened, who was affected, and whether the system is healthy.

## Process

1. Identify the critical path:
   - user action or job
   - dependency calls
   - failure modes
   - owner/on-call question to answer
2. Add structured logs:
   - event name
   - correlation/request id
   - stable entity ids, not PII
   - outcome and error category
3. Add metrics where useful:
   - rate: requests/jobs/events
   - errors: failed operations by category
   - duration: latency or processing time
   - saturation: queues, pools, resource limits
4. Add traces/spans for cross-service or slow paths.
5. Define alert/runbook only for actionable symptoms:
   - symptom
   - threshold
   - owner
   - first diagnostic query or dashboard
6. Verify signal:
   - run path locally/test environment if possible
   - inspect emitted log/metric/trace name
   - document manual verification when runtime evidence is unavailable

## Red Flags

- Logs contain sensitive data or raw tokens.
- Only logs success; failures have no category.
- Alert fires on implementation detail instead of user-facing symptom.
- New critical path ships with no way to know if it is failing.
- Observability is added after incidents instead of during build.

## Verification

- [ ] Critical path and failure modes are named.
- [ ] Logs/metrics/traces avoid PII and secrets.
- [ ] At least one signal proves success/failure for critical behavior.
- [ ] Alerts/runbooks are actionable or explicitly not needed.
- [ ] Ship artifact records observability evidence or gap.
