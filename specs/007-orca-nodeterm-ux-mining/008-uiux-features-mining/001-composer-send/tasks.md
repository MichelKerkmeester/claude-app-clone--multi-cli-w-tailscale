---
title: "Phase 1 tasks - composer/send ledger (CI + RS findings)"
description: "Task Format: T### [P?] Description (file path). Every task cites its finding id and the real app-mobile file it touches; all tasks open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/001-composer-send"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the composer/send task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1 (CI-4)."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 tasks - composer/send

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task cites its finding id and the real app file(s) it touches. All tasks are OPEN - this packet is a plan; nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_WAVE-1 P0 QUICK-WINS_

- [ ] T1.1 [CI-4 → REQ-001] Narrow the `disabled` predicate on the `<textarea>` (~L770) in `pages/chat/chrome/session-composer.svelte` so transient locks leave the field editable; move the locks onto the send gate via `inputLockReasonWithSettle` in `shared/state/streaming-derivations.ts`. Done: reconnect blip mid-typing does not disable the field, Send stays gated.
- [ ] T1.2 [CI-1 → REQ-002] Add a sessionId-keyed draft+attachment cache under `shared/state/`; wire the draft state in `pages/chat/screen-chat.svelte` (~L156) and stop wiping attachments on `sessionId` change in `pages/chat/attachments/attachment-draft-provider.svelte` + `attachment-state.ts`. Done: A→Home→B→A restores draft and staged photo; storage failure degrades to empty.
- [ ] T1.3 [RS-1 → REQ-004] Tag send delivery `accepted|rejected|unknown` on the Error in `shared/transport/relay.ts` `submitPrompt` (~L566-591), reusing the `delivery-unknown` pattern (~L815/831). Done: three outcomes distinguishable, unknown survives re-throw, unit test covers all three.
- [ ] T1.4 [CI-2 → REQ-003] Hold-before-restore in `pages/chat/screen-chat.svelte` `sendPrompt` (~L434-475): on a thrown POST, watch the transcript for the echoed turn (epoch/optimistic reconcile), 20 second deadline before restoring the draft. Done: lost-ack-but-landed does not restore or resend; true failure restores exact raw draft.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_HARDEN THE SEND PATH_

- [ ] T2.1 [RS-2 → REQ-005] Stamp each held send error with its `scopeKey` (sessionId) in a small held-error store under `shared/state/`; check live scope before painting the `data-send-error-announcer` region (~L650-657) in `screen-chat.svelte`; toast-fallback when the banner unmounted. Done: deferred error never paints the wrong session; unmounted-banner path toasts.
- [ ] T2.2 [RS-3 → REQ-006] Count consecutive E2EE-auth rejections in `shared/transport/use-sync-socket.svelte.ts` + `shared/transport/auth.ts`; flip the reconnect banner (via `shared/state/app-state.svelte.ts` / `state.ts connectionReducer`) to revoked/re-pair only on the third strike; only a full auth clears it. Done: 1/2 blips stay reconnecting, 3rd flips, full auth clears; unit test covers the sequence.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

_HOST-GATED SCAFFOLD + VERIFICATION_

- [ ] T3.1 [CI-5 → REQ-007] [B] Author the unified slash/skills picker under `shared/commands/` (analog of `host-command-catalog.svelte.ts`) with a collision/duplicate-source badge; inert without the host catalog field. BLOCKED on a host skills-catalog RPC (`../../007-host-requests/`). Done: inert with field absent, inserts editable draft (never auto-send) when present, badge on duplicate-source entries.
- [ ] T3.2 [verification] Run token-identity on the composer CSS (0 diffs expected), the send-outcome + RS-3 latch + RS-2 scope regression tests, `test:web`, and the a11y-parity check from the final state. Done: all green, evidence captured.
- [ ] T3.3 [traceability] Confirm every task cites a finding id and a real file, and each REQ has a covering task. Done: no traceless task.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [ ] All P0 findings (CI-4, CI-1, CI-2, RS-1) implemented with acceptance tests green.
- [ ] RS-2 and RS-3 implemented with regression tests; CI-5 shipped inert behind its host catalog.
- [ ] No `[B]` blocked task remains except the host-gated CI-5, which is documented against `../../007-host-requests/`.
- [ ] token-identity, test:web, a11y-parity green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the per-finding requirements and acceptance criteria.
- `plan.md` - the sequenced approach and the ambiguous-send batch.
- `checklist.md` - the Level-2 QA sign-off.
- `../plan.md` - master plan Wave 1, §5.2, §5.5, §6.8.
<!-- /ANCHOR:cross-refs -->
