---
title: "Phase 4 tasks — composer recommendation ledger (recs 4.1–4.8)"
description: "Extract the shared seams, apply each Angle-4 composer recommendation to its cited file, then prove the set fail-closed and behaviour-preserving. Every task cites its rec number and the real file it touches; all tasks are OPEN (plan only)."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-ux-mining/004-composer"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned composer recs 4.1–4.8 against real files; no code implemented yet."
    next_safe_action: "Await operator go, then start T1.1 (extract the recall + @-trigger seams)."
    blockers:
      - "rec 4.2 @-file search needs a host file-search RPC (requested in 007-host-requests); T2.8 is inert until it lands."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Every task cites its rec number and the
real app file(s) it will touch. All tasks are OPEN — this packet is a plan; nothing implements until the
operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** [rec 4.4] Extract a device-local prompt-history store as pure functions beside
  `readComposerShiftTabPreference` / `writeComposerShiftTabPreference` in `shared/state/state.ts`: record an
  accepted send, skip empties + consecutive dups, expose newest-first, try/catch-guarded so a storage
  failure degrades to empty history. No host field.
- [ ] **T1.2** [rec 4.2] Extract an `@`-mention trigger predicate as a pure sibling to `deriveSlashTrigger`
  in `shared/commands/` (whitespace-bounded token, collapsed-caret, empty query allowed), with a canonical
  differential test. Predicate only — no transport yet (the RPC does not exist).
- [ ] **T1.3** [cross-cutting] Capture the token-identity and test:web baseline for the composer surface
  (`session-composer.svelte`, `composer-command-autocomplete.svelte`, `composer-tools.svelte`,
  `sheet-model-effort.svelte`, `pages/chat/attachments/*`) before any change, so the pure-relabel/no-regression
  claims have a real starting point.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** [rec 4.1] In `pages/chat/chrome/session-composer.svelte`, narrow the `<textarea disabled>`
  predicate to drop the transient locks (`sendingPrompt`, `slashSubmitting`, `attachmentSubmission.busy`) so
  the keyboard is never yanked mid-send; keep those locks ONLY on the send gate. Confirm image-only send
  stays valid (`canSendMessage`). Add an exact-raw-draft capture-before-clear and restore-on-host-reject hook
  through `setPrompt`.
- [ ] **T2.2** [rec 4.3] Cap the slash suggestion list at 12 rows before it reaches the listbox — apply in
  `shared/commands/rank-host-commands.ts` (or at the consumer in
  `pages/chat/chrome/composer-command-autocomplete.svelte`) — and add/confirm a test that the line-leading
  rule in `shared/commands/use-slash-trigger.ts` never opens the panel for a `/` inside prose, with rows
  sourced only from `catalog.commands`.
- [ ] **T2.3** [rec 4.4] Build the prompt-history recall sheet: a new bits Sheet under
  `pages/chat/chrome/` (patterned on `sheet-model-effort.svelte`), opened from a new action-row entry in
  `pages/chat/chrome/composer-tools.svelte` only when the composer is empty; selecting an entry fills the
  draft via `setPrompt` (fills, never sends). Wire the record-on-send call (T1.1 store) at the send seam in
  `session-composer.svelte`.
- [ ] **T2.4** [rec 4.5] Add an `onpaste` image-vs-text classifier to the `session-composer.svelte` textarea
  that routes image blobs into the EXISTING `attachmentDraft.selectFiles` (chips already render via
  `pages/chat/attachments/attachment-rail.svelte`; the media lease already exists in
  `pages/chat/attachments/use-attachment-submission.svelte.ts`), active only when `mediaAvailable`. Text
  paste stays native; no base64-in-DTO.
- [ ] **T2.5** [rec 4.6] Add a dictation control (hold-vs-toggle) to the composer action row and a
  fail-closed setup sheet under `pages/chat/chrome/`; on-device Web Speech writes an editable local draft via
  `setPrompt` (confirm-before-send, same trust as typing). When speech is unavailable show the setup sheet,
  not a dead toast. Host STT stays ⚠️ (`007-host-requests`); the transcript is never host truth.
- [ ] **T2.6** [rec 4.7] Confirm the model/effort pickers are reachable from the composer action row
  (`pages/chat/chrome/composer-tools.svelte` "+" popover + the runtime strip) and that the send control stays
  disabled while a host option dispatch is in flight (the `sheet-model-effort.svelte` `isCommitting` / runtime
  `pending` gating on `canSubmit`); add the action-row affordance if missing.
- [ ] **T2.7** [rec 4.8] In `pages/chat/chrome/sheet-model-effort.svelte`, add a baseline-known guard to
  `canCommit` (refuse when `current = runtime.state?.model` is null), and add a regression guard/test that an
  identical host re-report of the confirmed model/effort does not clear a staged `draftKey`. Keep the
  host-RPC sheet; do NOT adopt orca's typed-`/model`-into-the-TUI pattern.
- [ ] **T2.8** [rec 4.2] Author the `@`-file mention UI shape as an inert scaffold reusing the autocomplete
  overlay (`pages/chat/chrome/composer-command-autocomplete.svelte`) and the T1.2 predicate: ~120 ms
  debounce, ~16-row cap, generation-counter stale-safety, empty-while-in-flight, query-in → relative-paths-out
  over a NEW host file-search RPC in `shared/commands/*`/`shared/transport/*`. No device FS walk. **BLOCKED**
  on the host RPC (`007-host-requests`); leave inert until it lands.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** [fail-closed] Assert every ⚠️ affordance is inert without its host capability: the `@` trigger
  does nothing (no FS walk, no local paths) with no file-search RPC; paste-image does nothing when
  `mediaCapability.enabled` is false; an on-device transcript is never auto-sent and never treated as host
  truth. Boundary-test the pure seams (T1.1/T1.2) for stale/empty/in-flight staying unresolved.
- [ ] **T3.2** [token-identity + test:web] token-identity resolves 0-diff on the existing composer surfaces
  (new chrome uses existing tokens, adds no override to a shared rule); test:web is green from the final
  state, including the composer send-gating, slash-panel, and attachment suites, plus the rec 4.8
  reconciliation regression tests.
- [ ] **T3.3** [a11y-parity] The a11y contract is preserved: the composer polite/assertive live regions, the
  slash listbox aria, the new recall/dictation/`@` sheet dialog semantics, and focus return all match the
  pre-change behaviour.
- [ ] **T3.4** [traceability] Every task cites a rec number (4.1–4.8); `validate.sh <packet> --strict`
  exits 0 through its realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every ✅ recommendation (4.1, 4.3, 4.4, 4.6-fallback, 4.7, 4.8) is implemented as pure view state /
interaction with its tests green; every ⚠️ recommendation (4.2, 4.5-paste, 4.6-host-STT) is either shipped
inert behind its host capability or deferred to `007-host-requests`; the fail-closed, token-identity,
test:web, and a11y-parity barriers hold from the final state; and every task traces to a rec number.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the per-rec architecture and the proof strategy.
- `checklist.md` — the barrier sign-off.
- `../research/research.md` — Angle 4 (the source recommendations) and the "Needs host support" table.
<!-- /ANCHOR:cross-refs -->
