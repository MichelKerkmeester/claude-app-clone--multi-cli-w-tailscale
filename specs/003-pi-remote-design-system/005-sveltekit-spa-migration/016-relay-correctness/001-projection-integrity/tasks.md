---
title: "Child 016/001 tasks — projection integrity"
description: "Task ledger for the reproduction test, the error listener, the sequence-allocation fix, epoch rotation and cross-epoch collection."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/001-projection-integrity"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Write T2.1 and watch it fail."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/001 tasks — projection integrity

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

Each fix is done when its negative control has been observed failing and then passing. Every defect
here is silent by construction, so an unobserved check proves nothing.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Re-confirm the chain against current source before changing anything: the cached
      counter, the early return that consumes no sequence, the contiguity throw, the over-wide `try`,
      and the absent listener registration. [evidence: index.ts:295 cached counter, relay-store.ts:220 early return, relay-store.ts:265 throw, framing.ts:71 wide try, `grep onError src/index.ts` exit 1]
- [x] **T1.2** Capture the backend baseline by running the four real test directories explicitly,
      because the bare positional in the test script sweeps a protected research repository. [evidence: 48 files / 379 tests, exit 0]
- [x] **T1.3** Confirm no relay work is in flight from a sibling child, so the diff stays readable. [evidence: working tree clean apart from untracked research repos; no sibling relay dispatch open]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Reproduce**
- [x] **T2.1** Write the regression test: an extension request whose control-plane block redaction
      drops, with an artifact block behind it in the same batch; assert the artifact reaches the sync
      plan. **Watch it fail.** If it passes, the analysis is wrong and nothing else should proceed. [evidence: observed failing: Relay expected sequence 2 for epoch 'epoch_projection_integrity', received 3]

**Make it audible**
- [x] **T2.2** Register the supervisor error listener, using the logging idiom already in the file. [evidence: index.ts:155, process.stderr.write idiom]
- [x] **T2.3** Narrow the framing `try` to the parse alone, so a downstream throw is no longer
      relabelled as a wire-format failure. [evidence: parse and record handling in separate try blocks]
- [x] **T2.4** Confirm a deliberately raised framing error now appears in output. [evidence: pre-fix run reported RPC JSONL parse failed for a downstream throw; post-fix reports record handling]

**Fix the allocation**
- [x] **T2.5** Re-read the sequence from the store per projected block, matching the two call sites
      that already do. T2.1 turns green. [evidence: allocated at publish time, since the projector assigns a whole batch before any block is published]
- [x] **T2.6** Confirm no other caller holds a private copy of a store-owned counter. [evidence: one remains — projectSubmittedAttachments caches across a batch; reported, not fixed here]

**Rotate**
- [ ] **T2.7** Rotate the stream epoch on the child exit, restart and failed edges. [deferred: held — epoch rotation awaits the operator retention decision]
- [ ] **T2.8** Respect the store's reused-epoch guard and its first-sequence-is-one requirement. [deferred: held with T2.7]
- [ ] **T2.9** Confirm the transcript now shows a generation change, as the command catalog, todos and
      attachments already do. [deferred: held with T2.7]

**Collect and bound**
- [ ] **T2.10** Add cross-epoch collection for ended epochs behind an explicit retained count. [deferred: held — collection ships with rotation or not at all]
- [ ] **T2.11** Verify collection against a copy of a real database before running it against one, and
      keep the before-and-after row counts. [deferred: held with T2.10]
- [x] **T2.12** Bound the four unbounded attachment-service maps, matching the bound the prompt service
      already applies to its equivalent. [evidence: three ceilings with live-record-skipping eviction, proven by a bound test and its negative control]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION
- [x] **T3.1** T2.1 fails on the pre-fix commit and passes on the post-fix commit — both observed. [evidence: both observed: fail at 2e71b45, pass at 3052336]
- [x] **T3.2** A grep for the error-listener registration returns a hit. [evidence: `grep onError app-relay/src/index.ts` returns line 155]
- [ ] **T3.3** Rotation produces an epoch whose first sequence is one, and the reused-epoch guard still
      rejects a repeat. [deferred: held with rotation]
- [ ] **T3.4** Collection reduces ended-epoch rows, with counts recorded. [deferred: held with collection]
- [x] **T3.5** `npm test` exit 0 against the four real directories. [evidence: 51 files / 384 tests, exit 0]
- [x] **T3.6** `npm run build` exit 0. [evidence: exit 0]
- [x] **T3.7** `validate.sh --strict` exit 0 through its realpath. [evidence: exit 0 through the script realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

A block that reaches the projector reaches the transcript, or something says why. A host restart is
visible in the stream. Storage growth stays bounded across the rotations that visibility costs.

The packet does not close on a green suite alone: the reproduction test must have been seen failing
first, because a test that was never observed failing is indistinguishable from one that cannot.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — the verified chain and the requirements.
- `plan.md` — why the listener precedes the counter fix, and why rotation and collection are one change.
- `checklist.md` — barrier sign-off with evidence.
- `../spec.md` — the relay-correctness phase parent.
- `../../010-context-repo-research/final-synthesis.md` — the council items this child implements.
- Program goal: `../../goal.md`.
<!-- /ANCHOR:cross-refs -->
