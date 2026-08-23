---
title: "Child 016/001 checklist — projection integrity"
description: "Barrier sign-off for the projection and epoch work. Both halves executed; one collection rehearsal remains open."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/001-projection-integrity"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Reproduce the drop before changing code."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 016/001 — Projection integrity

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Every defect in this child is silent by construction, so the protocol is negative-control-first:
observe the failure, then fix it, then observe the same check pass. A check that was never seen
failing is indistinguishable from one that cannot fail.

The epoch half has now been executed and observed as well: the operator chose to ship rotation and
to retain ten ended epochs. One item stays open — collection has not been rehearsed against a copy of
a real database, only against a test-constructed store.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] The chain is re-confirmed against current source. [evidence: all five links read in current source; `grep onError app-relay/src/index.ts` exit 1 at `index.ts:295`, `relay-store.ts:220`, `relay-store.ts:265`, `framing.ts:71`]
- [x] **CHK-PRE-02** [P0] Backend baseline captured. [evidence: `npx vitest run` over the four real directories: 48 files / 379 tests, exit 0]
- [x] **CHK-PRE-03** [P1] No sibling relay child is in flight. [evidence: `git status` clean apart from untracked research repos; no sibling relay dispatch open]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] The store is the sole allocator of its sequence. [evidence: `app-relay/src/index.ts:305` asks the store per block at publish time; no local copy survives]
- [x] **CHK-CQ-02** [P0] The framing `try` wraps the parse only. [evidence: `app-relay/src/rpc/framing.ts:71` parses inside its own try; record handling has a second]
- [x] **CHK-CQ-03** [P1] The error listener uses the logging idiom already in the file. [evidence: `app-relay/src/index.ts:155` uses `process.stderr.write`, the only other logging call in the file]
- [x] **CHK-CQ-04** [P1] Collection is behind an explicit retained-epoch count. [evidence: `MAX_RETAINED_ENDED_EPOCHS = 10` in `relay-store.ts`, the operator's chosen retention — a named constant, not a runtime-settable option]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] The regression test was observed failing before the fix. [evidence: observed failing: `Relay expected sequence 2 for epoch, received 3` at `relay-store.ts:265`]
- [x] **CHK-TEST-02** [P0] The same test passes after. [evidence: `npx vitest run app-relay/tests/projection-integrity.test.ts` — 2 tests passed, exit 0]
- [x] **CHK-TEST-03** [P0] A deliberately raised framing error appears in output. [evidence: `npx vitest run app-relay/tests/framing-error-surfacing.test.ts` — 2 tests passed, exit 0; pre-fix run failed]
- [x] **CHK-TEST-04** [P1] Rotation yields a first sequence of one and the reused-epoch guard still rejects a repeat. [evidence: `app-relay/tests/epoch-rotation.test.ts` asserts the rotated epoch's first allocation is 1 and that reuse raises the store's exact guard message]
- [x] **CHK-TEST-05** [P0] `npm test` exit 0. [evidence: `npx vitest run` over the four real directories: 50 files / 387 tests, exit 0]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] Rotation and collection landed together. [deferred: held together as required — rotation alone multiplies orphaned partitions]
- [x] **CHK-FIX-02** [P1] The four unbounded attachment maps are bounded. [evidence: `app-relay/src/attachments/attachment-service.ts:556` bounds three collections; `deviceReservedBytes` already self-trims]
- [x] **CHK-FIX-03** [P1] Throws newly surfaced by the narrowed `try` are reported, not absorbed. [evidence: three defects recorded in `implementation-summary.md` under known limitations, none absorbed]
- [x] **CHK-FIX-04** [P2] The transcript now shows a generation change. [evidence: confirmed by reading the consumer rather than by a test — `use-sync-socket.svelte.ts` compares its cursor epoch against each sync message and fires `pi-remote:transcript-superseded` on a mismatch]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] No security invariant is touched. [evidence: the diff touches sequencing and retention only; `npx vitest run app-relay/tests/security/` passes]
- [ ] **CHK-SEC-02** [P0] Collection was verified against a database copy first. [deferred: held with collection; nothing in this child deletes a row]
- [x] **CHK-SEC-03** [P1] No new error output leaks session content. [evidence: `app-relay/tests/framing-error-surfacing.test.ts` asserts a canary string absent from the reported message]
- [x] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [evidence: `git status` shows no write under `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] The reason the store owns the counter is written where the loop reads it. [evidence: `app-relay/src/index.ts:304` states why the store owns the counter]
- [x] **CHK-DOC-02** [P1] The retained-epoch count states what it protects. [evidence: the comment above `MAX_RETAINED_ENDED_EPOCHS` in `app-relay/src/store/relay-store.ts` states it keeps recent restart history inspectable while bounding transcript storage across epochs]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Per-phase commits. [evidence: per-phase commits `2e71b45`, `3052336`, `5956559`, `08d8fec`]
- [x] **CHK-ORG-02** [P2] The reproduction test lives with the relay suites. [evidence: three suites under `app-relay/tests/` run in the backend lane: 51 files / 384 tests]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

The reproduction was watched failing first, which is the only check that distinguishes a test that
passes from a test that cannot fail. It failed at the contiguity throw the analysis predicted, then
passed against the fix.

Three further defects on the same path were found while building the reproduction and are reported
in the implementation summary rather than absorbed here. The epoch half has since been executed: it
rotates on the child's exit, restart and failed edges, every consumer resolves the epoch at use time,
and collection bounds stored envelopes while keeping each epoch's tombstone so a collected epoch can
never be reused.
<!-- /ANCHOR:summary -->
