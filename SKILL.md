---
name: visual-edit
description: Use this skill when the user is building or iterating on a frontend (websites, landing pages, dashboards, React/Vue/Svelte components, HTML/CSS) in Claude Code and wants a tight visual-feedback loop — write code, preview in a browser, screenshot with annotations (red boxes, arrows, circles, notes) to point at what to change, and have Claude edit the exact region. Trigger whenever the user mentions "preview", "screenshot", "미리보기", "스크린샷", "이 부분 수정", "영역 수정", "marked up", annotated images of a UI, or when they paste an image of a webpage with drawings on it. Also trigger proactively at the START of any frontend-building task in Claude Code so the code is structured from day one to make targeted region edits easy.
---

# Visual Edit

A workflow for building frontends iteratively with screenshot-based feedback. The user writes a prompt, Claude generates code, the user previews it in a browser, annotates a screenshot (draws a red box around "this section", writes "make this bigger"), and Claude edits precisely that region without disturbing the rest.

## Step 0: Page selection (run this first, every time)

Before anything else, discover what pages exist in the project and let the user pick one.

### 1. Detect the framework

Check for these files in priority order:

| File | Framework |
|---|---|
| `next.config.*` | Next.js |
| `nuxt.config.*` | Nuxt |
| `vite.config.*` + `src/pages/` | React/Vue (Vite with pages) |
| `vite.config.*` | React/Vue/Svelte (Vite) |
| `*.html` at root | Static HTML |

### 2. Find page files

| Framework | Pattern |
|---|---|
| Next.js App Router | `src/app/**/page.tsx` (or `.jsx`, `.js`) |
| Next.js Pages Router | `pages/**/*.tsx` — exclude `_app`, `_document`, `api/` |
| React Vite | `src/pages/**/*.tsx`, `src/views/**/*.tsx` |
| Vue / Nuxt | `src/pages/**/*.vue`, `pages/**/*.vue` |
| Static HTML | `**/*.html` |

If none match, open the router config (`App.tsx`, `router.tsx`, `routes.ts`) and extract route → component mappings.

### 3. Present the numbered list

```
어떤 페이지를 수정할까요?

1. /                  → src/app/page.tsx
2. /about             → src/app/about/page.tsx
3. /dashboard         → src/app/dashboard/page.tsx
4. /settings          → src/app/settings/page.tsx
─────────────────────────────────────
0. 전체 (글로벌 테마/토큰 수정)

번호를 입력하세요:
```

Rules:
- Sort by route depth, then alphabetically
- More than 10 pages → group by prefix (`/dashboard/*`) and ask if they want to expand
- Option 0 "전체" triggers a global edit (tokens/theme only — see `references/edit-scope.md`)

### 4. Load page context and show section checklist

Once the user picks a page:
1. Read that page file
2. Identify all components it imports (one level deep)
3. Scan for sections: `SECTION:` markers, component names, semantic HTML landmarks (`<header>`, `<section id="...">`, etc.)
4. Show the **Section Checklist**:

```
📄 /dashboard → src/app/dashboard/page.tsx

수정할 섹션을 선택하세요:

  [ ] 1. Hero          → components/Hero.tsx (lines 1–52)
  [ ] 2. Features      → components/Features.tsx (lines 1–88)
  [ ] 3. Pricing       → components/Pricing.tsx (lines 1–134)
  [ ] 4. Testimonials  → components/Testimonials.tsx (lines 1–67)
  [ ] 5. Footer        → components/Footer.tsx (lines 1–40)

번호 입력 (예: 1,3) 또는 스크린샷에 박스 그려서 붙여넣기:
```

**선택 방법 두 가지:**

- **번호 입력**: `1,3` → Hero와 Pricing이 수정 대상으로 체크됨
- **스크린샷 + 박스**: 박스가 그려진 이미지를 붙여넣으면 Claude가 해당 영역을 섹션 목록과 매핑해서 자동 체크

체크된 섹션이 생기면:
```
✅ 선택된 섹션:
  ✔ 1. Hero
  ✔ 3. Pricing

각 섹션을 순서대로 수정합니다. Hero부터 시작할까요?
```

If the preview server isn't running → read `references/setup.md`.

Type `/visual-edit` again at any time to go back to page selection.

---

## The loop (after page selection)

```
┌─────────────────────────────────────────────────────────────┐
│  1. Claude writes code (structured for future region edits) │
│  2. User runs preview server (see setup.md)                 │
│  3. User opens browser, takes screenshot, annotates it      │
│  4. User pastes annotated screenshot to Claude Code         │
│  5. Claude identifies the target region in the code         │
│  6. Claude confirms interpretation if ambiguous             │
│  7. Claude makes a minimal, scoped edit                     │
│  8. User refreshes, screenshots again, repeats              │
└─────────────────────────────────────────────────────────────┘
```

## When to read the reference files

- **Preview server not running / new project** → `references/setup.md`
- **User sent an annotated screenshot** → `references/annotations.md`
- **Unclear if local or global edit** → `references/edit-scope.md`
- **Something broke after an edit** → `references/regressions.md`

## Core principles

### 1. Structure code FOR future region edits, from the first file

- **Semantic HTML landmarks**: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- **Descriptive ids/classes**: `id="hero"`, `class="pricing-table"` — not `.div-3`
- **Section markers**: `<!-- SECTION: Hero -->` / `<!-- /SECTION: Hero -->`
- **Small, single-purpose components**: one section per file = one file per edit
- **CSS custom properties**: `--color-primary`, `--space-4` for all design tokens

### 2. Never guess silently on annotated screenshots

Before editing:
- State which element(s) the annotation targets, by code identifier
- If multiple elements match, ask
- If annotation has no text, infer and confirm: "The red box around the pricing cards — background color, resize, or something else?"

### 3. Match edit scope to the request

- **Region edit** — touch only that component/section
- **Global edit** — touch design tokens / theme variables only
- **Structural edit** — always confirm before doing

### 4. Preserve the ability to undo

After 3+ edits: "Want me to commit this before continuing?"

## Output conventions

When responding to an annotated screenshot:

1. **Describe the annotation.** "You've drawn a red box around the testimonials section with 'too cramped'."
2. **State the target in code.** "`<section id="testimonials">` in `Testimonials.jsx`, lines 12–48."
3. **Propose the change.**
4. **Ask if ambiguous.**
5. **Edit — touching only that region.**
6. **What's next.** "새로고침 후 스크린샷 찍어서 보내주세요."

## What this skill does NOT do

- Does not take screenshots (user does: Snip, Cmd+Shift+4, CleanShot)
- Does not run a browser
- Does not make aesthetic choices (see `frontend-design` skill)
