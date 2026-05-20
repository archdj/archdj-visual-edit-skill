# Setup: Preview Server and Edit-Friendly Structure

Two things need to be true before the visual edit loop works:

1. The user can see their code in a browser and reload it fast.
2. The code is organized so that "edit the X section" maps to an obvious, isolated place.

This file covers both.

## Part 1: Picking a preview setup

Ask the user what they're building. The right preview setup depends on the stack.

### Static HTML / CSS / JS

Simplest case. Any of these work; pick based on what the user has installed.

**Python (almost always available):**
```bash
python -m http.server 8000
# open http://localhost:8000
```
No auto-reload, but for small HTML files the user can just hit refresh.

**Node (if they have it):**
```bash
npx serve .
# or with live-reload:
npx live-server
```
`live-server` auto-refreshes the browser on file save — much nicer for the iteration loop.

**VSCode extension:**
"Live Server" by Ritwick Dey. Right-click an HTML file → "Open with Live Server". Zero config if they already use VSCode.

### React / Vue / Svelte / Solid

Use the framework's dev server. Hot Module Replacement (HMR) means edits appear instantly without losing component state.

```bash
# Vite (recommended for new projects)
npm create vite@latest my-app
cd my-app
npm install
npm run dev

# Next.js
npm run dev

# Create React App (legacy but still common)
npm start
```

### Astro / Remix / other SSR frameworks

```bash
npm run dev
```
Same pattern. Framework docs will specify the exact command, but `npm run dev` is the convention.

### Tailwind considerations

If the user is using Tailwind, make sure the dev server is running the Tailwind build alongside (most framework integrations do this automatically — Vite plugin, Next.js built-in). If they're using standalone Tailwind CLI:

```bash
npx tailwindcss -i ./input.css -o ./output.css --watch
```
in a separate terminal.

### Mobile preview

If the user wants to test responsive design, most dev servers bind to `localhost` only. To access from a phone on the same Wi-Fi:

```bash
# Vite
npm run dev -- --host

# Most others support --host or HOST=0.0.0.0
```
Then find the laptop's LAN IP (`ifconfig` / `ipconfig`) and open `http://<laptop-ip>:<port>` on the phone.

## Part 2: Structuring code for region edits

The whole point of this workflow is that "edit the hero" should be a precise, isolated operation. That requires the code to be organized so regions are findable and independent.

### HTML structure — use landmarks and markers

Every meaningful region gets:

- A **semantic tag** (`<header>`, `<main>`, `<section>`, `<aside>`, `<footer>`, `<nav>`)
- A **descriptive id or class** — readable English, not `div-2`
- A **comment marker** at open and close — makes grep trivial

```html
<!-- SECTION: Hero -->
<section id="hero" class="hero">
  <h1 class="hero__title">Headline here</h1>
  <p class="hero__subtitle">Supporting copy.</p>
  <a href="#" class="hero__cta">Get started</a>
</section>
<!-- /SECTION: Hero -->

<!-- SECTION: Features -->
<section id="features" class="features">
  ...
</section>
<!-- /SECTION: Features -->
```

When the user says "the hero section", Claude greps `SECTION: Hero` and finds the exact lines immediately. No ambiguity, no hunting.

For JSX/TSX, either use the same comments (they're legal inside JSX with `{/* ... */}`) or rely on component boundaries — one component per section is even cleaner.

### Component boundaries — one section per file

Structure a page as a composition of section components:

```
src/
├── App.jsx              — just imports and arranges sections
├── components/
│   ├── Hero.jsx
│   ├── Features.jsx
│   ├── Pricing.jsx
│   ├── Testimonials.jsx
│   ├── FAQ.jsx
│   └── Footer.jsx
└── styles/
    ├── tokens.css       — design tokens (colors, spacing, fonts)
    └── global.css       — resets, base styles
```

When the user annotates the pricing section, Claude opens `components/Pricing.jsx` and nothing else. A change to pricing cannot leak into the hero because they're in different files.

### CSS — design tokens at the top, component styles close to their components

Centralize tokens:

```css
/* styles/tokens.css */
:root {
  --color-bg: #0b0c10;
  --color-fg: #e8e6df;
  --color-accent: #ff5d3b;
  --color-muted: #7a7468;

  --font-display: 'Fraunces', serif;
  --font-body: 'Inter Tight', sans-serif;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 2rem;
  --space-5: 4rem;

  --radius-sm: 4px;
  --radius-md: 12px;
  --radius-lg: 24px;

  --shadow-card: 0 2px 20px rgba(0,0,0,0.08);
}
```

Global edits ("make everything more spacious", "switch to a warmer palette") touch this one file. Region edits don't touch this file.

Component styles can be collocated (CSS modules, styled-components, Tailwind utility classes, or scoped `<style>` in Vue/Svelte) — the key is that they don't leak into other regions.

### Tailwind projects

If using Tailwind, the same principles apply, just expressed differently:

- **Tokens live in `tailwind.config.js`** under `theme.extend` — colors, fonts, spacing scales
- **Section markers still help** — HTML comments `<!-- SECTION: X -->` or component file names
- **Avoid magic numbers in arbitrary values** (`p-[23px]`) — if you need it once, fine; if twice, it should be a token

### Naming rule of thumb

Ask: "If the user screenshots this region and writes 'fix this', can I name the region in plain English?"

- ✅ `#pricing`, `.testimonial-card`, `.site-header`
- ❌ `#s2`, `.card`, `.wrapper-3`

If the answer is no, rename before moving on. Good names make the rest of the loop effortless.

## A good starting template

When scaffolding a new landing-page-style project from scratch, a useful starter:

```
project/
├── index.html
├── styles/
│   ├── tokens.css
│   ├── global.css
│   └── sections/
│       ├── hero.css
│       ├── features.css
│       └── ...
└── scripts/
    └── main.js
```

With `index.html` organized into clearly-marked sections, `tokens.css` holding all design decisions, and one CSS file per section. This structure makes every subsequent instruction trivially resolvable to a file.

For React, substitute JSX components for the section CSS files.
