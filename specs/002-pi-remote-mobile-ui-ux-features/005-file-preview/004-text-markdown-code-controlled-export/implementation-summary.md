# Implementation Summary — Phase 3 — Text, Markdown, code, and controlled export

## Final state

Complete and verified. Text, strict-inert Markdown, code, and diff now render under the shared viewer over the exact frozen revision, with a race-safe, digest-verified resource lifecycle, native selection/Find/Wrap, Copy, and policy+capability-gated Share — no downloads, no minted URLs, no active content. Image/PDF stay deferred to Phase 4. No new dependency (hand-rolled inert Markdown AST + plain-text-fallback highlighter). Implemented by GPT-5.6 Luna Max — first via the OpenCode CLI (renderers, resource hook, inert Markdown, share), then, after the opencode-go route hit its cap mid-phase, finished via the Codex CLI on the same model; orchestrated and verified by Claude.

## What shipped (web only)

- **`useArtifactResource.ts`**: the sole text-like payload source — one `AbortController` per request, a monotonic generation, exact artifact id/revision/ETag checks, byte-length + double SHA-256 digest verification BEFORE commit, a 15 s stall timer, heartbeat-aware offline mapping, and cleanup that aborts, terminates workers, revokes object URLs, and zero-fills buffers on close/revoke/expiry/replacement. A late or A/B response failing `isCurrent()` is dropped — content never crosses artifact boundaries.
- **Renderers**: `TextPreview` (Source Serif DOM text), `MarkdownPreview` (strict inert AST → React elements; no `dangerouslySetInnerHTML`, links/images render inert with their URLs discarded, fixed safe element set, 50k-line bound), `CodePreview` (plain readable first paint + optional lazy highlighter that degrades to plain text; nonselectable line-number gutter), `UnsupportedPreview`, and completed `DiffPreview` with shared controls.
- **Shell** (`ArtifactViewerHost`/`ArtifactHeader`/`ArtifactStatus`/`PreviewControls`): renderer selection by descriptor, responsive load, one throttled status + one alert region, explicit `View latest` for a stale exact revision, exact-revision header label.
- **`artifact-share.ts`**: `navigator.share` from the press event with `{ title, text: displayedBuffer }` only — no `url`, no `files`; `shareAllowed` + capability gated; partial-redaction/excerpt confirmed; `AbortError`/cancellation is a no-op. Copy writes only the displayed buffer.
- **`relay.ts`/`cache.ts`**: heartbeat/offline mapping + coded (non-raw) error surfacing; cache persists only bounded descriptors/metadata — never bodies, Files, object URLs, or share buffers — and revalidates exact revisions after `pageshow`/bfcache.
- **`style.css`, `demo.ts`, `scripts/file-preview-cdp.mjs`**: Source Serif text, carbon code, selection, horizontal code scroll (page never overflows), Wrap/Find, gutter exclusion, 200%/RTL/reduced-motion/320-390px reflow; a double-gated `text-code-share` demo fixture and CDP mode; six relay artifact-response fixtures (empty/whitespace/truncated/partial-redaction/digest-mismatch/stale).

## Verification (Claude, in the worktree, OUTSIDE any sandbox)

- `npm run build` → exit 0; `npm run typecheck` → exit 0.
- `npm test` → exit 0, **237 passed (31 files)** (+6 relay artifact fixtures). Note: the Codex run reported 49 backend failures — all were its workspace-write sandbox's `listen EPERM` on localhost sockets (auth/artifact-http/authority-loop/plan-control/prompt/runtime-reconcile/slash-submit); every one passes outside the sandbox, and the 6 new fixtures pass.
- `npm run test:web` → exit 0, **501 passed (30 files)** (+25: resource/text/code/markdown/share/race/cleanup — delayed A/B isolation, close-during-fetch, digest-mismatch rejected pre-commit, abort cleanup, stale replacement, native selection/copy, gutter not selectable, share cancellation no-op, cache absence, markdown-inert). Phase-1/Phase-2 stay green.
- CDP: `file-preview-cdp.mjs --fixture text-code-share --theme {light,dark}` → both exit 0, exactly 390 CSS px, no page horizontal overflow, and the runner's own assertions (selectable text/code, Find/Wrap, capability-gated Share, excluded gutter) pass; screenshots inspected — Claude-quality code viewer with exact-revision label + Copy/Share.
- Security review (Claude read the diffs): Markdown inert (no innerHTML; URL-discarded links/images); resource hook race-safe + digest-verify-before-commit + full cleanup; share is displayed-buffer-only with no URL/File and policy+capability gating.

## Orchestration note (transparent deviation)

The opencode-go transport hit a rate cap mid-phase and Devin's daily quota was exhausted, so the finish ran on Codex (OpenAI OAuth) using the same GPT-5.6 Luna Max model — a transport change, not a model change. Because Codex could not run headless Chrome in its sandbox, its CDP `text-code-share` fixture path was never executed and shipped a shell-escaping bug (a single-quoted `\"` that collapsed to `"` and broke a `querySelector` argument). Claude fixed that one line in the `scripts/` verification harness — verification tooling outside the `apps/`/`packages/`/`extensions/` app-code boundary — so the required screenshots could be produced; no application code was written by Claude.

## Frozen contracts

- Design: locked ink-on-parchment tokens only, Inter + Source Serif 4, light + dark, ≥44px targets, no new colors/typeface.
- Security preserved/strengthened: exact-revision + digest-verified reads, inert Markdown, displayed-buffer-only export with no URL minting, no cached bodies/buffers, read-only-by-default and Plan mode untouched.

## Deferred / operator-required

- Image/PDF renderers + binary sanitization/Share remain deferred to Phase 4.
- The manual installed-PWA/Safari/VoiceOver device pass (native long-press, hardware keyboard Find, rotation, bfcache resume) is operator-required; the code + automated axe/DOM/CDP checks are in place.
