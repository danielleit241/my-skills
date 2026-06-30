---
name: migration-safety
description: >
  Plans and verifies safe migrations, deprecations, and compatibility changes.
  Use when changing databases, schemas, APIs, data contracts, feature flags,
  background jobs, external contracts, or removing/replacing old behavior.
---

# Migration Safety

Migrations fail when old and new worlds cannot coexist. Design changes so they
can be deployed, rolled back, and observed without data loss.

## Process

1. Classify the change:
   - additive schema or field
   - backfill or data transform
   - contract/API change
   - deletion/deprecation
   - behavior switch or feature flag
2. Prefer expand-contract:
   - expand: add new nullable/backward-compatible path
   - dual-read/write or adapt callers
   - backfill safely and idempotently
   - contract: remove old path only after verification
3. Define compatibility:
   - old app with new data
   - new app with old data
   - mixed versions during rollout
   - retries and repeated jobs
4. Define rollback:
   - code rollback path
   - data rollback or explicit irreversibility
   - feature flag kill switch
   - owner and verification command
5. Test the migration:
   - forward migration
   - rollback or documented no-rollback caveat
   - data preservation
   - legacy records and empty/default values

## Red Flags

- Destructive migration and app deploy are coupled in one step.
- Existing clients break immediately on contract change.
- Backfill is not idempotent.
- Rollback path assumes data can be magically restored.
- Phase plan deletes old behavior before proving new behavior.

## Verification

- [ ] Deploy order is explicit.
- [ ] Backward/forward compatibility is addressed.
- [ ] Data preservation is tested or risk is documented.
- [ ] Rollback or irreversibility caveat is written.
- [ ] Deprecation/removal has owner and timing.
