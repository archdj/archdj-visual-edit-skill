# Handling Regressions

Sooner or later an edit will break something. The user will say "wait, that changed the footer too" or "the mobile layout is broken now" or "the animation is gone." Good recovery is as much a part of the loop as good editing.

## First response to "that broke something"

Don't jump to fixing. Diagnose first.

1. **Ask for evidence if you don't have it yet.** "Can you send a screenshot showing what's wrong, ideally with the before for comparison?"
2. **Reproduce mentally from the diff.** Look at what you changed in the last edit. For each change, ask: "could this plausibly affect what the user is reporting?"
3. **State your hypothesis before acting.** "My guess: when I changed `--space-3`, that also affected the footer padding because the footer uses the same token. Let me check the footer file."
4. **Confirm, then fix.** Don't speculatively edit.

This is slower than just trying stuff, but "try stuff" often makes things worse.

## Common causes

### Token change cascading

Symptom: user asked for a region change, but unrelated sections also shifted.
Cause: edit touched a design token used in multiple places.
Fix: revert the token change, add a region-specific value instead. If the user actually wants the token change globally, they'll say so.

### Selector too broad

Symptom: "make this button red" made every button red.
Cause: CSS selector like `.button { color: red; }` instead of `#hero .button`.
Fix: scope the selector to the intended region.

### Missing responsive breakpoint

Symptom: desktop looks right, mobile is broken (or vice versa).
Cause: edit was written for one viewport only; media queries not updated.
Fix: add the change to the corresponding media query, or use responsive units / container queries.

### CSS specificity war

Symptom: the edit "didn't apply" or keeps getting overridden.
Cause: another rule with higher specificity is winning. Or `!important` is in play somewhere.
Fix: use browser devtools to see which rule is winning (the user can send a screenshot of the computed styles panel). Adjust specificity minimally — don't escalate to `!important` unless already matching the codebase's style.

### Dark mode / theme variant forgotten

Symptom: looks right in light mode, wrong in dark mode (or vice versa).
Cause: edited one theme only.
Fix: find the matching override, update there too. Tokens should be defined per theme at the `:root` and `[data-theme="dark"]` (or equivalent) level.

### Hot reload stale

Symptom: user says "it didn't change" but the code definitely changed.
Cause: HMR got confused, or browser cached something, or the dev server crashed silently.
Fix: suggest hard refresh (Cmd/Ctrl+Shift+R), or restart the dev server. This is before assuming the code is wrong.

## Reverting cleanly

If the fix isn't obvious and the user is frustrated, revert and try again with a smaller change.

If the project is in git:
```bash
git diff                      # see what the last edit changed
git checkout -- <file>        # revert specific file to last committed state
git reset --hard HEAD         # revert all uncommitted changes (destructive — confirm)
```

If recent edits were committed:
```bash
git log --oneline -5          # find the last known-good commit
git revert <bad-commit-sha>   # create an undo commit — preserves history
```

This is why the main SKILL.md recommends committing between iterations: it makes rollback one command instead of an archaeology project.

## When the user is frustrated

After 3+ failed edits, the user will be annoyed. Handle it directly:

- Acknowledge briefly ("I see the last two tries didn't land — sorry.")
- Suggest a reset. "Let's revert to the last commit and try a different approach. Want me to walk through what I'd do differently?"
- Don't pile on more edits. Stop, reset, re-understand the goal, then act.

Don't over-apologize or go into long self-critical explanations. One clear acknowledgment and a concrete next step is better.

## Preventing regressions in the first place

- Keep edits small. A 2-line change is easier to diagnose than a 40-line one.
- Commit frequently. After each successful iteration that the user approves, suggest a commit.
- Prefer additive changes over invasive ones. Adding a new class is safer than modifying an existing one used in 10 places.
- Name things well upfront. Half of regressions trace back to selectors that were too generic (`.card`, `.wrapper`) and got picked up by an edit meant for somewhere else. See `setup.md` on naming.
- Test the obvious viewport variants after theme / token changes. "I changed the accent color — check the buttons, links, and any icons that use accent."
