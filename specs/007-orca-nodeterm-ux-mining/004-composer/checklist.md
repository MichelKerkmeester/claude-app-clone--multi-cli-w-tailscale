---
title: "Phase 4 checklist — composer recommendation barrier (recs 4.1–4.8)"
description: "Barrier sign-off for the composer phase: every ⚠️ affordance inert without its host capability, the pure seams differential/boundary-tested, token-identity 0-diff on existing composer CSS, test:web green (incl. the model/effort reconciliation regression tests), a11y-parity preserved, and every task traceable to a rec. All barriers PASSED."
trigger_phrases:
  - "composer verification checklist"
  - "composer packet"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/004-composer"
    last_updated_at: "2026-08-27T00:00:00.000Z"
    last_updated_by: "sk-code"
    recent_action: "Fixed dictation pipeline defects P0-P2: bind, leak, tests, a11y, permission"
    next_safe_action: "Phase complete; awaiting sign-off."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. This phase is host-authoritative
and fail-closed, so the authoritative gate is the fail-closed inertness barrier — a ⚠️ affordance that does
ANYTHING without its host capability is a hard failure regardless of how it looks. Behaviour is proven by
test:web (send-gating, slash-panel, attachments, reconciliation), unchanged rendering by token-identity, and
the AT tree by a11y-parity. All barriers are PASSED.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The token-identity + test:web baseline for the composer surface is captured before
  any file is touched (real starting numbers for the no-regression claim). Evidence: baseline `test:web`
  svelte 75/599 · logic 36/365 recorded in `implementation-summary.md`.
- [x] **CHK-PRE-02** [P0] The new pure seams (prompt-history filter rec 4.4, `@`-trigger predicate rec 4.2)
  each have a canonical differential test written before their consumers. Evidence: `promptHistory.test.ts`,
  `useMentionTrigger.test.ts`.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] [rec 4.1] The `<textarea>` stays editable through every transient lock; only the
  send action is gated. Image-only send remains valid; a host-rejected send restores the exact raw draft
  byte-for-byte.
- [x] **CHK-CQ-02** [P0] [rec 4.3] The slash panel opens only for a line-leading `/` (never prose `/foo`),
  suggestions are capped at 12, and rows come only from the host catalog snapshot.
- [x] **CHK-CQ-03** [P1] [rec 4.4] The recall sheet is device-local, empty-composer-only, skips empties +
  consecutive dups, and fills (never sends) the draft; storage failure degrades to empty history. Evidence:
  `sheet-prompt-history.svelte`, `promptHistory.test.ts`.
- [x] **CHK-CQ-04** [P0] [ND-5.4] Dictation NEVER auto-submits: the transcript only writes the draft via
  `setPrompt` and routes through the SAME `canSendMessage` send-gate (== typing; the user confirms); STOP ≠
  CANCEL, a cancelled/superseded take never lands, an insert failure surfaces, and a newer overlay instance is
  never closed by an older take.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] token-identity resolves 0-diff on the existing composer surfaces from the final
  state (new chrome uses existing tokens, adds no override to a shared grouped rule). Evidence: `token-identity.mjs`
  35/35 goldens PASS.
- [x] **CHK-TEST-02** [P0] test:web passes from the final state, including the composer send-gating,
  slash-panel, and attachment suites. Evidence: `test:web` svelte 76/606 · logic 38/444, 0 failures.
- [x] **CHK-TEST-03** [P0] [rec 4.8] Regression tests prove the model/effort sheet refuses to commit with an
  unknown baseline (`current === null`) and does NOT revert a staged pick on an identical host re-report.
- [x] **CHK-TEST-04** [P1] [ND-5.1 / ND-5.5] The pure dictation seams (RMS→equalizer scaler, capture-mode
  state machine with the 400 ms tap-cancel) each have a canonical differential test; a11y-parity holds for the
  new dictation overlay + setup-sheet dialog semantics, live regions, and focus return. Evidence:
  `dictationAudioLevel.test.ts`, `dictationCapture.test.ts`, `dictation-overlay.svelte.test.ts`.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Every task in `tasks.md` cites a rec number (4.1–4.8) and the real file it touches
  (dictation tasks additionally cite an ND-5.x id); no task is traceless.
- [x] **CHK-FIX-02** [P1] [rec 4.5] Pending-image chips + paste classification route only through the
  existing attachment draft/lease; no base64 image ever enters a DTO, and paste-image is inert when
  `mediaCapability.enabled` is false.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] [fail-closed] No ⚠️ affordance acts without its host capability: the `@` trigger
  performs no device filesystem walk and no local path synthesis absent the host file-search RPC; an
  on-device transcript is never auto-sent and never treated as host truth. Stale/unknown/in-flight input
  stays visibly unresolved. Evidence: `mention-file-search.ts` returns empty, `dictation-overlay.svelte.test.ts`
  never-auto-submit + cancel-during-pending.
- [x] **CHK-SEC-02** [P0] No client-owned or client-edited session metadata is introduced; the composer only
  reads existing DTO fields / host capabilities and requests host-authorized changes. Nothing under
  `specs/context/**`, `scripts/`, the backend, or a sibling phase folder is touched.
- [x] **CHK-SEC-03** [P0] [ND-5.3 / ND-5.2] Dictation is fail-closed: mic permission is asked before the
  first record with an actionable denial + Settings deep-link, a failed start tears the track down (no dead
  mic), a secure (HTTPS) context is required, and setup surfaces a first-class None/off + model-not-ready
  states. An on-device transcript is never host truth; audio→host STT (ND-5.6 cap) is ⚠️ and inert until the
  host STT RPC lands (`007-host-requests`).
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh <packet> --strict` exits 0 through its realpath.
- [x] **CHK-DOC-02** [P1] No spec path or artifact id appears in any new code comment (comment-hygiene
  clean). Evidence: `scan-comments.mjs` PASS.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] New chrome (recall sheet, dictation setup sheet, `@` overlay scaffold) lives under
  `pages/chat/chrome/`; the device-local store lives in `shared/state/state.ts`; the `@`-trigger predicate
  lives in `shared/commands/` — each beside the pattern it mirrors.
- [x] **CHK-ORG-02** [P2] [rec 4.6 / rec 4.2] The host-dependent items (host STT, file-search RPC) are
  recorded as `007-host-requests` line items, with the client shape buildable when the field lands.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

All barriers PASSED. The composer phase implements recs 4.1, 4.3, 4.4, 4.6-fallback, 4.7 and 4.8 as
pure view state / interaction, and ships recs 4.2, 4.5-paste and 4.6-host-STT as fail-closed items behind a
host capability. The dictation pipeline (ND-5.1–5.5, 5.7–5.9) is complete with constraint proofs.
<!-- /ANCHOR:summary -->