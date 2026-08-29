---
title: "Final cross-repo synthesis — one target architecture and a ranked, verified recommendation set"
description: "The terminal synthesis of the five-repo context research sweep. Reconciles OGAM, MobileCLI, nodeterm, openclaude-android and remote-for-opencode into one target architecture, verifies every inherited recommendation against the shipped relay, protocol and client, and returns eleven dependency-ordered items. Supersedes recommendations.md, which counted repo agreement rather than checking the codebase: seven of its thirteen items are already implemented or do not transfer, and the highest-ranked item here is a silent data-loss defect no research document surfaced."
trigger_phrases:
  - "final research synthesis"
  - "context repo recommendations decision"
  - "adopt research patterns pi remote"
importance_tier: "critical"
contextType: "research"
---

# Final cross-repo synthesis

**Status: AWAITING OPERATOR DECISION. Nothing below has been scaffolded.**

This supersedes `recommendations.md` as the decision document. That pass ranked items by how many of
five repos agreed, which measures how common a problem is in the industry, not whether this codebase
has it. Every claim below was re-checked against `app-relay/`, `packages/pi-rpc-protocol/` and
`app-mobile/src/`. Where the two documents disagree, this one carries the `file:line`.

Five lenses deliberated over two rounds — protocol, security, mobile UX, a blast-radius skeptic, and
a verification reviewer. Round 2 overturned three Round 1 conclusions and one of the adjudicator's.
The record is in `ai-council/deliberation.md`.

**Three findings, in order of importance.**

**One.** The sweep's flagship recommendation — R-01, gap-free reconnect, rated effort L against the
wire contract — is **already implemented on both sides, by a stronger mechanism**. So are R-02, R-07,
R-12, and the substance of R-05 and R-11. The council spent most of its effort establishing what not
to build.

**Two.** The single most serious defect in this system is one no research document could have
surfaced: a projection sequence desync that makes the relay **silently drop transcript blocks** on a
first-party code path, with the error swallowed by an unregistered listener. It is four lines to fix.

**Three.** Six of the ten proposals that survived scrutiny live in `app-relay/`, which the queued
`012-naming-and-structure` packet explicitly does not touch. **012's blocked state does not block
this list.**

---

## 1. THE INTEGRATED TARGET ARCHITECTURE

Where the five repos converge, they converge on one design. Stated once, as a builder would need it.

**A remote agent client is a projection of a durable, sequenced, server-owned event log, and every
authority it exercises must be proven fresh at the moment of use.**

**The log is durable and sequenced, so reconnect is replacement, never continuation.** Every event
carries `{epoch, seq}`; the server owns both. A client resumes by presenting a cursor and gets a
snapshot, a delta, or an explicit gap — never silence, never an implicit splice. MobileCLI proves the
negative: its per-socket forwarder drops broadcast frames while no attach is registered and
registration happens only after readiness, so bytes in that window exist in neither the snapshot nor
the live stream (mobilecli `daemon.rs:1396-1437`, `1195-1248`, `2694-2743`). nodeterm and
openclaude-android reach it from the client side — fail every pending call before raising the overlay
(nodeterm `ws-bridge.ts:88-114`), gate live writes until initial history has flushed then drain in
order (openclaude-android `flushGate.ts:28-70`).

**This app already implements that clause, more strongly than any of the five.**
`app-relay/src/replay/sync.ts:78` registers the subscriber **before** `:79` builds the plan; `:99-101`
queues live envelopes while initializing; `:85-90` drains them `filter(seq > barrier).sort(by seq)`;
`:38-48` persists before broadcasting. The snapshot boundary is read once and reused for both
`coversThrough` and the bounded envelope read (`relay-store.ts:324`, `:341-352`). The log is a
WAL-mode SQLite file (`:172-177`), so a delta from a cursor is a real range read rather than a replay
of a memory ring. And the store refuses to persist a hole at all: `relay-store.ts:262-268` **throws**
on any non-contiguous append. The client mirrors it — `state.ts:357-370` clears and sets
`awaitingSnapshot` on a gap, `:331` refuses deltas until the snapshot lands, `:341` dedupes below the
high-water mark, and `Chat.svelte:417-421` tells the user a reconciliation barrier is active.

**Policy is pure; I/O is confined to adapters.** OGAM writes it as doctrine — the service owns the
state machine, the store is a read-only projection (`rules.md:166-175`) — and shows the race it
prevents: a shared abort flag reset by a concurrent turn repaints a stopped turn as a fresh empty
response (`generationToolLoop.ts:1235-1244`). remote-for-opencode arrives from the other side, with
framing, permissions, parsing and diff modelling in pure modules and I/O in adapters
(`docs/development.md:30-38`). This app's **reducer** layer already follows it: four pure reducers
with stable dispatchers in `app-mobile/src/shared/data/app-state.svelte.ts:56-70`. Its **effect**
layer does not, and that is where this program has been bitten seven times.

**The phone's vocabulary is owned by the phone's authors.** remote-for-opencode is the only repo
stating this as a contract: your own typed kinds, upstream skew behind a server-side adapter, never
command templates to the browser (`protocol-v1.md:7-10`, `:66-83`, `:215-224`). This app honours it
for commands more strictly than the recommendation asks — `redaction.ts:647-670` builds the
descriptor by allowlisted fresh object construction, and `guards.ts:2578-2603` **fails the guard on
an extra key**. It honours it for events too, which Round 1 missed: `demux.ts:77-83` admits a record
as an event only if `isPiRpcEvent` passes, and that guard checks `type` against a closed 22-name set
(`guards.ts:189-212`). An upstream rename never becomes an envelope; it routes to `onProtocolError`.

**Authority is proven fresh, per action, never inferred from a cached artefact.** MobileCLI binds an
HMAC transcript to server, credential, both nonces and installation id (`auth.rs:120-156`); nodeterm
advances approval only from ciphertext, one trust choke point (`relay-trust.ts:9-128`);
openclaude-android carries viewer authority into the session manager rather than the UI
(`RemoteSessionManager.ts:50-62`); remote-for-opencode authenticates grants but never declines
(`TurnController.swift:193-205`). This app's own standard states it in one line: *"authority that the
phone must prove fresh on every use"* (`sk-code-mobile-cli/references/standards/security.md:26`),
with foreground authority defined as *"a current device proof"* (`:34`). Two shipped routes do not
prove it (S-02), and the predicate that would prove it cannot tell a live peer from a dead socket
(S-04).

### Where the repos conflict, and who wins

| Conflict | Winner | Why |
|---|---|---|
| Delta replay from a cursor vs. snapshot + boundary + queue | **Neither — the durable log wins** | MobileCLI's `last_seen_seq` is a presence label, not a cursor (`daemon.rs:2463-2467`); its own analysis rules delta replay out for want of an event log. This app has the log, so it gets honest deltas *and* honest gaps. Both source designs are workarounds for an absence this app does not have. |
| OGAM mints reply identity at stream start; MobileCLI keys on `(prompt_hash, wait_type)` | **OGAM** | Server-minted stable ids beat content hashing. This app goes further: blocks carry `id` + numeric `revision` (`types.ts:431-437`) and approvals carry `digest` + `idempotencyKey` + `epoch` + `revision`. Hashing a 300-character prompt suffix is what you do when you cannot change the producer. |
| nodeterm's answer-file approval tickets vs. openclaude-android's correlated `control_request` | **openclaude-android; this app exceeds both** | The answer-file contract is an artefact of driving a CLI you cannot modify. Here the host emits structured approval events and leases are consumed through a final gate (`final-gate.ts:36-66`). |
| nodeterm's reconnect delay table | **Neither** | Dead code, no call site (`relay-socket.ts:501-535`). Repeated here so it is not revived. |
| OGAM's checklist-enforced token compliance vs. a machine gate | **This app** | OGAM records its own enforcement as checklist-only and notes its docs have drifted from the runtime (F4-F5). The token-identity 0-diff gate is strictly stronger. |

### One repo's unique idea — insight or accident?

**Genuine insight:** nodeterm's *activity string* — a closed tool-to-verb mapping driving mobile live
cards with **zero transcript streaming to the phone** (`mobile-usage-inbox.md:91-96`). That is the
content-free posture this app already requires, reached independently for a different reason. Its
transferable residue is S-10.

**Local accident, do not import:** MobileCLI's per-CLI approval-model enum exists because it drives
third-party CLIs by keystroke injection. OGAM's 55%/12% context ledger exists because OGAM owns its
own inference loop. nodeterm's nine-layer E2EE stack exists because its relay is untrusted; this one
is loopback. Each is excellent engineering for a problem this deployment does not have.

---

## 2. WHAT TRANSFERS, AND WHAT DOES NOT

Four of five sources are native — a Rust daemon, SwiftUI, React Native, Android/TypeScript.

**Survives translation:** event sequencing and cursor semantics; explicit gap signalling;
fail-pending-before-overlay ordering; close-code classification by recovery semantics; server-side
liveness probing; typed refusal vocabularies; scoped, bounded, expiring grants; content-free push
with an opaque lookup id; disclosure state keyed outside the row; pure policy with I/O in adapters;
harnessing production components rather than lookalikes.

**Does not survive, and the sweep proposed it anyway:**

- **PTY tail classification** (MobileCLI's ANSI-strip, 1200-char, 6-line, precedence-ordered
  classifier). This app never scrapes a terminal: the host emits 22 structured lifecycle events
  (`types.ts:260-282`) over strict LF-JSONL. The `>=10 non-whitespace characters` clear rule, the
  approval-model enum and the keystroke mapping have no analogue.
- **Chunk-safe think-tag parsing** (OGAM `openAICompatibleStream.ts:21-117`). The relay delivers
  `ThinkingBlock{summary}` (`types.ts:616-619`); no raw tag reaches the client.
- **Per-part delta accumulation throttled to ~10/s** (remote-for-opencode `protocol-v1.md:167-193`).
  `SyncDelta` carries whole `envelopes` (`types.ts:398-404`), deduped by `id` and `revision`.
  Coalescing already happened server-side; the client additionally batches by
  `requestAnimationFrame` (`useSyncSocket.svelte.ts:202-215`).
- **The 300 ms post-keyboard-hide deferral** (OGAM `useKeyboardAwarePopover.ts:30-75`). 300 ms is the
  UIKit keyboard-animation constant; the web does not expose that event.
  `useVisualViewportAnchor.svelte.ts:62-63` coalesces every measurement through one
  `requestAnimationFrame`, and `:70-85` also listens for `pageshow`, because an installed PWA
  restored from the iOS page cache fires it without a viewport resize — sharper PWA knowledge than
  the recommendation offers.
- **Client filename sanitization, UUID prefixing, path quoting** (openclaude-android
  `inboundAttachments.ts:31-57`). No filename exists in this protocol (`types.ts:115-121`); storage
  names are 32 CSPRNG bytes (`attachment-service.ts:679`); identity is server-minted opaque ids
  (`:714-722`); images reach the host as base64 in an RPC frame with no shell
  (`pi-image-bridge.ts:152-160`); any client filename is dropped by `redaction.ts:61`.
- **"Send/stop/voice as one precedence state."** There is no voice control, by explicit design
  (`SessionComposer.svelte:9-11`). Asserting this is "already satisfied" names a control that does
  not exist.
- **Relay-side context budgeting and summarization** (OGAM `contextCompaction.ts`). The relay does
  not build prompts: `prompt-service.ts:81-140` forwards `{type:'prompt', message, images}`, and
  `compaction_*` are host events it only projects (`transcript-projector.ts:313-329`).

---

## 3. THE FINAL RANKED RECOMMENDATIONS

Eleven items. Each is a rule, then the mechanics, then the failure it prevents. Test effort is stated
separately, because for two items it is the larger number.

---

### S-01 · Make the swallowed error audible, and allocate sequences from the store.

**Ship this first. It is roughly four lines, and it is the only live silent data loss on the list.**

Register `supervisor.onError` in `app-relay/src/index.ts` (the logging idiom already exists at
`:463`). Narrow the `try` in `rpc/framing.ts:70-76` to `JSON.parse` only. Then stop `index.ts:295-298`
caching `nextProjectedSequence` and re-read `store.nextSequence` per block, as `index.ts:315` and
`prompt-service.ts:216` already do.

**Because** the counter hands out `S+1, S+2, …` locally while `relay-store.ts:220-223` drops
control-plane projections **without consuming a sequence**, so the next block in the batch arrives as
`S+2` against an expected `S+1` and throws at `:262-268`. That throw is caught by the JSONL framing
layer, relabelled `RPC JSONL parse failed`, and handed to an error-listener set that `index.ts` never
populates. It vanishes. The user sees a plan referenced in the transcript but never rendered, with no
error anywhere.

**The trigger is a first-party code path, not a hypothetical.** `transcript-projector.ts:379-392`
emits the plan block for an `extension_ui_request` and `:399-402` appends artifact blocks after it in
the same batch; `redaction.ts:595-608` drops the plan block exactly when the extension sent no
`title` and no `message`; and the producer is in this tree —
`extensions/pi-remote-plan/src/plan-artifact.ts:133-134`.

The two halves ship together because **you cannot verify the counter fix without the listener** —
there is no output today. And the listener pays for itself twice: it also makes `demux.ts:81-83`'s
`onProtocolError` audible, which is what would surface an upstream Pi rename (see §6).

*Effort:* S, ~4 lines. *Test:* Low — feed an `extension_ui_request` with `method:'setPlan'`,
`statusKey:'pi-remote-plan-artifact'`, an `artifactSnapshot` and no `title`/`message`; assert the
artifact block reaches `createSyncPlan`. *Blast radius:* the projection loop. *Ongoing cost:* none.
*Depends on:* nothing. *012-immune.*

---

### S-02 · Every route that *exercises* mutation authority proves foreground first.

Add `isForegroundDevice(session.deviceId, session.token)` and a `FixedWindowRateLimiter` to
`/api/approval/decide` (`app-relay/src/http/server.ts:782-790`) and `/api/accept-edits` (`:1091-1123`),
copying the pattern at `:1039-1047`. Make `/api/prompt/submit` unconditional: `:820` reads
`if (hasAttachments && !isForegroundDevice(...))`, so a plain steering prompt from a background device
is accepted while the same prompt carrying an image is refused.

**Leave `/api/approvals` (`:771-780`) alone.** Round 1 proposed gating all three; that is wrong.
Listing is a read (`relay.ts:1053`), and gating it would start returning `403 foreground_required` to
a phone whose socket has not yet re-opened — a behaviour regression bought for no invariant.

**Because** `server.ts:191-192` says *"a background or stale device can never steer the host"*,
`goal.md:45` freezes foreground authority among the invariants, and `security.md:26` says authority
*"must prove fresh on every use"* — while twelve sibling routes honour it (`:533`, `:559`, `:660`,
`:820`, `:929`, `:979`, `:1006`, `:1039`, `:1069`, `:1181`, `:1326`, `:1415`) and these do not.

**Sell this as consistency, not security.** The approval surface is already principal-scoped and
revocation-aware independently of the gate — `approval-service.ts:314-320` filters `list` by
`principal_ref`, `:504-505` returns `principal-mismatch` on decide, `:106-107` and `:331-332` throw
for a revoked principal. The caller this would block already holds an enrolled device key on the
tailnet, which is the user's own phone. What it buys is that the next reader can assume the invariant
is universal, which today they cannot.

*Effort:* S. *Test:* Med, ~150 lines, ~110 of it harness glue merged from `plan-control.test.ts:574,764`
and `authority-loop.test.ts:526`; **no route-level test of any kind exists for these routes today**.
*Blast radius:* the approval path. *Bundle with:* S-03. *012-immune.*

---

### S-03 · Every 429 carries `Retry-After`.

Nine server sites send a bare `429, { error: 'rate_limited' }`. Send the header, as the artifact-read
path already does at `server.ts:2328-2337`.

**Because the client's consumer is already built and shipped, and the server is simply telling it
nothing.** `relay.ts:256-264` `parseBoundedRetryAfter` parses and clamps to 60 s; `relay.ts:1714`
wires it into the **shared** JSON response handler for every 429; it rides on
`RelayRequestError.retryAfterMs`; and `useRuntime.svelte.ts:112-119` acts on it. Today that machinery
receives `null` from nine of ten sources and falls back to a guess.

This is the best cost-to-value ratio on the list: server-only, no contract change, no new consumer,
no ongoing surface.

*Effort:* S. *Blast radius:* one header at nine call sites. *Bundle with:* S-02 — same route table,
same file, same test. *012-immune.*

---

### S-04 · The server proves the peer is alive, on an interval the tests can inject.

Add a 30-second ping with a one-miss `terminate()` to the sync WebSocket. **Expose the interval as a
constructor option**, because that one choice turns a day of flaky timing tests into about forty
lines.

**Buy it for connection-slot exhaustion, not for authority.** The authority argument is weak here:
the stale authority belongs to the user's own phone, so its practical effect is that a mutation the
user genuinely made is accepted. The real bug is `MAX_CONNECTIONS_PER_DEVICE = 4` (`server.ts:82`,
enforced `:243`) against a set drained only by `close`, `error`, revocation, or the fifteen-minute
session timer (`auth-service.ts:35`). A phone that suspends on a train four times **locks itself out
of its own relay** for up to fifteen minutes. That is an everyday failure for exactly this
deployment.

It also makes S-02's new 403 mean what `security.md:34` claims — "a current device proof" rather than
"a socket was once opened".

*Evidence:* no `ping`/`pong`/`isAlive`/`setInterval` anywhere in `app-relay/src` except
`attachment-reaper.ts:28`. *Effort:* S. *Test:* High → Low with the injectable interval.
*Blast radius:* all twelve foreground gates. *Bundle with:* S-07. *012-immune.*

---

### S-05 · "Foreground" means one thing, computed in one place.

Rename `PushService.setForeground` (`push-service.ts:159-162`) to name what it is — a **client-asserted**
flag — and prefer the socket-derived `foregroundDeviceIds` (`server.ts:337-339`) wherever push already
receives it. `isForegroundDevice` (`server.ts:193`) stays the authority predicate.

**Because** there are three names for two semantics, and the one worth marking is the push one
precisely because it is *asserted by the phone* rather than *observed by the server*. When they
disagree, the failing direction is the damaging one: a device whose socket dropped loses authority
while push still suppresses its wake-up hint, so it can neither act nor be told to come back.

*Effort:* S — a rename and one WHY comment. *Ongoing cost:* none. *012-immune.*

---

### S-06 · A host generation change rotates the sync epoch, and the relay collects its own garbage.

Rotate the stream epoch on the child `exit`/`restart`/`failed` edge handled at `index.ts:148-154`.
**Ship it with cross-epoch GC and the unbounded-map bounds, or do not ship it.**

**Because** post-restart output from a Pi process with **zero conversation context** is currently
appended to the tail of the pre-crash conversation with no gap, no epoch bump and no marker. The
command catalog, todos and attachments all honour the generation change; the transcript does not.

**Three corrections to how Round 1 stated this.** The comment at `:146-147` is *not* lying — it
annotates the command-catalog invalidation, and that epoch genuinely does rotate
(`command-service.ts:110`). Two epochs, one comment. "Unbounded DB growth" overstates it: retention
is 1000 envelopes **per epoch** (`relay-store.ts:60`, applied `:291`), so growth is ≤1000 rows per
*relay* restart — linear, not unbounded. And most importantly, **fixing this makes the growth worse**:
there is no cross-epoch GC anywhere (zero hits for `DELETE FROM stream_epochs` or `VACUUM` in
`app-relay/src`), so rotating per *Pi* restart multiplies orphaned ended-epoch partitions. Bound
`sets`, `submissions`, `deliveredSets` and `deviceReservedBytes` at
`attachment-service.ts:115-118` in the same pass, the way `prompt-service.ts:69` already bounds its
equivalent at 256.

The rotation itself is delicate: `relay-store.ts:968-977` throws on a reused epoch and
`assertFirstSequence` demands `seq === 1`. Get either wrong and you land in S-01's swallowed-throw
path — another reason S-01 ships first.

*Effort:* M. *Test:* Med. *Blast radius:* stream identity plus a new retention policy.
*Ongoing cost:* a GC policy that will need revisiting. *Depends on:* S-01. *012-immune.*

---

### S-07 · The client classifies a close by what recovery it implies.

`useSyncSocket.svelte.ts:234-242` increments `retryCount` and reconnects identically on every close.
Classify: `4003` (revocation, `server.ts:314`) is permanent — stop and surface re-enrollment; `4001`
(session expired) is transient — re-ticket immediately; `1006`/`1001` keep the existing bounded
backoff. Two facts to respect: tickets are one-use (`server.ts:239`), so a `401` on a racing retry is
expected rather than a failure; and `4001` fires on a **timer** (`auth-service.ts:220`), not a network
event.

**Because that timer makes the fifteen-minute expiry the routine backgrounded-phone case**, and today
it is met with exponential backoff to 15 s instead of re-authentication. For a phone-first single-user
app that is a daily papercut, not an edge case. A genuine revocation, meanwhile, reconnects forever
behind a "connecting" indicator and the user is never told to re-enroll.

**The honest counter-argument, which did not resolve.** The verification lens put the test at roughly
fifteen times the ten-line fix: `app-mobile/tests/` has no WebSocket-level test at all, so the
harness — a controllable `WebSocket` global, fake timers, a host component — is built from scratch.
See §7.

*Effort:* S. *Test:* High. *Blast radius:* the connection layer. *Bundle with:* S-04 — deciding the
heartbeat interval and deciding the re-auth path is one conversation. **Land before 012**, because
012's scripted specifier rewrite carries a prior content change through as a plain move, while a
concurrent edit collides with a 148-file batch.

---

### S-08 · Disclosure state lives outside the row, keyed by the block id.

Hoist `open` out of `NormalizedActivityGroup.svelte:30` and `CollapsedEvidence.svelte:29` into a keyed
store, exactly as `TodoPanel.svelte:74-78` already does with `openByState` and
`bind:open={openByState[section.state]}` at `:221`. The `Collapsible` primitive already exposes
`open = $bindable(false)` (`Collapsible.svelte:12`).

**Because** `TranscriptList.svelte:127,145` virtualizes with `overscan: 6`, so a row scrolled about six
positions out of view is removed from the DOM and its component-local state is destroyed. Expand a
tool result to read a stack trace, scroll up to check what prompted it, scroll back — it has silently
re-collapsed, and the virtualizer has lost the measured height too.

**Two corrections to the inherited version.** The stated *reason* was wrong: it blamed a key change at
finalization, but the group's id comes from the protocol block id (`transcript-helpers.ts:48`) and does
not change. And it is **not** the free five-line fix it was billed as. It lifts state through
virtualized row markup fenced at `TranscriptList.svelte:122`, `:174-175` and `:202`, so fence text must
survive the per-file unchanged-fence-TEXT diff and fence count is itself a gate (`goal.md:61`). It also
diverges from the frozen React oracle, so despite changing no rendered value it needs an
`011-ux-affordances` requirement.

*Effort:* S-M. *Test:* ~50 lines in the state-layer form (mount → expand → unmount → remount → still
expanded), which needs no virtualizer. *Blast radius:* two components plus three fences.
*Depends on:* 011 approval. **After 012** — it touches three files across two directories 012 renames.

---

### S-09 · Differentiate the blanket grant from the single approval, and model repairability.

Two small `011-ux-affordances` requirements that share one review.

**Differentiate the grant.** `Review.svelte:164` ("Approve once") and `:186` ("Accept next 3 edits")
are two plain `Button`s in the same row, the same size, the same distance from the thumb — one of
them three times more consequential. **This is a mis-tap problem, not a risk-classification problem.**
Fix it with visual and physical differentiation composing existing tokens, exactly as 011's REQ-001
does. That needs no classifier, no protocol field, and no pre-redaction computation.

**Model repairability.** Change `RUNTIME_ISSUE_COPY` (`runtime-issues.ts:14-22`) from
`Record<RuntimeIssueCode, string>` to `Record<RuntimeIssueCode, {copy, repairable}>`. Five of seven
codes already name a repair and `unsupported` is correctly terminal, but `foreground-required`
("Another device is controlling Pi.") and `host-unavailable` read as walls when they are doors. And
nothing exposes repairability, so no UI can branch on it — which is why `runtime.ts:674-685` lumps
permanently-impossible `unsupported` into the same `BLOCKED_MUTATION_PHASES` set as self-healing
`rate-limited`, and `RuntimeStrip.svelte:23` can only say "Unavailable — reconcile".

The type change needs **no test at all** — `svelte-check` proves it, and `runtime-issues.test.ts:22-24`
already asserts exact keying in the logic lane. The copy rewordings are rendered-value changes.

*Effort:* S each. *Blast radius:* the approval card and one catalog; both fenced
(`Review.svelte:160`). *Depends on:* 011 approval. **After 012.**

---

### S-10 · The transcript distinguishes "working" from "stalled".

`TranscriptList.svelte:253` renders the fixed string `"Working…"` for as long as `running` is true.
Derive a stall threshold from `Date.now() - lastBlockAt`; `occurredAt` is on every block
(`types.ts:435`).

**Because** the socket layer covers only **transport** death — `StatusPill` surfaces
`Reconnecting`/`Relay unavailable` — so a healthy socket with a wedged host shows a green "Relay live"
pill and pulsing dots indefinitely. Over a tailnet, where the laptop sleeps, that is the actual
failure mode. Nothing in the transcript is a function of time.

Take only this half of R-06: the tool-to-verb vocabulary would change rendered strings that
token-identity and the story fixtures depend on, and tool identity is already one tap deep
(`NormalizedActivityGroup.svelte:70-80`); the throttling half does not transfer at all (§2).

**Rank it last deliberately.** It is a rendered-value change under the fence at
`TranscriptList.svelte:174-175` which names streaming state explicitly, so it costs a fence-crossing
review, the fence-count gate, and an 011 sign-off — for an affordance whose absence is diagnosable by
looking at the relay. **Approve it only if S-08 is approved**, so it rides that fence review.

*Effort:* S. *Test:* Low, ~30 lines. *Irreducible residue:* a test can assert the label changes after
N milliseconds; only the operator can judge whether the copy reads as "stalled" rather than "working
harder". **After 012, with S-08.**

---

### S-11 · A test that is written is a test that runs.

Not a feature. A precondition, and on its own evidence the highest-leverage item after S-01.

Three repairs. **First**, `vitest.web.logic.config.ts:22-38` is a hardcoded fifteen-path allowlist used
as `include: LOGIC_TESTS` at `:45` — replace it with a glob. It has already silently killed four
tests, and the file says so at `:17-21`. **Second**, all four suites that render `TranscriptList` mock
`@tanstack/svelte-virtual` so `getVirtualItems()` returns *every* item
(`disclosure-persistence.svelte.test.ts:17`, `transcript-placement.svelte.test.ts:16`,
`App.svelte.test.ts:83`, `ask-question-card.svelte.test.ts:17`) — **no test in this repo has ever
exercised the real virtualizer**, which is why S-08's bug survived. Rename
`disclosure-persistence.svelte.test.ts` too: it asserts card *placement* (`:121-141`), not
persistence, and its filename is the false assurance. **Third**, `eslint.config.js` has no
`**/*.svelte` block and neither `eslint-plugin-svelte` nor `svelte-eslint-parser` is installed, so
ESLint parses zero Svelte files; while there, delete the `react-hooks`/`react-refresh` configuration
at `:48-52` (React is gone) and fix the dead override at `:55` pointing at
`app-mobile/public/service-worker.js` — that directory no longer exists.

**Add the contiguity assertion here as a test, not as runtime code.** Round 1 proposed a runtime
contiguity branch in `state.ts` `case 'delta'`. Decline that: `relay-store.ts:262-268` already throws
on any non-contiguous append, so a hole cannot be persisted, and one producer over loopback with no
proxy has no other origin. But **no test anywhere touches `state.ts:330-370`** —
`transcript-scope.test.ts` dispatches only `select`/`promptOptimistic`/`promptAccepted`/`promptRejected`,
and `App.svelte.test.ts:360,411,523` uses the reducer only to build fixtures. A sixty-line test
covering snapshot, delta, gap and the `awaitingSnapshot` barrier is cheap and permanent.

*Effort:* S for the allowlist and ESLint globs. *Blast radius:* test infrastructure only.
**Do this before S-07 or the contiguity test**, or you will write a test that never runs.

---

## 4. THE BUILD SEQUENCE

The controlling constraint is a merge constraint the program already documented.
`012-naming-and-structure` renames every file and folder under `app-mobile/src/` and dissolves
`shared/data/` into seven directories (`012/spec.md:91-99`), rewriting 238 aliased and 296 relative
specifiers via a scripted rewrite (`:98-99`, `:173`). Its own risk register states the rule: *"both
packets touch all 148 source files. They must not run concurrently"*, and *"Depends on 011 landing
first only to avoid a merge conflict, not for correctness"* (`012/spec.md:159-161`).

**012 explicitly excludes `app-relay/`, `packages/` and `extensions/`** (`012/spec.md:106`).

**Lane 1 — relay. Runs today. Six of eleven items. Blocked by nothing, and unblocked by 012's own
blocked state.**

```
S-01 ──→ S-06 (+ GC + map bounds)      S-01 first: S-06's rotation can land in its swallowed-throw path
S-02 ─┬─ S-03                          one pass through the route table
      └─ S-04 ──→ S-05                 S-04 makes S-02's gate honest; S-05 needs the honest predicate
```

**Lane 2 — test infrastructure. Runs today. Gates part of Lane 3.**

`S-11` first, always.

**Lane 3 — client. Joins the existing 011 → 012 → 013 queue.**

`S-07` before 012, for the non-obvious reason that 012's rewrite is scripted and deterministic: a
content change landing *before* the move rides through as a plain rename, whereas landing *during*
012 collides with a 148-file batch. `S-08`, `S-09` and `S-10` after 012 — all three need an 011
requirement anyway, and all three touch files 012 renames, so doing them on the far side saves a
rebase you never pay for.

**Cheap now, expensive later.** Only S-11's ESLint gap genuinely compounds: 89 unlinted `$effect`
blocks today, and every new `.svelte` file adds to a population no rule will ever reach. Everything
else is order-independent, which is the honest answer and more useful than an invented dependency
chain.

**Bundle these or pay the review twice:** S-01 with the framing narrow (splitting them makes S-01
unverifiable); S-02 with S-03 (one pass through a 1,500-line route table); S-04 with S-07 (one
connection-lifecycle design across two packages); S-06 with GC and the map bounds (one retention
decision); S-08 with S-10 (same file, same fences, same gates); S-09's two halves (one 011 amendment,
one sign-off).

---

## 5. ALREADY SATISFIED — VERIFIED AGAINST THIS CODEBASE

The prior pass listed four. Three hold, one is overstated, and it missed seven.

**Confirmed:** near-bottom autoscroll with a jump-to-bottom affordance (`TranscriptList.svelte:94`
is the 96px threshold; `:151-169` gates on `atLiveEdge`; `:260-283` reveals the control with an
unread badge at `:279-281` and a count-bearing `aria-label` at `:265-267`; the pill is 44px at
`:310-327` and drops its glass under `prefers-contrast: more` at `:353-359`); a token vocabulary
separating theme-dependent from invariant values, enforced by a machine gate rather than OGAM's
checklist; loopback-only exposure (`server.ts:77`, `:324`, Funnel disabled at
`deploy/setup-tailscale-serve.sh:42-43`).

**Overstated:** "send/stop/voice as one exclusive precedence state". The chain is real
(`SessionComposer.svelte:702-746`); the voice control does not exist (`:9-11`).

**Missed by the prior pass:**

1. **R-01's server contract in full** — §1. The sweep's largest item, rated effort L.
2. **R-01's client contract** — `state.ts:310-370`, plus a store that refuses to persist a hole
   (`relay-store.ts:262-268`).
3. **A fail-closed mutation gate riding the same flag**, which no source repo proposed:
   `awaitingSnapshot` reaches `Chat.svelte:171,443`, `SessionComposer.svelte:201,655` (placeholder
   "Syncing with the relay…" at `:276`) and `submitSlashDraft.ts:88`. While recovering from a gap
   every mutation is refused, and the user is told why (`Chat.svelte:417-421`).
4. **R-02, structurally.** The sync socket accepts exactly one frame and closes on the second
   (`server.ts:275-296`); all real control is HTTP, where every route terminates in `sendJson`; the
   host direction is correlated with the id registered before the write and rejected on channel
   close (`demux.ts:44-55`, `:87-93`). The peer cannot hang.
5. **R-07 in full, enforced rather than conventional.** `service-worker.js:160-169` refuses any push
   payload that is not exactly two keys and regex-constrains `lookupId` before it becomes a URL; the
   body is a fixed string (`:132`); `push-service.ts:222-231` drops any attention publish at or below
   the latest generation; `:194-202` resolves only if the epoch still matches. Permission is
   requested behind an explicit opt-in (`attention.ts:84`), not on first load.
6. **R-08's byte half, far exceeding the recommendation** — a published `MediaPolicyDto` with source,
   decoded-megapixel, edge-pixel, normalized-byte, per-window and quarantine caps
   (`types.ts:61-107`); `attachment-normalizer.ts:36-113` sniffs before decode and zeroes every
   discarded buffer; symlink rejection and negative controls for byte-flips and polyglots ship and
   are tested.
7. **R-11's event half**, which Round 1 missed and Round 2 established: `demux.ts:77-83` +
   `guards.ts:189-212` pin the upstream event vocabulary at a closed 22-name allowlist.
8. **OGAM A6 as an active sanitizer** — `cache.ts:76-103` strips byte-bearing keys from anything
   persisted; `state.ts:280` refuses to let a cached hydrate overwrite relay-sourced state.
9. **R-12** — 74 story files against real `demo.ts` fixtures plus `story-render.svelte.test.ts`,
   which covers the decorator pipeline CDP smoke cannot see. Planning states are harnessed;
   approvals are not, because `Review.svelte` has no story or test.

---

## 6. RULED OUT

Beyond the negative knowledge the research already recorded, this council rules out the following.

| Ruled out | Because |
|---|---|
| **A runtime contiguity branch in the client reducer** (R-01 residue) | `relay-store.ts:262-268` throws on any non-contiguous append, so a hole cannot be persisted. One producer, loopback, no proxy, no retry middlebox. Keep it as a test (S-11), not a runtime branch. |
| **Re-taxonomising the `pi.*` envelope lane** (R-11 core) | The premise is false. `demux.ts:77-83` admits an event only if `isPiRpcEvent` passes, and `guards.ts:189-212` is a closed 22-name set — an upstream rename never becomes an envelope, it routes to `onProtocolError`. The client's total upstream-shape parsing is **one line** (`useSyncSocket.svelte.ts:70`), and two of its three matched fields are first-party (`extensions/pi-remote-plan/src/plan-artifact.ts:133-134`, `plan-status.ts:9`). The proposed fix is a wire change plus a `kind`-column schema migration. **Registering `supervisor.onError` (S-01) buys the same protection in three lines** by turning a designed-but-unheard error path into a stderr line. |
| **A relay-side approval risk classifier** (R-05 core) | The real defect is a mis-tap, not a classification gap — see S-09. A classifier adds a field that three packages must keep in sync forever, plus a heuristic that will sometimes be wrong; and a wrong risk label is worse than none, because a confirmation you learn to tap through no longer confirms anything. The blast radius it guards is three edits, by the agent the user just asked to edit, reversible by `git checkout`. |
| **An epoch check on the live broadcast path** (R-01/R-02 residue) | Cannot fire. `index.ts:68` is the only mint site for the sync epoch, so it never rotates live; and the client already double-guards — `state.ts:331-338` resets to `EMPTY_TRANSCRIPT` on epoch mismatch and `:467` filters by epoch a second time. Re-open only if S-06 ships. |
| **A custom `$effect`-dispatch lint rule** (R-04 mechanics) | The toolchain does not exist: `eslint.config.js` has no `**/*.svelte` block and neither `eslint-plugin-svelte` nor `svelte-eslint-parser` is installed. "Add a rule" is really: install a parser, stand up a lint lane, triage a first pass over 148 files, clear the 27 pre-existing errors (`goal.md:164`), author a custom rule no upstream plugin expresses, write its rule tests, then keep a tenth gate green forever — on a one-person project, over files 012 is about to rename. **Keep R-04's doctrine**, which is real (19 hand-placed `untrack()` across 11 files, seven self-invalidation incidents), as a paragraph in the `sk-code-mobile-cli` conventions authority — an obligation 012 already carries (`012/spec.md:102-103`). |
| **A hard abort while a draft exists** | `SessionComposer.svelte:250` gates Stop on `!hasText && !hasAttachments`, but `:738` makes the primary disc **Steer**, which `types.ts:204` documents as interrupting. The user can already interrupt while typing. The residual — aborting *without* sending text — costs an 011 requirement and operator sign-off to buy back one keystroke, and the current behaviour is deliberate (`:247-249`). Carried to §8 as a question instead. |
| Relay-side context budgeting and summarization (R-10) | Not this component. §2. The injection-relevant residue already ships: `redaction.ts:76-79` strips control and bidi characters from every string before any DTO. |
| Filename sanitization, UUID prefixing, path quoting, collision avoidance (half of R-08) | No filename exists in the protocol; storage is CSPRNG-named and content-addressed; nothing reaches a shell. §2. |
| Normalizing mobile image-metadata casing (R-08) | Actively counterproductive — `redaction.ts:139` normalizes keys *precisely so* casing variants cannot dodge the forbidden-key set. |
| "Best-effort per attachment" (R-08) | Deliberately inverted, and correctly: `pi-image-bridge.ts:130-150` fails the whole submission, because silent partial delivery of an approval-relevant image set is worse than a clean failure. |
| Per-socket message rate limiting (R-03) | Structurally moot — the sync socket accepts one frame and closes on the second. |
| "Re-read before you send / already handled" (R-07) | No surface: there is no notification action; `notificationclick` only navigates. |
| Re-proposing structured scoped grants (R-05) | Shipped as the accept-edits grant (`approval-service.ts:323-379`): tool-listed, count-limited, TTL-bounded, rejects `'*'`, re-checks per action, and a prior deny of the same digest beats an active grant (`:400`). |
| The wait-state machine (R-13) and any new approval dedupe field | No PTY. And `digest`, `canonicalArguments`, `revision`, `idempotencyKey` and `epoch` are all already on the wire and enforced. |
| The `startsWith`-before-`timingSafeEqual` serve-secret comparison (`server.ts:1985-1988`) | Unreachable here: Serve rewrites the path so no remote peer controls the prefix, and a local attacker who can craft loopback paths already has code execution. Not to be laundered as defence in depth. |
| nodeterm's nine-layer E2EE stack | A checklist for if a relay carrier ever enters scope. It has not. |
| The 300 ms keyboard-settle timer, chunk-safe think-tag parsing, per-part delta throttling | §2. The first would actively regress `useVisualViewportAnchor`. |

---

## 7. SURVIVING DISSENT

**Whether S-07 is worth its test.** The verification lens put the harness at roughly fifteen times the
ten-line fix, because `app-mobile/tests/` has no WebSocket-level test at all. The protocol and
skeptic lenses both judged it the best client-side item, because the fifteen-minute expiry is the
*routine* backgrounded-phone case and is currently met with backoff instead of re-authentication.
**Unresolved: whether to ship the switch with a documented caveat and no test** — which this council
would otherwise refuse. It is the only item where "no ship without a test" is in genuine tension with
proportionality. The operator decides.

**Whether S-02 is security or hygiene.** The security lens ranked it first overall. The skeptic
established that the approval surface is already principal-scoped and revocation-aware
(`approval-service.ts:314-320`, `:504-505`, `:106-107`), so the caller it would block already holds
the user's phone. Both agree it should ship; they disagree on why, and therefore on urgency. This
document sells it as consistency, which is the weaker and more defensible claim.

**Whether S-06 is worth its GC obligation.** Rotating the epoch is correct. But it cannot ship alone
without amplifying the orphaned-partition growth it is partly justified by, and the GC policy is a new
retention decision that will need revisiting. One lens would defer the whole item until a Pi restart
mid-session is actually observed. **Unresolved.**

---

## 8. OPEN QUESTIONS FOR THE OPERATOR

1. **Is the ask-question feature meant to be live?** `AskQuestionService` is constructed **only in its
   own test** (`app-relay/tests/ask-question.test.ts:312`). `app-relay/src/index.ts` never imports or
   wires it, so all three routes return `503 ask_question_unavailable` (`server.ts:510-512`,
   `:527-529`, `:553-555`) — while the client ships the full feature: `AskQuestionCard.svelte` plus
   six sub-components, seven stories, a test, and roughly fifteen protocol types. This is not a
   migration regression; child 003 correctly ported the client (`003-feature-dirs/spec.md:61`) and the
   relay wiring never existed. Deliberately dark, or an integration gap?

2. **Should aborting a turn be possible without discarding the draft?** §6. Today the options are
   Steer (interrupt and send your text), Later (queue it), or clear the draft to reveal Stop.

3. **Ship S-07 without its test, or build the harness?** §7. This is the one place the council's own
   rule and proportionality genuinely conflict.

4. **Do the two miscalibrated runtime strings get reworded?** `foreground-required` and
   `host-unavailable` (`runtime-issues.ts:16,18`) read as terminal but are recoverable. Rewording
   needs an 011 requirement; the type-level half of S-09 does not.

5. **Should 011 absorb S-08, S-09 and S-10, or split?** `011/spec.md:135` already carries this as its
   own open question, and this synthesis would add three or four unrelated requirements to a packet
   holding one.

6. **Is `retentionEvents = 1000` (`relay-store.ts:60`) the right window?** A phone offline through a
   long session exceeds it and gets a full resync — correct, but total. Nothing is wrong; the number
   was simply never revisited against real session lengths.

---

## 9. WHAT COULD NOT BE DETERMINED

- Whether a Pi child restart mid-session has actually occurred in practice. The S-06 mechanism is
  confirmed; the incidence is unknown, and it is the main input to that item's priority.
- Whether the `MAX_CONNECTIONS_PER_DEVICE = 4` zombie lockout has been hit. Mechanism confirmed,
  incidence unknown.
- Whether `validate.sh` is on disk. `find . -name validate.sh` returns nothing; **inferred** to ship
  with the spec-kit skill runtime outside this tree. The `@ds guardrail:` fence count is likewise not
  a program — it exists as a measured number in prose (`007-verify-and-cutover/tasks.md:253`).
- Real-device behaviour for S-08 and S-10. jsdom cannot reproduce iOS Safari momentum scrolling, and
  the CDP scripts drive headless Chrome at 390px, not a real compositor. Both need the operator
  verification step the P0/P1 a11y work received — the nine gates are structurally blind to this
  class, as `007-verify-and-cutover/a11y-parity-findings.md:11` already records.
