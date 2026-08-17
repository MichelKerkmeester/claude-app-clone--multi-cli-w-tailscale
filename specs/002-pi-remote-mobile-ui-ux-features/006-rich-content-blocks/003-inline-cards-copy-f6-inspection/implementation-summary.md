# Implementation Summary — Phase 2 — Inline cards, exact Copy, and F6 inspection

## Final state

Complete and verified. The first user-visible rich-content slice ships over the Phase-1 contract: semantic Bash Command/Output cards, code and text-artifact cards, exact unit-level Copy, and explicit full-screen Open through the EXISTING feature-005 F6 viewer (one shared modal, no second overlay). Plaintext is the first-paint and failure renderer for code; every action operates on committed redacted snapshots with no new data path. Implemented by GPT-5.6 Luna Max (via the Cursor CLI); orchestrated and verified by Claude.

## What shipped (web only)

- **`rich-content/` components**: `normalizeTranscriptBlocks.ts` (pure; pairs shell call/result only by `callId`, keeps result-before-call pending, ignores duplicate/lower revisions, never classifies optimistic prompts), `RichContentRouter.tsx` (exhaustive routing; malformed/legacy-incomplete content is non-copyable + non-openable), `RichBlockFrame.tsx` + `RedactionBadge.tsx` (shared chrome + non-sensitive reason categories), `CommandOutputCard.tsx` (separate Command/Output regions, lifecycle labels, tail-first preview, stable streaming geometry, `Copy command`/conditional `Copy output`/`Copy current output`/`Open full screen`), `CodeCard.tsx` (escaped plaintext `<pre><code>`, allowlisted language labels, bounded preview, code-only horizontal pan, `Copy code`, Open), `TextArtifactCard.tsx` (trusted labels + `Long text` after settlement, Source Serif preview, `Copy text`, Open), `SafeMarkdown.tsx` (strict React-AST subset; inert), `useCopyFeedback.ts` (direct `writeText` of the canonical source from `onPress`, focus-preserving, polite announcement, hidden when Clipboard API missing), `F6ViewerAdapter.tsx` (maps cards to the existing `ArtifactViewerProvider`'s frozen in-memory document — no fetch, no second modal, opaque-id history).
- **Integration** (`App.tsx`, `state.ts`): normalize + route committed transcript blocks with the provider outside the virtualized transcript; stable turn keys + optimistic-prompt exclusion preserved. `turns.ts`, `relay.ts`, and the service worker needed no change.
- **Viewer seam** (`artifacts/ArtifactViewerProvider.tsx`, `ArtifactViewerHost.tsx`): a minimal adapter seam to accept the frozen in-memory document; the single existing `ModalOverlay` is reused (no second modal); existing diff/file-preview behavior unchanged.
- **Styling/cache** (`style.css`, `cache.ts`): light/dark card + shell-well + focus-ring + 44px action + safe-area + reduced-motion + 320px + code-only-overflow rules on the frozen tokens; cache holds only the bounded transcript representation (no rich bodies/highlight output).
- **Fixtures/tests + CDP** (`demo.ts`, 8 new component tests + `pwa-cache` extension, `scripts/rich-content-cdp.mjs` `rich-core`): every lifecycle/output/code/artifact/long-text/stale/unknown/result-before-call/optimistic/malformed state.

## Verification (Claude, in the worktree, OUTSIDE the cursor session)

- Blast check: main checkout untouched (cursor ran `--force --sandbox disabled` in the worktree).
- `npm run build` → exit 0; `npm run typecheck` → exit 0.
- `npm test` → exit 0, **256 passed (32 files)** — backend unchanged; the known `auth.test.ts` socket-close race passed this run.
- `npm run test:web` → exit 0, **528 passed (42 files)** (+17: normalize/router/each card/SafeMarkdown/copy-feedback/F6-adapter/cache). Phase-1 and features 001–005 unchanged.
- CDP: `rich-content-cdp.mjs --fixture rich-core --theme {light,dark}` → both exit 0, exactly 390 CSS px, no page overflow, ≥44px actions; Copy/Open/Close + malformed fallback exercised; screenshots inspected — Claude-style Command/Output card with `[redacted command]`, `Redacted · Input` badge, lifecycle status, and Copy/Open actions.
- Security review (Claude read the diffs): SafeMarkdown is inert (no `dangerouslySetInnerHTML`; raw-HTML + `javascript:`/`data:`/`blob:`/`file:` schemes rejected to a plain-text fallback; link/image URLs stripped to label/alt text; allowlisted code languages); Copy writes the canonical redacted source string (never highlighted DOM/`getSelection`); F6 reuses the single existing viewer modal (no second `ModalOverlay`); no `fetch`/`WebSocket`/`createObjectURL`/`href` in `rich-content/`.

## Frozen contracts

- Design: frozen ink-on-parchment tokens, Inter + Source Serif 4, ≥44px actions; no new visual language/shadow/accent.
- Security preserved: components receive only committed redacted source + bounded provenance; open/copy/wrap/close make no fetch/WebSocket/ticket/host-file/filesystem/relay call; malformed/legacy/unsafe/optimistic content is non-copyable + non-openable; redaction markers stay the only sensitive values reaching browser + clipboard.

## Deferred

- Progressive syntax highlighting (worker), large-content/bidi/ANSI hardening, and the physical-device pass are Phase 3; code remains plaintext-first here and highlighting is never a prerequisite for reading or copying.
