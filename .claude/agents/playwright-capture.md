---
name: playwright-capture
description: Captures show-off HTML sections as social-ready PNGs — one section per image, centered card on bokeh background. Spawned by /show-off.
tools: ["Write", "Bash"]
model: sonnet
---

Capture sections of a show-off HTML page as high-res PNG images. Each image shows exactly **one section** centered as a floating card on a blurred bokeh background.

## Input

You will receive:

- `HTML_PATH` — absolute path to `index.html`
- `OUTPUT_DIR` — absolute path to `images/` output directory
- `RUNNER` — absolute path to `run.js` (playwright-skill executor)
- `SECTIONS` — comma-separated IDs (e.g. `hero,features,demo,cta`)
- `VIEWPORTS` — comma-separated names from: `16x9`, `9x16`, `1x1`
- `THEME` — `dark` or `light`
- `LANG` — `en` or `vi`

## Steps

### 1. Ensure output directory

Create `OUTPUT_DIR` with `mkdir -p` if it doesn't exist.

### 2. Write capture script

Derive `CAPTURE_DIR` = parent directory of `OUTPUT_DIR`.

> **CRITICAL**: Write `<CAPTURE_DIR>/capture.js` by copying the code block below **character-for-character**. Do NOT generate, rewrite, or reinterpret the code from memory. The ONLY allowed changes are substituting the six labeled placeholders. Any other deviation will break the output.

Placeholders to substitute before writing:
- `<HTML_PATH>` → actual HTML_PATH value (forward slashes, no trailing slash)
- `<OUTPUT_DIR>` → actual OUTPUT_DIR value (forward slashes)
- `<SECTIONS_ARRAY>` → JS string literals, e.g. `'hero', 'features', 'demo', 'cta'`
- `<VIEWPORTS_ARRAY>` → JS string literals, e.g. `'16x9', '9x16', '1x1'`
- `<THEME>` → `dark` or `light`
- `<LANG>` → `en` or `vi`

```javascript
const { chromium } = require('playwright');
const fs = require('fs');

const HTML_PATH = '<HTML_PATH>';
const TARGET    = 'file:///' + HTML_PATH.replace(/\\/g, '/');
const OUT       = '<OUTPUT_DIR>';
const SECTIONS  = [<SECTIONS_ARRAY>];
const THEME     = '<THEME>';
const LANG      = '<LANG>';

const VIEWPORT_MAP = {
  '16x9': { width: 1920, height: 1080 },
  '9x16': { width: 1080, height: 1920 },
  '1x1':  { width: 1080, height: 1080 },
};
const VIEWPORTS = [<VIEWPORTS_ARRAY>].map(name => ({ name, ...VIEWPORT_MAP[name] }));

// 3 bokeh background themes — one picked at random per run
const BG_THEMES = [
  // Deep ocean blue
  `radial-gradient(ellipse 70% 90% at 30% 70%, rgba(10,60,180,0.9) 0%, rgba(5,30,100,0.6) 40%, transparent 70%),
   radial-gradient(ellipse 90% 70% at 70% 30%, rgba(20,80,200,0.8) 0%, rgba(8,40,120,0.5) 50%, transparent 75%),
   radial-gradient(ellipse 100% 100% at 50% 50%, rgba(2,10,40,1) 0%, rgba(1,5,20,1) 100%)`,
  // Forest emerald
  `radial-gradient(ellipse 65% 85% at 25% 75%, rgba(10,150,80,0.9) 0%, rgba(5,80,40,0.6) 40%, transparent 70%),
   radial-gradient(ellipse 85% 65% at 75% 25%, rgba(20,170,90,0.8) 0%, rgba(8,90,45,0.5) 50%, transparent 75%),
   radial-gradient(ellipse 100% 100% at 50% 50%, rgba(2,20,10,1) 0%, rgba(1,10,5,1) 100%)`,
  // Purple nebula
  `radial-gradient(ellipse 70% 90% at 30% 60%, rgba(120,30,200,0.9) 0%, rgba(70,15,120,0.6) 40%, transparent 70%),
   radial-gradient(ellipse 90% 70% at 70% 40%, rgba(150,40,220,0.8) 0%, rgba(90,20,150,0.5) 50%, transparent 75%),
   radial-gradient(ellipse 100% 100% at 50% 50%, rgba(15,5,30,1) 0%, rgba(8,2,15,1) 100%)`,
];
const BG = BG_THEMES[Math.floor(Math.random() * BG_THEMES.length)];

const INJECT_CSS = `
  body::before {
    content: '';
    position: fixed;
    inset: -60px;
    z-index: 0;
    background: ${BG};
    filter: blur(55px) saturate(1.4);
  }
  body { background: #07040f !important; }
  #controls { display: none !important; }
  #hero, #features, #demo, #cta {
    position: relative;
    z-index: 1;
    border-radius: 14px;
    overflow: hidden;
    margin: 5% auto;
    max-width: 84%;
    min-height: 78vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-shadow:
      0 2px 0 rgba(255,255,255,0.07) inset,
      0 50px 140px rgba(0,0,0,0.75),
      0 0 0 1px rgba(255,255,255,0.06);
  }
`;

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1.75,
    });
    const page = await ctx.newPage();
    await page.goto(TARGET, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.evaluate(theme => {
      document.documentElement.setAttribute('data-theme', theme);
    }, THEME);

    if (LANG) {
      await page.evaluate(lang => {
        if (typeof window.applyLang === 'function') window.applyLang(lang);
      }, LANG);
    }

    await page.addStyleTag({ content: INJECT_CSS });

    for (const id of SECTIONS) {
      const el = await page.$(`#${id}`);
      if (!el) { console.warn(`#${id} not found, skipping`); continue; }

      // Show only this section — hide all others
      await page.evaluate(({ sections, targetId }) => {
        sections.forEach(s => {
          const el = document.getElementById(s);
          if (el) el.style.display = s === targetId ? '' : 'none';
        });
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, { sections: SECTIONS, targetId: id });

      await page.waitForTimeout(300);

      await page.screenshot({ path: `${OUT}/${id}-${vp.name}.png` });
      console.log(`✓ ${id} @ ${vp.name}`);

      // Restore all sections for next iteration
      await page.evaluate(sections => {
        sections.forEach(s => {
          const el = document.getElementById(s);
          if (el) el.style.display = '';
        });
      }, SECTIONS);
    }

    await ctx.close();
  }

  await browser.close();
})();
```

### 3. Execute

Run via Bash using **absolute paths only** — no `cd`, no cwd change:

```bash
node "<RUNNER>" "<CAPTURE_DIR>/capture.js"
```

### 4. Report

```
## Capture Results

Images: <OUTPUT_DIR>
Theme: <THEME>   Lang: <LANG>

✓ hero @ 16x9   ✓ hero @ 9x16   ✓ hero @ 1x1
✓ features @ 16x9  ...
✓ demo @ 16x9   ...
✓ cta @ 16x9    ...

Total: <N>/<expected> images created
```

List any skipped or failed items with the error message.
