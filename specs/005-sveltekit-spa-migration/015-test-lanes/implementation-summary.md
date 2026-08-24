---
title: "Child 015 implementation summary — test lanes"
description: "The logic lane resolves by glob, the real virtualizer is exercised, ESLint parses Svelte against an honest scope, and the transcript reducer is covered with a negative control."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/015-test-lanes"
    last_updated_at: "2026-08-24T17:58:13.879Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Glob lane, real-virtualizer suite, Svelte lint scope and reducer coverage landed."
    next_safe_action: "Start 012/001, which this packet unblocks."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 015 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | **Shipped** |
| Requirements shipped | REQ-001 … REQ-007 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Three instruments that reported green while measuring less than they appeared to now measure what
they claim.

**The logic lane resolves by glob.** A new file in the tests directory runs without a config edit —
proven by adding one, watching the lane go from 15 files to 16, and removing it again. The four files
the old config named as dead are excluded explicitly, each with the reason observed by running it
rather than assumed.

**The real virtualizer is exercised.** Every suite that renders the transcript replaced the
virtualizer with a stub returning every row, so virtualization itself had never been observed. A new
suite stubs the layout jsdom cannot provide instead of the component under test: the virtualizer
sizes its viewport from `offsetHeight`, which jsdom always reports as zero. With two hundred blocks
in a six-hundred-pixel viewport the list renders ten rows and still sizes its scrolled area for all
two hundred. The existing mocks stay where a test genuinely needs every row.

**ESLint parses Svelte, against an honest scope.** No rule had ever read a component: no parser was
installed and no block matched `.svelte`. Ninety-six components are now linted. The run also swept
generated output and the read-only research repositories checked out under `specs/`, reporting 36,934
problems nobody could act on; scoped to this project's own source the baseline is 113.

**The transcript reducer is covered.** Snapshot, delta beyond the cursor, epoch change, gap and the
recovery barrier. Removing the barrier fails the barrier case, which is what makes the coverage worth
having.

**A test filename stopped claiming coverage it did not provide.** `disclosure-persistence` asserts
that an image card sits outside the collapsing group and stays operable — placement, not persistence.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Six commits, one per change, all authored here: this packet touches only configs and tests, which sit
outside the executor's write scope. No source file under `app-mobile/src/` or `app-relay/src/`
changed in any of them.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Quarantine the four dead tests rather than repair them**, as the packet recommended. Each carries
its own reason in the config, where the next reader will look. Repairing them is real work of unknown
size and bundling an unknown into a precondition is how preconditions stop being cheap.

**Stub the layout, not the virtualizer.** Removing the mock from an existing suite made it render
zero rows, because jsdom has no layout at all — the honest fix is to supply the one thing jsdom
cannot, and let the real component run.

**Scope the lint run before recording its baseline.** A number dominated by findings in read-only
research repositories is not a baseline anyone can ratchet against.

**Baseline and ratchet rather than triage now**, as the packet recommended. 113 findings, 48 of them
unused variables, are written down rather than silenced.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Logic lane, before | 15 files / 182 tests |
| Logic lane, after | 16 files / 188 tests, exit 0 — one new file, six new tests |
| Svelte lane, before | 65 files / 530 passed, 3 skipped |
| Svelte lane, after | 66 files / 532 passed, 3 skipped — one new file, two new tests |
| `npm run test:web` | PASS — exit 0, verified by both suite summaries being present rather than by a piped status |
| Glob property | PASS — a temporary file ran without a config edit and was removed again |
| Real virtualizer | PASS — 10 rows rendered of 200, spacer sized for all 200 |
| Reducer negative control | PASS — removing the barrier fails the barrier case |
| ESLint over `.svelte` | PASS — 96 components linted, 22 with findings; baseline 113 errors |
| No source changed | PASS — the six commits touch tests and configs only |
| Dev dependencies are dev-only | PASS — both under `devDependencies` |
| Backend suite unaffected | PASS — 51 files / 384 tests, exit 0 |
| `npm run build` | PASS — exit 0 |
| `npm run typecheck` | PASS — exit 0, 0 errors |
| Token identity, three themes | PASS — 0 CHANGED / 0 VANISHED / 0 ADDED |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The four quarantined tests are still not running**, and one of them fails for a reason worth
naming: `highlight.worker.test.ts` throws at import because the worker's token regex carries an
invalid escape under the unicode flag. That is a source defect, reported here rather than fixed,
because this packet changes no source.

**The 113-error lint baseline is a starting notch, not a clean board.** Nothing ratchets it yet.

**The virtualization suite proves a window exists, not that the window is right.** jsdom has no
compositor, so scroll-driven behaviour and momentum still need a device.
<!-- /ANCHOR:limitations -->
