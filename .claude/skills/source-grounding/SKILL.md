---
name: source-grounding
description: >
  Grounds implementation and research decisions in authoritative sources. Use
  when framework, library, API, CLI, cloud, model, protocol, or product behavior
  could be version-sensitive, recently changed, unfamiliar, or likely to be
  misremembered.
---

# Source Grounding

Use sources when correctness depends on current or version-specific behavior.
Local code is the primary source for this repo; official docs are the primary
source for external APIs and frameworks.

## Process

1. Detect the version and surface:
   - package lock, config, imports, CLI output, SDK version
   - runtime, framework, database, provider, or protocol
2. Choose source tier:
   - repo source and tests for local behavior
   - official docs or API reference for external behavior
   - release notes or migration guides for version changes
   - source code/types when docs are incomplete
3. Record a source note:
   - claim
   - source path or URL
   - version/date if available
   - confidence
   - what remains unverified
4. Apply the finding narrowly:
   - update the plan, phase brief, implementation, or review package
   - do not paste long docs into artifacts
   - mark any unsourced assumption explicitly

## Source Note

```markdown
## Source Grounding

Claim: {behavior or API decision}
Source: {repo path, official docs URL, type definition, release note}
Version: {detected version or unknown}
Confidence: {high | medium | low}
Unverified: {none or remaining uncertainty}
```

## Red Flags

- Using remembered API syntax for a library version not checked locally.
- Treating blog posts or examples as authoritative over official docs.
- Ignoring local wrappers or project conventions.
- Updating code from docs without checking installed version.
- "Probably works" appears in a plan, review, or completion claim.

## Verification

- [ ] Version or local source was checked when relevant.
- [ ] External claims use official or primary sources.
- [ ] Unverified assumptions are labeled.
- [ ] The final artifact cites the source note briefly.
