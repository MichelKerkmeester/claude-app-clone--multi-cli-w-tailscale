---
title: "orca + nodeterm UX mining — implement the verified portable recommendations"
description: "Phase parent for porting verified, portability-checked UX recommendations from two research passes into the SvelteKit mobile client, both now folded area-by-area into the seven phases below: orca (research/research.md, ~48 recs) and nodeterm (research-nodeterm/, 58 findings from a manual multi-agent pass). Grouped by area and ordered by leverage and dependency: a tested pure-function foundation, home session-selection UX, chat message/transcript UX, composer UX, streaming and ask/permission hardening, navigation correctness, and a host-protocol request spec for the items that need new host fields. Every ported idea stays host-authoritative and fail-closed; nothing implements until the operator says go."
contextType: "planning"
importance_tier: "normal"
trigger_phrases:
  - "orca nodeterm ux mining spec requirements"
  - "orca nodeterm ux mining packet"
  - "spec requirements"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Folded 58 nodeterm findings into all phases beside the orca recs; plan-only."
    next_safe_action: "Await operator go; implement the ✅ set, request the new host fields in 007."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# orca + nodeterm UX mining — implementation phase parent

> **Phase links** — orca research: [`research/research.md`](research/research.md) · nodeterm research: `research-nodeterm/` (58 findings, folded into the phases) · Findings artifacts published separately

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Mode | Phase parent |
| Source of truth | orca: `research/research.md` (fresh-Opus-verified; ~48 recs) · nodeterm: `research-nodeterm/` (58 findings, folded into the phases) |
| Children | `001-tested-seams`, `002-home-selection` (nested), `003-chat-message`, `004-composer`, `005-streaming-ask`, `006-navigation`, `007-host-requests` |
| Status | Planning (no implementation until the operator says "go") |
| Constraint | Host-authoritative, fail-closed — the client owns no editable session metadata |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

A 20×2 deep-research run mined orca for portable UI/UX and chat-feature logic, and a fresh independent
Opus verifier confirmed ~48 distinct recommendations against real orca source (0 hallucinations, 1 verdict
corrected). This packet turns that verified synthesis into an implementable plan.

The recommendations split three ways against THE CONSTRAINT: **✅ drop-in** (client-side over existing DTO
fields `status`/`messageCount`/`updatedAt`/`epoch` or pure interaction), **⚠️ needs a new host field**
(worthwhile but blocked on the relay publishing a new read-only field/RPC), and **❌ not portable** (needs
the client to own mutable session truth). The phases below implement the ✅ set now, plan the ⚠️ set as an
explicit host-request spec that is buildable the moment the fields land, and record the ❌ set as backlog
exclusions.

Each phase is a distinct area with its own verification surface (`token-identity` for CSS, `test:web` for
behaviour, a11y-parity for the AT tree), which is why they are separated rather than shipped as one diff.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:phases -->
## 3. PHASE DOCUMENTATION MAP

| Phase | Child | Scope | Level |
|---|---|---|---|
| 1 | `001-tested-seams` | Extract the home filter/sort/group, message grouping, draft reconciliation, and scope-guard logic as PURE functions over immutable snapshots (each carrying `id`+`epoch`+revision), with differential + boundary tests. The foundation that keeps every later drop-in provably faithful and fail-closed. | 3 |
| 2 | `002-home-selection` | The biggest-leverage area (15 recs). Nested: `001-list-behavior` (recency-sort, pull-to-refresh, list states, single-flight open, resume slot, haptics), `002-list-organization` (time buckets, status filter, search chrome, device-local favorite, new-session chrome), `003-card-polish` (relabel messages, datetime + absolute-on-tap, stale-decay, drop resting-done dot, peek accordion chrome). | 3 |
| 3 | `003-chat-message` | Message/transcript interactions: in-transcript copy-code, per-turn scroll arrow, whole-message copy, tool-run folding, scoped selection-copy, safe session action sheet, jump-to-latest FAB split, load-earlier, authorized file-link routing. | 2 |
| 4 | `004-composer` | Composer: image-or-text send + exact-draft-restore, line-leading slash + cap, prompt-history recall sheet, pending-image chips, dictation chrome, and the model/effort-sheet reconciliation bug-fixes. | 2 |
| 5 | `005-streaming-ask` | Streaming & blocking-prompt hardening: working-vs-streaming split, peek-safe streaming, optimistic-echo reconciliation, input-lock reasons, ask-card wizard + index answers, approval-from-ticket, one-blocking-at-a-time, named empty/error copy. | 2 |
| 6 | `006-navigation` | Fail-closed navigation: carry id raw + re-validate `id`+`epoch` at chat entry, selection-vs-host-active precedence, per-session view-mode preference. | 2 |
| 7 | `007-host-requests` | The ⚠️ set as a host-protocol request spec: the card bundle (`title`, `lastMessagePreview`, `agent`, `attention`) + optional fields + RPCs (`@`-file-search, media-lease), each with the UI it unlocks and the fail-closed fallback. Includes the Inbox-`sessionId` question that could unblock the attention badge for free. Buildable when the host ships. | 2 |
| 9 | `009-home-balance-and-controls` | Operator-reported, not finding-driven: the home column reads as unstructured on a phone — half-width cards beneath full-width headings, three control clusters in three shapes, an unlabelled theme control — and closing the model picker leaves the chat unable to scroll or accept input. Every acceptance criterion is a browser measurement rather than a judgement. | 2 |
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:invariants -->
## 4. INVARIANTS

Non-negotiable across every phase:

- **Fail-closed, host-authoritative.** No phase makes the client own or edit mutable session truth. Every
  new view affordance reads existing DTO fields, is a pure interaction, or reads a NEW host-published
  read-only field. Stale/unknown/mismatched data stays visibly unresolved — never promoted to success.
- **Traceability.** Every task traces to a numbered recommendation in `research/research.md`.
- **No rendered-value regressions.** `token-identity` resolves 0-diff and `test:web` stays green from the
  final state of any phase that touches CSS or behaviour; the a11y contract is preserved (per the
  a11y-parity discipline).
- **Comment hygiene.** No spec path or artifact id in any code comment.
- **Plan-only until "go".** These packets are a plan; no phase implements code until the operator says so.
<!-- /ANCHOR:invariants -->

---

<!-- ANCHOR:cross-refs -->
## 5. CROSS-REFERENCES

- `research/research.md` — the verified synthesis every phase draws from.
- `research/research-angles.md` — the goal, our current-state gaps, and the constraint.
- `../004-sveltekit-spa-migration/020-source-structure/` — the source/comment conventions any new code follows.
- `../002-pi-remote-mobile-ui-ux-features/` — the earlier per-feature UX packets some recommendations extend.
<!-- /ANCHOR:cross-refs -->
