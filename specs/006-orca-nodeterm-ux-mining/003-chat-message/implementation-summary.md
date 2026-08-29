---
title: "Phase 3 implementation summary — chat message/transcript interactions (IMPLEMENTED)"
description: "Shipped the transcript find bar, five-state load taxonomy, quantified copy receipts, http(s) vs file-path prose links, native tool folds, scoped selection copy, and a session action sheet that only forwards host slash-commands. Status Implemented."
trigger_phrases:
  - "chat message implementation summary"
  - "chat message packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/003-chat-message"
    last_updated_at: "2026-08-26T22:10:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Shipped find bar, five-state load, copy receipts, and native tool folds"
    next_safe_action: "None — snapshot find stays local until a host search RPC lands"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `006-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Implemented |
| Requirements planned | REQ-001 … REQ-009 |
| Host dependency | Partial — snapshot search and file-path artifact refs stay inert until host RPCs land |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Shipped the message-level transcript affordances over host-supplied rendered blocks. A per-turn
scroll-to-top control on every turn lead calls the virtualizer `scrollToIndex` API and does not
touch live-edge follow-state. Fenced prose Copy writes the fence source through
`use-copy-feedback.svelte.ts`. Whole-message Copy uses a 700 ms non-shifting tint (`is-copied`)
and the same quantified receipt. Tool runs render as native `<details>` one-line folds; call↔result
pairing marks an unpaired call in-flight. Long-press / context-menu copy is gated on
`window.getSelection()` containment inside `.transcript--frame`. The header overflow sheet offers
open / copy-id / refresh and forwards only catalogued host slash names (`rename`, `archive`,
`new`, `fork`) as `/${name}` drafts.

The find bar is a flat `SearchSnippet[]` index lowercased once per snapshot. `{i}/{count}` chrome
wraps with Enter / Shift+Enter / Esc. `next()` / `prev()` scroll `@tanstack/svelte-virtual` to an
off-screen match and reuse `<mark class="artifact-find--match">`. Search is snapshot-scoped only.

Copy receipts strip one trailing newline, then report `Copied N lines` or `Copied N chars`, or
null on empty. Failure owns the confirm slot — never a green receipt beside a red failure. http(s)
prose links open externally (`rel="external noopener noreferrer"`). File-path tokens stay inert
unless a host artifact ref exists; `file:` / `blob:` / unsafe schemes never become hrefs.
`screen-chat.svelte` derives `loading | ok | missing | unsupported | error`; missing / unsupported
/ error never render as an empty conversation; held blocks keep a rendered thread across reload.

**Backlog exclusion (rec 3.7).** regenerate, reply/quote, edit-and-resend, reactions, and a
per-message mutation menu were not built. In-conversation search is filled by the find bar.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Pure seams first: `transcript-find-index.ts`, `transcript-load-state.ts`, `prose-link.ts`,
`tool-run-pairing.ts`, `transcript-selection.ts`, and `copiedReceipt` in
`use-copy-feedback.svelte.ts`. The virtualized list owns find, turn-scroll, long-press menu, and
scoped copy. Load taxonomy is view state in `screen-chat.svelte` (`heldBlocks` via
`nextHeldTranscriptBlocks`) — the transcript reducer was not given a second source of truth. File
open stays disabled until a host artifact ref exists. Session actions dispatch through the existing
slash draft lane. Proof from the final state: `npm run typecheck` 0 errors, `npm run test:web`
svelte 75 files / 591 passed + 3 skipped and logic 32 files / 313 passed, eslint 0 on changed
`.svelte`/`.ts` files, and `run-source-gates.sh` all PASS (token-identity 35 goldens).
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**REC 3.6 dispatches, never mutates.** The session action sheet forwards existing host slash-commands
(`/rename`, `/archive`, `/new`, `/fork`) through the same `sendSlashDraft` lane a typed command uses; copy-id
copies the opaque id verbatim; refresh re-requests the host snapshot. A SvelteKit pencil that PATCHes a local
title is ❌ and out of scope. A real title-rename RPC is requested in `007-host-requests`.

**REC 6.6 routes only host-referenced artifacts.** `classifyProseLink` splits http(s) (open external)
from file-path tokens (inert "unavailable"). A markdown path / local URI / image URL is never treated
as permission. A NEW authorized reference is a host field deferred to `007-host-requests`.

**REC 3.4 is layout only.** The flat tool-run recast keeps grouping a pure projection; call↔result
pairing and in-flight derive from host blocks, not new session state.

**Find is snapshot-scoped.** Off-screen virtual rows are not mounted, so the index is decoupled from
the DOM and `scrollToIndex` moves the window. Searching beyond the loaded snapshot needs a host
search RPC / `hasMore` token, deferred to `007-host-requests`.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Fail-closed review | Passed — slash sheet dispatches catalog names only; selection scoped to `.transcript--frame`; file-paths inert without a host ref |
| Find wrap + off-screen scroll | Passed — `transcript-find-bar.svelte.test.ts:102` and `transcript-find-index.test.ts:31` |
| Five-state load | Passed — missing/unsupported/error never empty; reload holds the thread (`transcript-load-state.svelte.test.ts:79`) |
| Copy receipts + honesty | Passed — `copy-receipt.svelte.test.ts:17` lines/chars/null; failure clears the green label |
| URL vs file-path | Passed — `prose-link.test.ts:13`; `safe-markdown.svelte.test.ts:67` |
| Token identity | Passed — `token-identity.mjs verify` matched all 35 `tokens.md` goldens (light/dark/system) |
| `test:web` | Passed — svelte 75 files / 591 passed + 3 skipped; logic 32 files / 313 passed |
| `typecheck` | Passed — 0 errors (`svelte-check` COMPLETED 1148 FILES 0 ERRORS 6 WARNINGS) |
| scoped lint | Passed — eslint 0 on changed `.svelte`/`.ts` files (`.svelte.ts` still unparsed by root eslint) |
| a11y-parity | Passed — find `role="search"`, menu Esc + `hideOutside`, overflow live region |
| `validate.sh --strict` | Passed — exit 0 from realpath; Errors: 0 Warnings: 0 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Two edges cannot be fully closed on the client and stay deferred to `007-host-requests`: a real
session-title rename needs a host RPC (REC 3.6 only dispatches the existing command string), and a
bare prose file-link with no host-supplied artifact reference stays inert "unavailable" until the
host publishes an authorized reference (REC 6.6 / ND-4.4). Snapshot search does not walk unloaded
history — a host search RPC / `hasMore` token is the remaining find-bar ⚠️. The ❌ set (REC 3.7)
except in-conversation search remains backlog: regenerate, reply/quote, edit-and-resend, reactions,
and a mutation-capable per-message menu. Edit/resend and regenerate would be host operations.
<!-- /ANCHOR:limitations -->
