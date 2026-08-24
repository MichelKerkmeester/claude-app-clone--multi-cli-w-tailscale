# Iteration 10: CLOSE-OUT — Primary-Citation Verification of relay-socket.ts / relay-client.ts

## Focus

Final cap iteration (10 of 10, config `maxIterations: 10`). Direct-read `src/main/remote/relay-socket.ts` (750 lines) and `src/main/remote/relay-client.ts` (170 lines) under `specs/context/nodeterm-main` to upgrade the four enforcement points iteration 9 cited via `docs/ios-protocol-migration.md`'s byte-for-byte transcriptions (its §2 citing relay-socket.ts 250–265, 284–289, 318–347, handleControl 350–398) to primary `file:line` evidence. Verification targets from the dispatch: (1) seq anti-replay `recvSeq` init −1 with `drop <=`; (2) role-byte-must-equal-peer; (3) handshake-frozen-after-ready; (4) frame processing exactly once; (5) heartbeat/reap constants. Findings emitted ONLY where direct reading adds or corrects evidence.

**Saturation-record override (documented):** strategy §9 carries a BLOCKED entry "relay-client.ts / relay-socket.ts direct reads **this iteration**" — scoped by its own wording to iteration 9's 12-call budget. It is invalidated for iteration 10 by two explicit directives: the iteration-9 record itself proposed this exact closure in its Next Focus ("closing this iteration's missing-dependency note"), and the dispatch prompt pack names it as THE focus. Proceeded under the constraint's "unless new evidence explicitly invalidates the saturation record" clause.

## Actions Taken

1. Read state (config, state log, strategy) and verified the boundary: 9 prior iteration records (5 = dispatch error), `iteration-010.md` and `deltas/iter-010.jsonl` absent (write-once safe), 12-call budget confirmed.
2. Full direct read of `specs/context/nodeterm-main/src/main/remote/relay-socket.ts` (750 lines) — first primary read of this file in the packet.
3. Full direct read of `specs/context/nodeterm-main/src/main/remote/relay-client.ts` (170 lines) — first primary read of this file in the packet.
4. Narrow reread of `research/iterations/iteration-009.md` to compare its doc-transcribed claims (F-03/F-04/F-05/F-06) and anchors against the primary source, per the read-budget freshness rule.
5. Diffed every transcribed enforcement point against the actual code; emitted findings only for upgrades (doc citation → primary citation) and additions (evidence the doc/packet never recorded).

## Findings

### F-01 — Sealed `[role][seq][tag]` header construction VERIFIED at primary lines (upgrades iteration-9 F-03)

`withHeader` builds the authenticated plaintext exactly as the doc transcribed: byte 0 = sender role (`out[0] = OUR_ROLE`), bytes 1–8 = seq as two little-endian uint32 halves written high-then-low (`setUint32(1, Math.floor(seq / 0x100000000), true)` then `setUint32(5, seq >>> 0, true)`), payload appended at offset `HEADER_BYTES` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:256-265]. `SEQ_BYTES = 8`, `HEADER_BYTES = 1 + SEQ_BYTES = 9` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:254-255]. Role constants confirmed: `OUR_ROLE = host?1:2`, `PEER_ROLE = host?2:1` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:176-177]; plaintext tags `TAG_RPC=0x01, TAG_FRAME=0x02, TAG_TUNNEL_TEXT=0x03, TAG_TUNNEL_BIN=0x04` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:125-132]. Zero discrepancy with the iteration-9 doc transcription. **Status: partially new** (provenance upgrade, no new semantics).

### F-02 — Receiver check chain VERIFIED: decrypt → length ≥ 9 → role == PEER_ROLE → seq strictly increasing → strip + dispatch (upgrades iteration-9 F-04/F-05)

`handleMessage` enforces the exact documented order: box decrypts under `sessionKey` and is ≥ `HEADER_BYTES` or dropped [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:322-325]; the reflection check rejects a box tagged with our OWN role ("Reject a box tagged with our OWN role (a reflected message)") via `if (sealed[0] !== PEER_ROLE) return` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:326-329]; seq is decoded little-endian via `DataView` (`getUint32(1,true) * 0x100000000 + getUint32(5,true)`) and dropped unless strictly greater: `if (seq <= recvSeq) return` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:330-336]; only then `recvSeq = seq` and the header is stripped (`subarray(HEADER_BYTES)`) [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:337-338]. Counter initialization confirmed at primary lines: `sendSeq = 0`, `recvSeq = -1` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:193-194], with the attack rationale in the code's own comment (relay/on-path attacker cannot replay a captured box such as an OP.Input keystroke frame or a pty.kill RPC, nor reorder traffic) [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:188-192]. The per-(re)connection reset claim is confirmed and sharpened: both counters reset inside `openConnection` (`sendSeq = 0; recvSeq = -1` at [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:217-218]) in the SAME function that nulls `baseKey`/`sessionKey` and mints a fresh nonce ([SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:212-215]) — the seq-reset and fresh-key paths are structurally co-located, so they cannot drift apart across reconnects, exactly the composition property iteration-9 F-05 recommended adopting. Zero discrepancy. **Status: partially new** (provenance upgrade + one sharpening detail).

### F-03 — Handshake-frozen-after-ready VERIFIED: late control frames dropped without re-key or close (upgrades iteration-9 F-06)

`handleControl` opens with the SECURITY block stating the re-key attack verbatim: re-processing a hello/ready after the session is live would let a relay MITM re-derive baseKey/sessionKey, overwrite `peerPubB64`, and forge the peer's encrypted `trust:confirm` under the swapped key, degrading mutual approval to one-way [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:350-362]. The freeze is a single guard placed BEFORE any parsing or state mutation: `if (readyFired) { return }` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:363-365] — drop without re-keying AND without closing (the comment explains closing would hand a MITM a trivial teardown of an established session while adding no protection, since the relay already controls the transport). `readyFired` latches once in `fireReadyOnce` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:291-299]. Zero discrepancy with the doc transcription of handleControl 350–398. **Status: partially new** (provenance upgrade).

### F-04 — Exactly-once processing mechanics VERIFIED with new primary detail (not recorded in iteration 9)

Four mechanisms guarantee each decrypted box is processed at most once, none of which iteration 9 recorded: (1) `recvSeq` advances BEFORE dispatch ([SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:337] precedes the routing at [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:340-347]), so even a same-tick duplicate replay hits `seq <= recvSeq` regardless of which handler ran; (2) the state machine routes each decrypted plaintext to exactly ONE handler — `handshaking` → `handleHandshakeEncrypted` then return, non-ready states drop, `ready` → `handlePeerPlaintext` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:340-347]; (3) every tag/kind branch in `handlePeerPlaintext` returns after handling (tunnel-text/binary/frame/RPC req/notify/res/keepalive are mutually exclusive single-dispatch paths) [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:427-483], and a response resolves its waiter exactly once because `pending.delete(env.id)` runs before resolve/reject [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:470-482]; (4) the production ws wrapper fires its close callback EXACTLY ONCE across either a close OR an error event via a `fired` latch — treating a ws `error` (504 upgrade timeout, TLS/DNS failure) as a close so Node never re-throws it as an uncaught exception [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:691-705]. **Status: fully new.**

### F-05 — relay-client.ts client-half obligations now primary-cited (iteration 9 held only the host-side pin via doc)

Obligation (a) at primary lines: the ONLY confirm the client ever sends rides the sealed channel — the gate's `sendConfirm` closure calls `socket.sendTunnelText(json)` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:137-140], and a plaintext frame the relay injects dies in relay-socket's `handleControl`, never reaching the gate [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:12-15]. Obligation (b) at primary lines: `sessionPeerKey` is pinned from the offer's `hostKeyB64` (which IS the socket's peer key for a client — it seeded the ECDH secret) [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:130-132]; `peerKeyIntact()` is the second, independent check that cuts the session on any divergence [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:79-84, 102-110], enforced BOTH before approval advances (`open` gates on it) [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:113-118] AND before every tunnel frame is forwarded to the gate or renderer [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:148-158]; the trust gate is constructed exactly once (`if (gate) return`) with `sessionId` = one state per pairing attempt [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:131-135]; trust frames are consumed by the gate and never forwarded to the renderer's RPC client [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:159-162]. Also captured: the synchronous-handshake gotcha — over an in-process transport `onReady` completes DURING `connectRelay`, so the deferred closures guard with `socket?.` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-client.ts:71-74]. **Status: fully new.**

### F-06 — Relay-side timing constants anchored; reconnect backoff table is DEAD CODE (nuance/correction)

Primary anchors: `RPC_TIMEOUT_MS = 30_000` and `KEEPALIVE_INTERVAL_MS = 25_000` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:134-135]; the keepalive is an ENCRYPTED tagged-RPC ping sent every 25 s once ready, timer `unref`'d so it never holds the event loop [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:485-492]; RPC pending timers are likewise `unref`'d [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:557-562]. Scope honesty: the WS heartbeat/reap constants are NOT here — they live server-side in `src/server/ws.ts` and were already primary-cited in iteration 4; relay-socket.ts carries only this relay-side keepalive analog. Correction-grade nuance: `RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 8000, 15_000]` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:136] feeds `scheduleReconnect` [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:524-535], which has NO call site — `handleClose` explicitly delegates reconnection to the CALLER (same-token redial would reuse a token the relay rejects after its short TTL and would fight the standing host's fresh-token reconnect) [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-socket.ts:501-523, tombstone comment at 522-523]. Any future reader must not cite the backoff table as a live auto-reconnect path. **Status: fully new.**

## Questions Answered

None newly answered — all eight key questions were already resolved (KQ1/3/4/5/6/7/8 in iterations 1–8; KQ2 in iteration 9). This iteration COMPLETED KQ2's evidence base: the packet's last missing-dependency note (iteration-9 Edge Cases: "the two enforcement points in F-03/F-04/F-05/F-06 cite the doc rather than primary code") is CLOSED. Every doc-transcribed claim was confirmed against the source with ZERO discrepancies; the citation provenance for the sealed header, receiver checks, handshake freeze, and relay-side timing constants is now primary `file:line`.

## Questions Remaining

- None — all eight key questions answered.

## Next Focus

None — the loop is at its 10-of-10 cap and every key question is answered with primary-source coverage. Recommended handoff to the workflow: (a) reducer/synthesis assembles the cross-KQ adoption-priority picture for the Pi Remote PWA (per iteration-9 Next Focus item b); (b) reducer may promote the iteration-9 BLOCKED entry "relay-client.ts / relay-socket.ts direct reads" to fully resolved/saturated — the deferral is now discharged and the direction should not be re-opened; (c) no further leaf research iterations are warranted on this charter.

## Ruled Out

- Re-verifying `src/server/ws.ts` heartbeat/reap constants: already primary-cited in iteration 4; relay-socket.ts carries only the relay-side analog (`KEEPALIVE_INTERVAL_MS = 25_000` encrypted keepalive), so a ws.ts reread would add nothing this iteration.
- Treating `RECONNECT_DELAYS_MS`/`scheduleReconnect` as a live auto-reconnect mechanism: defined but never invoked; reconnection is caller-owned via fresh-token mint (see F-06).

## Dead Ends

None. Both direct reads succeeded in full; no verification target was unreachable and no claim required correction (zero discrepancies found).

## Edge Cases

- **Missing dependency (RESOLVED):** iteration 9's recorded missing dependency — relay-socket.ts / relay-client.ts unread, claims cited via doc transcription — is discharged this iteration. Residual uncertainty: none material; doc and source agree on every checked point.
- **Contradictory evidence:** none. The protocol doc's transcriptions match the primary source byte-for-byte on all five verification targets (header layout, role values, seq semantics, freeze guard, constants).
- **Ambiguous input:** none material. "Heartbeat/reap constants" resolved to the relay-side keepalive + RPC timeout in relay-socket.ts, with ws.ts explicitly out of scope (already primary-cited, iteration 4).
- **Partial success:** none; all research reads succeeded within budget (8 of 12 calls used through research, 12 total with artifacts).
- **Progressive synthesis note:** config has `progressiveSynthesis: true`, but the dispatch prompt pack's ALLOWED WRITE PATHS omit `research/research.md`. Per the pack's scope lock (which governs this leaf), `research.md` was NOT written; synthesis ownership stays with the workflow. Same decision as iteration 9.

## SCOPE VIOLATIONS

None. All writes stayed within the three allowed paths; both researched files were read-only; no reducer-owned file (strategy, registry, dashboard) was edited.

## Sources Consulted

- specs/context/nodeterm-main/src/main/remote/relay-socket.ts:125-136, 176-177, 188-199, 212-218, 250-265, 291-299, 301-348, 350-398, 427-483, 485-492, 501-535, 557-562, 691-705
- specs/context/nodeterm-main/src/main/remote/relay-client.ts:9-28, 46-68, 71-84, 86-110, 113-118, 120-167
- specs/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/research/iterations/iteration-009.md (claim-comparison baseline)
- specs/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/research/deep-research-config.json, deep-research-state.jsonl, deep-research-strategy.md (state)

## Assessment

- New information ratio: 0.75 (of 6 findings: 3 fully new — F-04, F-05, F-06; 3 partially new provenance upgrades — F-01, F-02, F-03; ratio = (3 + 0.5×3)/6)
- Questions addressed: KQ2 (evidence-base completion; no new question opened or closed)
- Questions answered: none new (all 8 previously resolved)

## Reflection

- What worked and why: the narrowest-reread discipline — reading only the two named source files plus the iteration-9 narrative (4 research calls) gave complete comparison coverage, because the doc-transcribed claims were already precisely anchored in the packet, so the direct reads only had to confirm or correct against known line ranges. Reading both files in FULL (not just the cited ranges) is what surfaced the two genuinely new evidence clusters (exactly-once mechanics, dead-code reconnect table) that a range-only read would have missed.
- What did not work and why: nothing failed. The only friction was budget arithmetic at the hard cap of 12 calls, resolved by batching the boundary check with the source reads.
- What I would do differently: nothing transferable — this was the designed close-out; the packet's citation-provenance debt is now zero.
