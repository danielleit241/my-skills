# Style Presets

Each style is a complete CSS block for a 1280×720 slide. Apply to `.slide` (the slide container, full-viewport flex box) and its children.

---

## `swiss` — Swiss Grid

Inspired by the International Typographic Style. Strict grid, red accent, Helvetica, strong hierarchy through size alone.

```css
@import url("data:text/css,"); /* no external fonts */
body,
html {
  background: #fff;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.slide {
  background: #fff;
  color: #111;
  flex-direction: column;
  justify-content: flex-end;
  padding: 80px;
  border-top: 8px solid #e00;
  position: relative;
}
.slide-number {
  position: absolute;
  top: 48px;
  left: 80px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #e00;
  text-transform: uppercase;
}
.slide h1 {
  font-size: 72px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
  max-width: 800px;
}
.slide h2 {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 20px;
}
.slide p,
.slide li {
  font-size: 22px;
  line-height: 1.5;
  color: #333;
  max-width: 720px;
}
.slide ul {
  list-style: none;
  padding: 0;
}
.slide ul li::before {
  content: "—  ";
  color: #e00;
  font-weight: 700;
}
.accent {
  color: #e00;
}
.slide .tag {
  display: inline-block;
  background: #e00;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 10px;
  margin-bottom: 16px;
}
```

---

## `terminal` — Dark Terminal

Code-editor aesthetic. Monospace, phosphor green, scanline texture via CSS.

```css
body,
html {
  background: #0d1117;
  font-family: "Courier New", "Consolas", monospace;
}
.slide {
  background: #0d1117;
  color: #c9d1d9;
  flex-direction: column;
  justify-content: center;
  padding: 80px;
  position: relative;
  overflow: hidden;
}
.slide::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 65, 0.015) 2px,
    rgba(0, 255, 65, 0.015) 4px
  );
  pointer-events: none;
}
.slide .prompt {
  color: #00ff41;
  font-size: 13px;
  margin-bottom: 32px;
  opacity: 0.7;
}
.slide .prompt::before {
  content: "$ ";
}
.slide h1 {
  font-size: 56px;
  font-weight: 700;
  color: #00ff41;
  line-height: 1.1;
  margin-bottom: 24px;
  text-shadow: 0 0 20px rgba(0, 255, 65, 0.4);
}
.slide h2 {
  font-size: 28px;
  color: #58a6ff;
  margin-bottom: 20px;
}
.slide p,
.slide li {
  font-size: 20px;
  line-height: 1.7;
  color: #8b949e;
}
.slide ul {
  list-style: none;
  padding: 0;
}
.slide ul li::before {
  content: "> ";
  color: #00ff41;
}
.slide .badge {
  display: inline-block;
  border: 1px solid #00ff41;
  color: #00ff41;
  font-size: 11px;
  padding: 2px 8px;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.slide-number {
  position: absolute;
  bottom: 32px;
  right: 48px;
  color: #30363d;
  font-size: 12px;
}
```

---

## `editorial` — Editorial / Magazine

Bold, expressive typography. Contrast between a massive headline and restrained body text. Feels like a spread in an art magazine.

```css
body,
html {
  background: #fff;
  font-family: Georgia, "Times New Roman", serif;
}
.slide {
  background: #fff;
  color: #111;
  flex-direction: column;
  justify-content: center;
  padding: 0;
  position: relative;
}
.slide-inner {
  display: grid;
  grid-template-columns: 3fr 2fr;
  height: 100%;
}
.slide-main {
  padding: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid #e8e8e8;
}
.slide-aside {
  padding: 80px 60px;
  background: #111;
  color: #f5f5f5;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.slide h1 {
  font-size: 80px;
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.03em;
  margin-bottom: 32px;
  font-style: italic;
}
.slide h2 {
  font-family: "Helvetica Neue", Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 24px;
  color: #666;
}
.slide p,
.slide li {
  font-size: 19px;
  line-height: 1.65;
  color: #444;
}
.slide-aside p,
.slide-aside li {
  color: #ccc;
  font-size: 16px;
}
.slide ul {
  list-style: none;
  padding: 0;
}
.slide ul li {
  border-top: 1px solid #e0e0e0;
  padding: 12px 0;
}
.slide-aside ul li {
  border-top-color: #333;
}
.rule {
  width: 40px;
  height: 3px;
  background: #111;
  margin-bottom: 24px;
}
.slide-number {
  position: absolute;
  top: 32px;
  right: 48px;
  font-size: 12px;
  font-family: monospace;
  color: #bbb;
}
```

---

## `brutalist` — Brutalist

Raw. No decoration. Thick borders are the design. Uses only black, white, and one accent (yellow by default).

```css
body,
html {
  background: #fff;
  font-family: "Arial Black", "Helvetica Neue", Impact, sans-serif;
}
.slide {
  background: #fff;
  color: #000;
  flex-direction: column;
  justify-content: center;
  padding: 80px;
  border: 6px solid #000;
  position: relative;
  outline: 12px solid #000;
  outline-offset: -24px;
}
.slide h1 {
  font-size: 88px;
  font-weight: 900;
  line-height: 0.9;
  text-transform: uppercase;
  letter-spacing: -0.04em;
  margin-bottom: 32px;
}
.slide h2 {
  font-size: 28px;
  font-weight: 900;
  text-transform: uppercase;
  border-bottom: 4px solid #000;
  padding-bottom: 8px;
  margin-bottom: 20px;
}
.slide p,
.slide li {
  font-size: 22px;
  font-family: "Courier New", monospace;
  line-height: 1.5;
  color: #222;
}
.slide ul {
  list-style: none;
  padding: 0;
}
.slide ul li {
  border-left: 6px solid #ff0;
  padding-left: 16px;
  margin-bottom: 12px;
}
.highlight {
  background: #ff0;
  padding: 0 6px;
}
.slide-number {
  position: absolute;
  top: 32px;
  right: 48px;
  font-size: 48px;
  font-weight: 900;
  color: #eee;
  line-height: 1;
}
```

---

## `minimal-jp` — Japanese Minimal

Generous whitespace. Thin typography. The design is what you leave out. Restrained to the point of silence.

```css
body,
html {
  background: #fafaf8;
  font-family:
    "Hiragino Sans", "Yu Gothic", "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.slide {
  background: #fafaf8;
  color: #1a1a1a;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 120px 160px;
  position: relative;
}
.slide::after {
  content: "";
  position: absolute;
  left: 80px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 40%;
  background: #d0c8b8;
}
.slide h1 {
  font-size: 52px;
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin-bottom: 40px;
  color: #111;
}
.slide h2 {
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #999;
  margin-bottom: 40px;
}
.slide p,
.slide li {
  font-size: 18px;
  font-weight: 300;
  line-height: 2;
  color: #555;
  max-width: 600px;
}
.slide ul {
  list-style: none;
  padding: 0;
}
.slide ul li {
  padding: 10px 0;
  border-bottom: 1px solid #e8e4dc;
}
.slide-number {
  position: absolute;
  bottom: 56px;
  right: 80px;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: #bbb;
  text-transform: uppercase;
}
```

---

## `synthwave` — Synthwave

80s retrofuturism. Dark purple background, neon pink and cyan, glow effects, CSS grid-horizon.

```css
body,
html {
  background: #1a0533;
  font-family: "Courier New", "Consolas", monospace;
}
.slide {
  background: linear-gradient(180deg, #1a0533 0%, #0d001f 60%, #1a0533 100%);
  color: #f0e6ff;
  flex-direction: column;
  justify-content: center;
  padding: 80px;
  position: relative;
  overflow: hidden;
}
.slide::before {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 35%;
  background:
    linear-gradient(transparent 0%, rgba(255, 45, 120, 0.08) 100%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 45, 120, 0.15) 0,
      rgba(255, 45, 120, 0.15) 1px,
      transparent 0,
      transparent 60px
    ),
    repeating-linear-gradient(
      0deg,
      rgba(255, 45, 120, 0.15) 0,
      rgba(255, 45, 120, 0.15) 1px,
      transparent 0,
      transparent 40px
    );
  transform: perspective(300px) rotateX(30deg);
  transform-origin: bottom;
}
.slide h1 {
  font-size: 72px;
  font-weight: 900;
  line-height: 1;
  color: #ff2d78;
  text-shadow:
    0 0 30px rgba(255, 45, 120, 0.6),
    0 0 60px rgba(255, 45, 120, 0.3);
  margin-bottom: 24px;
  font-family: "Arial Black", Impact, sans-serif;
  letter-spacing: -0.02em;
}
.slide h2 {
  font-size: 20px;
  color: #00fff9;
  text-shadow: 0 0 20px rgba(0, 255, 249, 0.5);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 32px;
}
.slide p,
.slide li {
  font-size: 19px;
  line-height: 1.7;
  color: #c9b8e8;
}
.slide ul {
  list-style: none;
  padding: 0;
}
.slide ul li::before {
  content: "◆ ";
  color: #ff2d78;
}
.slide-number {
  position: absolute;
  top: 32px;
  right: 48px;
  color: #3d1a5c;
  font-size: 48px;
  font-weight: 900;
}
```

---

## `blueprint` — Blueprint / Technical

Like an engineering drawing on blue drafting paper. White lines, grid, precise and technical.

```css
body,
html {
  background: #1a3a5c;
}
.slide {
  background-color: #1e4878;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 40px 40px;
  color: #e8f4fc;
  flex-direction: column;
  justify-content: center;
  padding: 80px;
  position: relative;
  font-family: "Courier New", monospace;
  border: 2px solid rgba(255, 255, 255, 0.2);
}
.slide::before {
  content: "DWG NO. — FRONTEND-SLIDES";
  position: absolute;
  bottom: 24px;
  right: 48px;
  font-size: 10px;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
}
.slide h1 {
  font-size: 60px;
  font-weight: 700;
  line-height: 1.1;
  color: #fff;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 20px;
  font-family: "Arial", sans-serif;
}
.slide h2 {
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #7ec8e3;
  margin-bottom: 32px;
}
.slide p,
.slide li {
  font-size: 19px;
  line-height: 1.7;
  color: #b8d8ec;
}
.slide ul {
  list-style: none;
  padding: 0;
}
.slide ul li::before {
  content: "▶  ";
  color: #7ec8e3;
  font-size: 10px;
}
.slide-number {
  position: absolute;
  top: 24px;
  left: 80px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.15em;
}
```

---

## `newsprint` — Newsprint / Editorial Print

Like a broadsheet newspaper. Off-white, serif, editorial columns, ink-on-paper feel.

```css
body,
html {
  background: #f5f0e8;
  font-family: Georgia, "Times New Roman", "Palatino Linotype", serif;
}
.slide {
  background: #faf7f0;
  color: #1a1208;
  flex-direction: column;
  justify-content: flex-start;
  padding: 60px 80px;
  position: relative;
  border-top: 3px solid #1a1208;
}
.slide .masthead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid #1a1208;
  padding-bottom: 8px;
  margin-bottom: 36px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #666;
  font-family: "Helvetica Neue", sans-serif;
}
.slide h1 {
  font-size: 72px;
  font-weight: 900;
  line-height: 0.95;
  margin-bottom: 24px;
  letter-spacing: -0.03em;
  font-style: italic;
  max-width: 900px;
}
.slide h2 {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-family: "Helvetica Neue", sans-serif;
  margin-bottom: 16px;
  color: #444;
}
.slide p {
  font-size: 18px;
  line-height: 1.7;
  color: #2a2018;
  max-width: 680px;
  column-count: 2;
  column-gap: 40px;
}
.slide ul {
  list-style: none;
  padding: 0;
  max-width: 680px;
}
.slide ul li {
  font-size: 18px;
  line-height: 1.6;
  padding: 8px 0;
  border-bottom: 1px solid #d8d0c0;
  color: #2a2018;
}
.slide ul li::before {
  content: "■ ";
  font-size: 8px;
  color: #888;
  vertical-align: middle;
}
```

---

## Usage Notes

- Each style can be applied to the `.slide` container by adding these CSS rules to the full presentation's `<style>` block
- Semantic HTML structure inside `.slide` should always include a wrapping element hierarchy: section label (`h2`), main headline (`h1`), body content (`p` or `ul`)
- For title slides: hide the slide-number element, make the headline larger, add a subtitle line
- For content slides: keep hierarchy — label → headline → 3–5 bullet points or 1–2 paragraphs
- Images: embed as base64 data URIs, constrain with `max-width`/`max-height` and `object-fit: cover`

# Style Presets Reference

Curated visual styles for Frontend Slides. Each preset is inspired by real design references — no generic "AI slop" aesthetics. **Abstract shapes only — no illustrations.**

**Viewport CSS:** For mandatory base styles, see [viewport-base.css](viewport-base.css). Include in every presentation.

---

## Dark Themes

### 1. Bold Signal

**Vibe:** Confident, bold, modern, high-impact

**Layout:** Colored card on dark gradient. Number top-left, navigation top-right, title bottom-left.

**Typography:**

- Display: `Archivo Black` (900)
- Body: `Space Grotesk` (400/500)

**Colors:**

```css
:root {
  --bg-primary: #1a1a1a;
  --bg-gradient: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
  --card-bg: #ff5722;
  --text-primary: #ffffff;
  --text-on-card: #1a1a1a;
}
```

**Signature Elements:**

- Bold colored card as focal point (orange, coral, or vibrant accent)
- Large section numbers (01, 02, etc.)
- Navigation breadcrumbs with active/inactive opacity states
- Grid-based layout for precise alignment

---

### 2. Electric Studio

**Vibe:** Bold, clean, professional, high contrast

**Layout:** Split panel—white top, blue bottom. Brand marks in corners.

**Typography:**

- Display: `Manrope` (800)
- Body: `Manrope` (400/500)

**Colors:**

```css
:root {
  --bg-dark: #0a0a0a;
  --bg-white: #ffffff;
  --accent-blue: #4361ee;
  --text-dark: #0a0a0a;
  --text-light: #ffffff;
}
```

**Signature Elements:**

- Two-panel vertical split
- Accent bar on panel edge
- Quote typography as hero element
- Minimal, confident spacing

---

### 3. Creative Voltage

**Vibe:** Bold, creative, energetic, retro-modern

**Layout:** Split panels—electric blue left, dark right. Script accents.

**Typography:**

- Display: `Syne` (700/800)
- Mono: `Space Mono` (400/700)

**Colors:**

```css
:root {
  --bg-primary: #0066ff;
  --bg-dark: #1a1a2e;
  --accent-neon: #d4ff00;
  --text-light: #ffffff;
}
```

**Signature Elements:**

- Electric blue + neon yellow contrast
- Halftone texture patterns
- Neon badges/callouts
- Script typography for creative flair

---

### 4. Dark Botanical

**Vibe:** Elegant, sophisticated, artistic, premium

**Layout:** Centered content on dark. Abstract soft shapes in corner.

**Typography:**

- Display: `Cormorant` (400/600) — elegant serif
- Body: `IBM Plex Sans` (300/400)

**Colors:**

```css
:root {
  --bg-primary: #0f0f0f;
  --text-primary: #e8e4df;
  --text-secondary: #9a9590;
  --accent-warm: #d4a574;
  --accent-pink: #e8b4b8;
  --accent-gold: #c9b896;
}
```

**Signature Elements:**

- Abstract soft gradient circles (blurred, overlapping)
- Warm color accents (pink, gold, terracotta)
- Thin vertical accent lines
- Italic signature typography
- **No illustrations—only abstract CSS shapes**

---

## Light Themes

### 5. Notebook Tabs

**Vibe:** Editorial, organized, elegant, tactile

**Layout:** Cream paper card on dark background. Colorful tabs on right edge.

**Typography:**

- Display: `Bodoni Moda` (400/700) — classic editorial
- Body: `DM Sans` (400/500)

**Colors:**

```css
:root {
  --bg-outer: #2d2d2d;
  --bg-page: #f8f6f1;
  --text-primary: #1a1a1a;
  --tab-1: #98d4bb; /* Mint */
  --tab-2: #c7b8ea; /* Lavender */
  --tab-3: #f4b8c5; /* Pink */
  --tab-4: #a8d8ea; /* Sky */
  --tab-5: #ffe6a7; /* Cream */
}
```

**Signature Elements:**

- Paper container with subtle shadow
- Colorful section tabs on right edge (vertical text)
- Binder hole decorations on left
- Tab text must scale with viewport: `font-size: clamp(0.5rem, 1vh, 0.7rem)`

---

### 6. Pastel Geometry

**Vibe:** Friendly, organized, modern, approachable

**Layout:** White card on pastel background. Vertical pills on right edge.

**Typography:**

- Display: `Plus Jakarta Sans` (700/800)
- Body: `Plus Jakarta Sans` (400/500)

**Colors:**

```css
:root {
  --bg-primary: #c8d9e6;
  --card-bg: #faf9f7;
  --pill-pink: #f0b4d4;
  --pill-mint: #a8d4c4;
  --pill-sage: #5a7c6a;
  --pill-lavender: #9b8dc4;
  --pill-violet: #7c6aad;
}
```

**Signature Elements:**

- Rounded card with soft shadow
- **Vertical pills on right edge** with varying heights (like tabs)
- Consistent pill width, heights: short → medium → tall → medium → short
- Download/action icon in corner

---

### 7. Split Pastel

**Vibe:** Playful, modern, friendly, creative

**Layout:** Two-color vertical split (peach left, lavender right).

**Typography:**

- Display: `Outfit` (700/800)
- Body: `Outfit` (400/500)

**Colors:**

```css
:root {
  --bg-peach: #f5e6dc;
  --bg-lavender: #e4dff0;
  --text-dark: #1a1a1a;
  --badge-mint: #c8f0d8;
  --badge-yellow: #f0f0c8;
  --badge-pink: #f0d4e0;
}
```

**Signature Elements:**

- Split background colors
- Playful badge pills with icons
- Grid pattern overlay on right panel
- Rounded CTA buttons

---

### 8. Vintage Editorial

**Vibe:** Witty, confident, editorial, personality-driven

**Layout:** Centered content on cream. Abstract geometric shapes as accent.

**Typography:**

- Display: `Fraunces` (700/900) — distinctive serif
- Body: `Work Sans` (400/500)

**Colors:**

```css
:root {
  --bg-cream: #f5f3ee;
  --text-primary: #1a1a1a;
  --text-secondary: #555;
  --accent-warm: #e8d4c0;
}
```

**Signature Elements:**

- Abstract geometric shapes (circle outline + line + dot)
- Bold bordered CTA boxes
- Witty, conversational copy style
- **No illustrations—only geometric CSS shapes**

---

## Specialty Themes

### 9. Neon Cyber

**Vibe:** Futuristic, techy, confident

**Typography:** `Clash Display` + `Satoshi` (Fontshare)

**Colors:** Deep navy (#0a0f1c), cyan accent (#00ffcc), magenta (#ff00aa)

**Signature:** Particle backgrounds, neon glow, grid patterns

---

### 10. Terminal Green

**Vibe:** Developer-focused, hacker aesthetic

**Typography:** `JetBrains Mono` (monospace only)

**Colors:** GitHub dark (#0d1117), terminal green (#39d353)

**Signature:** Scan lines, blinking cursor, code syntax styling

---

### 11. Swiss Modern

**Vibe:** Clean, precise, Bauhaus-inspired

**Typography:** `Archivo` (800) + `Nunito` (400)

**Colors:** Pure white, pure black, red accent (#ff3300)

**Signature:** Visible grid, asymmetric layouts, geometric shapes

---

### 12. Paper & Ink

**Vibe:** Editorial, literary, thoughtful

**Typography:** `Cormorant Garamond` + `Source Serif 4`

**Colors:** Warm cream (#faf9f7), charcoal (#1a1a1a), crimson accent (#c41e3a)

**Signature:** Drop caps, pull quotes, elegant horizontal rules

---

## Font Pairing Quick Reference

| Preset            | Display Font      | Body Font         | Source    |
| ----------------- | ----------------- | ----------------- | --------- |
| Bold Signal       | Archivo Black     | Space Grotesk     | Google    |
| Electric Studio   | Manrope           | Manrope           | Google    |
| Creative Voltage  | Syne              | Space Mono        | Google    |
| Dark Botanical    | Cormorant         | IBM Plex Sans     | Google    |
| Notebook Tabs     | Bodoni Moda       | DM Sans           | Google    |
| Pastel Geometry   | Plus Jakarta Sans | Plus Jakarta Sans | Google    |
| Split Pastel      | Outfit            | Outfit            | Google    |
| Vintage Editorial | Fraunces          | Work Sans         | Google    |
| Neon Cyber        | Clash Display     | Satoshi           | Fontshare |
| Terminal Green    | JetBrains Mono    | JetBrains Mono    | JetBrains |

---

## DO NOT USE (Generic AI Patterns)

**Fonts:** Inter, Roboto, Arial, system fonts as display

**Colors:** `#6366f1` (generic indigo), purple gradients on white

**Layouts:** Everything centered, generic hero sections, identical card grids

**Decorations:** Realistic illustrations, gratuitous glassmorphism, drop shadows without purpose

---

## CSS Gotchas

### Negating CSS Functions

**WRONG — silently ignored by browsers (no console error):**

```css
right: -clamp(28px, 3.5vw, 44px); /* Browser ignores this */
margin-left: -min(10vw, 100px); /* Browser ignores this */
```

**CORRECT — wrap in `calc()`:**

```css
right: calc(-1 * clamp(28px, 3.5vw, 44px)); /* Works */
margin-left: calc(-1 * min(10vw, 100px)); /* Works */
```

CSS does not allow a leading `-` before function names. The browser silently discards the entire declaration — no error, the element just appears in the wrong position. **Always use `calc(-1 * ...)` to negate CSS function values.**
