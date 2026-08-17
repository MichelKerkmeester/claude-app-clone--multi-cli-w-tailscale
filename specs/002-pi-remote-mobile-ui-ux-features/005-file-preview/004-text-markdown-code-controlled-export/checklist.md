# Checklist — Text, Markdown, code, and controlled export

- [x] Text, Markdown, code, and diff render the exact received bytes of the frozen revision. — renderers consume the digest-verified resource; tested.
- [x] Markdown renders a strict inert AST; raw HTML, remote images, frames, executable links, and external navigation never execute. — no `dangerouslySetInnerHTML`; links/images render inert with URLs discarded; `MarkdownPreview.test.tsx` proves raw-HTML/`javascript:`/remote-image input is inert.
- [x] Code is readable before highlighting completes; highlighting failure leaves plain text; line numbers cannot be selected or copied. — plain first paint + lazy highlighter fallback; gutter `user-select: none` (CDP-asserted).
- [x] Native selection, Find, Copy, keyboard alternatives, and applicable Wrap work without stealing native long-press or horizontal pan. — controls present; code pans in its own container; CDP asserts selectable text/code + Find/Wrap.
- [x] Delayed A/B resources cannot place one artifact's content under another title, revision, or Share action. — monotonic-generation `isCurrent()` gate; `useArtifactResource.test.ts` A/B race case.
- [x] Close, revoke, expiry, and replacement prevent late commits and remove object URLs, workers, buffers, and DOM payloads. — `cleanupRequest` aborts/terminates/revokes/zero-fills on every terminal transition; tested.
- [x] Loading, stalled, ready, empty, whitespace-only, partial-redaction, truncated, stale, offline, denied, expired, missing, conflict, corrupt, too-large, rate-limited, relay-error, revoked, aborted, and exiting states have explicit tested behavior. — resource status union + relay fixtures + demo states.
- [x] Share is shown only when policy and capability permit it, uses only the displayed revision, confirms redaction/truncation, never mints a URL, and treats cancellation as a no-op. — `artifact-share.ts` shares `{title,text}` only; `artifact-share.test.ts`.
- [x] Raw relay/server diagnostics do not reach the UI. — `relay.ts` maps to coded statuses; error mapping uses codes, not raw strings.
- [x] Text-like bodies, prepared Files, object URLs, and share buffers are absent from persisted cache state. — `cache.ts` persists only bounded descriptors/metadata; tested.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — exit 0, 237 passed (31 files) outside sandbox (Codex's 49 sandbox `EPERM` socket failures all pass outside the sandbox).
- [x] `npm run test:web` passes with race, cleanup, selection/copy, share, and cache coverage. — exit 0, 501 passed (30 files).
- [x] The light text/code/share CDP command passes at exactly 390 CSS pixels and its screenshot is inspected. — exit 0, 390 CSS px, no overflow, PNG inspected.
- [x] The dark text/code/share CDP command passes at exactly 390 CSS pixels and its screenshot is inspected. — exit 0, 390 CSS px, no overflow, PNG inspected.
- [x] Phase 1 and Phase 2 exact-revision, redaction, focus/history, and cache/service-worker boundaries remain green. — full web + backend suites green; no Phase-1/2 regression.
