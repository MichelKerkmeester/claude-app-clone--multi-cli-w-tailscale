---
title: "Phase 7 plan — how the host-request spec is structured and proven complete"
description: "How the ⚠️ set becomes a buildable host request: one card-bundle table, one optional-fields table, one RPC table, each row a four-facet contract (shape · consuming-phase UI · fail-closed fallback · wire-compat), grounded in the real SessionCardDto/AttentionItemDto/guard shapes; and how completeness is proven — every row traces to a rec number and a consuming phase, Open-Q#1 is answered from the protocol, and no client code is touched."
trigger_phrases:
  - "host requests plan approach"
  - "host requests packet"
  - "plan approach"
importance_tier: "normal"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/007-host-requests"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added nodeterm additions wire-compat note; new optional fields additive-safe, RPC new."
    next_safe_action: "Author the nodeterm request rows; hand to relay team; consuming phases build on ship."
    blockers:
      - "Host dependency: the requested fields/RPCs are relay-authored; the plan produces a request, not code."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 7 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Turn the ⚠️ "Needs host support" set into a precise, buildable request. The plan is documentary, not
executable: it produces three request tables — the minimum home-card bundle, the optional/product-gated
fields, and the chat RPCs — where every row is a four-facet contract: (1) the exact wire **shape**, (2) the
**UI it unlocks** and the **consuming phase** that will render it, (3) the **fail-closed fallback** the client
holds until the field lands, and (4) the orca **wire-compat** note grounded in this codebase's actual DTO
guards. It also carries the three operator/product questions and answers #1 against our own protocol. It
implements no client code.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The request is complete when every row of every table carries all four facets; every row cites a rec number in
`../research/research.md`; every row names a consuming phase under `006-orca-nodeterm-ux-mining`; no row proposes the
client owning or editing session truth; Open Question #1 is answered with `file:line` evidence from
`packages/pi-rpc-protocol`; and `validate.sh --strict` exits 0. Because this phase changes no CSS or behaviour,
`token-identity` and `test:web` are explicitly NOT this phase's gate — they are inherited by each consuming
phase when it renders the unlocked UI, and are named there rather than claimed here.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The request is anchored to the real, current shapes so the host team can diff against them directly:

- **The card DTO to extend** is `SessionCardDto = { id, status, updatedAt, messageCount }`
  (`packages/pi-rpc-protocol/src/types.ts:428`), rendered at `app-mobile/src/pages/home/screen-home.svelte:97`
  under the "opaque identifiers only" rule (line 86). The four bundle fields are additive to this interface.
- **The attention source of truth** is the Inbox: `fetchAttention()` → `AttentionItemDto[]`
  (`app-mobile/src/shared/format/attention.ts:35`), where `AttentionItemDto = { lookupId, attentionClass,
  generation, nonce, occurredAt }` (`types.ts:1068`) and `AttentionClass = 'needs_input' | 'finished' |
  'error'` (`types.ts:1054`). The item carries no `sessionId`; only `AttentionResolutionDto` does, post-open.
- **The wire-compat asymmetry** is decided by the guards: `isSessionCardDto` (`guards.ts:1244`) is permissive
  (extra keys ignored) → an added `attention` is additive-safe; `isAttentionItemDto` (`guards.ts:364`) is
  strict `hasOnlyKeys` → an added `sessionId` is guard-breaking. This is why the plan recommends the card
  field over the Inbox-join.
- **The RPC touch-points** are the composer (`app-mobile/src/pages/chat/chrome/session-composer.svelte`) for
  `@`-search / paste-lease / dictation, and the Review surface
  (`app-mobile/src/pages/review/screen-review.svelte`) for the approval envelope.

Each request row is written so the fail-closed fallback is the client's CURRENT behaviour — the field's absence
is never a broken state, only an un-enriched one, and a stale/unknown value stays visibly unresolved.

- **The nodeterm net-new fields are wire-compat by the same asymmetry.** `contextPercent`, `activity`/`tool`,
  `prompt`, and `stateEnteredAt` are all **additive optional fields on `SessionCardDto`** — a new optional field
  is additive-safe under the permissive `isSessionCardDto` (`guards.ts:1244`), invisible to an un-updated client.
  The `attention` sub-kind + end-reason are **additive sub-fields on the already-requested `attention`**, not a
  new top-level key, so they inherit the same additive-safe guarantee. The cross-surface **read-ack RPC** is a
  NEW endpoint versioned independently, feature-detected, with a local-only-dismissal fallback when absent.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · setup
Inventory the ⚠️ recs from `../research/research.md` and read the current DTOs, guards, and consuming surfaces
(`SessionCardDto`, `AttentionItemDto`, `isSessionCardDto`, `isAttentionItemDto`, `screen-home.svelte`,
`session-composer.svelte`, `screen-review.svelte`). Confirm Open Question #1 against the protocol.

### Phase 2 · implementation (author the request contract — define, do NOT build)
Write the three request tables. For each field/RPC: fix the wire shape, name the exact UI + the consuming
phase, state the fail-closed fallback (= current behaviour), and write the wire-compat note (additive-safe, or
the guard-coordination caveat). Reconcile the attention taxonomy and mark the recommended attention approach.
Carry the three open questions; answer #1 with evidence.

### Phase 3 · verification
Prove every row has all four facets and a rec-number + consuming-phase trace; prove no row hands the client
session truth; prove Open-Q#1 is answered from `pi-rpc-protocol`; confirm `git status` shows no file created or
edited under `app-mobile/`; run `validate.sh --strict` from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No code, so no runtime tests here. The proof is documentary and structural: a traceability pass (every
requested field/RPC → a rec number and a consuming phase), a fail-closed-coverage pass (every field has a
defined absent-behaviour that is the current client behaviour), and the protocol-evidence pass for Open-Q#1
(`hasOnlyKeys` allowlist read directly). The runtime gates that will prove the eventual UI — `token-identity`
0-diff, `test:web` green, a11y-parity — are named as the consuming phases' barriers, not run here.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- `../research/research.md` "Needs host support" — the ⚠️ set and its rec numbers.
- `packages/pi-rpc-protocol/src/types.ts` + `.../guards.ts` — the authoritative current DTO shapes and guard
  strictness the request diffs against.
- The relay/host team — the sole implementer of every requested field/RPC (the external blocker).
- The consuming phases `002-home-selection`, `003-chat-message`, `004-composer`, `005-streaming-ask`,
  `006-navigation` — each builds the UI its field/RPC unlocks when the host ships it.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

This phase creates only documentation under `specs/006-orca-nodeterm-ux-mining/007-host-requests/`; it edits no code and
runs no migration. `git checkout -- specs/006-orca-nodeterm-ux-mining/007-host-requests` removes the request docs. There
is nothing deployed, so there is no client or host state to revert.
<!-- /ANCHOR:rollback -->
