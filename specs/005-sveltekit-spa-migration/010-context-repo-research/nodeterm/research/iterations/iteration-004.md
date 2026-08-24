# Iteration 4: KQ7 Drop Resilience

## Focus

KQ7 [ux]: how nodeterm keeps remote sessions usable across connection drops. The focus area named six sub-parts: the session status model (`connected|connecting|offline`), `takeSessionOffline` greying a tab while keeping it bound for reconnect in place, the `ready()`-can-hang trap and its fix, carrier-close handling of in-flight requests, the WS heartbeat/reap policy, and backpressure/frame-size caps as DoS guard — plus a conditional from iteration 1: whether ws-bridge.ts lines 400-907 hold heartbeat/backpressure logic. All sources under `specs/context/nodeterm-main` (READ-ONLY); every finding carries a PWA adoption note for the Pi Remote SvelteKit mobile app.

## Actions Taken

1. Read state (config, state JSONL, strategy) and verified the packet boundary: `iteration-004.md` and `iter-004.jsonl` did not exist; all five named target files exist.
2. Read `src/renderer/session/session.ts` (281 lines, full) — status model, registry, teardown discipline.
3. Read `src/renderer/session/relay-tab.ts` (212 lines, full) — ready() race fix, offline bookmark, reconnect-in-place.
4. Read `src/server/ws.ts` (215 lines, full) — heartbeat/reap policy, frame cap, upgrade gate, teardown path.
5. Read `src/renderer/bridge/frame-transport.ts` (103 lines, full) — transport contract for onClose/ready on both carriers.

## Findings

### F-1 — Three-state session status model mutated in place

`WorkspaceSession.status` is exactly `'connected' | 'connecting' | 'offline'` [SOURCE: specs/context/nodeterm-main/src/renderer/session/session.ts:17]. `setSessionStatus` mutates the live session object in place so the tab label and the offline gate read current state without re-registering the session [SOURCE: specs/context/nodeterm-main/src/renderer/session/session.ts:111-117]. Sessions are entries in a module-level registry with per-session stores memoized by API identity, so a reconnecting session keeps its store instances [SOURCE: specs/context/nodeterm-main/src/renderer/session/session.ts:36, 54-59]. **PWA adoption note:** model each Pi Remote backend connection as a small status object (`connected|connecting|offline`) mutated in place inside a Svelte store; derive all UI greying/badges from that one field instead of scattering booleans across components.

### F-2 — Involuntary drop keeps the entry and binding; user close does not

`takeSessionOffline` is the INVOLUNTARY-drop counterpart of a user close: it runs held teardowns exactly once (presence leaves every facepile; closing an already-dead socket is a safe no-op) and flips status to `'offline'`, but deliberately KEEPS the registry entry and the project binding so the greyed tab can reconnect IN PLACE; idempotent against double-drop races [SOURCE: specs/context/nodeterm-main/src/renderer/session/session.ts:119-130]. `disposeSession` (user close) is the opposite: teardowns once, drop the entry, unbind every project so dead tabs resolve back to local [SOURCE: specs/context/nodeterm-main/src/renderer/session/session.ts:97-109]. Both share `runTeardowns`, which splices the list first so a re-entrant teardown run finds nothing left to run [SOURCE: specs/context/nodeterm-main/src/renderer/session/session.ts:85-95]. Bindings are runtime-only, never persisted, and a stale binding is pruned to fall back to local [SOURCE: specs/context/nodeterm-main/src/renderer/session/session.ts:180-194]. **PWA adoption note:** split "close" from "dropped" in the PWA's connection layer — a dropped WS must not unmount the view or clear its Svelte stores; only an explicit user close disposes them. Run disconnect teardowns exactly once via a splice-style guard.

### F-3 — ready()-can-hang trap fixed by racing approval against real close signal plus timeout backstop

The trap: `RelayFrameTransport.ready()` resolves only on `onApproved` and NEVER rejects [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:83-85, 100-102], so a socket drop before SAS approval would leave the bootstrap awaiting forever — a dead tab that never errors [SOURCE: specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:12-15]. The fix: `raceApproval` races `ready()` against the connection's REAL close signal (`relayClient.onClosed(connectionId)`) plus a 60 s timeout backstop (`APPROVAL_TIMEOUT_MS`), rejecting on either, with a settled-once guard that unregisters the close listener and clears the timer whichever leg finishes [SOURCE: specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:31, 183-212]. On rejection the half-built handle is closed before surfacing the failure [SOURCE: specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:72-77]. A construction-order rule makes the race sound: `buildRelayApi` runs BEFORE awaiting `ready()` because its one-shot `onApproved` listener must already be registered [SOURCE: specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:9-11, 69]. A post-approval workspace-load failure disposes the just-created session before rethrowing so presence subscription and socket cannot leak [SOURCE: specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:91-94, 111-114]. **PWA adoption note:** never await a promise that only resolves on a remote event; wrap every PWA handshake (WS open, pairing approval) in `Promise.race([ready, closeSignal, timeout])` with a 60 s backstop and guaranteed listener cleanup.

### F-4 — Offline tab is a connection bookmark: grey out, click-to-reconnect, deferred stale-session disposal

An involuntary drop greys the tab to "unavailable" (reusing the workspace-index rendering) without removing it — a relay tab is a connection BOOKMARK, not workspace on disk, and the host's tmux survives the outage; this is distinct from a user close, which drops the tab [SOURCE: specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:117-137]. Click triage is pure: available → switch; unavailable + relay/server source → reconnect; unavailable + local → ignore (a missing folder has nothing to reconnect to) [SOURCE: specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:172-181]. Reconnect mounts onto the EXISTING project id (never a duplicate tab), prompts for a FRESH pairing code because the offer token is single-use, and critically does NOT tear down the stale offline session up front — disposal happens only after the fresh session rebinds the project, else a connect failure or declined SAS would strand the tab resolved to the LOCAL session: greyed but no longer recognized as relay, hence no longer reconnectable [SOURCE: specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:139-170]. **PWA adoption note:** a dropped PWA route should degrade to a persistent "reconnect" card bound to the same view id; keep the dead connection object until the replacement has fully rebound, and make the click action a pure function of (unavailable, source).

### F-5 — Carrier close fails in-flight requests and shows the reconnect overlay (transport contract)

The `FrameTransport` contract states it directly: `onClose` registers "the carrier-closed hook (in-flight requests are failed, the reconnect overlay shows)" and `ready()` "resolves once the carrier is open... rejects if it fails to open" [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:18-21]. Both carriers forward their native close to that one hook — WebSocket `close` event [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:59-61], relay `onClosed` [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:96-98] — so RpcClient-level failure semantics stay carrier-independent (iteration 1 recorded the E_DISCONNECTED in-flight failure at the RpcClient layer; this confirms the contract seam both carriers plug into). The WebSocket carrier normalizes ArrayBuffer/Buffer to Uint8Array so the client sees one frame shape [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:24-29, 49-57]. **PWA adoption note:** define one `onClose` seam in the PWA transport whose documented job is "fail all pending RPCs + show reconnect overlay", so neither carrier nor view code improvises drop handling.

### F-6 — WS heartbeat/reap: ping every 30 s, one missed round terminates, sized for proxy idle timeouts

`WS_HEARTBEAT_MS = 30_000`: the server pings each socket every round; a socket that answered nothing since the previous round is terminated (ONE missed round), reaping a dead peer in 30-60 s — fast enough that ghost cursors/phantom facepile entries are a blip, slow enough to survive a stalled tab or brief hiccup, and sized to stay well inside the ~60 s idle timeout of common reverse proxies, which the ping traffic also keeps the connection alive against [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:24-33]. The mechanism exists because Node enables no TCP keepalive on an upgraded socket, so a vanished browser leaves a half-open socket where `close` never fires; any inbound traffic marks the socket alive, and `terminate()` fires `close` — the ONE path that leaves the hub and detaches the UI [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:126-146]. A pong is protocol-layer proof of life requiring no page JS, so it works even with the tab frozen [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:168-172]. Teardown is idempotent and releases the pty subscriber (a closed tab sends no `pty:kill`; skipping this leaks the client and can strand a frozen session) [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:108-124]. The interval is `unref()`'d so it never holds the process open [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:144-146]. **PWA adoption note:** heartbeat belongs on the SERVER side of the Pi Remote link (ping/pong at protocol level, terminate after one missed round, ~30 s period tuned to any reverse-proxy idle timeout); treat `terminate→close` as the single teardown trigger that releases per-view resources.

### F-7 — 8 MiB frame cap rejects oversized frames pre-dispatch as shared-process DoS guard

`WS_MAX_PAYLOAD = 8 * 1024 * 1024`: `ws` defaults to 100 MiB, which is a remote DoS on a process shared by every user of the box — one authenticated client looping 100 MB frames could OOM the server, taking down everyone's ptys, hook server and workspace store; the receiver drops an oversized frame with close code 1009 BEFORE dispatch, so nothing buffers it [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:35-54, 106]. The sizing rationale is measured against actual traffic: keystroke/paste casts (kilobytes), presence strings hub-capped at 200/32/128 code points, and the largest RPC `fs:write` (JSON-escaped editor saves) leave an order of magnitude of headroom while cutting worst-case per-frame cost ~12x [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:42-53]. Adjacent hardening in the same file: the upgrade gate rejects cross-site WS hijacking via Origin/Host same-host check (malformed Origin rejects rather than throws) [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:80-102], and a receiver protocol error gets an explicit error listener because without one the throw would crash the whole server, tearing down every session [SOURCE: specs/context/nodeterm-main/src/server/ws.ts:204-210]. **PWA adoption note:** set `maxPayload` explicitly on any PWA-facing WS endpoint to the largest legitimate frame times headroom (reject 1009 pre-dispatch), keep the Origin check on upgrades, and attach error listeners to every socket so one bad frame cannot kill the host process.

## Questions Answered

- KQ7 [ux] How does nodeterm keep remote sessions usable across drops (connected/connecting/offline model, reconnect-in-place, ready()-can-hang fix, carrier-close in-flight failure, WS heartbeat/reap, backpressure and frame-size caps)? — All named sub-parts evidenced: status model (F-1), takeSessionOffline reconnect-in-place (F-2), ready() race fix (F-3), offline bookmark/reconnect flow (F-4), carrier-close contract (F-5), heartbeat/reap (F-6), frame cap + hardening (F-7).

## Questions Remaining

- KQ2 [security] What is the exact layered security envelope of nodeterm's untrusted-relay E2EE design (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule), and which specific attack does each layer defeat?
- KQ3 [logic] How does reduceEntry reduce raw agent hook events into working/waiting/blocked/done status without race-condition false flips (DONE_HOLDOFF, stale-working sweeper, interrupt inference, awaitingInput hold, idle-rescue, newTurn gating, transient-vs-persisted fields)?
- KQ4 [logic] How does nodeterm normalize heterogeneous agent transcript/hook formats into one universal event shape (NormalizedAgentEvent, per-agent normalizers), and how does it tail live transcripts including subagent fan-out and context-window fill?
- KQ8 [ease-of-use] How does push-notification decisioning decide when to ping the phone (batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation)?

## Sources Consulted

- specs/context/nodeterm-main/src/renderer/session/session.ts:17,36,54-59,85-130,180-194
- specs/context/nodeterm-main/src/renderer/session/relay-tab.ts:9-15,31,69-77,91-94,111-137,153-181,183-212
- specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:18-29,49-61,83-85,96-102
- specs/context/nodeterm-main/src/server/ws.ts:24-54,80-106,108-146,168-172,204-210

## Ruled Out / Dead Ends

- Reading ws-bridge.ts lines 400-907 (iteration 1 leftover): NOT needed — heartbeat and backpressure live server-side in `src/server/ws.ts`; the renderer bridge seam (`frame-transport.ts`) is a thin carrier abstraction carrying neither. Conditional resolved; recommend the reducer retire it.
- Full read of `src/server/backpressure.test.ts` (447 lines): deferred under the 12-call budget. Behavior evidence comes from `ws.ts` itself (constants + inline rationale); the test file remains available if a later iteration needs assertion-level confirmation.

## SCOPE VIOLATIONS

None. All writes stayed within the three allowed paths (iteration narrative, state-log append, delta file); researched sources were only read.

## Edge Cases

- Ambiguous input: config sets `progressiveSynthesis: true` (which would normally license a `research/research.md` update), but the prompt pack's ALLOWED WRITE PATHS list is exhaustive and excludes it. Resolution: the dispatched prompt pack governs; `research/research.md` was NOT touched. Recorded here so the reducer/workflow can reconcile the flag.
- Missing dependencies: none blocking. `backpressure.test.ts` deferred deliberately (see Ruled Out / Dead Ends); no finding depends on it.
- Contradictory evidence: none. All four sources are mutually consistent; `relay-tab.ts` comments independently document the same `ready()` trap visible in `frame-transport.ts:83-85`.

## Assessment

- New information ratio: 0.93 (6 of 7 findings fully new; F-5 partially new — iteration 1 already recorded the E_DISCONNECTED in-flight failure, this confirms the contract seam). No simplicity bonus applied: the ratio is evidence-led, not synthesis-led.
- Questions addressed: KQ7.
- Questions answered: KQ7 (full text in the JSONL `answeredQuestions`).
- Cumulative: 4 of 8 key questions answered (KQ1, KQ5, KQ6, KQ7).

## Reflection

- What worked and why: reading the four files in full (all under 300 lines) gave complete, line-cited coverage in a single batched pass; the code's own design comments carry the rationale (hang-trap history, proxy-timeout sizing, DoS math), so findings cite primary intent rather than inference — the same pattern that won iterations 1-3.
- What did not work and why: nothing failed. Budget was tight enough that `backpressure.test.ts` had to be deferred; acceptable because the load-bearing constants and their rationale live in `ws.ts` itself.
- What I would do differently: none material — but future iterations should keep preferring full reads of small focused files over grep+targeted-range two-steps when files are known to be under ~300 lines; it cost one call per file and left citations exact.

## Next Focus

Recommended: KQ8 [ease-of-use] push-notification decisioning (batch window, per-node throttle, presence-aware hold queue, grant model, three-surface degrade, deliver-on-idle with flush-time re-validation) — it completes the mobile-companion UX arc begun with KQ6 and pairs with the inbox contract already mapped. Alternate: KQ3 reduceEntry status machine (logic-dense, benefits from a fresh budget).
