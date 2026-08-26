---
title: "Phase 4 tasks — composer recommendation ledger (recs 4.1–4.8)"
description: "Extract the shared seams, apply each Angle-4 composer recommendation to its cited file, then prove the set fail-closed and behaviour-preserving. Every task cites its rec number and the real file it touches; all tasks are OPEN (plan only)."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/004-composer"
    last_updated_at: "2026-08-26T00:00:00.000Z"
    last_updated_by: "sk-code"
    recent_action: "Applied review fixes: real re-report test, gated history, restore/paste tests, a11y button."
    next_safe_action: "Commit the orca-recs slice; dictation pipeline is next."
    completion_pct: 55
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
- [ ] **T1.4** [rec 4.6 / ND-5.1, ND-5.5] Extract the pure dictation seams: the RMS audio-level →
  equalizer-bar scaler (sqrt+gain curve, idle floor, ~20 Hz poll) and the capture-mode state machine (toggle
  vs hold-to-talk, 400 ms accidental-tap cancel, STOP ≠ CANCEL) as pure functions under `shared/`, each with
  a canonical differential test. Scaling/interaction only — no `getUserMedia` / MediaRecorder yet.
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
- [ ] **T2.5** [rec 4.6] Add a dictation control (hold-vs-toggle) to the composer action row and a
  fail-closed setup sheet under `pages/chat/chrome/`; on-device Web Speech writes an editable local draft via
  `setPrompt` (confirm-before-send, same trust as typing). When speech is unavailable show the setup sheet,
  not a dead toast. Host STT stays ⚠️ (`007-host-requests`); the transcript is never host truth.
- [x] **T2.6** [rec 4.7] Model & Effort button in `composer-tools.svelte` popover, wired through to open
  sheet. Send stays disabled during host option dispatch.
- [x] **T2.7** [rec 4.8] `current !== null` guard in `canCommit`. Regression test: re-report does not clear
  staged `draftKey`.
- [x] **T2.8** [rec 4.2] @-file mention scaffold: `mention-file-search.ts` + `use-mention-search.svelte.ts`.
  **BLOCKED** — inert without host RPC.

### Dictation pipeline (net-new from nodeterm — extends rec 4.6; no orca equivalent)

- [ ] **T2.9** [rec 4.6 / ND-5.1, ND-5.4] Build the dictation overlay chrome — a new
  `pages/chat/chrome/dictation-overlay.svelte` — as a BATCH capture loop (record → STOP → transcribe the
  whole take once, no streaming partial); the only live feedback is the RMS audio-level equalizer + `mm:ss`
  elapsed (never partial text, so there is no partial/final reconcile). The transcript is written to the draft
  via `setPrompt` and routed through the SAME `canSendMessage` send-gate — it NEVER calls submit. STOP =
  transcribe+insert; CANCEL (Esc/×) = discard; a cancelled/superseded take never lands; an insert failure is
  surfaced ("could not insert"); a newer overlay instance is never closed by an older take.
- [ ] **T2.10** [rec 4.6 / ND-5.2] Add a fail-closed dictation setup sheet under `pages/chat/chrome/`:
  model-download progress, a first-class None/off row, and the dangling-pointer heal (adopt a fresh download
  only when the current pick has nothing behind it; on delete fall back to any on-disk model but never
  re-adopt over an explicit None); cache the model in IndexedDB/Cache API and screen corrupt/partial downloads
  before use. ⚠️ If the STT model is host-hosted, surface "choose / download a model" as sheet states, never a
  dead mic.
- [ ] **T2.11** [rec 4.6 / ND-5.3] Gate the mic permission BEFORE the first record via
  `navigator.permissions` / `getUserMedia`: an actionable denial message + a Settings deep-link, a failed
  start tears the track down (the OS mic indicator never stays lit), "no model wins" so the failure surfaces
  before the user speaks, and a secure (HTTPS) context is required. Add the mic control to the composer action
  row in `pages/chat/chrome/composer-tools.svelte`.
- [ ] **T2.12** [rec 4.6 / ND-5.5, ND-5.8] Wire the two capture modes to the mic control — tap-to-toggle (tap
  start, tap stop+insert) vs press-and-hold walkie-talkie (hold to record, release to stop) — with a hold
  under 400 ms cancelling quietly as an accidental tap, window blur cancelling, and STOP ≠ CANCEL. On a
  mid-dictation session switch, discard the old take (remount/retarget) so a transcript never lands in the
  wrong session's draft.
- [x] **T2.13** [rec 4.5 / ND-5.7] Screenshot MIME→extension map in `paste-utils.ts`. Clipboard image/png
  named `pasted-<ts>.png` before selectFiles.
- [ ] **T2.14** [rec 4.6 / ND-5.6] ⚠️ ONLY IF audio is ever shipped to a host STT RPC: cap the recording
  length below the transport single-frame budget (auto-stop fires the same transcribe+insert path, with a
  "recording capped…" notice). On-device WASM STT keeps a memory ceiling only. BLOCKED on host STT
  (`007-host-requests`); not built until it lands.
- [ ] **T2.15** [rec 4.6 / ND-5.9] Ship a per-locale language-hint select (auto-detect default) in the
  dictation setup sheet, only when dictation ships. Record ND-5.9's absences — prompt-history / `@`-mentions /
  slash stay orca-owned (recs 4.4 / 4.2 / 4.3) — as exclusions in `spec.md`; do NOT re-propose them.
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
- [ ] **T3.4** [traceability] Every task cites a rec number (4.1–4.8); dictation tasks additionally cite an
  ND-5.x id; `validate.sh <packet> --strict` exits 0 through its realpath.
- [ ] **T3.5** [fail-closed / ND-5.4, ND-5.3] Prove dictation is constraint-legal and fail-closed: the
  transcript only writes the draft via `setPrompt` and routes through `canSendMessage` (never auto-submits);
  STOP ≠ CANCEL, a cancelled/superseded take never lands, an insert failure surfaces, a newer overlay instance
  is never closed; the mic permission is asked before record with an actionable denial + Settings deep-link, a
  failed start tears the track down (no dead mic), and a secure context is required. Confirm the composer maps
  Shift+Enter → newline vs Enter → send (ND-5.9).
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
