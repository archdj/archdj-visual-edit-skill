# Edit Scope: Region vs Global vs Structural

Every edit request falls into one of three categories. Misclassifying leads to regressions — the user asks to tweak a button and the whole page shifts. Before editing, classify, then apply the matching rules.

## The three categories

### Region edit
**Scope:** one section / component / element.
**Signal:** "this button", "the hero", "that card", annotated screenshot with a box around one area.
**Rule:** touch exactly the files/selectors that render that region. Nothing else.

### Global edit
**Scope:** design tokens or theme — colors, spacing scale, font stack, radius conventions.
**Signal:** "the whole site", "everywhere", "every button", "make it feel more X", "warmer palette", "tighter overall".
**Rule:** edit the tokens file (CSS custom properties, Tailwind config, theme object). Don't edit every component individually.

### Structural edit
**Scope:** layout, component tree, section order, page composition.
**Signal:** "move X above Y", "combine these", "split this into two", "remove this section entirely", "turn this into a sidebar".
**Rule:** confirm the change before making it. These are higher-risk. State the plan: "I'll move `<Pricing>` to render before `<Features>` in `App.jsx` and adjust any related anchor links. Proceed?"

## Classification table

| User says... | Category | Why |
|---|---|---|
| "make this red" (on a boxed button) | Region | One element, one property |
| "the title is too big" (on a boxed hero) | Region | One element |
| "everything feels cramped" | Global | Spacing scale change |
| "use a serif for all headings" | Global | Font token change |
| "the CTA color should match everywhere" | Global | One color across instances → token |
| "swap the order of features and pricing" | Structural | Component tree change |
| "move this button to the header" | Structural | Cross-region move |
| "make the whole page darker" | Global | Theme-level |
| "this button and that button should match" | Region × 2 or Global? Ask. |

When in doubt between region and global, ask: "Just this one, or everywhere this style appears?"

## Isolation rules for region edits

When making a region edit:

1. **Open only the file(s) that render that region.** If the project has one-component-per-section structure, this is trivial.
2. **Use scoped selectors.** If editing raw CSS, selectors should include the region's id or class: `#hero .cta` not `.cta`. Otherwise you change every `.cta` on the page.
3. **Do not rename things outside the region.** Even "cleanup" that seems helpful. If a variable used elsewhere is badly named, note it — don't rename it as part of a region edit.
4. **Do not touch tokens unless asked.** If the region edit requires a color and the color isn't in the palette, propose two options: (a) add a new token, or (b) use an existing token. Let the user decide.
5. **Do not refactor.** If the region's code is messy, don't clean it up unless the user asked for a refactor. Messy code that works is better than refactored code that breaks.

## Making global edits correctly

When making a global edit:

1. **Locate the token source.** `styles/tokens.css`, `tailwind.config.js`, `theme.ts`, whatever the project uses. If the project doesn't have one, flag this: "Your colors are hardcoded in each component. I can (a) extract them to tokens first, which takes a few minutes but makes future global edits trivial, or (b) do a find-and-replace now. Which?"
2. **Change the token, not every usage.** `--color-accent: #ff5d3b` becomes `--color-accent: #c44a2e`. Done. Every component using `var(--color-accent)` updates automatically.
3. **Check visual regressions.** Token changes affect everything that uses them. After a global edit, prompt the user to screenshot key sections ("Check hero, pricing, footer — anything look off?").

## Making structural edits safely

Structural edits are the most likely to break things. Before any structural edit:

1. **State the plan explicitly**, including all side effects you can see:
   > "Moving `<Pricing>` before `<Features>` means:
   > - Changing the render order in `App.jsx`
   > - The anchor link `#pricing` in the nav will still work (id stays on the section)
   > - The page flow depends on Features introducing concepts that Pricing uses — the text might need tweaking. Want me to do the move only, or also adapt the copy?"
2. **Ask before proceeding.** Structural edits rarely need to be instant.
3. **Make the smallest change that achieves the goal.** Don't combine "move this" with "also restyle it" unless asked.

## When a request mixes categories

Example: "make the pricing cards bigger and use the warmer orange I asked for earlier everywhere."

Two edits: one region (pricing cards bigger), one global (color token change). Handle them as two edits, state them separately, and make them in sequence:

> "Two changes:
> 1. Increase pricing card size — region edit in `Pricing.jsx`
> 2. Switch `--color-accent` from the current coral to a warmer orange — global edit in `tokens.css`
>
> Doing #2 first since the pricing cards use the accent color — that way you'll see both changes together on refresh."

Thinking out loud like this catches ordering issues before they become "why is it flickering?"

## Anti-patterns to avoid

- **"While I'm here..."** No. Region edits stay in the region. Side improvements get flagged, not silently included.
- **Touching tokens "just to be safe"** when the user asked for a region edit. Tokens affect everything. Don't.
- **Editing HTML structure on a styling request.** If the user asks for a color change, don't reorder the DOM.
- **Adding new dependencies** without asking. "I used a library for this" on what was supposed to be a small CSS tweak is unwelcome.
- **Rewriting working code in a different style.** If the project uses CSS modules, don't sneak in styled-components. Match the existing conventions.
