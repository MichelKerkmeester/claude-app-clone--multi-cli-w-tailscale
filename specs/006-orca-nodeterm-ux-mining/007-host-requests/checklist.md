---
title: "Phase 7 checklist — host-request spec barrier"
description: "Barrier sign-off for the host-protocol request spec: every requested field/RPC carries shape + consuming-phase UI + fail-closed fallback + wire-compat; every entry traces to a rec number; the attention approach is the additive-safe SessionCardDto field; Open-Q#1 is answered from the protocol; no client code is touched; the token-identity/test:web/a11y gate is inherited by the consuming phases. All barriers OPEN — plan only."
trigger_phrases:
  - "host requests verification checklist"
  - "host requests packet"
  - "verification checklist"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/007-host-requests"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added nodeterm barriers: fail-closed per new field, both-way wire-compat, ND traceability."
    next_safe_action: "Sign barriers when the request is authored; consuming phases hold the runtime gates."
    blockers:
      - "Host dependency: barriers verify a request; the runtime gates fire in the consuming phases on ship."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Verification Checklist: Phase 7 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. Because this phase implements
no client code, the barriers are documentary and structural — a request is proven complete by traceability
(every field/RPC → a rec and a consuming phase), fail-closed coverage (every field has a defined absent
behaviour that is the current client behaviour), and protocol evidence for Open-Q#1 — NOT by a runtime gate.
The runtime gates (`token-identity` 0-diff, `test:web` green, a11y-parity) are the authoritative gates for the
UI these fields unlock, and they fire in the consuming phases when the host ships, not here.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [ ] **CHK-PRE-01** [P0] The current shapes the request diffs against are captured: `SessionCardDto` (`packages/pi-rpc-protocol/src/types.ts:428`), `AttentionItemDto`/`AttentionClass` (`types.ts:1068,1054`). [evidence: the read shapes recorded in `spec.md` §2 and `plan.md` §3]
- [ ] **CHK-PRE-02** [P0] The guard strictness is captured: `isSessionCardDto` permissive (`guards.ts:1244`) vs `isAttentionItemDto` strict `hasOnlyKeys` (`guards.ts:364`), which decides the attention approach. [evidence: `spec.md` §6 Risks + `tasks.md` T2.4/T3.3]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] Every requested field/RPC carries all four facets: wire shape, consuming-phase UI, fail-closed fallback, wire-compat note. [evidence: `tasks.md` T2.1–T2.13]
- [ ] **CHK-CQ-02** [P0] No entry invents the field on the client or has the client own/edit session truth — every field is host-authored and client-read-only. [evidence: each row's shape marked host-authored; fallbacks are read-only view state]
- [ ] **CHK-CQ-03** [P1] The attention taxonomy reconciliation is stated (request the card enum `none|blocked|waiting|completed` with a mapping, or a widened `AttentionClass`), and "unread ≠ working" holds. [evidence: `tasks.md` T2.4; `types.ts:1054`]
- [ ] **CHK-CQ-04** [P0] Each nodeterm net-new field degrades fail-closed to today's card when absent: no meter (`contextPercent`), plain working state (`activity`/`tool`), omitted line (`prompt`), base three-value attention (sub-kind/end-reason), age off `updatedAt` (`stateEnteredAt`), local-only dismissal (read-ack). [evidence: `tasks.md` T2.14–T2.19 fallbacks]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] Fail-closed barrier: every field/RPC has a defined absent-behaviour equal to the current client behaviour; a stale/unknown/mismatched value stays visibly unresolved, never promoted to success. [evidence: each fallback in `tasks.md` T2.* names the current behaviour]
- [ ] **CHK-TEST-02** [P0] The `token-identity` 0-diff + `test:web` green + a11y-parity gate is NAMED as inherited by each consuming phase (this request spec changes no CSS or behaviour, so it runs no such gate and claims none). [evidence: `plan.md` §2 Quality Gates + §5 Testing]
- [ ] **CHK-TEST-03** [P1] Open Question #1 is answered from `pi-rpc-protocol` with `file:line` evidence; #2 and #3 carried with observed state. [evidence: `spec.md` §7; `types.ts:1068,1076`, `guards.ts:364,396`]
- [ ] **CHK-TEST-04** [P1] Wire-compat both ways for the nodeterm additions: each net-new optional field (`contextPercent`, `activity`/`tool`, `prompt`, `stateEnteredAt`) and the `attention` sub-kind/end-reason is additive-safe under the permissive `isSessionCardDto` (`guards.ts:1244`); the read-ack is a new versioned, feature-detected RPC. [evidence: `plan.md` §3; `tasks.md` T2.14–T2.19]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] Every ⚠️ rec in the research "Needs host support" set is placed: card bundle (2.2, 2.3, 1.6), optional (2.4, 2.5, 1.3, 1.4, 2.6, 1.14, 6.4), RPCs (4.2, 4.5, 4.6, 5.6). [evidence: `tasks.md` T2.1–T2.13 rec cites]
- [ ] **CHK-FIX-02** [P0] The attention approach is corrected to the additive-safe `SessionCardDto` field rather than the guard-breaking `sessionId`-on-`AttentionItemDto` join. [evidence: `tasks.md` T2.4/T3.3; `guards.ts:1244,364`]
- [ ] **CHK-FIX-03** [P0] Every net-new nodeterm ⚠️ request is placed, cites its `ND-x.y` id, and names a consuming phase: `contextPercent` (ND-3.1), `activity`/`tool` (ND-3.2), `prompt` (ND-3.3), attention sub-kind+end-reason (ND-2.2, ND-2.9), read-ack RPC (ND-2.10), `stateEnteredAt` (ND-2.8, ND-1.5); the reinforced orca fields (`title`, `agent`/`model`, base `attention`) are NOT re-requested. [evidence: `tasks.md` T2.14–T2.19, T3.5]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] No requested field lets the client edit or own mutable session truth; raw `cwd`/path on home is not requested (only a redacted `projectLabel`, gated on product). [evidence: `tasks.md` T2.6; `screen-home.svelte:86`]
- [ ] **CHK-SEC-02** [P0] Nothing under `specs/context/**` read or written; no file under `app-mobile/` created or edited. [evidence: `git status` — changes only under `specs/006-orca-nodeterm-ux-mining/007-host-requests/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run via realpath]
- [ ] **CHK-DOC-02** [P1] No spec path or artifact id embedded in any code comment (N/A here — this phase writes no code; the note holds for the consuming phases). [evidence: no code authored in this phase]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] The five Level-2 docs exist in the phase folder: `spec.md`, `plan.md`, `tasks.md`, `checklist.md`, `implementation-summary.md`. [evidence: `ls specs/006-orca-nodeterm-ux-mining/007-host-requests/`]
- [ ] **CHK-ORG-02** [P2] Every requested field/RPC names its consuming phase (`002-home-selection` children, `003-chat-message`, `004-composer`, `005-streaming-ask`). [evidence: `tasks.md` T2.* consuming-phase cites; `T3.1` trace]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

When signed, this phase will have delivered the ⚠️ "Needs host support" set as a buildable cross-team request:
a four-field card bundle, five optional/product-gated fields, and four chat RPCs, each with a wire shape, the
exact UI and consuming phase it unlocks, a fail-closed fallback equal to today's behaviour, and a wire-compat
note grounded in the real `pi-rpc-protocol` guards. Open Question #1 is answered against our own protocol (the
Inbox item carries no `sessionId`, so the attention badge needs a new host field — the additive-safe
`SessionCardDto.attention`). The phase implements no client code and stays blocked on the relay until the
operator says go; the runtime gates for the eventual UI belong to the consuming phases.
<!-- /ANCHOR:summary -->
