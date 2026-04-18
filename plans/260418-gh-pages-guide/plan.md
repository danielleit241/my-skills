# Plan: Claude Pipeline Guide — GitHub Pages Static Site
Status: ✅ Complete
Date: 2026-04-18
Mode: Hard

## Overview
Build and deploy a Claude-themed static HTML/CSS documentation site that explains the `/plan` → `/cook` → `/fix` pipeline from the my-skills repo. The site deploys automatically to GitHub Pages on every push to `main` that touches `docs/**`.

## Phases
- [x] Phase 1: Site Structure — HTML skeleton with sidebar layout, 4 content sections, `.nojekyll`, and nav wiring
- [x] Phase 2: CSS Styling — Claude dark theme, sidebar, typography, code blocks, and pipeline flow diagrams
- [x] Phase 3: Content Authoring — Full written guide content for Overview, Plan, Cook, and Fix sections
- [x] Phase 4: CI/CD Deployment — GitHub Actions workflow and GitHub Pages configuration instructions

## Research Summary
Vanilla HTML/CSS chosen over MkDocs or Nextra to eliminate build toolchain dependencies. Aligns with KISS/YAGNI: single `index.html` + `style.css` is fully auditable with no framework lock-in and no Node.js or Python required.

Deployment uses the official GitHub Actions Pages flow with `permissions` scoped to the deploy job only:
`actions/checkout@v4` → `actions/configure-pages@v5` → `actions/upload-pages-artifact@v4` (path: `./docs`) → `actions/deploy-pages@v4`.
The `gh-pages` branch is managed entirely by Actions and never pushed manually. Trigger is push to `main` with path filter `docs/**`.

Claude brand palette: `--bg-base: #0a0a0a`, `--accent-primary: #c15f3c`, `--text-primary: #f0ece6`. Sidebar 240px fixed; content capped at 760px with 1.7 line-height.

All asset references use relative paths (e.g. `./style.css`) to work correctly under the `/my-skills/` sub-path on GitHub Pages.

## Dependencies
- GitHub repository: `https://github.com/danielleit241/my-skills`
- GitHub Pages must be enabled in repo Settings → Pages → Source: **GitHub Actions** (not a branch)
- No Node.js, Python, or build tools required

## Risks
- HIGH: GitHub Pages source not set to "GitHub Actions" → `deploy-pages` fails silently; mitigation: Phase 4 step 3 has explicit UI instructions
- HIGH: All asset paths must be relative or use `<base href="/my-skills/">` — absolute `/style.css` will 404 under sub-path
- HIGH: Missing `docs/.nojekyll` → Jekyll strips `_`-prefixed assets; mitigation: Phase 1 creates it as first deliverable
- MEDIUM: CDN resources (Google Fonts) loaded without SRI; mitigation: fonts-only CDN, no scripts — risk is acceptable for a public guide site, but noted
- MEDIUM: `permissions` should be job-scoped, not workflow-scoped, to follow least-privilege; Phase 4 workflow scopes them to the deploy job
- LOW: `docs/` must remain hand-authored only — no generated output mixed in; enforced by no build step in workflow
- LOW: No custom `docs/404.html` — GitHub's default 404 serves as fallback; can be added in a follow-up commit
