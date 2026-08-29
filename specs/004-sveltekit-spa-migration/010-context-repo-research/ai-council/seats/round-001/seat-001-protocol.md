---
round: 1
seat: seat-001
executor: native-explore
lens: analytical
status: ok
timestamp: "2026-08-23T09:50:00Z"
simulated: false
---

# Seat 001 — Protocol / distributed systems

## Headline

The relay is **gap-free by construction**, and it gets there by a stronger mechanism than the sweep
proposes. R-01's design (per-attach frame queue + boundary + ready-sequence handshake) is a
workaround for not having a durable log. This relay has one.

## Verdicts

| Claim | Verdict | Decisive evidence |
|---|---|---|
| R-01 reconnect replaces, never continues | satisfied (server) | `sync.ts:78` registers the subscription **before** `:79` builds the plan; `:99-101` queues live envelopes while initializing; `:85-90` drains `filter(seq > barrier).sort(by seq)`; `:38-48` persists before broadcasting |
| Snapshot boundary atomic | satisfied | `relay-store.ts:324` reads `stream_state` once; `:341-352` uses the same `state` for `coversThrough` and the bounded read; no `await` between |
| Durable per-session log | satisfied | file-backed better-sqlite3 + WAL (`relay-store.ts:172-177`), production path `index.ts:42` |
| Gap forces resync | satisfied, server-enforced | `relay-store.ts:328-337`, `:365-378` emit gap **and** a fresh snapshot as one atomic plan |
| R-02 answer every control request | satisfied, structurally | the sync socket accepts exactly one frame (`server.ts:275-296`); all real control is HTTP, where every route terminates in `sendJson`. Host direction correlated at `demux.ts:44-55`, `:87-93` |
| R-03 close-code classes | partial (server half) | server emits `4001` transient-auth, `4003` permanent, `1008` overloaded, `1006` drop. Something to key on exists |
| R-11 no command templates | satisfied, stronger than asked | `redaction.ts:647-670` allowlist object construction; `guards.ts:2578-2603` fails on an extra key |
| R-11 upstream skew absorbed | **absent for one lane** | `index.ts:284` `kind: \`pi.${event.type}\``, `:290` raw payload; client parses upstream shape at `useSyncSocket.svelte.ts:70-75` |
| R-11 user prompt double-render | not present, guarded | `transcript-projector.ts:608` drops non-assistant roles; relay authors the user block itself |
| R-13 wait-state machine | does-not-transfer | 22 structured lifecycle events (`types.ts:260-282`), strict LF-JSONL framing; no PTY, no ANSI, no tail regex anywhere |
| R-13 dedupe residue | satisfied | `digest`+`canonicalArguments`+`revision`+`idempotencyKey`+`epoch` all on the wire and enforced (`approval-service.ts:128-133`, `:138-159`, `:513`) |

## New defects found

- **N1 — projection sequence desync, silent.** `index.ts:295-298` caches an incrementing counter while
  `relay-store.ts:220-223` drops control-plane blocks without consuming a sequence; the next block
  throws at `:264-268`; the throw is mislabelled by `framing.ts:71-76` and swallowed because
  `index.ts` never registers `supervisor.onError`. A plan artifact silently never renders.
- **N2 — Pi child restart does not rotate the sync epoch.** `index.ts:68` one epoch per process;
  `:148-154` invalidates catalog/todos/attachments but not the stream, contradicting its own comment
  at `:146-147`. Sub-effect: retention DELETE is epoch-scoped (`relay-store.ts:294-300`), so
  ended-epoch rows are never pruned.
- **N3 — no `sync.gap` on live epoch rotation.** `sync.ts:94-105` has no epoch check.
- **N4 — `1008` overloaded** across `server.ts:277` and `:283`.
- **Ask-question is dark in production.** `AskQuestionService` is never constructed in `index.ts`;
  all three routes return `503` (`server.ts:511, 528, 554`).

## Hypothesis raised and later REFUTED by the adjudicator

The seat flagged, as INFERRED, a client loss window: `useSyncSocket.svelte.ts:217` advances `cursor`
on receipt while application happens in a later `requestAnimationFrame`. See
`deliberation.md` — the adjudicator traced it and it does not reproduce.
