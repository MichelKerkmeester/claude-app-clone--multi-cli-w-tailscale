---
title: "Child 016/001 implementation summary — projection integrity"
description: "The projection, framing and retention halves shipped and are proven by negative control. The epoch half is held for an operator decision, and three new defects were found on the same path."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/001-projection-integrity"
    last_updated_at: "2026-08-24T04:43:07Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Epoch rotation, consumer resolution and ended-epoch collection shipped."
    next_safe_action: "Rehearse collection against a copy of a real database (T2.11)."
    blockers: []
    completion_pct: 100
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
| Status | **Projection, framing and retention shipped; epoch half held** |
| Requirements shipped | REQ-001, REQ-002, REQ-003, REQ-006, REQ-007 |
| Requirements held | REQ-004, REQ-005 — both epoch-side, pending an operator decision |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

The silent data loss is closed. A block that reaches the projector now reaches the transcript, and a
throw that used to disappear now reaches stderr with a label that names the layer it came from.

| Change | File |
|---|---|
| The sequence is allocated from the store at publish time, per block, for both the envelope and the block payload | `app-relay/src/index.ts` |
| The supervisor's errors are written to stderr using the idiom already in the file | `app-relay/src/index.ts` |
| The framing `try` covers the parse alone; record-handling failures report as themselves | `app-relay/src/rpc/framing.ts` |
| A parse failure reports the record's byte length instead of its contents | `app-relay/src/rpc/framing.ts` |
| Managed sets, submission records and delivery markers each gained a ceiling and an eviction that skips live records | `app-relay/src/attachments/attachment-service.ts` |

The sequence fix is not the one the analysis first suggested. Re-reading the store inside the
projection callback would have handed every block in a batch the same number, because the projector
assigns all of them before any is published. The allocation had to move to the publish site.

**Held back:** epoch rotation on host restart and the cross-epoch collection it obliges. They ship
together or not at all, and whether they ship is the operator's call.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Per-phase commits, negative control first throughout. The reproduction was committed while still
failing, so the fix commit is the thing that turns it green and a bisect tells the truth.

Relay source was written by a dispatched executor under explicit write paths; the reproduction, the
framing tests and the retention-bound test were written and verified outside its sandbox, as was
every command output quoted below.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Allocate at publish time, not in the projection callback.** The projector builds the whole batch
before the caller publishes any of it, so a callback that reads the store returns the same value for
every block. The store stays the sole owner of its counter; the caller just asks later.

**A parse failure reports a size, not a snippet.** These errors now reach the host's stderr, and a
malformed record is still session content. Making errors audible must not make transcripts audible,
so the wire-format branch reports the record's byte length and nothing from the record.

**Eviction skips anything live.** A managed set is droppable only when it holds no quota and has
nothing in flight; a submission or delivery marker only once its set is gone. Evicting a live record
would release a quota its owner still holds.

**The epoch half is not a judgement call to make here.** Rotation without collection makes storage
strictly worse, and the retained-epoch count is a retention policy. That belongs to the operator.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

Every negative control below was observed failing before the fix and passing after.

| Check | Result |
|---|---|
| Reproduction, pre-fix | FAIL — `Relay expected sequence 2 for epoch 'epoch_projection_integrity', received 3.` at `relay-store.ts:265` via `publishPiEvent` |
| Reproduction, post-fix | PASS — 2 tests, exit 0 |
| Framing labels, pre-fix | FAIL — `expected 'RPC JSONL parse failed: Relay expecte…' not to contain 'parse failed'` |
| Framing labels, post-fix | PASS — 2 tests, exit 0 |
| Error listener registered | PASS — `grep onError app-relay/src/index.ts` returns line 155; the same grep returned nothing before |
| Retention bound, pre-fix | FAIL — `expected function to throw an error, but it didn't` |
| Retention bound, post-fix | PASS — the oldest released reservation is evicted, the newest still answers |
| Backend suite, four real directories | PASS — 51 files / 384 tests, exit 0 (baseline was 48 / 379) |
| `npm run build` | PASS — exit 0 |
| `npm run typecheck` | PASS — exit 0, 1123 files, 0 errors |
| Token identity, three themes | PASS — 0 CHANGED / 0 VANISHED / 0 ADDED, corpus confirmed at 96 components plus `app.css` before the result was trusted |
| Epoch rotation | not run — held |
| Cross-epoch collection | not run — held |

`app-relay/tests/auth.test.ts` failed intermittently during this work. It was characterised rather
than assumed: eight runs with the change and eight against `HEAD` both failed on the identical
assertion (`expected 201 to be 403`) in the identical test, and no change here touches that path.
It is the documented baseline flake.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**Three further defects on this same path were found and not fixed here.** Narrowing the `try` was
expected to surface throws; building the reproduction surfaced them sooner. All three are reported
rather than absorbed, because each belongs to a different surface:

1. **A text artifact preview can never be delivered.** `isFilePreviewContent` treats `firstLine` as
   required for inline text — its key check demands exact key equality — while the very next line
   treats it as optional, and `sanitizeArtifactSnapshot` omits it unless the host supplies one. A
   host text artifact without an explicit first line therefore builds a descriptor the store refuses,
   throwing from inside the projector into precisely the path this child just closed. This is a
   second live silent data loss, found by fixture-building rather than by analysis.
2. **The artifact revision grammars disagree.** The sanitizer accepts an underscore-bearing revision
   that the protocol's own revision guard rejects, with the same consequence.
3. **A second cached sequence remains.** `projectSubmittedAttachments` reads the sequence once and
   increments locally across a batch — the pattern just removed from the entry point. It is safe
   today only because every card in that batch persists, which is an assumption the code does not
   state.

**Incidence is still unknown**, and cannot be recovered from logs that were never written.

**The retention ceilings are counts, not measurements.** They are set where they cannot fire during
normal use; nothing here establishes what normal use is.
<!-- /ANCHOR:limitations -->
