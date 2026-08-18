# Iteration 001 — Lens: Untitled UI React + the Figma→code token-seam model

**Pass goal:** what a designer-editable coded system on THIS stack (Tailwind + react-aria) does
for editability, and what it teaches the Pi Remote seam model.

## Findings

- **Untitled UI React positions itself as "the world's largest collection of React components"
  explicitly built on "Tailwind CSS + React Aria"** ([C4]). That is the exact stack of
  `apps/pi-remote-web` (Tailwind 4 via the Vite plugin + `@theme`; react-aria-components v1.11).
  So the app is already on the reference "designer-editable coded system" stack — the gap is
  convention/tokens, not stack.
- Its value proposition against a Figma-first UI kit is **cross-surface consistency from the same
  tokens in design and code**: dedicated **Figma VARIABLES + STYLES** previews let a designer
  rebrand and see the React components follow. The editability mechanism is a **token/theme seam**,
  not a visual WYSIWYG editor over code ([C4]).
- What it does **not** do: it does not expose a machine `@ds`-style inventory of which parts a
  non-engineer may touch. That labeling is this packet's differentiator (the brief's "one step
  further" target bar).

## Implication for Pi Remote

- Adopt the **token-first seam** model: a designer edits tokens/theme values and the components
  follow — mirroring Untitled UI's VARIABLES→code handoff.
- Add what Untitled UI omits: an inline-comment grammar that **names the seam and fences what a
  designer may not touch** (Decision 2), turning "rebrand and hope" into "retint a labelled
  `@ds edit` row safely".

## Rejected alternative

A **visual low-code editor overlay** (Figma-to-component-bound, drag-drop style). Heavier than the
read-only posture wants, adds a runtime/CLI dependency, and moves the source of truth out of the
single stylesheet. The codec is the seam; the token is the handle.

## Confirmed by
- <https://www.untitledui.com/react> (fetched): "Tailwind CSS + React Aria", Figma VARIABLES/STYLES
  preview, designer-developer handoff marketing.
- Repo: `apps/pi-remote-web/package.json` (react-aria-components ^1.11, tailwindcss ^4.1.11,
  @tailwindcss/vite) and `src/style.css` `@theme` block.