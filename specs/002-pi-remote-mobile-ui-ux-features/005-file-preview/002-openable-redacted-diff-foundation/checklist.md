# Checklist — Openable redacted diff foundation

- [x] Existing diff cards remain compact and do not auto-open. — `ArtifactCard` renders a compact card; no auto-open (asserted in `ArtifactCard.test.tsx`).
- [x] The whole card is one accessible button; the six-line peek is noninteractive. — single React Aria `Button` wrapping `aria-hidden`/plain spans; peek is noninteractive.
- [x] Pressing the card opens one full-screen labelled dialog and focuses the first safe heading. — `ArtifactViewerHost` dialog `aria-label="File diff viewer"`, initial focus on heading ref.
- [x] The exact received patch is rendered with visible `+`/`−` prefixes. — `DiffPreview` renders `preview.source.patch` unchanged; asserted in `ArtifactViewer.test.tsx`.
- [x] Opening the diff makes no `fetch`, WebSocket, filesystem/path, or tool request. — negative control spies `fetch`+`WebSocket`, asserts zero calls; security scan of `src/artifacts/` clean.
- [x] Close, Escape, browser Back, iOS edge-back, and VoiceOver scrub return to the same session. — all five dismissal paths in `ArtifactViewerHost` + `useArtifactHistory`; asserted.
- [x] Chat scroll position and originating-card focus are restored, with the transcript fallback when virtualization removed the trigger. — `restorePreview` restores scroll + focuses trigger, falls back to `[aria-label="Typed transcript"]`; asserted (`falls back to the transcript region…`).
- [x] Second-source replacement and close-during-opening cannot commit stale viewer state. — generation counter + `clearTimers` cancel the first opening transition; two tests (`replaces a source…`, `invalidates the opening transition when closed before it becomes ready`).
- [x] The locked ink-on-parchment light/dark system, safe areas, focus rings, reduced motion, and 390px reflow are verified. — `style.css` frozen tokens; light+dark CDP at 390px inspected.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm run test:web` passes, including the negative filesystem-request control. — exit 0, 472 passed (26 files); negative control green.
- [x] The light CDP command passes at exactly 390 CSS pixels and its screenshot is inspected. — `file-preview-cdp.mjs … --theme light` exit 0, 390 CSS px, no overflow, PNG inspected.
- [x] The dark CDP command passes at exactly 390 CSS pixels and its screenshot is inspected. — `file-preview-cdp.mjs … --theme dark` exit 0, 390 CSS px, no overflow, PNG inspected.
- [x] Temporary screenshot output is outside the repository and no application, protocol, relay, or `001-research` file changed. — PNGs written to `$TMPDIR`; git status shows only allowlisted web files changed; no `packages/`/`relay/`/`extensions/`/`001-research` change.
