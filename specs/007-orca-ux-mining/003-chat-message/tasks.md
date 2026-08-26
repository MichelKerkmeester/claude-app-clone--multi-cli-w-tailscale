---
title: "Phase 3 tasks — chat message/transcript interactions ledger"
description: "Setup the reusable seams, build recs 3.1-3.6 and 6.6 against the cited transcript files, record the 3.7 exclusions, and prove fail-closed + token-identity 0-diff + a11y-parity + test:web. Every task is OPEN; nothing is implemented until the operator says go."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/003-chat-message"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Wrote the OPEN task ledger for recs 3.1-3.7 and 6.6; nothing implemented."
    next_safe_action: "On operator go, start T1.1 baselines and seam confirmation."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task cites its rec number and the
real app file(s) it will touch. All tasks are OPEN — this is a plan.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** Capture the token-identity and `test:web` baselines for the transcript surfaces before any
  change, so the phase's 0-diff / green claims have a real starting point. [recs: 3.1-3.6, 6.6]
- [ ] **T1.2** Confirm the reusable seams exist and are the ones to build on: `use-copy-feedback.svelte.ts`
  (copy + announcer + `copiedUnit`), `getOptionalArtifactViewer` / `openInMemory` / `openDiff` in
  `pages/chat/artifacts/artifact-viewer-provider.svelte`, the `sendSlashDraft` lane in
  `pages/chat/chrome/session-composer.svelte`, the `sheet-model-effort.svelte` bottom-sheet pattern, and the
  `.transcript--frame` / `.transcript--scroll` roots in `pages/chat/transcript/transcript-list.svelte`.
  [recs: 3.2, 3.3, 3.4, 3.5, 3.6, 6.6]
- [ ] **T1.3** Record the REC 3.7 backlog exclusions (regenerate, reply/quote, edit-and-resend, reactions,
  per-message context menu, in-conversation search) with rationale — orca native-chat lacks all six; these
  are our gaps, not ports, and edit/resend + regenerate would be host operations needing host RPCs. [rec: 3.7]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** Add a per-turn "scroll this message to top" arrow on each turn's lead block that scrolls the
  block to the top of `.transcript--scroll`, distinct from the list-level jump-to-latest FAB and never
  mutating blocks or follow-state. [rec: 3.1 · `pages/chat/transcript/block.svelte`,
  `pages/chat/transcript/normalized-transcript-block-view.svelte`, `pages/chat/transcript/transcript-list.svelte`]
- [ ] **T2.2** Add an in-transcript per-fence copy-code button to the fenced blocks rendered by
  `safe-markdown.svelte` (`.safe-markdown--code`), writing the fence's canonical source via
  `use-copy-feedback.svelte.ts` with its fail-closed availability guard and polite announcer; confirm the
  code card's existing Copy still covers `card-code.svelte`. [rec: 3.2 ·
  `pages/chat/rich-content/safe-markdown.svelte`, `pages/chat/rich-content/use-copy-feedback.svelte.ts`,
  `pages/chat/rich-content/card-code.svelte`]
- [ ] **T2.3** Swap the whole-message prose Copy confirm to a non-shifting tint / icon-swap (~700 ms, no
  toast); keep the copy input the prose `text` the actions row already receives so tool/image content is
  never copied. [rec: 3.3 · `pages/chat/transcript/assistant-actions.svelte`]
- [ ] **T2.4** Recast tool runs from the boxed evidence group into flat one-line `▸ ToolName` previews with
  call↔result pairing (unpaired call = visibly in-flight), a file-open tap independent of expand, and a
  single whole-run expand/collapse; keep the grouping a pure projection. [rec: 3.4 ·
  `pages/chat/transcript/normalized-activity-group.svelte`, `pages/chat/transcript/collapsed-evidence.svelte`,
  `pages/chat/transcript/block.svelte`, `pages/chat/transcript/transcript-helpers.ts`]
- [ ] **T2.5** Add scoped selection-copy (long-press / bottom sheet) that is disabled on an empty selection
  and copies only when `window.getSelection()` is anchored inside the transcript root (`.transcript--frame`),
  so a foreign selection cannot be copied as this session's. [rec: 3.5 ·
  `pages/chat/transcript/transcript-list.svelte`]
- [ ] **T2.6** Add a "…" session action sheet on the header with **open / copy-id / refresh** and forwarding
  of the host slash-commands the child already understands (`/rename`, `/archive`, `/new`, `/fork`) via the
  existing `sendSlashDraft` lane; copy-id copies the opaque id verbatim; no client-owned rename/pin/archive.
  [rec: 3.6 · `pages/chat/chrome/session-header.svelte`, `pages/chat/chrome/session-composer.svelte`,
  `pages/chat/chrome/sheet-model-effort.svelte` (pattern)]
- [ ] **T2.7** Route a file/link tap through the existing artifact viewer (`openInMemory` / `openDiff`) ONLY
  when the host supplies a stable artifact reference; otherwise present the link inert with an explicit
  "unavailable" state. Never read a local path / URI / image URL directly. Note the NEW authorized reference
  as a ⚠️ host field deferred to `007-host-requests`. [rec: 6.6 ·
  `pages/chat/rich-content/safe-markdown.svelte`, `pages/chat/rich-content/rich-content-router.svelte`,
  `pages/chat/artifacts/artifact-viewer-provider.svelte`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Fail-closed review: no client-owned session truth (3.6 dispatches existing host commands only),
  selection-copy is scoped to the transcript root (3.5), file-links route only host-referenced artifacts and
  stay inert otherwise (6.6), and no rename/pin/archive/edit writes local session metadata. [recs: 3.5, 3.6, 6.6]
- [ ] **T3.2** token-identity resolves 0-diff vs the T1.1 baseline for the new controls and the flat tool-run
  recast, across the three themes. [recs: 3.1, 3.2, 3.3, 3.4]
- [ ] **T3.3** a11y-parity check on every new control — label, focus order, disclosure roles, dismissal, and
  the existing live regions preserved; the action sheet reuses the established sheet a11y pattern. [recs: 3.1,
  3.2, 3.4, 3.5, 3.6]
- [ ] **T3.4** `test:web` green and `validate.sh <packet> --strict` exit 0 (via realpath) from the final
  state; confirm every task traces to a rec and the 3.7 exclusions are recorded. [recs: 3.1-3.7, 6.6]
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
