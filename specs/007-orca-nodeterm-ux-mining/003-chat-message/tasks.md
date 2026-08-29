---
title: "Phase 3 tasks — chat message/transcript interactions ledger"
description: "Setup the reusable seams, build recs 3.1-3.6 and 6.6 against the cited transcript files, record the 3.7 exclusions, and prove fail-closed + token-identity 0-diff + a11y-parity + test:web. Implemented."
trigger_phrases:
  - "chat message task ledger"
  - "chat message packet"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/003-chat-message"
    last_updated_at: "2026-08-26T22:10:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Shipped find bar, five-state load, copy receipts, and native tool folds"
    next_safe_action: "None — snapshot find stays local until a host search RPC lands"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task cites its rec number and the
real app file(s) it will touch.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Capture the token-identity and `test:web` baselines for the transcript surfaces before any
  change, so the phase's 0-diff / green claims have a real starting point. [recs: 3.1-3.6, 6.6]
  — evidence: sibling closeout svelte 72/577+3 skipped, logic 29/308; final `token-identity.mjs verify`
  matched 35/35 goldens; `test:web` svelte 75/591+3 skipped, logic 32/313.
- [x] **T1.2** Confirm the reusable seams exist and are the ones to build on: `use-copy-feedback.svelte.ts`
  (copy + announcer + `copiedUnit`), `getOptionalArtifactViewer` / `openInMemory` / `openDiff` in
  `pages/chat/artifacts/artifact-viewer-provider.svelte`, the `sendSlashDraft` lane in
  `pages/chat/chrome/session-composer.svelte`, the `sheet-model-effort.svelte` bottom-sheet pattern, and the
  `.transcript--frame` / `.transcript--scroll` roots in `pages/chat/transcript/transcript-list.svelte`.
  [recs: 3.2, 3.3, 3.4, 3.5, 3.6, 6.6]
  — evidence: `use-copy-feedback.svelte.ts:75` `useCopyFeedback`; `screen-chat.svelte:363` `dispatchSlashDraft`;
  `transcript-list.svelte` frame bind; viewer still via `getOptionalArtifactViewer`.
- [x] **T1.3** Record the REC 3.7 backlog exclusions (regenerate, reply/quote, edit-and-resend, reactions,
  per-message context menu, in-conversation search) with rationale — orca native-chat lacks all six; these
  are our gaps, not ports, and edit/resend + regenerate would be host operations needing host RPCs. [rec: 3.7]
  — evidence: `implementation-summary.md:58` records five remaining exclusions; in-conversation search is
  filled by ND-4.1 (`transcript-find-index.ts:104`).
- [x] **T1.4** Confirm the find-bar seams for the nodeterm fold: the `@tanstack/svelte-virtual` host and
  scroll API in `transcript-list.svelte`, the `<mark>` highlight primitive in `artifacts/text-preview.svelte`
  / `artifacts/code-preview.svelte`, and the existing per-preview `findTerm` pattern in
  `artifacts/preview-controls.svelte` / `artifacts/artifact-viewer-host.svelte`. ND-4.1 fills the orca 3.7
  in-conversation-search gap — the find bar supersedes that single ❌ exclusion; the other five 3.7 exclusions
  stay recorded (T1.3). [rec: ND-4.1 · `pages/chat/transcript/transcript-list.svelte`,
  `pages/chat/artifacts/text-preview.svelte`, `pages/chat/artifacts/code-preview.svelte`,
  `pages/chat/artifacts/preview-controls.svelte`, `pages/chat/artifacts/artifact-viewer-host.svelte`]
  — evidence: `transcript-list.svelte:161` `scrollToIndex`; `transcript-find-index.ts:180` `findParts` emits
  `artifact-find--match` marks.
- [x] **T1.5** Baseline `screen-chat.svelte`'s current empty/error state before the 5-state load recast, so a
  rendered thread must survive a reload. ND-4.7 supersedes orca 5.8. [rec: ND-4.7 ·
  `pages/chat/screen-chat.svelte`]
  — evidence: `transcript-load-state.ts:214` `nextHeldTranscriptBlocks`; hold proven in
  `transcript-load-state.test.ts:75`.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Add a per-turn "scroll this message to top" arrow on each turn's lead block that scrolls the
  block to the top of `.transcript--scroll`, distinct from the list-level jump-to-latest FAB and never
  mutating blocks or follow-state. [rec: 3.1 · `pages/chat/transcript/block.svelte`,
  `pages/chat/transcript/normalized-transcript-block-view.svelte`, `pages/chat/transcript/transcript-list.svelte`]
  — evidence: `transcript-list.svelte:159` `scrollTurnToTop`; `turnLeadIds` at `transcript-list.svelte:359`.
- [x] **T2.2** Add an in-transcript per-fence copy-code button to the fenced blocks rendered by
  `safe-markdown.svelte` (`.safe-markdown--code`), writing the fence's canonical source via
  `use-copy-feedback.svelte.ts` with its fail-closed availability guard and polite announcer; confirm the
  code card's existing Copy still covers `card-code.svelte`. [rec: 3.2 ·
  `pages/chat/rich-content/safe-markdown.svelte`, `pages/chat/rich-content/use-copy-feedback.svelte.ts`,
  `pages/chat/rich-content/card-code.svelte`]
  — evidence: `safe-markdown.svelte:488` fence Copy; `use-copy-feedback.svelte.ts:88` clipboard guard.
- [x] **T2.3** Swap the whole-message prose Copy confirm to a non-shifting tint / icon-swap (~700 ms, no
  toast); keep the copy input the prose `text` the actions row already receives so tool/image content is
  never copied. [rec: 3.3 · `pages/chat/transcript/assistant-actions.svelte`]
  — evidence: `assistant-actions.svelte:34` `is-copied` tint; `use-copy-feedback.svelte.ts:12` `COPY_CONFIRM_MS = 700`.
- [x] **T2.4** Recast tool runs from the boxed evidence group into flat one-line `▸ ToolName` previews with
  call↔result pairing (unpaired call = visibly in-flight), a file-open tap independent of expand, and a
  single whole-run expand/collapse; keep the grouping a pure projection. [rec: 3.4 ·
  `pages/chat/transcript/normalized-activity-group.svelte`, `pages/chat/transcript/collapsed-evidence.svelte`,
  `pages/chat/transcript/block.svelte`, `pages/chat/transcript/transcript-helpers.ts`]
  — evidence: `tool-run-pairing.ts:50` `pairActivityRuns`; `tool-fold.svelte:39` native `<details>`.
- [x] **T2.5** Add scoped selection-copy (long-press / bottom sheet) that is disabled on an empty selection
  and copies only when `window.getSelection()` is anchored inside the transcript root (`.transcript--frame`),
  so a foreign selection cannot be copied as this session's. [rec: 3.5 ·
  `pages/chat/transcript/transcript-list.svelte`]
  — evidence: `transcript-selection.ts:13` `readTranscriptSelection`; used at `transcript-list.svelte:270`.
- [x] **T2.6** Add a "…" session action sheet on the header with **open / copy-id / refresh** and forwarding
  of the host slash-commands the child already understands (`/rename`, `/archive`, `/new`, `/fork`) via the
  existing `sendSlashDraft` lane; copy-id copies the opaque id verbatim; no client-owned rename/pin/archive.
  [rec: 3.6 · `pages/chat/chrome/session-header.svelte`, `pages/chat/chrome/session-composer.svelte`,
  `pages/chat/chrome/sheet-model-effort.svelte` (pattern)]
  — evidence: `session-header.svelte:336` disabled slash rows; `screen-chat.svelte:407` forwards `/${name}`;
  `sessionheader-overflow-dialog.svelte.test.ts:254`.
- [x] **T2.7** Route a file/link tap through the existing artifact viewer (`openInMemory` / `openDiff`) ONLY
  when the host supplies a stable artifact reference; otherwise present the link inert with an explicit
  "unavailable" state. Never read a local path / URI / image URL directly. Note the NEW authorized reference
  as a ⚠️ host field deferred to `007-host-requests`. [rec: 6.6 ·
  `pages/chat/rich-content/safe-markdown.svelte`, `pages/chat/rich-content/rich-content-router.svelte`,
  `pages/chat/artifacts/artifact-viewer-provider.svelte`]
  — evidence: `prose-link.ts:53` `classifyProseLink`; `prose-link.ts:71` `canRouteProsePathToArtifact`;
  `prose-link.test.ts:33`.
- [x] **T2.8** Build the transcript-wide find bar: a flat `SearchSnippet[]` line index built on open,
  decoupled from the virtualized DOM, lowercased once per snapshot; substring match exposing `matchCount`
  and a 1-based `matchIndex` with `next()` / `prev()` wraparound and reset-to-first on each new query; a
  `{i}/{count}` chrome (Enter=next, Shift+Enter=prev, Esc=close) with a role-tagged (`user`/`assistant`/
  `tool`) snippet of the current match. `next()` scrolls the `@tanstack/svelte-virtual` list to an off-screen
  match — it never relies on browser find — and reuses the `<mark>` primitive. Search beyond the loaded
  snapshot is a ⚠️ host search RPC / `hasMore` token deferred to `007-host-requests` (ties orca 6.4). [rec:
  ND-4.1 · fills the orca 3.7 gap · `pages/chat/transcript/transcript-list.svelte`,
  `pages/chat/artifacts/text-preview.svelte`, `pages/chat/artifacts/code-preview.svelte`]
  — evidence: `transcript-find-index.ts:133` `matchFindQuery`; wrap at `transcript-find-index.ts:161`;
  `transcript-find-bar.svelte.test.ts:102` off-screen `scrollToIndex`.
- [x] **T2.9** Swap `use-copy-feedback.svelte.ts`'s unit-only label for a quantified receipt (multi-line →
  "Copied N lines", single line → "N chars"), stripping exactly one trailing newline before both counts and
  returning null on empty / newline-only input; feed both the per-fence copy and the per-answer copy. [rec:
  ND-4.2 · improves orca 3.3 · `pages/chat/rich-content/use-copy-feedback.svelte.ts`]
  — evidence: `use-copy-feedback.svelte.ts:32` `copiedReceipt`; `copy-receipt.svelte.test.ts:17`.
- [x] **T2.10** Adopt copy-affordance honesty as an explicit invariant: one owner per confirm slot; the green
  receipt yields to the copy-failure message (never green beside red); a once-per-install, `try/catch`-guarded
  `localStorage`-gated "hold to select" coach on a drag that produced neither a copy nor a selection. [rec:
  ND-4.3 · `pages/chat/rich-content/use-copy-feedback.svelte.ts`,
  `pages/chat/transcript/assistant-actions.svelte`]
  — evidence: `use-copy-feedback.svelte.ts:101` failure clears `copiedUnit`; `copy-receipt.svelte.test.ts:34`;
  `use-copy-feedback.svelte.ts:11` `HOLD_TO_SELECT_STORAGE_KEY`.
- [x] **T2.11** Split prose link handling in `safe-markdown.svelte` — we are the relay-remote (no client fs)
  case: http(s) URLs render tappable open-external (✅); file-path tokens stay inert "unavailable" unless
  routed through the artifact viewer with a host-supplied stable reference (⚠️, reinforces orca 6.6); a bare
  local path / URI is never resolved directly (❌). [rec: ND-4.4 · `pages/chat/rich-content/safe-markdown.svelte`,
  `pages/chat/rich-content/rich-content-router.svelte`, `pages/chat/artifacts/artifact-viewer-provider.svelte`]
  — evidence: `safe-markdown.svelte.test.ts:67` https `<a>` vs `./README.md` span; `safe-markdown.svelte.test.ts:85`
  `file:` never an href.
- [x] **T2.12** Harden the markdown path: sanitize on every render (already enforced by `rich-content/`),
  memoize the parsed output per message / block text so a turn-finish does not re-parse the whole transcript,
  and keep raw text on screen until an async-highlighted block is ready — never blank. [rec: ND-4.5 ·
  `pages/chat/rich-content/safe-markdown.svelte`, `pages/chat/rich-content/card-code.svelte`]
  — evidence: `safe-markdown.svelte:97` `PARSE_CACHE` / `PARSE_CACHE_LIMIT = 256`; `parseSafeMarkdown` at
  `safe-markdown.svelte:105`.
- [x] **T2.13** Adopt native `<details>` one-line tool folding where a group is a single call+result, with a
  null result reading as visibly in-flight (call↔result pairing). [rec: ND-4.6 · reinforces orca 3.4 ·
  `pages/chat/transcript/collapsed-evidence.svelte`, `pages/chat/transcript/normalized-activity-group.svelte`,
  `pages/chat/transcript/block.svelte`]
  — evidence: `tool-fold.svelte:39` `<details>`; in-flight label `tool-fold.svelte:44`; pairing
  `tool-run-pairing.ts:50`.
- [x] **T2.14** Recast `screen-chat.svelte`'s transcript load state into the 5-state taxonomy
  (`loading | ok | missing | unsupported | error`), each with its own title / detail and retryable-or-not;
  `missing` / `unsupported` / `error` never render as an empty conversation and a reload never blanks a
  rendered `ok` thread. [rec: ND-4.7 · supersedes orca 5.8 · `pages/chat/screen-chat.svelte`]
  — evidence: `transcript-load-state.ts:19` kinds; `transcript-load-state.svelte.test.ts:79` missing;
  `transcript-load-state.svelte.test.ts:91` unsupported; hold at `transcript-load-state.test.ts:75`.
- [x] **T2.15** Render the long-press action menu (copy selection / copy message / copy code) as a body
  portal edge-flipped away from the viewport bottom, closing on backdrop tap, with disabled rows carrying a
  hint and only SAFE read-only actions — never a client-owned mutation. [rec: ND-4.8 ·
  `pages/chat/transcript/transcript-list.svelte`, `pages/chat/chrome/sheet-model-effort.svelte` (pattern)]
  — evidence: `menu-transcript-action.svelte:51` body portal; flip at `menu-transcript-action.svelte:87`;
  `hideOutside` at `menu-transcript-action.svelte:67`.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Fail-closed review: no client-owned session truth (3.6 dispatches existing host commands only),
  selection-copy is scoped to the transcript root (3.5), file-links route only host-referenced artifacts and
  stay inert otherwise (6.6), and no rename/pin/archive/edit writes local session metadata. [recs: 3.5, 3.6, 6.6]
  — evidence: `session-header.svelte:336` missing slash = disabled+hint; `transcript-selection.ts:24` `root.contains`;
  `prose-link.ts:71` requires a host ref.
- [x] **T3.2** token-identity resolves 0-diff vs the T1.1 baseline for the new controls and the flat tool-run
  recast, across the three themes. [recs: 3.1, 3.2, 3.3, 3.4]
  — evidence: `token-identity.mjs verify app-mobile/src/app.css` matched all 35 goldens light/dark/system.
- [x] **T3.3** a11y-parity check on every new control — label, focus order, disclosure roles, dismissal, and
  the existing live regions preserved; the action sheet reuses the established sheet a11y pattern. [recs: 3.1,
  3.2, 3.4, 3.5, 3.6]
  — evidence: find `role="search"` in `transcript-find-bar.svelte:53`; menu Esc `menu-transcript-action.svelte:73`;
  overflow live region `sessionheader-overflow-dialog.svelte.test.ts:254`.
- [x] **T3.4** `test:web` green and `validate.sh <packet> --strict` exit 0 (via realpath) from the final
  state; confirm every task traces to a rec and the 3.7 exclusions are recorded. [recs: 3.1-3.7, 6.6]
  — evidence: `test:web` svelte 75 files / 591 passed + 3 skipped; logic 32 files / 313 passed; 3.7 recorded
  in `implementation-summary.md:58`; `validate.sh --strict` exit 0, Errors: 0 Warnings: 0.
- [x] **T3.5** Find-bar navigation proof: `next()` / `prev()` wraparound over the flat index scrolls the
  `@tanstack/svelte-virtual` list to an off-screen match and highlights it via `<mark>`; the action menu
  portal flips at the bottom edge and shows disabled rows with a hint. [recs: ND-4.1, ND-4.8]
  — evidence: `transcript-find-bar.svelte.test.ts:102`; `transcript-find-index.test.ts:31`; menu flip
  `menu-transcript-action.svelte:87`.
- [x] **T3.6** Fail-closed load / link review: `missing` / `unsupported` / `error` transcripts never render
  as an empty conversation, a reload never blanks a rendered thread (ND-4.7), and a prose file-path stays
  inert unless host-referenced (ND-4.4). [recs: ND-4.7, ND-4.4]
  — evidence: `transcript-load-state.svelte.test.ts:79` / `:91` / `:103`; hold `:115`; `prose-link.test.ts:13`.
- [x] **T3.7** token-identity 0-diff + a11y-parity + `test:web` green from the final state for the quantified
  copy receipt, copy-honesty invariant, memoized markdown, and native `<details>` folding; every ND-4.x task
  traces to a finding. [recs: ND-4.2, ND-4.3, ND-4.5, ND-4.6]
  — evidence: `copy-receipt.svelte.test.ts:17`; `safe-markdown.svelte:97` parse cache; `tool-fold.svelte:39`;
  `token-identity.mjs` 35/35.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Recs 3.1-3.6 and 6.6 are implemented against the cited files, 3.7 is recorded as backlog exclusions, no
client-owned session truth is introduced, and token-identity 0-diff + a11y-parity + `test:web` are green from
the final state — every task traceable to a rec.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the build approach and quality gates.
- `checklist.md` — barrier sign-off.
- `../research/research.md` — Angle 3 (3.1-3.7) and Angle 6 (6.6).
<!-- /ANCHOR:cross-refs -->
