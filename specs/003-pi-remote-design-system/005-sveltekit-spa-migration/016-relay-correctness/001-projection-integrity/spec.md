---
title: "Child 016/001 — Projection integrity"
description: "Make the deliberately-raised-but-unheard error audible, allocate projection sequences from the store that owns them, and rotate the stream epoch on host restart together with the garbage collection that rotation obliges."
trigger_phrases:
  - "projection sequence swallowed error"
  - "stream epoch rotation host restart"
  - "cross epoch garbage collection relay"
importance_tier: "critical"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/016-relay-correctness/001-projection-integrity"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped; the data-loss chain was verified link by link against source."
    next_safe_action: "Write the failing regression test, then register the error listener."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 016/001 — Projection integrity

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../../015-test-lanes/spec.md |
| **Successor** | ../002-route-authority/spec.md |
| **Level** | 2 |
| **Layer** | relay — first, because the others can fail into the path this fixes |
| **Writer** | executor (`app-relay/src/**`) + Claude (verification, git) |
| **Barrier** | regression test fails before the fix and passes after; backend suite green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

There is a live silent data loss on a first-party code path. The chain was verified link by link
against the source, not inferred:

1. `index.ts:295` reads `store.nextSequence(...)` once into a local, then hands out `S+1, S+2, …` as it
   projects each block in a batch.
2. `store/relay-store.ts:220-222` returns `{ inserted: false }` for a control-plane projection and
   returns **before** the transaction that advances `highSeq` — so no sequence is consumed.
3. The next block in the same batch therefore arrives as `S+2` against an expected `S+1`, and
   `relay-store.ts:263-267` throws.
4. `rpc/framing.ts:71-76` catches that throw — its `try` wraps `onRecord(JSON.parse(line))`, not just
   the parse — and relabels it `RPC JSONL parse failed`.
5. It is handed to `options.onError`. **`grep onError index.ts` returns nothing.** The error vanishes.

The user sees a block referenced in the transcript and never rendered. No log line, no failed request,
no indication anything went wrong.

The trigger is not hypothetical: the projector emits a plan block for an extension request and appends
artifact blocks after it in the same batch, redaction drops the plan block exactly when the extension
sent no title and no message, and the producer of that shape is in this tree.

The second defect is quieter. When the Pi child process restarts, output from a fresh process with
zero conversation context is appended to the tail of the pre-crash conversation with no gap, no epoch
bump and no marker. The command catalog, todos and attachments all honour the generation change; the
transcript does not.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- Register the supervisor error listener in `index.ts`, using the logging idiom already present in the
  same file.
- Narrow the `try` in `rpc/framing.ts` so it wraps `JSON.parse` only, and a downstream throw is no
  longer relabelled as a parse failure.
- Stop caching the projection sequence; re-read from the store per block, as the attention path and
  the prompt service already do.
- Rotate the stream epoch on the child `exit` / `restart` / `failed` edge.
- Add cross-epoch garbage collection — **not optional, and not separable.**
- Bound the four unbounded maps in the attachment service, matching the bound the prompt service
  already applies to its equivalent.

**Out of scope:** any client change; the route work in the sibling child; a new wire field; changing
the retention window itself, which is a separate operator decision.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — An error the code deliberately raises reaches somewhere readable. The listener is
  registered before the counter fix, because without it there is no output to verify against.
- **REQ-002** — A sequence is allocated by the component that owns it. No caller holds a private copy
  of a counter that another component may decline to advance.
- **REQ-003** — A framing-layer error message describes a framing-layer failure. Relabelling a
  downstream throw as a parse failure destroys the one clue a reader would have.
- **REQ-004** — A host generation change is visible in the transcript stream, as it already is in three
  other surfaces.
- **REQ-005** — Epoch rotation ships with cross-epoch collection. Rotating more often without
  collecting multiplies orphaned partitions, so shipping the rotation alone makes storage strictly
  worse than today.
- **REQ-006** — The four unbounded attachment-service maps are bounded.
- **REQ-007** — The projection defect has a regression test that fails against today's code before it
  passes against the fix.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. A test feeding an extension request that drops its control-plane block asserts the following
   artifact block still reaches the sync plan — and fails on today's code.
2. A deliberately raised framing error appears in output rather than vanishing.
3. `grep onError app-relay/src/index.ts` returns a registration.
4. Epoch rotation produces a new epoch whose first sequence is one, without tripping the store's
   reused-epoch guard.
5. Cross-epoch collection removes ended-epoch rows, demonstrated by a count before and after.
6. `npm test` exit 0, run against the four real test directories explicitly.
7. `validate.sh … --strict` exit 0 through its realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Rotation is delicate.** The store throws on a reused epoch and demands a first sequence of one.
  Getting either wrong lands in the swallowed-throw path — which is why the listener is registered
  first, so a mistake here is loud instead of invisible.
- **Collection is a new retention policy**, and retention policies need revisiting. That ongoing cost
  is real and is the honest argument against this half.
- **Narrowing the framing `try` may surface previously-hidden throws.** That is the point, and it may
  mean this packet finds more than it planned to fix. Findings get reported, not absorbed.
- Runs first among the relay children. Independent of the client queue.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

Both answered by the operator; neither is open.

1. **Does rotation ship now or wait for an observed restart?** **Answered: ship it.** A context-free
   process appending silently to the previous conversation cannot be diagnosed after the fact, which
   is precisely why nobody has reported it. Rotation ships together with cross-epoch collection, as
   the requirement states — neither alone.
2. **What is the collection policy?** **Answered: retain ten ended epochs.** Ten keeps several
   restarts inspectable when debugging one, at a storage cost the operator accepted explicitly.
   The count is a named constant so it can be tuned without reading the collection logic.

<!-- /ANCHOR:questions -->
