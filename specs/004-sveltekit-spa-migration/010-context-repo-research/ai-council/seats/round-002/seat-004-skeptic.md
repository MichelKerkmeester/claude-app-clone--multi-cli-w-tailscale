---
round: 2
seat: seat-004
executor: native-explore
lens: pragmatic
status: ok
timestamp: "2026-08-23T10:25:00Z"
simulated: false
---

# Seat 004 — Blast-radius skeptic

Mandate: argue the Round 1 list **down**. Result: six items killed, four downgraded, one upgraded.

## Corrections to the record

1. **The `pi.*` premise is false.** `demux.ts:77-83` calls `onEvent` only when `isPiRpcEvent` passes;
   that guard tests `type` against a closed 22-name set (`guards.ts:189-212`). An unrecognised
   upstream name routes to `onProtocolError` and never becomes an envelope. The client's total
   upstream-shape parsing is one line (`useSyncSocket.svelte.ts:70`), and two of its three matched
   fields are first-party (`extensions/pi-remote-plan/src/plan-artifact.ts:133-134`).
2. **The live epoch-gap guard cannot fire.** `index.ts:68` is the only mint site for the sync epoch
   (`command-service.ts:110` mints a different value); it never rotates live. The client
   double-guards anyway (`state.ts:331-338`, `:467`).
3. **`Retry-After` is better than claimed.** The consumer is already shipped:
   `relay.ts:256-264` → `:1714` → `RelayRequestError.retryAfterMs` → `useRuntime.svelte.ts:112-119`.
   Nine server sites send a bare 429 into machinery built to honour a header they never send.

## Kill list

| Killed | Because |
|---|---|
| Client runtime contiguity branch | `relay-store.ts:262-268` throws on non-contiguous append; a hole cannot be persisted. Keep as a test. |
| Live epoch-gap broadcast check | Unreachable branch (correction 2). Re-open only if the epoch rotation ships. |
| Hard abort while a draft exists | `SessionComposer.svelte:738` makes the primary **Steer**, which `types.ts:204` documents as interrupting. Costs an 011 requirement to buy back one keystroke. |
| Custom `$effect` lint rule | `eslint.config.js` has no `**/*.svelte` block; neither `eslint-plugin-svelte` nor `svelte-eslint-parser` is installed. ESLint parses zero Svelte files. Keep the doctrine, not the rule. |
| Approval risk classifier as scoped | A wrong label is worse than none. The real defect is a mis-tap: `Review.svelte:164` and `:186` are two plain Buttons, same row, same size. |
| `pi.*` re-taxonomy as scoped | Correction 1, plus a `kind`-column schema migration. `supervisor.onError` buys the same protection in three lines. |

## Downgrades

- **Foreground gate** — narrow to the two *mutations*; `/api/approvals` is a read (`relay.ts:1053`)
  and gating it would 403 a phone whose socket has not re-opened. Sell as consistency: the surface is
  already principal-scoped (`approval-service.ts:314-320`, `:504-505`, `:106-107`).
- **Epoch rotation** — the comment is not lying (two epochs, one comment); growth is linear not
  unbounded; and fixing it *worsens* growth without cross-epoch GC (zero hits for
  `DELETE FROM stream_epochs` or `VACUUM`). Must bundle GC + the unbounded maps.
- **Heartbeat** — ship for connection-slot exhaustion (`MAX_CONNECTIONS_PER_DEVICE = 4`,
  `server.ts:82`, enforced `:243`), not for authority; the stale authority is the user's own phone.
- **Disclosure hoist** — fence-crossing (`TranscriptList.svelte:122`, `:174-175`, `:202`), not a
  five-line change.
- **Stall cue** — rendered change under the fence at `:174-175`; approve only if the disclosure item
  is approved, so it rides that fence review.

## Survives cleanly

**The projection sequence desync is the strongest item on the list**, and the trigger is first-party:
`transcript-projector.ts:379-392` emits the plan block and `:399-402` appends artifact blocks after it
in the same batch; `redaction.ts:595-608` drops the plan block exactly when the extension sends no
`title`/`message`; the producer is `extensions/pi-remote-plan/src/plan-artifact.ts:133-134`. Silent
because `index.ts` registers no `supervisor.onError` and `framing.ts:70-76` wraps `onRecord` inside
the `JSON.parse` try.

## Ship first

**`supervisor.onError` + the counter fix, one commit, ~4 lines.** You cannot verify the counter fix
without the listener — the failure has no output today. It beats the foreground gate because that
prevents nothing that can happen here, while this is live silent data loss on an owned path; and the
listener retires most of the `pi.*` rationale for free.

## 012 split

Seven of the eleven survivors are relay-side and `012/spec.md:106` excludes `app-relay/`,
`packages/` and `extensions/`. **012 is at 0% awaiting a design decision; do not let its block become
this list's block.** Client items: close-code classification before 012 (its specifier rewrite is
scripted, so a prior content change rides through as a plain move); disclosure and the 011 items
after.
