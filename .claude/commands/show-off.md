---
description: Generate impressive multi-section HTML presentations with parallax, theme toggle, bilingual VI/EN — then auto-capture as 16:9, 9:16, 1:1 social-ready images
argument-hint: [--html-only|--capture-only] [--dark|--light] [--lang=en|vi] [--viewport=16x9|9x16|1x1] <topic>
---

Create a show-off HTML presentation and auto-capture sections as social-ready images.

**Input:** `$ARGUMENTS`

## Flags

| Flag              | Effect                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| `--html-only`     | Generate HTML only, skip capture                                       |
| `--capture-only`  | Re-capture existing HTML, skip HTML generation                         |
| `--dark`          | Force dark theme for captures (default)                                |
| `--light`         | Force light theme for captures                                         |
| `--lang=vi`       | Set Vietnamese language for captures                                   |
| `--lang=en`       | Set English language for captures (default)                            |
| `--viewport=16x9` | Capture only 16:9 (repeatable — combine with other `--viewport` flags) |
| `--viewport=9x16` | Capture only 9:16                                                      |
| `--viewport=1x1`  | Capture only 1:1                                                       |
| `--sections=a,b`  | Capture only specified sections (default: hero,features,demo,cta)      |

---

## Steps

### 1. Parse flags and resolve slug

Strip all flags from `$ARGUMENTS`. Derive `<slug>` (kebab-case) and `<title>` (human-readable) from remaining text. Fallback: current git branch name.

Resolve `<project-root>` = current working directory (the project root).

Output dir: `<project-root>/tmp/show-off-<slug>/`

---

### 2. Generate HTML

**Skip if `--capture-only`.**

Write `<project-root>/tmp/show-off-<slug>/index.html` — fully self-contained, no build step.

**Sections** (in order):

| ID          | Purpose                                                     |
| ----------- | ----------------------------------------------------------- |
| `#hero`     | Large title, tagline, CTA button                            |
| `#features` | 3 highlight cards with icons                                |
| `#demo`     | Main content — code block, screenshot embed, or rich detail |
| `#cta`      | Social CTA, share links, badge                              |

**Capture layout constraints** — each section is captured as one independent image:

- **No `min-height: 100vh`** — sections must be naturally compact; never force viewport height
- **One message per section** — title + 3–4 supporting elements max; no scrolling content
- **Target ≤ 80vh of content** at 1080px height so the capture agent's 5% top/bottom margin is visible
- **No `background-attachment: fixed`** — Playwright headless doesn't scroll, so fixed backgrounds anchor incorrectly; use `background` with static gradients only

**Required features:**

- **Parallax (browser only)**: `#hero` and `#cta` may use `background-attachment: fixed` for the live HTML experience, but this does not affect capture (the capture agent overrides backgrounds)
- **Theme toggle**: `#theme-toggle` button — `data-theme="dark"` on `<html>`, CSS custom properties (`--bg`, `--fg`, `--accent`) switch under `[data-theme="dark"]`
- **Bilingual**: every user-facing string has `data-vi` and `data-en` attributes; `#lang-toggle` button swaps visible text; expose `applyLang(lang)` as a global function on `window`
- **Typography**: Inter via Google Fonts CDN or system font stack fallback
- **No frameworks** — vanilla JS only; all styles in `<style>`, all scripts in one `<script>` block before `</body>`
- **Controls bar**: `#controls` wrapper around `#theme-toggle` + `#lang-toggle` (hidden during capture)

---

### 3. Review gate

**Skip if `--capture-only` or `--html-only`.**

Print the preview path and wait for user approval:

```
📄 Preview ready: tmp/show-off-<slug>/index.html

Open it in your browser to review. When ready:
  • type "ok" or "capture" to proceed
  • describe changes to apply first (e.g. "change hero title", "make features darker")
```

**Wait for user input** — do not proceed automatically.

- If the user approves (`ok`, `yes`, `capture`, `lgtm`, or equivalent): proceed to Step 4.
- If the user requests changes: apply them to `index.html`, then re-print the preview path and wait again. Repeat until approved.

---

### 4. Capture images

**Skip if `--html-only`.**

Spawn the **`playwright-capture`** agent with:

```
HTML_PATH    = <project-root>/tmp/show-off-<slug>/index.html
OUTPUT_DIR   = <project-root>/tmp/show-off-<slug>/images
RUNNER       = <project-root>/.claude/skills/playwright-skill/run.js
SECTIONS     = (from --sections flag, default: hero,features,demo,cta)
VIEWPORTS    = (from --viewport flags, default: 16x9,9x16,1x1)
THEME        = light if --light, else dark
LANG         = from --lang=..., default: en
```

---

### 5. Report

```
✅ Show-off ready: tmp/show-off-<slug>/

  Preview  : tmp/show-off-<slug>/index.html
  Images   : tmp/show-off-<slug>/images/  (<N> files)

    hero-16x9.png    hero-9x16.png    hero-1x1.png
    features-16x9.png  features-9x16.png  features-1x1.png
    demo-16x9.png    demo-9x16.png    demo-1x1.png
    cta-16x9.png     cta-9x16.png     cta-1x1.png
```

If any capture failed, list which section/viewport and the error.
