---
name: visual-edit
description: Use this skill when the user is building or iterating on a frontend (websites, landing pages, dashboards, React/Vue/Svelte components, HTML/CSS) in Claude Code and wants a tight visual-feedback loop — write code, preview in a browser, screenshot with annotations (red boxes, arrows, circles, notes) to point at what to change, and have Claude edit the exact region. Trigger whenever the user mentions "preview", "screenshot", "미리보기", "스크린샷", "이 부분 수정", "영역 수정", "marked up", annotated images of a UI, or when they paste an image of a webpage with drawings on it. Also trigger proactively at the START of any frontend-building task in Claude Code so the code is structured from day one to make targeted region edits easy.
---

# Visual Edit

A workflow for building frontends iteratively with screenshot-based feedback. The user writes a prompt, Claude generates code, the user previews it in a browser, annotates a screenshot (draws a red box around "this section", writes "make this bigger"), and Claude edits precisely that region without disturbing the rest.

## Step 0: 어노테이션 툴 실행 (run this first, every time)

Launch the visual annotation tool. This opens a browser showing **all pages** — the user draws boxes and leaves comments on any page, then submits. Claude reads the result and edits.

### 1. Run the tool

```bash
node ~/.agents/skills/visual-edit/tools/visual-annotate.js
```

Run from the **project root**. `~` works on both macOS/Linux and Windows (PowerShell 5+).

The tool auto-detects the dev server (tries ports 3000, 5173, 8080, 4200…) and all pages, then opens `http://localhost:3099`.

If the dev server isn't running yet, tell the user to start it first (`npm run dev`), then re-run the tool.

### 2. What the annotation UI looks like

```
┌─ 사이드바 ─────────┐  ┌─ 페이지 미리보기 (실제 iframe) ──────────┐  ┌─ 코멘트 ──────┐
│  /           [2]  │  │                                         │  │  ● #1         │
│  /about           │  │   실제 페이지가 여기 표시됨               │  │  "헤더 색상   │
│  /dashboard  [1]  │  │                                         │  │   바꿔주세요" │
│  /settings        │  │   드래그로 박스 그리기                    │  │               │
│                   │  │   박스마다 번호 레이블 자동 부여           │  │  ● #2         │
│  [Claude에게 전송] │  │                                         │  │  "간격 넓게"  │
└───────────────────┘  └─────────────────────────────────────────┘  └───────────────┘
```

- 사이드바에서 페이지 클릭 → 해당 페이지 iframe으로 로드
- 드래그로 박스 그리기 → 오른쪽 패널에서 코멘트 입력
- 여러 페이지를 넘나들며 박스 추가 가능 (사이드바에 배지로 개수 표시)
- "Claude에게 전송" → `.visual-edit-annotations.json` 저장

### 3. After submission — act immediately

The tool prints the annotations to stdout and exits. When you see `VISUAL-EDIT-SUBMIT:` in the terminal output, **start editing immediately without waiting for the user to ask**.

Read `.visual-edit-annotations.json` from the project root:

```json
[
  {
    "route": "/dashboard",
    "annotations": [
      { "id": 1, "x": 120, "y": 80, "w": 400, "h": 200, "comment": "헤더 배경색 바꿔줘", "color": "#ef4444" },
      { "id": 2, "x": 50, "y": 350, "w": 600, "h": 150, "comment": "카드 간격 더 넓게", "color": "#3b82f6" }
    ]
  }
]
```

For each annotation:
1. Open the page file for that route
2. Map `(x, y, w, h)` to the nearest section (`SECTION:` markers, component names, semantic landmarks)
3. State the target: "annotation #1 → `<section id="hero">` in `Hero.tsx`"
4. Apply the edit — region-scoped (see `references/edit-scope.md`)
5. Move to the next annotation

Type `/visual-edit` again at any time to re-launch the tool.

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
