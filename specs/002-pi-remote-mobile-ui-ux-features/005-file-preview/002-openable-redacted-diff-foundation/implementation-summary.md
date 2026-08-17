# Implementation Summary — Phase 1 — Openable redacted diff foundation

## Final state

Complete and verified. The existing redacted `file_diff` transcript block is now a compact, deliberate card that opens ONE full-screen, history-backed, read-only diff viewer — the shared artifact-viewer shell that later phases (rich content, inbound media) reuse. Web-only: no protocol, relay, or extension change. Implemented by GPT-5.6 Luna Max (via the OpenCode CLI, opencode-go provider); orchestrated and verified by Claude.

## What shipped (web only)

- **Shared viewer shell** (`apps/pi-remote-web/src/artifacts/`): `ArtifactViewerProvider` owns exactly one active preview — a frozen copy of the received diff, its originating trigger, a generation counter, one history entry, and scroll + focus restoration + cleanup. `ArtifactViewerHost` is the full-screen labelled React Aria dialog (inert background; initial focus on the first safe heading; Close / Escape / browser Back / iOS edge-back / VoiceOver-scrub dismissal; closed → opening → ready-diff → exiting states). `ArtifactCard` is one accessible button wrapping a noninteractive six-line peek that keeps `+`/`−` prefixes. `DiffPreview`, `ArtifactHeader`, `ArtifactStatus`, `PreviewControls` render the exact patch, header, polite status region, and control row. `useArtifactHistory` pushes/pops a token-tagged history entry for Back/edge-back without navigating away.
- **Wiring** (`App.tsx`): the provider is mounted outside the virtualized `TranscriptList`; the `file_diff` case routes through `ArtifactCard`; every other block renders unchanged.
- **Styling** (`style.css`, `index.html`): card + full-screen chrome, `viewport-fit=cover`, visual-viewport fallback, safe-area padding, focus rings, reduced motion, and no page horizontal overflow at 390 CSS px — frozen ink-on-parchment tokens only.
- **Demo + verification** (`demo.ts`, `scripts/file-preview-cdp.mjs`): deterministic double-gated diff-open/close fixtures; a zero-dependency CDP runner that drives the demo at 390 CSS px and captures light + dark.

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm run test:web` → exit 0, **472 passed (472)** across 26 files (+13 new: card semantics + no auto-open, whole-card single button + noninteractive peek, full-screen dialog focuses first safe heading, exact patch with `+`/`−`, Close/Escape/Back/edge-back/VoiceOver-scrub restore session + scroll + focus, race-safe second-source + close-during-opening, and the negative no-filesystem/no-network control). Baseline was 459; zero regressions. (The one initial failure was a test-timing bug — a `waitFor` that resolved on summary text during the `opening` phase before `ready-diff` committed — corrected to await the terminal state; the race-safety assertion was strengthened, not weakened, and no component code changed.)
- CDP: `node scripts/file-preview-cdp.mjs --fixture diff --viewport-width 390 --theme {light,dark}` → both exit 0, exactly 390 CSS-px width, no horizontal overflow; both PNGs captured to a temp dir outside the repo and inspected (bone/carbon light, carbon-page dark; Close affordance, redacted metadata, `+`/`−` patch scrolling inside its own container).
- Security review (Claude read the diffs): opening the viewer performs zero `fetch` / WebSocket / filesystem / path / tool / ticket / export operation (negative control asserts `fetch` and `WebSocket` spies uncalled); the opaque block `id` and `location.href` history token never become a host path or block-derived URL; only already-redacted `summary` + `patch` are displayed; read-only + host/extension-enforced Plan mode untouched (no protocol/relay/extension change).

## Frozen contracts

- Design: locked ink-on-parchment tokens only, Inter + Source Serif 4, light + dark, ≥44px targets, no new colors or third typeface.
- Security: read-only-by-default preserved; the viewer is pure in-memory presentation of already-redacted bytes; no new lane, mutation, ticket, or resource request introduced.

## Deferred / operator-required

- The manual real-device pass (installed standalone PWA in Safari: VoiceOver scrub, hardware-keyboard focus, rotation, background/resume, true iOS edge-back) cannot run headlessly and is operator-required; the code + automated axe/DOM/CDP checks are in place.
