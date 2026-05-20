# Reading Annotated Screenshots

When the user sends an annotated screenshot, treat it as structured input with known conventions. Don't guess silently — interpret, state the interpretation, ask if unclear, then edit.

## Common annotation conventions

Most users use one of a handful of markup styles. Recognize these:

| Annotation | Usual meaning |
|---|---|
| **Red box / rectangle around an element** | "This is the thing I want changed." Scope of the change = whatever's inside the box. |
| **Circle around an element** | Same as red box — "this element." Often used for small things (an icon, a word). |
| **Arrow pointing to something** | "Look here" or "this specific element." The arrow's tip is the target, not the shaft. |
| **Text note near an element** | The instruction. "make bigger", "too much space", "wrong color", "use red here". |
| **Line crossing something out** (strikethrough) | "Remove this." |
| **Line connecting two things** | "Make these match" or "move this to here" — check the note for which. |
| **Multiple colors of marks** | Usually each color is a separate issue. Treat them as a list. |
| **Numbered marks (1, 2, 3)** | Explicit list of changes to make, in order. |

If the annotation doesn't match any convention — say, a free-form squiggle — describe what you see and ask what they mean.

## Handling the "box + note" case

This is the most common pattern: a colored box around a region, with a text note nearby. The workflow:

1. **Identify the region in the screenshot.** "The box is around the top navigation bar, including the logo and the menu items."
2. **Map it to code.** "That corresponds to `<header>` in `src/components/Header.jsx` (or `<!-- SECTION: Header -->` in `index.html`)."
3. **Parse the instruction.** What does the note actually ask for? If it's "too cramped" — interpret as spacing; if "wrong color" — ask which color they want; if "use the brand color" — check if there's a defined token.
4. **State your plan before editing.** One sentence: "I'll increase the vertical padding on the header from `--space-3` to `--space-4` and add `gap: var(--space-4)` to the nav list."
5. **Edit.**

## When to ask vs when to just do it

**Just do it** when:
- The instruction is unambiguous ("make the title 48px instead of 32px")
- The target is clearly isolated (one button, one section)
- The change is easily reversible (color, size, spacing, copy)

**Ask first** when:
- Multiple elements could be the target ("this" with a box containing 4 cards — one card? all cards?)
- The change has knock-on effects ("make this wider" on a flex item — does the user want the whole layout to rebalance, or just that item?)
- The instruction uses a subjective word and there's a design choice to make ("make this prettier", "more modern", "cleaner")
- The annotation suggests structural change ("move this above that") — always confirm
- The user wrote a color name but you have a themed palette (did they mean literal red, or the accent color which happens to be a red shade?)

One question is always cheaper than a wrong edit and a re-do.

## Handling ambiguity well

Bad: *"I'll change it."* (doesn't surface the ambiguity)
Bad: *"Which one did you mean?"* (too open; user has to re-specify from scratch)
Good: *"The box contains four pricing cards. Did you want me to (a) increase spacing between all four, (b) change the styling of just the middle one that looks highlighted, or (c) something else?"*

Enumerate the plausible interpretations. That way the user picks a letter instead of retyping the whole request.

## Multi-issue screenshots

If the user sends one screenshot with multiple annotations:

1. List what you see as a numbered set: "I see three things marked: 1) the hero title is crossed out with 'too small' written, 2) a red box around the feature grid with '4 columns?', 3) an arrow at the footer with 'color doesn't match'."
2. Confirm you've got them all: "Is that the full list?"
3. Tackle them one at a time, or in a single pass if all are small and clearly scoped. Mention which you're starting with.

Don't try to telepathically catch a fourth change the user didn't mark. If something looks wrong but isn't annotated, flag it separately: "Unrelated — I noticed the FAQ section has inconsistent heading weights. Want me to fix that too, or leave it?"

## Screenshots without annotations

Sometimes the user sends a clean screenshot with just a written instruction ("change the hero color"). Same principles apply: identify the target in code, state the target, ask if ambiguous.

If the user sends a screenshot with no instruction at all, ask what they want done. Don't guess.

## Screenshots of other sites as reference

If the user sends a screenshot of a *different* site with "make mine look like this":

- Describe what specifically you'll borrow: "I'll adopt the oversized serif headline, the muted beige background, and the inline numbered sections."
- **Don't copy pixel-exact.** You're taking design cues, not pirating. Mention this: "I'll take the aesthetic direction, not reproduce their exact layout or copy."
- Ask which aspects to match if the reference has multiple distinctive features and it's unclear which are important.

## What to do with the annotation image after

You do not need to save or embed the screenshot. Reference it in your response ("the screenshot you sent") so the user knows you looked at it, but the output is code changes, not image files.
