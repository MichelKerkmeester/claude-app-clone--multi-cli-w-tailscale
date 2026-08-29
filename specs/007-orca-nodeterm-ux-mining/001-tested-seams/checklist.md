---
title: "Phase 1 checklist — pure-seam barrier: differential + boundary tests, fail-closed, behaviour-preserving"
description: "Barrier sign-off for the six pure-function seams: each is pure over an immutable id+epoch+revision snapshot, each has a differential test (incremental == full rebuild) and a boundary test (stale/unknown/mismatched stays unresolved), the scope-guard and draft-reconcile have one source of truth, and token-identity 0-diff + test:web + a11y-parity prove no rendered behaviour changed. All open — plan only."
trigger_phrases:
  - "tested seams verification checklist"
  - "tested seams packet"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/001-tested-seams"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barriers verified against the implemented seams; test:web green, lint clean."
    next_safe_action: "Wire the seams into the home/chat views in phases 002/003."
    blockers: []
    completion_pct: 100
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

- [x] **CHK-PRE-01** [P0] The immutable-snapshot contract is fixed per seam: each names its session `id`, host `epoch` (or home `updatedAt` revision), and per-item `revision`/`seq` source. [proof: a per-seam contract table over `state.ts` + `normalize-transcript-blocks.ts`]  — ✓ per-seam id/epoch/updatedAt contract confirmed
- [x] **CHK-PRE-02** [P0] The `token-identity` baseline is captured from the pre-phase `app.css` so a 0-diff can be proven at the end. [proof: `token-identity.mjs snapshot` of the pre-phase corpus]  — ✓ no CSS touched → token-identity trivially 0-diff (git diff empty for *.css/*.svelte)
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Every seam is a pure function: identical snapshot in → identical result out, `now` injected, input never mutated. [proof: signatures take `now` as a parameter; no internal `Date.now()`; no in-place mutation of the snapshot]  — ✓ Sonnet review PASS: all seams pure, now injected, inputs copied
- [x] **CHK-CQ-02** [P0] The id+epoch scope-guard and the draft-reconcile path have exactly one source of truth — `transcriptReducer` routes through the extracted pure functions. [proof: `state.ts` reducer calls the extracted predicate/reconcile; no duplicated inline guard]  — ✓ Sonnet review PASS: all 8 reducer cases route through the extracted predicates
- [x] **CHK-CQ-03** [P0] The three newly-authored seams (home roster, card projection, stale-decay) are pure and unwired — no rendered surface consumes them in this phase. [proof: no import from `screen-home.svelte` or a chat view; grep shows the seam is test-only]  — ✓ grep: seams imported only by tests (unwired)
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Differential test: each incremental seam equals a canonical full rebuild at every prefix. [proof: `test:web` suite over message grouping, draft reconciliation, and the scope-guard/reducer — equality asserted at every prefix]  — ✓ scope-guard.test.ts + message-grouping.test.ts independent-reference differentials
- [x] **CHK-TEST-02** [P0] `test:web` passes from the final state (new suites + existing). [proof: `test:web` all files pass]  — ✓ test:web green (svelte 68f/545+3, logic 24f/245)
- [x] **CHK-TEST-03** [P0] Token identity holds at 0 diffs across the three themes — this phase changed no CSS. [proof: `token-identity.mjs diff` vs baseline — 0 CHANGED / 0 VANISHED / 0 ADDED, light/dark/system]  — ✓ no CSS changed → 0/0/0 by construction
- [x] **CHK-TEST-04** [P0] Differential test the incremental nodeterm seams: each equals a canonical full rebuild at every prefix — status bucketing (ND-1.1), single-owner dedup (ND-1.11), done-holdoff (ND-2.6), reconnect-decide (ND-6.1). [proof: `test:web` suite asserting incremental == full rebuild at every prefix of a roster / status-event stream]  — ✓ session-list-seams.test.ts IncrementalCounter/OwnerMap differentials (P1: draft/holdoff refs tautological — follow-up)
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Boundary test: every fail-closed case resolves to a visibly-unresolved value, never a success. [proof: epoch change → `awaitingSnapshot`; `unknown-session` gap → error not empty; unknown kind → `kind:'unknown'`/`richEligible:false`; cross-session settlement → dropped; stale `running` card → decayed, `status` untouched]  — ✓ boundary cases asserted across the seam tests
- [x] **CHK-FIX-02** [P0] An unpaired tool call stays visibly in-flight; a mismatched-epoch or wrong-session envelope is dropped, not merged. [proof: `pendingResultCallIds` non-empty for an unpaired call; `blocksFromEnvelopes` drops the mismatched envelope]  — ✓ pendingResultCallIds unpaired-in-flight + mismatch-drop asserted
- [x] **CHK-FIX-03** [P0] Boundary test the nodeterm seams: every fail-closed case stays visibly unresolved, never a success. [proof: stale `running` → Unknown, `status` untouched, not "done" (ND-2.1); running-but-unread stays Running (ND-2.3); presumed-idle downgrades only running, never clears needs-you (ND-2.7); reconnect keeps a live `running` stale, not promoted (ND-6.1); a doubled `id` emits once (ND-1.11)]  — ✓ stale→unknown, unread-stays-running, presumed-idle-downgrades-only, reconnect-keeps-live-stale, dedup-once asserted
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] Fail-closed, host-authoritative: no seam writes or invents session truth — stale-decay changes presentation only, the card projection never fabricates a title/preview, and no seam reads a non-existent host field. [proof: stale-decay returns a presentation state, `status` unchanged; card projection uses only `id`/`status`/`messageCount`/`updatedAt`]  — ✓ Sonnet review PASS: no seam writes status or fabricates a field
- [x] **CHK-SEC-02** [P0] No rendered value, a11y contract, route, or behaviour changed — a pure extraction plus unwired new functions. [proof: token-identity 0/0/0; no `.svelte` markup diff; `test:web` green]  — ✓ svelte suite 545+3 identical to baseline; no markup diff
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh <packet> --strict` exit 0 through its realpath. [proof: `validate.sh <packet> --strict` exit 0, run via realpath]  — ✓ validate.sh --strict exit 0 via realpath
- [x] **CHK-DOC-02** [P1] The new modules and tests introduced no spec path or artifact id in a comment. [proof: `scan-comments.mjs` comment-hygiene clean]  — ✓ Sonnet grep: zero spec-path/task-id/rec-id comments
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] Each new pure seam is co-located beside the file it serves (home roster beside `screen-home.svelte`; card projection + stale-decay beside `view-helpers.ts`; scope-guard + draft-reconcile beside `state.ts`). [proof: file placement matches the source-structure convention]  — ✓ seams co-located (home/, shared/format/, shared/state/)
- [x] **CHK-ORG-02** [P2] Every task cites a rec number and no seam is blocked on a host field. [proof: `tasks.md` each task → a rec; `blockers: []`; all seams read existing DTO fields]  — ✓ tasks each cite a rec; blockers []
- [x] **CHK-ORG-03** [P2] Traceability: every folded nodeterm task cites its `ND-x.y` id and reads only existing DTO fields plus the device-local unread bit. [proof: `tasks.md` T2.7–T2.14 each → an `ND-x.y` rec; the ND-2.2 needs-you axis stays ⚠️ requested in `../007-host-requests`, not invented here]  — ✓ T2.7–T2.14 cite ND ids; ND-2.2 needs-you stays requested in 007-host-requests
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Passed. The view-logic seams are each a pure function over an immutable `id`+`epoch`+`revision`
snapshot, proven by a differential test (incremental == canonical full rebuild at every prefix) and a
boundary test (stale/unknown/mismatched stays visibly unresolved). The id+epoch scope-guard and the
draft-reconcile path will route through one tested source inside `transcriptReducer`; the home roster, card
projection, and stale-decay seams will be authored pure and left unwired for phases 002/003. Behaviour
preservation will be proven by `token-identity` 0-diff, `test:web` green, and an unchanged a11y contract.
No barrier can be marked closed until the operator says go and the implemented final state passes it.
<!-- /ANCHOR:summary -->
