---
name: visual-edit
description: Use this skill when the user is building or iterating on a frontend (websites, landing pages, dashboards, React/Vue/Svelte components, HTML/CSS) in Claude Code and wants a tight visual-feedback loop — write code, preview in a browser, screenshot with annotations (red boxes, arrows, circles, notes) to point at what to change, and have Claude edit the exact region. Trigger whenever the user mentions "preview", "screenshot", "미리보기", "스크린샷", "이 부분 수정", "영역 수정", "marked up", annotated images of a UI, or when they paste an image of a webpage with drawings on it. Also trigger proactively at the START of any frontend-building task in Claude Code so the code is structured from day one to make targeted region edits easy.
---

# Visual Edit

A workflow for building frontends iteratively with screenshot-based feedback. The user writes a prompt, Claude generates code, the user previews it in a browser, annotates a screenshot (draws a red box around "this section", writes "make this bigger"), and Claude edits precisely that region without disturbing the rest.

This skill makes that loop fast and reliable. It covers three things:

1. **Setting up** — getting a preview running and structuring code so region edits are easy later
2. **Reading annotated screenshots** — turning drawings and arrows into confident code changes
3. **Editing scope** — distinguishing region edits from global edits, and not breaking unrelated things

For the *aesthetic* side of frontend work (typography, color, motion, avoiding generic AI look), rely on the `frontend-design` skill. This skill is about the *edit loop*, not the design itself.

## When to read the reference files

Don't load them all upfront. Pull them in as the conversation reaches each stage:

- **Starting a new frontend project** → `references/setup.md` (preview server options, project scaffolding, structure-for-edits)
- **User just sent an annotated screenshot** → `references/annotations.md` (how to read markup conventions, handle ambiguity, confirm before editing)
- **User wants a change but it's unclear whether it's local or global** → `references/edit-scope.md` (region vs global, isolation rules, how to avoid regressions)
- **Something broke after an edit, or user reports "that changed stuff I didn't ask for"** → `references/regressions.md` (diagnosing, reverting cleanly)

## The loop, at a high level

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

The skill's job is to make each step reliable. The most common failure modes are:

- Code isn't structured well, so "change the hero" means hunting through tangled CSS
- Claude guesses wrong about what the red box means and edits the wrong element
- Claude edits more than asked and breaks unrelated regions
- User iterates 5 times and loses track of what changed — no way back

The reference files address each of these.

## Core principles

### 1. Structure code FOR future region edits, from the first file

When generating frontend code from scratch in this workflow, optimize the structure for later targeted edits:

- **Use semantic HTML landmarks**: `<header>`, `<nav>`, `<main>`, `<section>`, `<aside>`, `<footer>`. These are Claude's anchors for "edit the header."
- **Give every meaningful region an id or a descriptive class**: `id="hero"`, `class="pricing-table"`, `class="testimonial-carousel"`. Not `.div-3`.
- **Add section comment markers**: `<!-- SECTION: Hero -->` / `<!-- /SECTION: Hero -->` or equivalent in JSX. When the user says "the hero section", Claude greps for `SECTION: Hero`.
- **Keep components small and single-purpose**: when each section is its own file or component, a region edit touches one file and can't accidentally leak.
- **Prefer CSS custom properties for design tokens**: colors, spacing, font sizes as `--color-primary`, `--space-4`. Global changes ("make all buttons more rounded") then touch one variable, not 40 rules.

Details and templates in `references/setup.md`.

### 2. Never guess silently on annotated screenshots

When the user sends an annotated image, treat the annotation as data that must be interpreted. Before editing:

- State out loud which element(s) you believe the annotation targets, referring to them by code identifier (`the div#hero .cta-button`), not just visual description
- If multiple elements plausibly match, ask before editing
- If the annotation is a shape (box, circle, arrow) with no text, infer the most likely change from context but confirm: "The red box around the pricing cards — you want me to change their background color, or resize them, or something else?"

Guessing silently and editing the wrong thing wastes a whole iteration cycle. Asking one clarifying question is almost always cheaper. Full conventions in `references/annotations.md`.

### 3. Match edit scope to the request

Classify every request before editing:

- **Region edit** — "make this button bigger" on an annotated screenshot. Touch only that component/section. Don't refactor, don't rename anything outside it, don't "improve" adjacent code.
- **Global edit** — "use a warmer color palette", "make the whole site feel more playful". Touch design tokens / theme variables. Don't go section by section changing hex values.
- **Structural edit** — "move the CTA above the hero", "combine these two sections". Touch layout / component tree. Confirm before doing this — it's the highest-risk category.

When in doubt which category a request is, ask. Details in `references/edit-scope.md`.

### 4. Preserve the ability to undo

Every round of the loop should be committable. Suggest the user keep a clean git state so bad edits can be rolled back with one command. After significant changes, offer: "Want me to commit this before we keep iterating?" This is especially important once 3+ edits pile up — at that point rollback becomes the user's only escape hatch if something subtle broke.

## Output conventions

When responding to an annotated screenshot:

1. **Describe what you see in the annotation** in one sentence. "You've drawn a red box around the testimonials section with a note saying 'too cramped'."
2. **State the target in code terms.** "That's the `<section id="testimonials">` in `src/components/Testimonials.jsx`, lines 12–48."
3. **Propose the change.** "I'll increase the gap between cards from 16px to 32px and add more vertical padding."
4. **Ask for confirmation if anything is ambiguous.** Skip this step only if the instruction is unambiguous.
5. **Make the edit, touching only that region.**
6. **Tell the user what to do next.** "Refresh your preview and send another screenshot if more needs tweaking."

Keep the turns short. The loop works because each round is fast.

## What this skill does NOT do

- It does not take screenshots for the user. The user drives that — browser screenshot tool, macOS Cmd+Shift+4, Windows Snip, or a dedicated annotation app like CleanShot / Shottr / Skitch.
- It does not run a browser itself. It assumes the user has a preview server running and a browser open.
- It does not make aesthetic choices — those come from `frontend-design` or from the user's direction.
- It does not replace component-level testing. Visual preview catches what looks wrong; tests catch what behaves wrong.
