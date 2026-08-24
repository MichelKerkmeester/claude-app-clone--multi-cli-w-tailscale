---
title: "AI Council deliberation record — final cross-repo synthesis"
description: "Who argued what across two rounds of the terminal synthesis council, which positions changed under challenge, which findings were escalated and then refuted, and what dissent survived adjudication. The companion record to final-synthesis.md."
trigger_phrases:
  - "council deliberation record"
  - "ai council dissent synthesis"
importance_tier: "important"
contextType: "research"
---

# Council deliberation record

Companion to `../final-synthesis.md`. That document says what to build. This one says how the
council got there, and where it was wrong on the way.

## Composition

Five lenses were mandated. The agent contract caps a dispatch round at three seats, so the run was
staged across two rounds plus adjudication. Every seat was a native dispatch with its own file
evidence — no external AI system participated, and nothing here is a simulated vantage.

| Round | Seat | Lens | Mandate | Score |
|---|---|---|---|---|
| 0 | seat-000 adjudicator | analytical | Independent client + program baseline gathered before seats returned | — |
| 1 | seat-001 protocol | analytical | Relay server and wire contract: replay, ordering, reconnect | 94 |
| 1 | seat-002 security | critical | Posture, authority, redaction, fail-closed | 99 |
| 1 | seat-003 mobile-ux | holistic | Transcript, composer, disclosure, failure copy | 83 |
| 2 | seat-004 skeptic | pragmatic | Argue items **down**; blast radius versus payoff | 97 |
| 2 | seat-005 verification | research | What test catches each item regressing, and can any gate see it | 96 |

Round 2 seats received Round 1's findings as their attack surface, which is the only way a skeptic
and a verification reviewer can do their jobs.

---

## What each seat argued

**seat-001 (protocol)** argued that the sweep's flagship recommendation is inverted: the relay is
gap-free *by construction*, and gets there by a stronger mechanism than R-01 proposes — R-01's
per-attach queue and ready-sequence handshake are workarounds for not having a durable log, and this
relay has one. It then found three defects nobody had: the projection sequence desync (N1), the
un-rotated sync epoch on child restart (N2), and the missing heartbeat.

**seat-002 (security)** argued that the security half of the sweep is almost entirely already
implemented under different names, and that the one real finding is a conformance defect: three
approval routes lack the foreground gate that twelve siblings have. It declined R-08's filename half
outright — no filename exists in the protocol — and refused to launder a timing-comparison weakness
as defence in depth when it is unreachable at this posture.

**seat-003 (mobile UX)** argued that four of the sweep's UX items are native muscle memory that the
relay architecture already abstracts away, and that the one real bug is disclosure state destroyed by
virtualization windowing — the right fix for a different reason than the sweep gave.

**seat-004 (skeptic)** argued six items off the list, downgraded four more, and — unprompted —
*upgraded* one. It was the only seat to check whether the tooling an item assumed actually exists.

**seat-005 (verification)** argued that two of the nine gates are not programs, that the logic test
lane is an allowlist which has already killed four tests, and that the test named after the property
S-08 establishes is structurally incapable of observing it.

---

## Positions that changed under challenge

This is the part worth reading.

### The adjudicator refuted seat-001's closing finding

seat-001 ended by flagging, as INFERRED, what it believed was the only remaining place bytes could be
lost: `useSyncSocket.svelte.ts:217` advances `cursor` on message *receipt* while application happens
in a later `requestAnimationFrame`, so a close with `pendingMessages` non-empty would leave the
cursor claiming coverage the reducer never applied. It addressed this to the client reviewer.

**Traced, and it does not reproduce.** The teardown at `:261-268` cancels the frame and clears
`pendingMessages`, and on the next effect entry `cursor` is reassigned — from the cache at `:140` or
to `null` at `:142`. The cache cannot lead the applied state, because `saveCache` writes
`coversThrough: current.coversThrough` from the reducer's `TranscriptState` (`cache.ts:155-164`), not
from the socket cursor. The socket-close-without-teardown path at `:241` reuses the advanced cursor
but *retains* `pendingMessages`, so the unapplied envelopes are still applied in order when the frame
resumes.

Taken on faith this would have entered the synthesis as a P0. It is the clearest vindication of the
rule the council was convened to apply to the prior document: **treat every inherited finding as a
hypothesis.**

### The skeptic refuted seat-001's largest recommendation

seat-001 held that the `pi.*` envelope lane ships raw upstream Pi event names and payloads to the
browser, making an upstream rename a silent breakage, and that fixing it is an L-effort wire change.
The adjudicator carried this into the draft synthesis as an item.

**The skeptic checked the guard and the premise is false.** `demux.ts:77-83` calls `onEvent` only when
`isPiRpcEvent(record)` passes, and that guard tests `type` against a closed 22-name set
(`guards.ts:189-212`). An unrecognised upstream name never becomes an envelope — it routes to
`onProtocolError`. The client's entire upstream-shape parsing is **one line**
(`useSyncSocket.svelte.ts:70`), and two of the three fields it matches are first-party, emitted by an
extension in this tree (`extensions/pi-remote-plan/src/plan-artifact.ts:133-134`).

So the residual risk is not "the vocabulary is unowned" but "the designed error path has no
listener" — which is three lines, and is already S-01. **An L-effort wire change plus a schema
migration collapsed into part of a four-line fix.** Verified independently by the adjudicator before
acceptance.

### The skeptic refuted the client contiguity assertion

seat-001 and seat-000 both wanted a runtime contiguity check in the client reducer as R-01's one real
residue. The skeptic pointed out that `relay-store.ts:262-268` **throws** on any non-contiguous
append, so a hole cannot be persisted at all — one producer, loopback, no proxy, no retry middlebox,
no other origin. Demoted from runtime code to a unit test (S-11). The adjudicator had read those
lines and drawn the weaker conclusion; the skeptic drew the right one.

### The adjudicator corrected seat-003, twice

seat-003 rated "you cannot stop a running turn once you have typed anything" as the app's
highest-consequence gap. The counter-argument is in the same file: at `SessionComposer.svelte:738` the
primary disc becomes **Steer**, and `types.ts:204` documents `'steer'` as interrupting the turn. The
user can already interrupt while a draft exists. The accurate gap is narrower — no abort *without*
sending text — and the behaviour is deliberate (`:247-249`). The skeptic independently reached the
same conclusion and killed it outright.

seat-003 also called the disclosure fix "migration-legal today". No rendered value changes, but the
behaviour diverges from the frozen React oracle, and `goal.md:19` freezes *"nothing about what the app
does"*. It needs an 011 requirement. The skeptic then added a cost seat-003 had not priced: the fix
lifts state through markup fenced at `TranscriptList.svelte:122`, `:174-175` and `:202`, so it is a
fence-crossing edit subject to the unchanged-fence-TEXT diff and the fence-count gate — not the
five-line change it was billed as.

### The skeptic upgraded an item nobody was championing

Sent to argue items down, it went looking to kill `Retry-After` uniformity and could not. The client
consumer is **already built and shipped**: `parseBoundedRetryAfter` at `relay.ts:256-264`, wired into
the shared response handler at `:1714`, carried on `RelayRequestError.retryAfterMs`, acted on at
`useRuntime.svelte.ts:112-119`. Nine server sites send a bare 429 into machinery built to honour a
header they never send. Server-only, no contract change, existing consumer. It went from a footnote to
S-03. Verified independently by the adjudicator.

### The skeptic narrowed the security seat's top item

seat-002 proposed foreground-gating three approval routes. The skeptic observed that `/api/approvals`
is a **read** (`relay.ts:1053` posts to it to list), so gating it would return
`403 foreground_required` to a phone whose socket has not yet re-opened — a behaviour regression
bought for no invariant. Narrowed to the two mutations. It also reframed the item's justification:
the approval surface is already principal-scoped and revocation-aware
(`approval-service.ts:314-320`, `:504-505`, `:106-107`), so this is consistency of a frozen
invariant, not a security fix. The synthesis sells it as the weaker, defensible claim.

### The skeptic deflated and then re-inflated the epoch item

Three corrections to seat-001's N2. The comment at `index.ts:146-147` is not lying — it annotates the
command-catalog invalidation, whose epoch genuinely does rotate (`command-service.ts:110`). Two
epochs, one comment. "Unbounded DB growth" overstates it: retention is per-epoch, so growth is ≤1000
rows per relay restart. And decisively — **fixing it makes the growth worse**, because there is no
cross-epoch GC anywhere, so rotating per Pi restart multiplies orphaned partitions. The item survived
but is now bundled with a GC obligation it cannot ship without.

### The skeptic recast the risk classifier

seat-002 ranked a relay-side approval risk classifier second overall. The skeptic accepted the
premise (paths are redacted, so classification must be relay-side and pre-redaction) and rejected the
conclusion: the person holding the phone is the person who asked for the work and knows what repo
they are in; a heuristic label will sometimes be wrong; and **a wrong risk label is worse than no
label, because a confirmation you learn to tap through no longer confirms anything.** It then found
the real defect by reading the markup: `Review.svelte:164` "Approve once" and `:186` "Accept next 3
edits" are two plain Buttons, same row, same size, same distance from the thumb, one of them three
times more consequential. **A mis-tap problem, not a classification problem** — and its fix needs no
classifier, no protocol field, and no cross-package contract.

### The skeptic killed the lint rule on evidence nobody had gathered

Every prior discussion of R-04's mechanics assumed a lint rule was cheap. The skeptic checked the
linter: `eslint.config.js` has no `**/*.svelte` block and neither `eslint-plugin-svelte` nor
`svelte-eslint-parser` is installed. ESLint currently parses zero Svelte files, and 89 of the app's
114 `$effect` blocks live in files it never reads. "Add a rule" is really: install a toolchain, stand
up a lint lane, triage a first pass over 148 files, clear 27 pre-existing errors, author a custom rule
no upstream plugin expresses, write its rule tests, and keep a tenth gate green forever — on a
one-person project, over files 012 is about to rename. The doctrine survives; the rule does not.

---

## What the verification seat contributed that no other lens could

Three findings that are about the *ability to know*, not about any feature.

**The false assurance is systemic.** All four suites that render `TranscriptList` mock
`@tanstack/svelte-virtual` so `getVirtualItems()` returns every item
(`disclosure-persistence.svelte.test.ts:17`, `transcript-placement.svelte.test.ts:16`,
`App.svelte.test.ts:83`, `ask-question-card.svelte.test.ts:17`). **No test in this repo has ever
exercised the real virtualizer** — which is precisely why S-08's bug survived to be found by reading
rather than by failing. And the test named after the property asserts something else entirely: card
*placement*, not persistence (`:121-141`).

**A test that is written can silently never run.** `vitest.web.logic.config.ts:22-38` is a hardcoded
fifteen-path allowlist used as `include`, and its own header at `:17-21` records four tests already
lost to it. Writing a new logic test without this knowledge produces a green board and no coverage.

**Two of the nine gates are not programs.** The `@ds guardrail:` fence count exists as a number in
prose (`007-verify-and-cutover/tasks.md:253`); `validate.sh` is not in the repo.

It also found a defect while mapping coverage: `server.ts:815-823` foreground-gates
`/api/prompt/submit` **only when the prompt carries attachments**, so a plain steering prompt from a
background device is accepted while the same prompt carrying an image is refused.

---

## Convergence

Round 1 did not converge: nine new defects, three of which changed the shape of the set, and two
mandated lenses had not run. Round 2 converged — the skeptic and the verification seat agreed
independently on the ordering (S-01 first, S-02 narrowed, client work behind 012), and neither
produced a finding the other contradicted. Adjudication resolved the three Round 1 positions that
Round 2 overturned and one of the adjudicator's own.

Final set: **eleven items**, down from the prior document's thirteen — but with only four survivors in
common, six items killed, four narrowed, and five defects added that no research document surfaced.

---

## Surviving dissent

Three disagreements did not resolve and are recorded rather than smoothed over. Each is in
`final-synthesis.md` §7 with its evidence; summarised here with who held which position.

**S-07's test ratio.** seat-005 put the harness at ~15x the ten-line fix, because there is no
WebSocket-level test in `app-mobile/tests/` at all. seat-001 and seat-004 both judged it the best
client-side item, because the fifteen-minute session expiry is the *routine* backgrounded-phone case.
Unresolved: whether to ship it with a documented caveat and no test, which the council would
otherwise refuse. **Operator decision.**

**S-02's category.** seat-002 ranked it first as a security fix; seat-004 established that the caller
it blocks already holds the user's phone, making it hygiene. Both agree it ships. They disagree on
urgency. The synthesis takes the weaker claim.

**S-06's GC obligation.** seat-001 wants the epoch rotated for correctness. seat-004 notes it cannot
ship without a new retention policy that will need revisiting, and would defer the whole item until a
mid-session Pi restart is actually observed. Unresolved, and the deciding input — how often the child
actually restarts — is not in the repo.

---

## Method note

The council's own discipline was tested twice and held both times. A seat's most dramatic finding was
escalated, traced, and refuted. A seat's largest recommendation was carried into a draft of the
synthesis and then killed by the next round before delivery. Both corrections came from reading the
specific line rather than accepting the summary — which is the same failure mode the prior
recommendations document exhibited when it asserted four items were "already satisfied" without
checking, and missed seven that were.
