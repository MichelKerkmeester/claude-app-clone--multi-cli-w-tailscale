---
title: "Phase 4 tasks — composer recommendation ledger (recs 4.1–4.8)"
description: "Extract the shared seams, apply each Angle-4 composer recommendation to its cited file, then prove the set fail-closed and behaviour-preserving."
trigger_phrases:
  - "composer task ledger"
  - "composer packet"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/004-composer"
    last_updated_at: "2026-08-27T00:00:00.000Z"
    last_updated_by: "sk-code"
    recent_action: "Fixed dictation pipeline defects P0-P2: bind, leak, tests, a11y, permission"
    next_safe_action: "Phase complete; awaiting sign-off."
    completion_pct: 100
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

- [x] **T1.1** [rec 4.4] Extract a device-local prompt-history store as pure functions beside
  `readComposerShiftTabPreference` / `writeComposerShiftTabPreference` in `shared/state/state.ts`: record an
  accepted send, skip empties + consecutive dups, expose newest-first, try/catch-guarded so a storage
  failure degrades to empty history. No host field.
- [x] **T1.2** [rec 4.2] Extract an `@`-mention trigger predicate as a pure sibling to `deriveSlashTrigger`
  in `shared/commands/` (whitespace-bounded token, collapsed-caret, empty query allowed), with a canonical
  differential test. Predicate only — no transport yet (the RPC does not exist).
- [x] **T1.3** [cross-cutting] Capture the token-identity and test:web baseline for the composer surface
  (`session-composer.svelte`, `composer-command-autocomplete.svelte`, `composer-tools.svelte`,
  `sheet-model-effort.svelte`, `pages/chat/attachments/*`) before any change, so the pure-relabel/no-regression
  claims have a real starting point.
- [x] **T1.4** [rec 4.6 / ND-5.1, ND-5.5] Pure dictation seams: RMS audio-level scaler
  (`shared/chrome/dictation-audio-level.ts`) and capture-mode state machine
  (`shared/chrome/dictation-capture.ts`). Each has a canonical differential test.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** [rec 4.1] Narrowed textarea disabled, captures draft before send, restores on reject.
- [x] **T2.2** [rec 4.3] Cap at 12 rows via `MAX_SUGGESTION_ROWS` in `rank-host-commands.ts`. Tested.
- [x] **T2.3** [rec 4.4] New `sheet-prompt-history.svelte`, opened from `composer-tools.svelte` when empty.
  Fills via `setPrompt`. Record-on-send wired.
- [x] **T2.4** [rec 4.5] `onpaste` handler on textarea routes image blobs to `attachmentDraft.selectFiles`.
  Active only when `mediaAvailable`.
- [x] **T2.5** [rec 4.6] Dictation mic control in `composer-tools.svelte` (tap-to-toggle +
  press-and-hold). Fail-closed setup sheet `sheet-dictation.svelte`. On-device Web Speech writes editable
  local draft via `setPrompt` (same trust as typing). Unavailable → setup sheet, not a toast.
- [x] **T2.6** [rec 4.7] Model & Effort button in `composer-tools.svelte` popover, wired through to open
  sheet. Send stays disabled during host option dispatch.
- [x] **T2.7** [rec 4.8] `current !== null` guard in `canCommit`. Regression test: re-report does not clear
  staged `draftKey`.
- [x] **T2.8** [rec 4.2] @-file mention scaffold: `mention-file-search.ts` + `use-mention-search.svelte.ts`.
  **BLOCKED** — inert without host RPC.

### Dictation pipeline (net-new from nodeterm — extends rec 4.6; no orca equivalent)

- [x] **T2.9** [rec 4.6 / ND-5.1, ND-5.4] `dictation-overlay.svelte`: BATCH capture loop, RMS equalizer
  + mm:ss clock, setPrompt (never submit), STOP = transcribe+insert, CANCEL (Esc/×) = discard, generation
  guard, insert failure surface.
- [x] **T2.10** [rec 4.6 / ND-5.2] `sheet-dictation.svelte`: engine-status row, None/off row, model
  placeholder states (inert until host provides a model). No real download implemented.
- [x] **T2.11** [rec 4.6 / ND-5.3] Permission gate in `shared/chrome/dictation-permission.ts`:
  navigator.permissions + getUserMedia, actionable denial, failed-start tears track down, secure context
  required. Mic control in `composer-tools.svelte`.
- [x] **T2.12** [rec 4.6 / ND-5.5, ND-5.8] Two capture modes wired (tap-to-toggle, press-and-hold), 400
  ms accidental-tap cancel, window blur cancels, STOP ≠ CANCEL, session switch discards take.
- [x] **T2.13** [rec 4.5 / ND-5.7] Screenshot MIME→extension map in `paste-utils.ts`. Clipboard image/png
  named `pasted-<ts>.png` before selectFiles.
- [~] **T2.14** [rec 4.6 / ND-5.6] ⚠️ Host STT audio→host RPC: BLOCKED on host STT
  (`007-host-requests`). Not built until host provides the RPC.
- [x] **T2.15** [rec 4.6 / ND-5.9] Language-hint select (auto-detect, en-US, de-DE, fr-FR, etc.) in
  `sheet-dictation.svelte`, shown only when dictation ships. ND-5.9 exclusions: prompt-history,
  @-mentions, slash stay orca-owned.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** [fail-closed] ⚠️ affordances inert: @-mentions are BLOCKED (no host RPC); paste-image gated
  on `mediaCapability.enabled`; dictation transcript never auto-sent (structural constraint).
- [x] **T3.2** [token-identity + test:web] token-identity 0-diff; test:web green (76 files, 603 passed).
- [x] **T3.3** [a11y-parity] Composer live regions, slash listbox aria, dictation overlay dialog semantics,
  setup sheet dialog semantics, focus return preserved.
- [x] **T3.4** [traceability] Every task cites rec number; dictation tasks cite ND-5.x ids.
- [x] **T3.5** [fail-closed / ND-5.4, ND-5.3] Dictation constraint-legal: setPrompt (never auto-submit),
  STOP ≠ CANCEL, permission gate with denial message, failed-start tears track, secure context required.
  Shift+Enter → newline vs Enter → send confirmed (existing behavior).
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every ✅ recommendation (4.1, 4.3, 4.4, 4.6-fallback, 4.7, 4.8) is implemented as pure view state /
interaction with its tests green; the net-new on-device dictation pipeline (ND-5.1–5.5, 5.7–5.9) ships as an
editable-draft-no-auto-submit surface that routes through the send-gate; every ⚠️ recommendation (4.2,
4.5-paste, 4.6-host-STT, ND-5.6 audio→host cap) is either shipped inert behind its host capability or deferred
to `007-host-requests`; the fail-closed, token-identity, test:web, and a11y-parity barriers hold from the
final state; and every task traces to a rec number.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the per-rec architecture and the proof strategy.
- `checklist.md` — the barrier sign-off.
- `../research/research.md` — Angle 4 (the source recommendations) and the "Needs host support" table.
<!-- /ANCHOR:cross-refs -->