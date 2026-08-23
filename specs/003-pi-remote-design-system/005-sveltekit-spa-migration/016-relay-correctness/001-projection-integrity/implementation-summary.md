---
title: "Child 016/001 implementation summary — projection integrity"
description: "Continuity anchor. Nothing is implemented yet: this records the verified data-loss chain, why the ordering is what it is, and what stays unknown."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/001-projection-integrity"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped from a verified defect chain; no code changed."
    next_safe_action: "Write the reproduction test and watch it fail."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/001 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `016-relay-correctness` |
| Level | 2 |
| Status | **Scoped, not started** |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing. No relay source has been edited.

What was produced is a verified defect chain. Each link was read in the source during scoping rather
than taken from the research synthesis:

| Link | State |
|---|---|
| `app-relay/src/index.ts` caches the next sequence and increments locally | confirmed |
| `app-relay/src/store/relay-store.ts` returns early for control-plane residue, before the transaction that advances the high sequence | confirmed |
| Store throws when the next block's sequence does not match the expected one | confirmed |
| `app-relay/src/rpc/framing.ts` wraps the whole record handler in one `try`, not just the parse, and relabels the throw | confirmed |
| No error-listener registration exists in the entry point | confirmed — the grep returns nothing |

That is a live silent data loss on a first-party path, not a hypothesis.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Per-phase commits in a fixed order: reproduce, make audible, fix the counter, rotate, collect.

The executor writes `app-relay/src/**`. Claude verifies each negative control and owns git.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**The listener lands before the counter fix.** There is no output today when this fails, so the fix
could not otherwise be verified. Registering it first also pays for itself twice — it makes the
protocol-error path audible as well, which is what would surface an upstream rename.

**Remove the assumption, not the arithmetic.** The loop assumes every projected block is persisted.
Rather than special-casing the drop, the sequence is re-read from the store per block, so the store
stays the sole owner of its counter. Two call sites in the same codebase already work this way.

**Rotation and collection are one change.** Retention is bounded per epoch, so rotating far more often
without any cross-epoch collection would trade a silent correctness bug for a storage-growth bug.
Neither ships alone.

**Narrowing the `try` is part of the fix, not tidying.** A downstream throw reported as a wire-format
failure sends the next reader to the wrong layer entirely.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Reproduction test | not written |
| Error listener registered | not done |
| Sequence allocation fixed | not done |
| Epoch rotation | not done |
| Cross-epoch collection | not done |
| Backend suite (`npm test`, four real dirs) | baseline not captured |
| `validate.sh --strict` via realpath | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**Incidence is unknown.** The mechanism is confirmed; how often a user has actually lost a block is
not, and cannot be recovered from logs that were never written. That is an argument for the fix, not
against it, but it means the packet cannot claim a measured user impact.

**Collection introduces a policy that will need revisiting.** A retained-epoch count is a number
someone will have to reconsider against real usage, and this packet creates that obligation where none
existed.

**Narrowing the `try` may surface throws nobody has seen.** They will be reported rather than fixed
here, so this child may end by handing findings to other packets — which is the correct outcome and
also means its scope is not fully knowable in advance.
<!-- /ANCHOR:limitations -->
