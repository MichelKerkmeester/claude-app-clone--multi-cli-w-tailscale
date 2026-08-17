# Checklist — Inline cards, exact Copy, and F6 inspection

- [x] Shell calls/results, fenced code, explicit artifacts, and settled long text render as the specified cards. — RichContentRouter + CommandOutputCard/CodeCard/TextArtifactCard; CDP rich-core.
- [x] Short prose, routine tools, thinking, usage, diffs, optimistic prompts, and unsafe/unknown blocks remain on their specified existing or safe fallback paths with no Copy/Open where required. — router leaves these on existing paths; malformed/legacy-incomplete non-copyable + non-openable.
- [x] Every Command/Output lifecycle and code/text card state has the correct status, bounded preview, available actions, and canonical source. — component tests + demo fixtures across states.
- [x] Command, output, current streaming output, code, text, and F6 Copy all are exact string matches, including whitespace and final newlines. — `useCopyFeedback` writes the canonical source; exact-string copy tests incl. final newline.
- [x] Copy success, failure, and unavailable states preserve focus and expose the required persistent announcement or recovery text without toast, network, worker, or permission-query dependency. — `copy-feedback` tests; action hidden when Clipboard API missing.
- [x] F6 uses one shared React Aria viewer, stores only an opaque block ID in ephemeral history, traps focus, supports all required dismissals, restores focus/scroll, and leaves virtualized row height unchanged. — `F6ViewerAdapter` reuses the single existing `ArtifactViewerProvider` modal (no second `ModalOverlay`); adapter test.
- [x] Completed F6 command/output opens at the top; running output opens at the tail, follows only at the live edge, and exposes Jump to latest after upward scroll. — adapter + CDP running-tail/completed-top exercised.
- [x] Safe Markdown and card previews cannot create executable/raw DOM or remote navigation; redaction markers are the only sensitive values visible to browser and clipboard. — `SafeMarkdown` inert (no innerHTML; raw-HTML/`javascript:`/`data:` rejected to plaintext; link/image URLs stripped); `SafeMarkdown` tests.
- [x] True-390px light and dark captures show card hierarchy, shell-well boundary, 44px controls, safe areas, no page overflow, and unchanged composer behavior. — CDP light+dark inspected.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — exit 0, 256 passed (32 files).
- [x] `npm run test:web` passes. — exit 0, 528 passed (42 files).
- [x] `npm run build` passes. — exit 0.
- [x] Mocked fetch, WebSocket, ticket, filesystem, and host-call spies report zero rich-content calls. — no-network tests on open/copy/wrap/close; no `fetch`/`WebSocket`/`createObjectURL` in `rich-content/`.
- [x] Every visible action measures at least 44×44 CSS pixels and has an accessible name beginning with its visible label. — CDP asserts ≥44px; accessible names (`Copy command`, `Open full screen`, …).
- [x] Focus-visible treatment, safe-area geometry, theme contrast, stable card geometry, and zero page horizontal overflow are inspected at true 390 CSS pixels in both themes. — CDP light+dark inspected.
- [x] Security/privacy review approves canonical source, redaction provenance, clipboard, hidden DOM, safe Markdown, F6 history, and no-network/no-ticket behavior before live enablement. — Claude read the diffs; PASS (see implementation-summary).
