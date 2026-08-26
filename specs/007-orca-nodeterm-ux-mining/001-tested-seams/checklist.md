---
title: "Phase 1 checklist — pure-seam barrier: differential + boundary tests, fail-closed, behaviour-preserving"
description: "Barrier sign-off for the six pure-function seams: each is pure over an immutable id+epoch+revision snapshot, each has a differential test (incremental == full rebuild) and a boundary test (stale/unknown/mismatched stays unresolved), the scope-guard and draft-reconcile have one source of truth, and token-identity 0-diff + test:web + a11y-parity prove no rendered behaviour changed. All open — plan only."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/001-tested-seams"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Wrote the open barrier checklist for six seams; nothing verified yet."
    next_safe_action: "Await operator go; barriers close only against the implemented final state."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. All items are OPEN — this
is a plan; barriers close only against the implemented final state. A seam is proven by two tests: a
differential test (every incremental prefix equals a canonical full rebuild) and a boundary test
(stale/unknown/mismatched stays visibly unresolved). The extraction is proven behaviour-preserving by
`token-identity` 0-diff, `test:web`, and an unchanged a11y contract — this phase touches no CSS or markup.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [ ] **CHK-PRE-01** [P0] The immutable-snapshot contract is fixed per seam: each names its session `id`, host `epoch` (or home `updatedAt` revision), and per-item `revision`/`seq` source. [proof: a per-seam contract table over `state.ts` + `normalize-transcript-blocks.ts`]
- [ ] **CHK-PRE-02** [P0] The `token-identity` baseline is captured from the pre-phase `app.css` so a 0-diff can be proven at the end. [proof: `token-identity.mjs snapshot` of the pre-phase corpus]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [ ] **CHK-CQ-01** [P0] Every seam is a pure function: identical snapshot in → identical result out, `now` injected, input never mutated. [proof: signatures take `now` as a parameter; no internal `Date.now()`; no in-place mutation of the snapshot]
- [ ] **CHK-CQ-02** [P0] The id+epoch scope-guard and the draft-reconcile path have exactly one source of truth — `transcriptReducer` routes through the extracted pure functions. [proof: `state.ts` reducer calls the extracted predicate/reconcile; no duplicated inline guard]
- [ ] **CHK-CQ-03** [P0] The three newly-authored seams (home roster, card projection, stale-decay) are pure and unwired — no rendered surface consumes them in this phase. [proof: no import from `screen-home.svelte` or a chat view; grep shows the seam is test-only]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [ ] **CHK-TEST-01** [P0] Differential test: each incremental seam equals a canonical full rebuild at every prefix. [proof: `test:web` suite over message grouping, draft reconciliation, and the scope-guard/reducer — equality asserted at every prefix]
- [ ] **CHK-TEST-02** [P0] `test:web` passes from the final state (new suites + existing). [proof: `test:web` all files pass]
- [ ] **CHK-TEST-03** [P0] Token identity holds at 0 diffs across the three themes — this phase changed no CSS. [proof: `token-identity.mjs diff` vs baseline — 0 CHANGED / 0 VANISHED / 0 ADDED, light/dark/system]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [ ] **CHK-FIX-01** [P0] Boundary test: every fail-closed case resolves to a visibly-unresolved value, never a success. [proof: epoch change → `awaitingSnapshot`; `unknown-session` gap → error not empty; unknown kind → `kind:'unknown'`/`richEligible:false`; cross-session settlement → dropped; stale `running` card → decayed, `status` untouched]
- [ ] **CHK-FIX-02** [P0] An unpaired tool call stays visibly in-flight; a mismatched-epoch or wrong-session envelope is dropped, not merged. [proof: `pendingResultCallIds` non-empty for an unpaired call; `blocksFromEnvelopes` drops the mismatched envelope]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [ ] **CHK-SEC-01** [P0] Fail-closed, host-authoritative: no seam writes or invents session truth — stale-decay changes presentation only, the card projection never fabricates a title/preview, and no seam reads a non-existent host field. [proof: stale-decay returns a presentation state, `status` unchanged; card projection uses only `id`/`status`/`messageCount`/`updatedAt`]
- [ ] **CHK-SEC-02** [P0] No rendered value, a11y contract, route, or behaviour changed — a pure extraction plus unwired new functions. [proof: token-identity 0/0/0; no `.svelte` markup diff; `test:web` green]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [ ] **CHK-DOC-01** [P1] `validate.sh <packet> --strict` exit 0 through its realpath. [proof: `validate.sh <packet> --strict` exit 0, run via realpath]
- [ ] **CHK-DOC-02** [P1] The new modules and tests introduced no spec path or artifact id in a comment. [proof: `scan-comments.mjs` comment-hygiene clean]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [ ] **CHK-ORG-01** [P1] Each new pure seam is co-located beside the file it serves (home roster beside `screen-home.svelte`; card projection + stale-decay beside `view-helpers.ts`; scope-guard + draft-reconcile beside `state.ts`). [proof: file placement matches the source-structure convention]
- [ ] **CHK-ORG-02** [P2] Every task cites a rec number and no seam is blocked on a host field. [proof: `tasks.md` each task → a rec; `blockers: []`; all seams read existing DTO fields]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Planned. The six view-logic seams will each become a pure function over an immutable `id`+`epoch`+`revision`
snapshot, proven by a differential test (incremental == canonical full rebuild at every prefix) and a
boundary test (stale/unknown/mismatched stays visibly unresolved). The id+epoch scope-guard and the
draft-reconcile path will route through one tested source inside `transcriptReducer`; the home roster, card
projection, and stale-decay seams will be authored pure and left unwired for phases 002/003. Behaviour
preservation will be proven by `token-identity` 0-diff, `test:web` green, and an unchanged a11y contract.
No barrier can be marked closed until the operator says go and the implemented final state passes it.
<!-- /ANCHOR:summary -->
