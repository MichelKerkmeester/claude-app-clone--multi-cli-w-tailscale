# Plan — Control primitives

## Approach

Establish the canonical per-state seam set once, then move the shared controls onto it without
changing behaviour. Read the current react-aria state styling, define one `@ds state:` block per
visual state reading from tokens, migrate Button / Toggle / Disclosure and the status/state
components onto it, and prove each primitive renders identically. Leave react-aria's behaviour and
a11y untouched.

## Steps

1. Inventory the shared controls and their current state styling in `style.css` (`[aria-pressed]`,
   `[aria-busy]`, `:focus-visible`, `data-*`) across `App.tsx` and `RuntimeStrip.tsx`.
2. Define the canonical per-state seam set: one `@ds state:` block each for default, hover, pressed,
   disabled, focus-visible, and busy, reading from tokens only.
3. Migrate Button, ToggleButton, ToggleButtonGroup, and Disclosure / DisclosurePanel onto the seam
   set, each fenced with `@ds surface:` and a `@ds guardrail` on the react-aria wiring.
4. Migrate StatusPill, Freshness, EmptyState, SessionStateIcon, and the inline glyphs onto tokens,
   preserving their state variants.
5. Confirm behaviour, focus order, and a11y semantics are unchanged (react-aria still owns them).
6. Capture true-390px light/dark of a primitives fixture and diff against the pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/style.css` (primitive control + status rules; seam labels, token reads)
- `apps/pi-remote-web/src/App.tsx` (className/seam alignment for the shared controls and status
  components — presentation only)
- `apps/pi-remote-web/src/RuntimeStrip.tsx` (ToggleButtonGroup seam alignment — presentation only)
- `scripts/design-system-cdp.mjs` (primitives fixture support, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface primitives --viewport-width 390 --theme light --output <temporary-directory>/primitives-light.png
node scripts/design-system-cdp.mjs --surface primitives --viewport-width 390 --theme dark --output <temporary-directory>/primitives-dark.png
```

The gate passes only when all suites and the build pass, react-aria interaction/a11y tests stay
green, the CDP runner reports exactly 390 CSS pixels with zero page horizontal overflow, and the
light/dark captures of every primitive state are visually identical to the pre-migration baseline.
