---
title: "Child 015 — Test lanes repaired"
description: "Replace the hardcoded logic-test allowlist with a glob, stop mocking the virtualizer out of existence, give ESLint a Svelte parser, and cover the transcript reducer. A precondition packet: it makes every later fix provable."
trigger_phrases:
  - "vitest logic allowlist glob"
  - "svelte eslint parser missing"
  - "virtualizer mocked in every test"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/015-test-lanes"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet scoped from verified test-infrastructure measurements."
    next_safe_action: "Replace the logic allowlist with a glob and read what turns red."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 015 — Test lanes repaired

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../014-folder-documentation/spec.md |
| **Successor** | ../016-relay-correctness/spec.md |
| **Level** | 2 |
| **Layer** | precondition — runs before the other post-cutover packets |
| **Writer** | executor (tests, configs) + Claude (verification, git) |
| **Barrier** | every written test runs, ESLint parses `.svelte`, reducer covered |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Three instruments report green while measuring less than they appear to.

**The logic lane is an allowlist, not a glob.** `vitest.web.logic.config.ts:22-38` hardcodes fifteen
paths and feeds them to `include:` at `:45`. Anything not on the list never runs, and nothing says so.
The file documents this against itself at `:17-21`: four transport and worker tests are named there as
*"excluded from every config (dead — never run)"*.

**No test in this repository has ever exercised the real virtualizer.** All four suites that render
`TranscriptList` mock `@tanstack/svelte-virtual` so `getVirtualItems()` returns every item. That is
why a state-destruction bug under `overscan: 6` survived every gate.

**ESLint parses zero Svelte files.** `eslint.config.js` contains no `**/*.svelte` block, and neither
`eslint-plugin-svelte` nor `svelte-eslint-parser` is installed — verified, both absent from
`node_modules`. There are **114 `$effect` occurrences** in the app source and no rule has ever read
one of them. This program has already been bitten seven times by `$effect` self-invalidation.

The purpose is not coverage for its own sake. It is that a test written after this packet is a test
that runs, and a fix verified after this packet is a fix that was actually verified.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- Replace `LOGIC_TESTS` with a glob, then triage whatever turns red.
- Repair or explicitly quarantine the four named dead tests — `highlight.worker`,
  `relay-runtime-transport`, `submitSlashDraft`, `submitSlashDraftTransport`.
- Remove the blanket virtualizer mock from at least one suite so the real virtualizer is exercised;
  keep the mock where a test genuinely needs every row.
- Rename `disclosure-persistence.svelte.test.ts` — it asserts card *placement* at `:121-141`, and its
  filename is a false assurance about coverage that does not exist.
- Install `eslint-plugin-svelte` and `svelte-eslint-parser`, add the `**/*.svelte` block, and triage
  the first pass.
- Delete the `react-hooks` / `react-refresh` configuration at `eslint.config.js:48-52` — React is gone
  — and fix the dead override at `:55` pointing at a directory that no longer exists.
- Add a reducer test over `state.ts` transcript handling: snapshot, delta, gap, and the
  `awaitingSnapshot` barrier. Nothing currently touches that path.

**Out of scope:** any source behaviour change; the a11y suite; relay tests; adding a custom
`$effect` lint rule, which the council ruled out separately and which this packet only makes possible.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — The logic lane resolves by glob. A new test file placed in the tests directory runs
  without any config edit, which is the property the allowlist removed.
- **REQ-002** — Every test file in the repository either runs in some lane or carries a written reason
  it does not. A dead test is worse than a missing one, because it reads as coverage.
- **REQ-003** — At least one suite renders `TranscriptList` against the real virtualizer, so that
  virtualization-dependent behaviour is observable at all.
- **REQ-004** — ESLint parses `.svelte` files. The first pass is triaged, not silenced, and the
  resulting error count is recorded as a baseline.
- **REQ-005** — The transcript reducer is covered for snapshot, delta, gap and the mutation barrier
  during recovery.
- **REQ-006** — Test file names describe what they assert. A file named for a behaviour it does not
  test is a coverage claim that is not true.
- **REQ-007** — No source file under `app-mobile/src/` or `app-relay/src/` changes. If a repaired test
  fails against real code, that failure is reported, not fixed here.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The logic lane uses a glob and its test count is recorded before and after.
2. Zero test files are unreferenced by every lane without a written reason.
3. `npm run test:web` exit 0, verified by content rather than by a piped exit status.
4. ESLint runs over `.svelte` files and reports a recorded baseline.
5. The reducer test covers four transitions and fails when the barrier is removed.
6. `npm test` unaffected — this packet does not touch relay tests.
7. `validate.sh … --strict` exit 0 through its realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **The glob will turn things red, and that is the point.** The honest risk is the temptation to
  re-narrow the glob until green returns, which reproduces the defect with extra steps. Failures get
  repaired or quarantined with a reason, never excluded silently.
- **Un-mocking the virtualizer may expose real bugs.** Those are findings, not this packet's work.
- **The ESLint first pass over 114 `$effect` occurrences may be large.** Baseline it; do not silence it.
- Installing two dev dependencies is a scoped mutation and needs the usual approval.
- Runs before 012, so no rename collision. Independent of the relay packets.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **Repair or quarantine the four dead tests?** They fail on stale fetch-mock and Worker-environment
   assumptions. Repairing them is real work of unknown size; quarantining them with a written reason
   is honest and cheap. Recommendation: quarantine now, repair as its own item, because bundling an
   unknown into a precondition packet is how preconditions stop being cheap.
2. **How much ESLint noise is acceptable to carry?** If the first Svelte pass produces hundreds of
   findings, the choice is triage-now versus baseline-and-ratchet. Recommendation: baseline and
   ratchet, so the lane lands this week rather than after a cleanup project.
<!-- /ANCHOR:questions -->
