---
title: "Phase 4 plan — composer recommendations over real files, fail-closed and proven"
description: "How recs 4.1–4.8 land on the composer: pure trigger/store seams first, then per-rec changes to session-composer.svelte, use-slash-trigger.ts, rank-host-commands.ts, the autocomplete overlay, a new recall sheet + dictation sheet, composer-tools.svelte, and sheet-model-effort.svelte; the ⚠️ @-file search and paste-upload stay inert behind their host capability. Proven behaviour-preserving by fail-closed inertness checks, token-identity 0-diff on existing composer CSS, test:web, and a11y-parity, all from the final state."
trigger_phrases:
  - "composer plan approach"
  - "composer packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/004-composer"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added nodeterm dictation pipeline ND-5.1–5.9 to the composer plan."
    next_safe_action: "Await operator go, then build Phase 1 seams incl. the dictation scaler."
    blockers:
      - "rec 4.2 @-file search needs a host file-search RPC (requested in 007-host-requests); plan the UI now, implement when it lands."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Land the eight Angle-4 composer recommendations as small, per-rec changes over the real composer files,
after first extracting the new stateless seams they share (the prompt-history store, the `@`-mention trigger
predicate) as pure functions tested against a canonical implementation. The ✅ recs (4.1, 4.3, 4.4, 4.6
on-device fallback, 4.7, 4.8) ship as pure view state / interaction; the ⚠️ recs (4.2 file-search, 4.5
paste-upload, 4.6 host STT) ship inert behind their host capability and are buildable when the host lands
the field. The set is proven fail-closed and behaviour-preserving by inertness checks, token-identity on the
existing composer CSS, test:web, and a11y-parity — all from the final state, before the phase closes.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Every ⚠️ affordance is inert with its host capability absent (no device FS walk for `@`-search, no paste-image
without `mediaCapability.enabled`, no auto-send of an on-device transcript). The new pure seams
(prompt-history filter, `@`-trigger predicate) match a canonical implementation on a differential test, and
boundary-test that stale/empty/in-flight input stays visibly unresolved. token-identity resolves identically
on the existing composer surfaces (0 diffs; new chrome uses existing tokens, adds no override to a shared
rule). test:web is green — including the composer send-gating, slash-panel, and attachment suites — and the
model/effort reconciliation guards (baseline-unknown refusal, no-revert-on-identical-re-report) each carry a
regression test. The a11y contract (polite/assertive live regions, listbox aria, sheet dialog semantics,
focus return) is preserved. All gates run from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The composer is already a strict presentational seam: `session-composer.svelte` fences a mutation path
(submit / steer / stop / snapshot / slash-draft / attachment flow) that presentation may not reach past, and
its send gates (`canSendMessage`, `effectiveSlashSendable`, `attachmentSendable`) already carry every lock.
The recommendations sit around that seam without crossing it.

**rec 4.1** narrows the `<textarea disabled>` predicate: today it disables on `connection !== 'live' ||
awaitingSnapshot || sendingPrompt || slashSubmitting || attachmentSubmission.busy`; the transient locks
(`sendingPrompt`, `slashSubmitting`, `attachmentSubmission.busy`) move OFF the textarea and stay ONLY on the
send gate, so the keyboard is never yanked mid-send. Image-only send is already valid
(`canSendMessage = hasAttachments ? attachmentSendable : canSubmit`). Exact-draft-restore is a view-state
hook at the reject boundary — the raw draft is captured before the optimistic clear and re-applied through
`setPrompt` when the host rejects, mirroring the existing `attachment-text-recovery` sessionStorage pattern.

**rec 4.3** is mostly already true: `deriveSlashTrigger` opens only when the draft's first char is `/` — a
line-leading rule strictly stronger than orca's (prose `/foo` never triggers). The delta is the missing
suggestion cap: `rankHostCommands` returns every match, so the cap (12) is applied to the ranked list before
it reaches the listbox in `composer-command-autocomplete.svelte`. Rows are already host-sourced
(`catalog.commands` from the scope-guarded `fetchCommands`), so "source from the host catalog" is a
confirm-and-test, not a new fetch.

**rec 4.4** adds a device-local prompt-history store beside `readComposerShiftTabPreference` /
`writeComposerShiftTabPreference` in `state.ts` (same try/catch-guarded `localStorage`/session-scoped
pattern), recording each accepted send (skip empties + consecutive dups) at the send seam. A new recall
sheet (bits Sheet, like `sheet-model-effort.svelte`) is opened from an action-row entry only when the
composer is empty; picking an entry calls `setPrompt` — it fills, never sends. No host field.

**rec 4.5** reuses the whole existing attachment stack: chips already render
(`attachment-rail.svelte` + `attachment-tile.svelte`, with a remove affordance), and the media-lease RPC
already exists (`use-attachment-submission.svelte.ts` → `attachment-client.ts` reservation/upload/commit).
The only new code is an `onpaste` classifier on the textarea that routes image blobs into
`attachmentDraft.selectFiles` and lets text paste stay native — active only when `mediaAvailable`
(`capabilityAllowsPhotos(mediaCapability)`). No base64-in-DTO.

**rec 4.6** adds a mic control (hold-vs-toggle) in the action row and a fail-closed setup sheet; on-device
Web Speech writes to the draft via `setPrompt` as an editable local draft — identical trust to typing — and
when speech is unavailable the setup sheet explains why instead of a dead toast. Host STT is ⚠️
(`007-host-requests`); the on-device path is the ✅ fallback and is never host truth.

**rec 4.7** is a layout confirmation: the model/effort pickers already reach the composer from the "+" tools
popover (`composer-tools.svelte`) and the runtime strip; the delta is confirming an action-row affordance
and that send stays disabled while an option dispatch is in flight (the sheet's `isCommitting` and the
runtime `pending` phase already gate `canSubmit`).

**rec 4.8** adds two guards to `sheet-model-effort.svelte` `canCommit`: refuse when the baseline
`current = runtime.state?.model` is null (today `canCommit` allows `draftKey !== currentKey` even when
`currentKey` is null), and confirm — via a regression test — that a host re-report of the identical
confirmed model/effort does not clear a staged `draftKey`. Effort already guards baseline
(`requestEffort` returns early when `runtime.state === null`). The host-RPC sheet is kept as-is; orca's
typed-`/model`-into-the-TUI pattern is explicitly not adopted.

**rec 4.2** reuses the autocomplete overlay shape for an `@`-trigger predicate (a sibling to
`deriveSlashTrigger`: whitespace-bounded, ~120 ms debounce, ~16 cap, generation-counter stale-safety,
empty-while-in-flight) over a NEW host file-search RPC analogous to `fetchCommands` in `transport/relay.js`.
Absent the RPC the `@` trigger is inert — no device FS walk, no local synthesis. Implementation waits on the
host field; only the shape is planned here.

**Dictation pipeline (ND-5.1–5.9, net-new; extends rec 4.6).** We ship zero dictation today, so this is a new
surface, not a narrowing of an existing predicate. The approach is a strict **capture → permission →
insert-as-draft** loop that never crosses the composer's mutation seam. *Capture (ND-5.1):* a new
`pages/chat/chrome/dictation-overlay.svelte` records the whole take, then on STOP transcribes it once (batch,
no streaming partial); the only live feedback is an RMS audio-level equalizer + `mm:ss` elapsed (a
sqrt+gain-scaled meter with an idle floor, polled ~20 Hz) — deliberately not partial text, so there is no
partial/final reconcile. *Permission (ND-5.3):* `navigator.permissions`/`getUserMedia` is gated BEFORE the
first record; denial surfaces an actionable message + a Settings deep-link, a failed start tears the track
down (the OS mic indicator never stays lit), a secure (HTTPS) context is required, and "no model wins" so the
failure appears before the user speaks a whole take. *Insert-as-draft (ND-5.4, constraint-critical):* the
transcript is written to the composer draft via `setPrompt` and routed through the SAME `canSendMessage`
send-gate — identical trust to typing — and NEVER calls submit; STOP = transcribe+insert, CANCEL (Esc/×) =
discard, a cancelled/superseded take never lands, an insert failure surfaces ("could not insert"), and a
newer overlay instance is never closed by an older take. This is the discipline that makes on-device STT
constraint-legal under host-authoritative + fail-closed.

**Fail-closed dictation setup states (ND-5.2, ND-5.5, ND-5.8).** A setup sheet under `pages/chat/chrome/`
presents the model as a radio list with download progress, a first-class **None/off** row, and a
dangling-pointer heal (adopt a fresh download only when the current pick has nothing behind it; on delete
fall back to any on-disk model but never re-adopt over an explicit None); the model is cached in
IndexedDB/Cache API and corrupt/partial downloads are screened before use. The mic control in
`composer-tools.svelte` drives two capture modes — tap-to-toggle vs press-and-hold walkie-talkie — with a
sub-400 ms hold cancelling as an accidental tap, window blur cancelling, and STOP ≠ CANCEL; a mid-dictation
session switch discards the old take (retarget-cancels) so a transcript never lands in the wrong session's
draft. On-device STT is ✅ (client interaction, editable draft); it becomes ⚠️ only if audio is shipped to a
host STT RPC — in which case the recording length is capped below the transport single-frame budget
(**ND-5.6**), inert until that RPC lands (`007-host-requests`). Paste (**ND-5.7**) only adds a screenshot
MIME→extension map to the rec 4.5 classifier; the language-hint select (**ND-5.9**) ships only with dictation.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · seams
Extract the new stateless seams as pure functions with a canonical differential test: the device-local
prompt-history filter (skip empties + consecutive dups, newest-first, empty-composer-only) in `state.ts`,
and the `@`-mention trigger predicate (sibling to `deriveSlashTrigger`) in `shared/commands/`. Capture the
token-identity + test:web baseline for the composer surface before any change.

### Phase 2 · per-rec changes
Apply each recommendation to its cited files: rec 4.1 (textarea-editable + send-gate + draft-restore in
`session-composer.svelte`), rec 4.3 (suggestion cap + line-leading confirm across `use-slash-trigger.ts`,
`rank-host-commands.ts`, `composer-command-autocomplete.svelte`), rec 4.4 (recall store + sheet + action-row
entry + record-on-send), rec 4.5 (paste classifier into the existing attachment draft/lease), rec 4.6
(dictation control + setup sheet feeding `setPrompt`), rec 4.7 (action-row pickers + in-flight send
disable), rec 4.8 (baseline-unknown refusal + no-revert guard in `sheet-model-effort.svelte`). rec 4.2 is
authored as an inert UI-shape scaffold only, pending the host file-search RPC.

### Phase 3 · verification
Run the fail-closed inertness checks (⚠️ affordances do nothing without their host capability), the pure-seam
differential + boundary tests, token-identity on the existing composer CSS, the model/effort reconciliation
regression tests, test:web, and the a11y-parity check. Confirm every task traces to a rec and
`validate.sh --strict` exits 0 via realpath. Fix and re-run from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

New behaviour gets new tests; unchanged rendering is proven by token-identity, not a line diff. The pure
seams (prompt-history filter, `@`-trigger predicate) are differential-tested against a canonical
implementation and boundary-tested for stale/empty/in-flight staying unresolved. The rec 4.1 send-gate,
rec 4.3 cap, rec 4.5 paste classification, and rec 4.8 reconciliation guards each get a focused test:web
case; the fail-closed inertness of the ⚠️ items is asserted (no FS walk, no paste without the media
capability, no auto-send of a transcript). a11y-parity is checked on the new chrome. All suites run from the
final state before the phase closes.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The existing composer seam and its send gates (`session-composer.svelte`), the slash trigger and ranking
  (`shared/commands/*`), the autocomplete overlay (`composer-command-autocomplete.svelte`), the attachment
  draft + media-lease pipeline (`pages/chat/attachments/*`), and the model/effort sheet
  (`sheet-model-effort.svelte`).
- The device-local storage helper pattern in `shared/state/state.ts`.
- **Host-dependent (⚠️):** a host file-search RPC for rec 4.2, the `mediaCapability.enabled` flag for
  rec 4.5 paste-upload, and (optionally) a host STT RPC for rec 4.6 — all requested/tracked in
  `007-host-requests`.
- The token-identity CSS resolver and the test:web harness for the composer suites.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Every change is confined to `app-mobile/src/pages/chat/**` and `app-mobile/src/shared/{commands,state}/**`
(plus new sibling components under `pages/chat/chrome/`). `git checkout -- app-mobile` restores the prior
composer; there is no migration or data step. The device-local prompt-history store is client-only
`localStorage` — clearing the key removes it, and it never reaches the host. No host contract is created by
this phase, so there is nothing to roll back on the relay.
<!-- /ANCHOR:rollback -->
