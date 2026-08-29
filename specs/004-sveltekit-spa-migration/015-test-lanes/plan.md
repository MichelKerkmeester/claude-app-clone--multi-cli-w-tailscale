---
title: "Child 015 plan — test lanes repaired"
description: "Why an allowlist is the wrong shape for a test include, the order that surfaces failures safely, and how to avoid re-narrowing the glob when it turns red."
trigger_phrases:
  - "test lanes plan approach"
  - "test lanes packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/015-test-lanes"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored with glob-first ordering."
    next_safe_action: "Record the current test count, then swap the allowlist for a glob."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 015 plan — test lanes repaired

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Swap the allowlist for a glob, read what turns red, and repair or quarantine each failure with a
written reason. Then give ESLint a Svelte parser, un-mock the virtualizer in one suite, and cover the
transcript reducer.

Order matters more than content here. Everything else in the post-cutover queue is verified by these
lanes, so this packet runs first — writing a test before the lane is repaired produces a green board
and no coverage.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The gate is a comparison, not a pass: test count before against test count after, with every delta
accounted for. A number that goes up without explanation is as suspicious as one that goes down.

For ESLint the gate is that it runs at all over `.svelte` and produces a recorded baseline. For the
reducer test the gate is a negative control: remove the `awaitingSnapshot` barrier and confirm the
test fails, because a test that passes against broken code is not a test.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

An `include:` allowlist inverts the default. A glob says *everything here is a test unless excluded*;
an allowlist says *nothing here is a test unless enumerated*. The first fails loudly when someone adds
a file and forgets a step. The second fails silently, forever, and looks identical to success.

`vitest.web.logic.config.ts:22-38` is the second shape, and its own header comment at `:17-21` records
four tests it has already swallowed. That comment is the strongest possible evidence for this packet:
someone noticed, wrote it down, and the shape still ate the tests.

The virtualizer mock has the same character. Returning every item from `getVirtualItems()` makes tests
deterministic and easy to write, and it removes the one behaviour worth testing — that rows outside
the window are unmounted. Four suites do it, so the app's most stateful surface has never been
observed doing the thing that breaks it.

ESLint is the third instance: a lane that reports success over an empty set. `eslint.config.js` has no
`**/*.svelte` block and the parser is not installed, so it is not that Svelte files pass — it is that
they are never read.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Baseline

Record the current test count per lane and the current pass count, so every later number has something
to be compared against. Without this the packet cannot prove it added coverage rather than moved it.

### Phase 2: Glob the logic lane

Replace `LOGIC_TESTS` with a glob and run it. Triage what turns red into two piles: repairable now,
and quarantined with a written reason. Nothing goes back into an implicit exclusion.

### Phase 3: Virtualizer and naming

Un-mock `@tanstack/svelte-virtual` in the suite where real virtualization matters most, keeping the
mock where a test legitimately needs every row. Rename the disclosure test to what it asserts.

### Phase 4: ESLint lane

Install the parser and plugin, add the `**/*.svelte` block, delete the dead React configuration and
the override pointing at a directory that no longer exists, then baseline the first pass.

### Phase 5: Reducer coverage

A focused test over the transcript reducer covering snapshot, delta, gap and the mutation barrier,
with a negative control proving it fails when the barrier is removed.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

This packet's product *is* tests, so the strategy is about how to trust them.

Every repaired test gets a negative control where one is cheap: break the thing it claims to check and
watch it fail. That is the only evidence that distinguishes a test from a assertion-shaped comment.

The reducer test is written against the state layer rather than through a component, so it needs no
virtualizer, no DOM and no timers — which is why it is cheap and permanent while the socket-level
harness discussed elsewhere is not.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- Runs before 012, so no rename collision.
- Independent of the relay packets — different lane, different config.
- Gates the client-side connection work, which should not be written until its lane runs.
- Installing `eslint-plugin-svelte` and `svelte-eslint-parser` is a scoped mutation needing approval.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Per-phase commits. The config changes revert cleanly; the new tests can be deleted without touching
source, because no source changes here.

The one decision that is awkward to unwind is quarantining a test with a reason, since the reason
becomes the record of why coverage is missing. That is a feature: an explicit, written gap is the
outcome this packet is buying, and reverting it would restore a silent one.
<!-- /ANCHOR:rollback -->
