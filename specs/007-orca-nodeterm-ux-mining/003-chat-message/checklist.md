---
title: "Phase 3 checklist — chat message/transcript interactions barrier"
description: "Barrier sign-off for the message-level chat affordances (recs 3.1-3.6, 6.6) and the 3.7 exclusions: fail-closed (no client-owned session truth), selection scoped to the transcript root, file-links routed only through the artifact viewer, token-identity 0-diff, a11y-parity preserved, and test:web green — all OPEN until implementation runs."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/003-chat-message"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Wrote the OPEN barrier checklist; no barrier is proven yet."
    next_safe_action: "On operator go, satisfy the pre-implementation barriers first."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. These affordances are
proven by a fail-closed review (no client-owned session truth; scoped selection; inert-vs-routed links), a
value oracle (token-identity), an a11y-parity check, and `test:web` — not by a line diff. The fail-closed
barrier is authoritative: it is the one that catches a control that would let the client edit session truth
or open an unauthorized file. All items are OPEN — nothing is implemented yet.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [ ] **CHK-PRE-01** [P0] The token-identity and `test:web` baselines are captured from the pre-change
  transcript surfaces. [rec: 3.1-3.6, 6.6]
- [ ] **CHK-PRE-02** [P0] The reusable seams are confirmed present and correct (`use-copy-feedback.svelte.ts`,
  the artifact viewer context, the `sendSlashDraft` lane, the `sheet-model-effort.svelte` pattern, the
  transcript roots). [rec: 3.2-3.6, 6.6]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] The per-turn scroll control (3.1) is distinct from the jump-to-latest FAB and does
  not mutate blocks or live-edge follow-state. [rec: 3.1]
- [ ] **CHK-CQ-02** [P0] The flat tool-run recast (3.4) keeps the grouping a pure projection — call↔result
  pairing and in-flight state derive from the existing grouping, not new session state. [rec: 3.4]
- [ ] **CHK-CQ-03** [P1] Copy paths (3.2, 3.3) reuse `use-copy-feedback.svelte.ts`; Copy is unavailable (not
  faked) when the clipboard API is absent; the tint confirm does not shift layout. [recs: 3.2, 3.3]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] token-identity resolves 0-diff vs baseline for the new controls and the flat
  recast across the three themes. [recs: 3.1, 3.2, 3.3, 3.4]
- [ ] **CHK-TEST-02** [P0] `test:web` passes from the final state (verified by content — both suite summaries
  present — not by a piped tail exit code). [recs: 3.1-3.6, 6.6]
- [ ] **CHK-TEST-03** [P1] The component stories for the touched surfaces still mount and render. [recs: 3.1,
  3.2, 3.4]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] Selection-copy (3.5) is disabled on empty selection and copies only when the
  selection is anchored inside `.transcript--frame`; a foreign selection is never copied as this session's.
  [rec: 3.5]
- [ ] **CHK-FIX-02** [P0] Every rec 3.1-3.6 and 6.6 is implemented against its cited file(s) and the 3.7
  exclusions are recorded; every task traces to a rec. [recs: 3.1-3.7, 6.6]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] Fail-closed: no client-owned session truth. REC 3.6 only dispatches existing host
  slash-commands via `sendSlashDraft`; no rename/pin/archive/edit writes local session metadata. [rec: 3.6]
- [ ] **CHK-SEC-02** [P0] REC 6.6: a file/link tap opens the artifact viewer only for a host-supplied stable
  reference; a markdown path / local URI / image URL is never read directly, and an unresolved link is inert
  "unavailable". [rec: 6.6]
- [ ] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is touched; changes stay under
  `app-mobile/src/pages/chat/`. [recs: 3.1-3.7, 6.6]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh <packet> --strict` exit 0 through its realpath. [recs: 3.1-3.7, 6.6]
- [ ] **CHK-DOC-02** [P1] No spec path or artifact id is introduced in any code comment (comment hygiene).
  [recs: 3.1-3.6, 6.6]
- [ ] **CHK-DOC-03** [P2] The two ⚠️ edges (host-title rename RPC, a new authorized artifact reference) are
  recorded as fail-closed fallbacks with a pointer to `007-host-requests`. [recs: 3.6, 6.6]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] a11y-parity is preserved on every new control (label, focus order, disclosure
  roles, dismissal, live regions); the action sheet reuses the established sheet a11y pattern. [recs: 3.1,
  3.2, 3.4, 3.5, 3.6]
- [ ] **CHK-ORG-02** [P2] Each affordance is additive and independently revertible; no unrelated transcript
  surface is refactored. [recs: 3.1-3.6, 6.6]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Planned, not yet verified. On implementation, the message-level affordances (recs 3.1-3.6, 6.6) will be
proven fail-closed (no client-owned session truth, scoped selection, inert-or-routed file-links), with
token-identity at 0 diffs, a11y-parity preserved, and `test:web` green from the final state; the ❌ set (3.7)
is recorded as backlog exclusions. No barrier is satisfied until the operator says go and the work runs.
<!-- /ANCHOR:summary -->
