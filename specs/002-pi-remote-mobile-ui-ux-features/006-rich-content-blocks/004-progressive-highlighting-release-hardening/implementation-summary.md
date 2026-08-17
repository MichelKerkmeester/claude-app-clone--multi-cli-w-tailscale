# Implementation Summary — Phase 3 — Progressive highlighting, accessibility, and release hardening

## Final state

Complete and verified (automated gates); the physical-device pass is operator-required. Rich content now reaches Claude-style inspection quality without making highlighting, streaming, or large payloads a prerequisite for reading: a bounded, disposable worker highlighter over the plaintext-first renderer, hardened SafeMarkdown (ANSI/bidi/HTML/URL), full F6/streaming reconciliation, a11y/RTL/200%/reduced-motion styling, and resource cleanup. This completes FEATURE 006 (rich-content-blocks) — all three phases. Implemented by GPT-5.6 Luna Max (via the Cursor CLI); orchestrated and verified by Claude.

## What shipped (web + relay/protocol tests)

- **Highlighter worker** (`rich-content/useHighlightedCode.ts` + `highlight.worker.ts`, Vite-bundled, hand-rolled — no library): language allowlist (bash/js/ts/jsx/tsx/json/html/css/markdown/python/go/rust/yaml/sql/diff/ansi/plaintext); plaintext visible before completion and after any failure. The worker receives ONLY the canonical redacted source + language/theme/contentHash/requestId/revisionId. A 20,000-char/1,000-line cutoff is enforced BEFORE dispatch. Stale request/revision responses are dropped (requestId + revisionId + contentHash + `tokensCoverSource` all checked). Highlight output is memory-only and cleared on revision change / close / disposal; the worker is terminated and counters decremented on cleanup (`getHighlightResourceStats` backs a no-growth test). The worker does no network; tokens render as plain `<span>{token.text}</span>` text nodes (no `dangerouslySetInnerHTML`); Copy stays verbatim from the canonical source.
- **SafeMarkdown hardening**: inert against raw HTML, unsafe schemes, data: URLs, media, forms, iframes, scripts, malformed nesting, ANSI bytes, and bidi controls; verbatim Copy unchanged.
- **Streaming + F6 reconciliation** (`CommandOutputCard`, `F6ViewerAdapter`, `RichContentRouter`, `normalizeTranscriptBlocks`, viewer seam on `ArtifactViewerHost`/`ArtifactViewerProvider`/`CodePreview`): revision reconciliation, stale-cache labels, connection-loss states, terminal-without-result, source removal (keeps last trustworthy redacted snapshot), running-tail live-edge follow + jump-to-latest, no refocus/reopen on replay; F6 history is an opaque block ID only.
- **Styling** (`style.css`): light/dark shell wells, AA syntax-token contrast, two-color focus rings, logical/RTL layout, 200% text, 320px/landscape reflow, safe-area insets, contained overscroll, reduced-motion ≤100ms.
- **Tests/fixtures/CDP**: new `highlight.worker` / `useHighlightedCode` / `demo-rich-release` web tests + extended CodePreview/CommandOutputCard/F6ViewerAdapter/SafeMarkdown/contrast; relay security-negative + redaction + recorded-fixture-flow + transcript-projector additions; protocol guard-test additions; `rich-content-cdp.mjs` `rich-release` state matrix.

## Verification (Claude, in the worktree, OUTSIDE the cursor session)

- Blast check: main checkout untouched (cursor ran `--force --sandbox disabled` in the worktree).
- `npm run build` → exit 0 (worker bundles); `npm run typecheck` → exit 0.
- `npm test` → exit 0, **261 passed (32 files)** (+5 relay/protocol tests; the known `auth.test.ts` socket-close race passed this run).
- `npm run test:web` → exit 0, **545 passed (44 files)** (+17: highlight worker/hook, hardening, memory, release). Phase 1/2 + features 001–005 stay green.
- `npm run lint`: the phase-3 changed files are lint-clean (scoped `eslint` on every changed/new `.ts`/`.tsx`/`.mjs` → exit 0). Repo-wide `eslint .` still fails on ~45 PRE-EXISTING errors in UNMODIFIED files (no rich-content/phase-3 file appears in the failures) — the same external-model lint/format debt class as the documented ~685-file prettier debt; out of phase-3 scope (flagged for a dedicated cleanup pass).
- CDP: `rich-content-cdp.mjs --fixture rich-release --theme {light,dark}` → both exit 0, exactly 390 CSS px, state matrix + bounded viewer + reduced motion + 200% text; screenshots inspected (redaction preserved, lifecycle status, no overflow at 200% text).
- Security review (Claude read the diffs): worker gets only the redacted source; cutoff before dispatch; stale-response dropped; memory-only + cleaned on disposal; worker does no network; token spans are text nodes (no innerHTML); SafeMarkdown inert against HTML/schemes/ANSI/bidi; Copy verbatim from canonical source; F6 opaque-id history, no network/mutation on open/close/replay.

## Frozen contracts

- Design: frozen ink-on-parchment tokens, Inter + Source Serif 4; syntax tokens meet AA in both themes using only the palette; no new visual language/accent.
- Security preserved: highlighting is a disposable enhancement that never sees unredacted content, never persists output, and never lets a stale response overwrite a newer revision; no Run/Retry/Edit/Approve/Apply/Download/Publish/Open-on-host/Share-file/raw-HTML/filesystem/mutation-ticket/rich-content-fetch path (negative controls); read-only-by-default intact.

## Deferred / operator-required (NOT fabricated)

- The installed-PWA physical-device checklist on the oldest supported iPhone — Safari + standalone, VoiceOver, Voice Control, external keyboard, native selection, Back/edge-back, suspension/bfcache, relay loss, RTL, 200% text, reduced motion, streaming, large code, repeated viewer cycles — CANNOT run headlessly and is operator-required. Code + automated axe/DOM/memory/CDP checks are in place; no device/VoiceOver evidence is claimed.
- Repo-wide `eslint .` / `prettier` debt in pre-existing unmodified files remains a separate, feature-independent cleanup.
