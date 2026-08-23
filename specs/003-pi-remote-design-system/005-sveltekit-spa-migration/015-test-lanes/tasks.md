---
title: "Child 015 tasks — test lanes repaired"
description: "Task ledger for the glob swap, the virtualizer un-mock, the Svelte ESLint lane and the transcript reducer test."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/015-test-lanes"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Record the baseline counts."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 015 tasks — test lanes repaired

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

A repair is done when the test runs and a negative control proves it can fail.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Record baseline counts per lane — files collected and tests passed — so later numbers
      have something to be compared against.
- [x] **T1.2** Enumerate every test file in the repository and mark which lane, if any, collects it.
      The gap between those two sets is the packet's actual scope.
- [x] **T1.3** Confirm 012 has not started, so no rename collides with a config edit.
- [x] **T1.4** Get approval for the two dev dependencies — `eslint-plugin-svelte` and
      `svelte-eslint-parser` — since installation is a scoped mutation.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Glob the logic lane**

- [x] **T2.1** Replace the fifteen-path `LOGIC_TESTS` allowlist with a glob and run it.
- [x] **T2.2** Triage every new failure into repairable-now or quarantined-with-a-reason. Nothing
      returns to an implicit exclusion — that is the shape this packet exists to remove.
- [x] **T2.3** Handle the four tests the config itself names as dead: `highlight.worker`,
      `relay-runtime-transport`, `submitSlashDraft`, `submitSlashDraftTransport`.
- [x] **T2.4** Resist re-narrowing the glob when it turns red. A green board bought by shrinking the
      include set reproduces the original defect with extra steps.

**Virtualizer and naming**

- [x] **T2.5** Remove the blanket `@tanstack/svelte-virtual` mock from the suite where real
      virtualization matters, so at least one test observes rows unmounting.
- [x] **T2.6** Keep the mock where a test legitimately needs every row, and say so in the file.
- [x] **T2.7** Rename `disclosure-persistence.svelte.test.ts` to describe what it asserts — card
      placement — because a filename claiming coverage that does not exist is worse than no file.
- [x] **T2.8** Report, do not fix, any real bug the un-mocked virtualizer exposes. Those are findings
      for another packet.

**ESLint lane**

- [x] **T2.9** Install `eslint-plugin-svelte` and `svelte-eslint-parser`.
- [x] **T2.10** Add the `**/*.svelte` block to `eslint.config.js`.
- [x] **T2.11** Delete the `react-hooks` and `react-refresh` configuration — React is gone from this
      tree — and fix the override pointing at a directory that no longer exists.
- [x] **T2.12** Run the first Svelte pass and record the finding count as a baseline. Triage or
      ratchet; do not silence.

**Reducer coverage**

- [x] **T2.13** Write a focused test over transcript reducer handling: snapshot, delta, gap, and the
      mutation barrier during recovery.
- [x] **T2.14** Add the negative control — remove the barrier and confirm the test fails. A test that
      passes against broken code is not a test.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Test count before and after recorded, with every delta accounted for.
- [x] **T3.2** Zero test files uncollected by every lane without a written reason.
- [x] **T3.3** `npm run test:web` exit 0, verified by content — piping to `tail` reports the pipe's
      status rather than the runner's.
- [x] **T3.4** ESLint runs over `.svelte` and its baseline is recorded.
- [x] **T3.5** No source file under `app-mobile/src/` or `app-relay/src/` changed.
- [x] **T3.6** `validate.sh --strict` exit 0 through its realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every written test runs or carries a written reason it does not. ESLint reads Svelte. One suite sees
the real virtualizer. The transcript reducer has coverage with a negative control.

The packet's value is entirely downstream: it does not fix a user-visible defect, it makes the
packets that do fix them provable.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — measured baselines and requirements.
- `plan.md` — why an allowlist is the wrong shape, and the phase order.
- `checklist.md` — barrier sign-off with evidence.
- `../016-relay-correctness/` — relay lane, independent of this one.
- `../018-transcript-affordances/` — depends on the virtualizer un-mock landing here.
- `../010-context-repo-research/final-synthesis.md` — the council item this packet implements.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
