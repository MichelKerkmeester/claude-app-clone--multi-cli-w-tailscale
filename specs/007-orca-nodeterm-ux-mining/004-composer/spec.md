---
title: "Phase 4 — Composer / input: port the verified orca composer recommendations"
description: "Plan the composer-surface recommendations from the orca UX mining synthesis (recs 4.1–4.8) into the SvelteKit mobile client, host-authoritative and fail-closed. Ships the ✅ set — image-or-text send with a never-disabled textarea and exact-draft-restore-on-reject, the line-leading slash rule plus a suggestion cap sourced from the host catalog, a device-local prompt-history recall sheet, paste-image classification into the existing attachment lease, on-device dictation as an editable local draft, the composer action-row option pickers, and the model/effort-sheet reconciliation bug-fixes — and plans the ⚠️ @-file mention UI shape against a host file-search RPC. Plan only; nothing implements until the operator says go."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/004-composer"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned composer recs 4.1–4.8 against real files; no code implemented yet."
    next_safe_action: "Await operator go, then implement Phase 2 starting with rec 4.1 in session-composer.svelte."
    blockers:
      - "rec 4.2 @-file search needs a host file-search RPC (requested in 007-host-requests); plan the UI now, implement when it lands."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 — Composer / input

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Research: [`../research/research.md`](../research/research.md) (Angle 4) · Prev: `003-chat-message` · Next: `005-streaming-ask`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Source of truth | `research/research.md` Angle 4 — recs 4.1 … 4.8 |
| Constraint | Host-authoritative, fail-closed — the client owns no editable session metadata |
| Barrier | fail-closed inert without host field + token-identity 0 diffs + test:web green + a11y-parity preserved + every task → a rec |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The composer is the client's one write surface, and the orca mining run (Angle 4) verified eight portable
improvements to it. Most are pure view state or interaction we can ship today; a few need a host-published
read-only capability before their body works. This phase plans all eight against the real composer files.

The gaps the recommendations close: the textarea is disabled during transient send/slash/attachment locks
(iOS yanks the keyboard on such a lock), a rejected send does not restore the exact raw draft, the slash
suggestion list has no cap, there is no way to recall a previously sent prompt, a pasted image is not
classified as an attachment, there is no dictation affordance, and the model/effort sheet can commit an
option with no known baseline. Two items — `@`-file mentions and image-paste upload — depend on host
support and are planned with a fail-closed fallback rather than invented on the client.

Nothing here makes the client own session truth. The ✅ set reads existing DTO fields or is pure
interaction; the ⚠️ set reads a NEW host-published capability and stays inert until it lands; the one ❌
sub-pattern (orca's typed-`/model`-into-the-TUI) is explicitly rejected in favour of our host-RPC sheet.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — the eight Angle-4 recommendations, each over real composer files:**

- **rec 4.1** — image-or-text send (image-only already valid); stop disabling `<textarea>` on a transient
  lock (gate only *sending*); restore the exact raw draft when the host rejects a send.
  `pages/chat/chrome/session-composer.svelte`.
- **rec 4.3** — keep the slash trigger line-leading (prose `/foo` is not a command) and cap suggestions at
  12, sourced from the host command catalog. `shared/commands/use-slash-trigger.ts`,
  `shared/commands/rank-host-commands.ts`, `pages/chat/chrome/composer-command-autocomplete.svelte`.
- **rec 4.4** — a device-local prompt-history recall sheet of THIS session's sent prompts (skip empties and
  consecutive dups; empty-composer-only; a sheet, not a hijacked hardware key). A new device-local store in
  `shared/state/state.ts`, a new sheet under `pages/chat/chrome/`, an action-row entry in
  `pages/chat/chrome/composer-tools.svelte`, and a record-on-send hook in `session-composer.svelte`.
- **rec 4.5** — pending-image chips (already present) plus image-vs-text paste classification routed into
  the EXISTING attachment draft + media-lease pipeline. `session-composer.svelte` (paste handler),
  `pages/chat/attachments/attachment-rail.svelte`, `pages/chat/attachments/use-attachment-submission.svelte.ts`.
- **rec 4.6** — dictation chrome (hold-vs-toggle) and a fail-closed setup sheet; on-device speech produces
  an editable local draft the user confirms before send. A new control in the action row and a new setup
  sheet under `pages/chat/chrome/`; feeds `session-composer.svelte` via `setPrompt`.
- **rec 4.7** — session-option pickers in the composer action row (model/effort already ship via the "+"
  tools popover and the runtime strip); keep send disabled while a host option dispatch is in flight.
  `pages/chat/chrome/composer-tools.svelte`, `pages/chat/chrome/sheet-model-effort.svelte`.
- **rec 4.8** — keep our host-RPC model/effort sheet; adopt the reconciliation bug-fixes only: refuse to
  commit a model with no known baseline, and never revert a staged pick on an identical host re-report.
  `pages/chat/chrome/sheet-model-effort.svelte`.
- **rec 4.2** — plan the `@`-file mention UI shape (whitespace-bounded trigger, ~120 ms debounce, ~16 cap,
  generation-counter stale-safety, empty-while-in-flight) over a NEW host file-search RPC (query in →
  relative paths out), reusing the autocomplete overlay. ⚠️ BLOCKED on the host RPC; plan only.
  `pages/chat/chrome/composer-command-autocomplete.svelte`, `shared/commands/*`.

**Out of scope:** any host RPC contract itself (owned by `007-host-requests`); the actual file-search or STT
network implementation (⚠️ items ship inert until the host lands the field); orca's typed-`/model`-into-the-TUI
option pattern (❌, explicitly rejected); any change to backend, `scripts/`, sibling phase folders, or
`specs/context/**`; base64 media in a DTO (❌); any client-owned/edited session metadata; the streaming,
ask-card, and navigation recommendations (Angles 5–6, other phases).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** [rec 4.1] — The `<textarea>` stays editable through every transient lock (sending, slash
  revalidation, attachment upload); only the *send* action is gated. Image-only send remains valid. When
  the host rejects a send, the exact raw draft (byte-for-byte) is restored to the composer.
- **REQ-002** [rec 4.3] — The slash panel opens only for a line-leading `/` token, never for a `/` inside
  prose; the suggestion list is capped at 12 rows; rows are sourced solely from the host command catalog
  snapshot (never client-invented).
- **REQ-003** [rec 4.4] — A device-local recall sheet lists this session's sent prompts, newest first, with
  empties and consecutive duplicates skipped; it is offered only when the composer is empty; selecting an
  entry fills the draft (it does not send). No host field is read or written; storage failure degrades to an
  empty history, never an error.
- **REQ-004** [rec 4.5] — A pasted image is classified and routed into the existing attachment draft and
  media-lease flow; a pasted text stays a native text paste. No image bytes are placed in a DTO. The path is
  active only when the host media capability is enabled; otherwise paste-image is inert and text paste is
  unaffected.
- **REQ-005** [rec 4.6] — A dictation control offers hold-vs-toggle; on-device speech writes an editable
  local draft the user confirms before send (identical trust to typing). When speech is unavailable a
  fail-closed setup sheet explains why, never a dead toast. On-device speech is never treated as host truth.
- **REQ-006** [rec 4.7] — The model and effort pickers are reachable from the composer action row; the send
  control stays disabled while a host option dispatch is in flight.
- **REQ-007** [rec 4.8] — The model/effort sheet refuses to commit an option when the baseline (the
  host-confirmed current model/effort) is unknown, and an identical host re-report of the confirmed option
  never reverts a user's staged pick. The host-RPC sheet is kept; orca's typed-`/model`-into-the-TUI pattern
  is not adopted.
- **REQ-008** [rec 4.2] — The `@`-file mention UI is specified (trigger predicate, debounce, cap,
  generation-counter stale-safety, empty-while-in-flight) as a query-in → relative-paths-out shape over a
  NEW host file-search RPC. It performs no device filesystem walk and no local path synthesis; absent the
  RPC the `@` trigger stays inert. Implementation is deferred to when the host ships the field.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Every task in `tasks.md` cites a rec number (4.1–4.8) and the real app file(s) it will touch; no task is
   traceless.
2. Each ✅ requirement (REQ-001…003, 005 fallback, 006, 007) is planned as pure view state / interaction over
   existing DTO fields — no client-owned session truth.
3. Each ⚠️ requirement (REQ-004 storage, REQ-008 file-search, REQ-004/paste media capability, REQ-005 host
   STT) names its fail-closed fallback and, where a host field is needed, points at `007-host-requests`.
4. The barriers in `checklist.md` — fail-closed, token-identity 0-diff, test:web green, a11y-parity — are
   all defined and OPEN; nothing is implemented (`completion_pct: 0`).
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **rec 4.2 is blocked on a host file-search RPC.** The client must never walk the device filesystem, so the
  `@`-mention body is inert until the host publishes a `query in → relative paths out` search. Dependency
  tracked in `007-host-requests`; the UI shape is plannable now and buildable the moment the field lands.
- **rec 4.5 paste-upload depends on the host media capability.** The media-lease pipeline already exists
  (`attachment-client.ts` reservation/upload/commit), gated behind `mediaCapability.enabled`, which
  production callers keep disabled until enablement. Paste classification is buildable now behind that gate;
  it does nothing until the capability is on. No base64-in-DTO path is ever added.
- **rec 4.6 host STT is ⚠️; on-device STT must stay a draft.** On-device speech is acceptable ONLY as a
  local editable draft the user confirms before send. Treating a transcript as host truth, or auto-sending
  it, is ❌.
- **rec 4.1 textarea-editable change could regress the disabled-state affordance.** Dropping the transient
  locks from the `disabled` predicate must not let a send fire mid-lock — the send gate (`canSendMessage`,
  `effectiveSlashSendable`) must carry the whole lock. Proven by test:web on the send-gating suite.
- **rec 4.8 reconciliation guards are behavioural, not cosmetic.** The baseline-unknown refusal and the
  no-revert-on-identical-re-report are invisible to token-identity; they need their own regression tests.
- **New composer chrome (recall sheet, dictation, `@` overlay) must preserve the a11y contract** (live
  regions, listbox aria, sheet dialog semantics, focus return) that the composer already ships.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- **Does the Pi relay already expose a file-search RPC** (query → relative paths), or must it be added? If it
  exists, rec 4.2 becomes buildable immediately; if not, it is a `007-host-requests` line item. Open per the
  research "Needs host support" section.
- **Is the host media capability (`mediaCapability.enabled`) expected to be enabled for this build?** rec 4.5
  paste-upload only functions when it is; otherwise the chrome ships inert.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent and its invariants.
- `../research/research.md` — Angle 4 (composer) and the "Needs host support" chat-RPC table.
- `../007-host-requests/` — the host file-search RPC (rec 4.2), media-lease/paste enablement (rec 4.5), and
  host STT (rec 4.6) requests this phase's ⚠️ items depend on.
- `../005-streaming-ask/` — the sibling phase that owns optimistic-echo reconciliation and input-lock
  reasons that pair with the composer send path.
<!-- /ANCHOR:cross-refs -->
