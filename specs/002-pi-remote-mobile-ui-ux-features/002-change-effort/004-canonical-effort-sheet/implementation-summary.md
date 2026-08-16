# Implementation Summary — Canonical sheet, effort rows, and shared entry points

## Final state

Complete and verified. The split effort controls are replaced by one canonical `ModelEffortSheet` — model picker + a controlled React Aria effort radio group — opened from both the header (model section) and the RuntimeStrip (effort section), driven entirely by the phase-2 runtime hook with no local committed state. Implemented by DeepSeek v4 Flash Max (via the Devin CLI, dangerous mode); orchestrated and verified by Claude.

## What shipped (web-only)

- **`effort.ts` (new):** the effort catalog — seven known IDs with exact local labels/descriptions and confirmed/pending trigger formatters; unknown IDs render as bounded ordinals derived from host position, so raw host IDs never reach copy.
- **`EffortRadioGroup.tsx` (new):** one controlled React Aria radio per host-advertised level (host order + subset), descriptions, the confirmed value as the checked row, a requested-row pending indicator, `aria-busy`, and read-only guards. `onChange → onSelect(level)` routes to the runtime hook.
- **`ModelEffortSheet.tsx` (new):** the ONE canonical controlled sheet (`initialSection` "model"|"effort", one top-level dialog, hydrate-on-open, safe-area padding, pending dismissal that does not cancel the request). `ModelSwitcherSheet.tsx` (feature 001, 673 lines) was folded into it and deleted; its behavior + tests carried over.
- **`SessionHeader.tsx` / `RuntimeStrip.tsx`:** both open the shared sheet (header→model, RuntimeStrip→effort), render confirmed values as separate spans, and restore focus to the originating trigger.
- **`SessionComposer.tsx` / `App.tsx`:** one `ModelEffortSheet` instance per session view; one document-level status region.
- **`style.css` (+336):** responsive light/dark radio/sheet/trigger/pending/edge-state styles using only the frozen tokens (zero new colors added).

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → 147/147 on a clean run (backend unchanged). The pre-existing flaky `auth.test.ts` foreground test intermittently reports 146/147 — a documented socket-close race, unrelated to this web-only phase (isolated re-run 12/12).
- `npm run test:web` → exit 0, **143 passed (143)** (+41 new: effort catalog, radio group, one-shared-sheet-two-entry-points, no-local-committed-state, pending, edge states).
- Design review (Claude): zero new colors in `style.css`. Security review: no ticket/control minting in the UI; unknown IDs → bounded ordinals; mutations only via the phase-2 hook; no protocol/relay/policy source touched.

## Frozen contracts

- Design system unchanged (frozen tokens only; no third typeface).
- Security unchanged and re-verified: no new mutation path; confirmed values move only from accepted host state; raw IDs/host labels/issue codes/RPC reasons/HTTP bodies never enter visible or accessible copy; Build/Plan authority + foreground ownership + redaction intact.

## Deferred

- True-390px CDP captures ride the feature-002 visual checkpoint (after phase `005`, the a11y/visual-hardening phase, when the effort sheet is visually final). This is the first VISIBLE feature-002 change; component-level 44px/overflow/one-dialog/contrast proxies pass in jsdom now.
