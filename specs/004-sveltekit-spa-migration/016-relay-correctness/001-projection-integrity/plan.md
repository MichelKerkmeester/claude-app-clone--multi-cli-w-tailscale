---
title: "Child 016/001 plan — projection integrity"
description: "Why the listener lands before the counter fix, why rotation and collection are one change, and the negative controls that make each fix provable."
contextType: "implementation"
importance_tier: "normal"
trigger_phrases:
  - "projection integrity plan approach"
  - "projection integrity packet"
  - "plan approach"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/016-relay-correctness/001-projection-integrity"
    last_updated_at: "2026-08-24T04:43:07Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored with negative-control-first ordering."
    next_safe_action: "Reproduce the drop with a test before changing any code."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/001 plan — projection integrity

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Reproduce the loss, make the error audible, fix the counter, then rotate the epoch with collection.

The ordering is not stylistic. Today there is no output when this fails, so the counter fix cannot be
verified until the listener exists — and the epoch work can fail into the same silent path, so it goes
last, after that path has been closed.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Every fix here gets a negative control, because every one of them is invisible by construction.

The projection fix: a test that fails on today's code. The listener: a deliberately raised framing
error that appears in output. The rotation: an epoch whose first sequence is one, and a store that
still rejects a reused epoch. The collection: a row count before and after.

The backend suite runs at each step, against the four real test directories explicitly — the bare
positional in the test script sweeps a protected research repository and reports hundreds of unrelated
failures.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Three separate mistakes combine into one invisible failure, and it is worth naming them separately
because only one of them is the bug people would look for.

**A cached counter.** The projection loop reads the next sequence once and increments locally. That is
correct only if every projected block is persisted, which is an assumption the loop does not state and
the store does not honour.

**A silent decline.** The store drops control-plane residue by returning early — deliberately, and
documented as never persisted, replayed, synced or broadcast. It is right to drop it. What it cannot
do is tell the caller that no sequence was consumed.

**A `try` that is too wide.** The framing layer wraps `onRecord(JSON.parse(line))` in one `try`, so
any throw from the entire downstream projection chain is caught and reported as a JSON parse failure.
The label actively misleads: a reader chasing "RPC JSONL parse failed" investigates the wire format,
which is fine.

And then the error goes to a listener nobody registered.

The fix is to remove the assumption rather than to patch the arithmetic: re-read the sequence from the
store per block, as two other call sites in the same codebase already do. The store stays the single
owner of its own counter.

**Rotation and collection are one change.** Retention today is bounded per epoch, so growth is linear
in relay restarts. Rotating on every *host* restart makes epochs far more numerous, and there is no
cross-epoch collection anywhere — no statement deletes an ended epoch, nothing vacuums. Rotation alone
therefore trades a silent correctness bug for a storage-growth bug, which is not a trade worth making.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Reproduce

Write the regression test first and watch it fail. An extension request whose control-plane block is
dropped by redaction, with an artifact block behind it in the same batch; assert the artifact reaches
the sync plan.

### Phase 2: Make it audible

Register the supervisor error listener using the logging idiom already in the file, and narrow the
framing `try` to the parse. Confirm a deliberately raised error now appears.

### Phase 3: Fix the counter

Re-read the sequence from the store per projected block. The Phase 1 test turns green.

### Phase 4: Rotate the epoch

Rotate on the child exit, restart and failed edges. Respect the store's reused-epoch guard and its
first-sequence-is-one requirement.

### Phase 5: Collect and bound

Cross-epoch collection for ended epochs, plus bounds on the four unbounded attachment-service maps,
matching the bound the prompt service already applies.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The defining property of every defect here is that it produces no output, so the test strategy is
built around producing output first and asserting on it second.

Phase 1's test is the packet's centrepiece and must fail before anything is changed. If it passes on
today's code, the reproduction is wrong and the analysis needs re-checking before proceeding.

Collection gets a count-based assertion rather than a behavioural one — rows before, rows after — since
what is being bought is bounded growth, and growth is a number.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- Runs first among the relay children, so the others cannot fail invisibly into this path.
- Independent of the client queue and of the naming packet.
- The backend test lane already works; this packet does not depend on the web test-lane repair.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Per-phase commits. Phases 1 to 3 are a few lines each and revert trivially.

Phase 5 is the one to think about before landing: collection deletes rows. It reverts as code, but the
rows it removed are gone. Land it behind an explicit retained-epoch count, verify the count on a copy
of a real database before running it against one, and keep the first run's before-and-after numbers.
<!-- /ANCHOR:rollback -->
