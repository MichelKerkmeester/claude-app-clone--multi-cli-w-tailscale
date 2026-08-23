---
round: 2
seat: seat-005
executor: native-explore
lens: research
status: ok
timestamp: "2026-08-23T10:10:00Z"
simulated: false
---

# Seat 005 — Verification

## Three infrastructure findings that change the effort math

**V1 — the false-assurance instance is systemic, not isolated.**
`app-mobile/tests/disclosure-persistence.svelte.test.ts:17-31` mocks `@tanstack/svelte-virtual` so
`getVirtualItems()` returns **every** item; `overscan` is never read and there is no scroll element.
The same mock appears in all four suites that render `TranscriptList`:
`disclosure-persistence.svelte.test.ts:17`, `transcript-placement.svelte.test.ts:16`,
`App.svelte.test.ts:83`, `ask-question-card.svelte.test.ts:17`. **No test in this repo has ever
exercised the real virtualizer.** The test that names itself after the property is the one that
structurally cannot observe it: it asserts card *placement* (`:121-141`,
`disclosure?.contains(cardButton) === false`), not persistence.

**V2 — the logic test lane is an allowlist, not a glob.**
`vitest.web.logic.config.ts:22-38` hardcodes 15 paths and `:45` uses `include: LOGIC_TESTS`. A new
pure-logic test **silently never runs** unless it is added to that array. The file's own header
(`:17-21`) records that four tests are already dead this way: `highlight.worker`,
`relay-runtime-transport`, `submitSlashDraft`, `submitSlashDraftTransport`. The svelte lane
(`vitest.web.svelte.config.ts:20`) and the relay lane (`package.json:22`) are real globs; only this
one has the trap.

**V3 — two of the nine gates are not programs.** The `@ds guardrail:` fence count exists only as a
number in prose (`007-verify-and-cutover/tasks.md:253`, "277 fences"); no script implements it.
`validate.sh` is not in the repo — INFERRED that it ships with the spec-kit skill runtime.

## Bonus defect found while mapping coverage

`server.ts:815-823` — `/api/prompt/submit` is foreground-gated **only when the prompt carries
attachments** (`hasAttachments && !isForegroundDevice(...)`). A plain prompt, including a `steer`
that interrupts a running turn, is accepted from a background device. Extends item A.

## Coverage map

| Item | Assertion required | Exists | Class | Test effort |
|---|---|---|---|---|
| A | no sync socket → 403 from all three approval routes; service spy records zero calls | no | (ii) | Med 2-3 h; ~110 of ~150 lines is harness glue |
| B | delta with `seq === coversThrough + 3` sets `awaitingSnapshot`, appends nothing, does not advance | no | (ii) | Low ~1 h, ~60 lines, **must be added to `LOGIC_TESTS`** |
| C | policy/auth close schedules no retry; ordinary close backs off | no WS test exists in `app-mobile/tests/` | (iii) | High ~1 d, all-new fake-socket infra |
| D | silent client terminated within 2 intervals and drops out of `activeSockets` | no | (iii) | High ~1 d → ~40 lines **if the fix exposes an injectable interval** |
| E | expand → unmount → remount → still expanded | no (V1) | (ii) state-layer / (iii) windowing | ~50 lines / ~150 lines |
| F relay | classifying pre-redaction yields a higher label than post-redaction | no | (ii) | Low ~40 lines |
| G | after N ms with no block, the label changes and announces once | no | (ii) | Low ~30 lines |
| H | every issue code carries a repairability answer | half exists and already gates (`runtime-issues.test.ts:22-24`, in `LOGIC_TESTS`) | (ii) → **(i)** | Trivial; a type change makes it compile-time |
| I | one closed socket is simultaneously refused authority and eligible for push | no; `push.test.ts:175-183` injects the very value whose provenance is the bug | (iii) | Med ~40 lines |
| J | maps never exceed MAX | no | (ii) | Low ~40 lines, zero infra — cheapest relay item |
| K | an `$effect` dispatching without `untrack()` fails lint | **cannot exist**: `eslint.config.js` globs `**/*.{js,mjs,ts,tsx}` and `app-mobile/**/*.{ts,tsx}`; `**/*.svelte` matches no block. 89 of 114 `$effect`s are in `.svelte` files ESLint never reads | (iii) → (iv) if unfunded | High 1-2 d, new dependency |
| L | with a draft and a running turn, a stop control exists and preserves the draft | no | (ii) | Low ~35 lines; `ComposerRecoveryHarness.svelte:70` already passes an assertable `vi.fn()` |

## Refuse to sign off without a test

A, B, D, F(relay), H, J, L. B especially: the failure renders as a *seamless* transcript, so nothing
but a test can ever detect it, and the test is 60 lines with no harness.

## Test harder than the fix

C ~15x, K infinite (the tooling is the deliverable), D ~6x (→ ~2x if the interval is injectable),
E ~5x (→ ~1.5x via the state-layer form).

## Irreducible human-acceptance residue (class iv)

Efficacy of the stall copy (G); whether a second confirmation causes a pause or becomes muscle
memory (F); real iOS Safari momentum scrolling (E); real half-open TCP detection through Tailscale
(D); and preventing a fourth notion of "foreground" from being introduced (I). Items E and L both
move interactive controls, so both re-enter the AT-tree blind spot recorded at
`a11y-parity-findings.md:11` and need the same verifier-pass treatment P0/P1 received.
