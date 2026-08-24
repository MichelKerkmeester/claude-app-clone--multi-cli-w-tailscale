# Iteration 001: KQ1 [architecture] — FrameTransport/RPC Carrier Abstraction

## Focus

How nodeterm drives one agent core over three carriers (Electron preload IPC, browser WebSocket, E2EE relay tunnel) behind a single `RpcClient`/`FrameTransport` contract. Extracted: the four-method transport interface, JSON-vs-binary frame discrimination, in-flight failure on carrier close, how `buildRelayApi`/ws-bridge rebuild the identical api surface over either carrier, and the request/cast/event/id-correlation RPC envelope. All evidence read from `specs/context/nodeterm-main` (READ-ONLY; nothing modified).

## Actions Taken

1. Read state (config, strategy, state JSONL) and verified packet boundary (state log had 0 iteration records; `iterations/` and `deltas/` empty).
2. Read `src/renderer/bridge/frame-transport.ts`, `ws-bridge.ts`, `relay-api.ts`, `stubs.ts`, and `src/shared/rpc.ts`, `src/shared/ipc.ts`.
3. Extracted the transport contract, frame formats, failure semantics, API-assembly pattern, and envelope shape with file:line citations; composed PWA adoption notes per finding.

## Findings

### F-1 — The carrier seam is a four-method interface with exactly two implementations

`FrameTransport` is four methods: `send(json: string): void` (outbound is ALWAYS a JSON string — binary pty-data is inbound-only), `onMessage(cb: (data: string | Uint8Array) => void)` (the inbound sink), `onClose(cb: () => void)` (carrier-closed hook), and `ready(): Promise<void>` (resolves when the carrier can exchange frames, rejects if it fails to open) [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:13-22]. Two implementations: `WebSocketFrameTransport` (one WS to `/ws`; sets `binaryType='arraybuffer'`; open→resolve / error-before-open→reject; normalizes browser `ArrayBuffer` and test-side `Buffer` to `Uint8Array`; drops anything else as undecodable) [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:31-66] and `RelayFrameTransport` (E2EE relay tunnel addressed by `connectionId` over the preload's `relayClient`; its `ready()` resolves only on `onApproved` — the mutual-SAS-approval gate — which is when the frame pipe goes live) [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:68-103]. `RpcClient` accepts a transport or a back-compat URL string wrapped in the WebSocket transport [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:63-72].

**PWA adoption note:** Adopt this exact seam in the Pi Remote SvelteKit PWA: define `FrameTransport` (send/onMessage/onClose/ready), ship `WebSocketFrameTransport` first, and leave a `ready()` promise as the single connection gate. A future E2EE carrier then slots in without touching the RPC client or any UI code — nodeterm's stated payoff ("same ws-bridge builders power both a browser tab and a remote-desktop tab") [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts:1-5].

### F-2 — Frame discrimination: string = JSON RPC frame, Uint8Array = binary pty-data

The transport hands the client `string | Uint8Array`; `RpcClient.onMessage` routes a string through `parseRpcMessage` (returns null on junk — silently dropped) and a `Uint8Array` through `decodePtyData`, fanning the decoded payload out on the per-session channel `IPC.ptyData(sessionId)` [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:126-138]. The binary wire format is minimal: byte 0 = type tag `0x01`, bytes 1-2 = big-endian sessionId length, then sessionId UTF-8, then payload [SOURCE: specs/context/nodeterm-main/src/shared/rpc.ts:117-141]. Only high-volume pty output uses binary; everything else is JSON text frames [SOURCE: specs/context/nodeterm-main/src/shared/rpc.ts:1-4]. Co-attach events (`pty:size`, `pty:closed`, `pty:recycled`, `pty:resync`) ride ordinary JSON `ev` frames so the decoder stays unchanged [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:257-265].

**PWA adoption note:** This maps 1:1 onto a browser PWA (`binaryType='arraybuffer'` is native). Keep terminal output on tagged binary frames (throughput + cheap sessionId routing) and all control traffic on JSON; one discriminator function at the client entry point keeps the protocol honest.

### F-3 — Carrier close fails every in-flight request BEFORE overlay hooks, with a coded error

In the `RpcClient` constructor, `transport.onClose` calls `failPending()` FIRST, then notifies close hooks (reconnect overlay) — "a response can only arrive over the carrier that carried the request, so once it is gone they are unanswerable" [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:88-93]. `failPending` clears the pending map before rejecting so a reject handler firing a new request cannot see stale ids, and rejects each waiter with `Error('The connection to the server was lost.')` carrying `code: E_DISCONNECTED` [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:106-114]. The rationale is explicit: a promise that never settles blocks ALL downstream cleanup (`setBusy(false)`, `finally`, error banners — a dialog stuck on "Creating…" with its Cancel disabled); every caller that handles rejection handles this correctly the moment rejection actually happens [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:96-105]. `E_DISCONNECTED` is client-synthesized only — no server ever sends it [SOURCE: specs/context/nodeterm-main/src/shared/rpc.ts:16-18].

**PWA adoption note:** This is the single most transferable behavior for a mobile PWA on flaky cellular: guarantee every `await` settles on drop. Reject in-flight promises with a distinguished `E_DISCONNECTED` code so UI can show "connection lost + reconnect" instead of a hung spinner, and fail pending BEFORE showing reconnect UI.

### F-4 — One api surface rebuilt over either carrier by reusing the same builders

`buildRelayApi(connectionId)` constructs an `RpcClient` over `RelayFrameTransport` and calls the SAME ws-bridge builders the browser uses — `buildRealApi`/`buildFilesApi`/`buildGitHubApi`/`buildAgentApi`/`buildCanvasApi`/`buildPresenceApi`/`buildClaudeApi` — assembling a full `NodeTerminalApi` [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/relay-api.ts:1-8, 65-98]. Routing is a documented per-member decision: CORE-BOUND namespaces (`pty`, `workspace`, `fs`, `git`, `files`, `context`, `canvas`, `presence`, agent-status streams, `claude.cliCaps`, `userDataDir`) go over the RpcClient to the remote core; APP-GLOBAL namespaces (`updates`, `license`, `clipboard`, `shell`, `dialog`, `media`, `settings`, `pairing`, …) stay LOCAL via a `...local` preload spread — "Routing one of these to the remote core would be a latent bug" [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/relay-api.ts:10-19, 77-81]. Two recorded gotchas: (1) `pty.onData` is the ONE core-bound member that bypasses the RpcClient — relay pty output is decoded main-process-side and re-emitted on the LOCAL per-session channel, so it delegates to the local preload (wire it to the RpcClient and the remote terminal is blank) [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/relay-api.ts:22-27, 100-105]; (2) `RelayFrameTransport.ready()` resolves on a ONE-SHOT `onApproved`, so the transport must be constructed while the approval dialog is still open — building after approval leaves `ready()` pending forever [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/relay-api.ts:28-31]. Version skew degrades cleanly: an older host's `E_NO_HANDLER` on boardLog maps to `{entries:[],unsupported:true}` / `false` instead of rejecting [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/relay-api.ts:107-118], and unsupported-over-relay members refuse with coded errors rather than silently acting on the wrong machine (`chat` → `E_UNSUPPORTED`, canvas-control/messaging → inert no-op stubs) [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/relay-api.ts:140-155].

**PWA adoption note:** Copy the "swap the API object" pattern: assemble Pi Remote's app services object by spreading a local/browser baseline and overriding only core-bound members with bridge-built ones. Write down the routing decision PER MEMBER (remote / local / typed refusal) — nodeterm treats a wrong-machine silent no-op as the worst outcome, which is exactly right for a phone controlling a remote host.

### F-5 — RPC envelope: five `t`-discriminated shapes, incrementing-id correlation, out-of-band `undef`

Envelope types: `req {t:'req', id:number, method, args}`; `cast {t:'cast', method, args}` (fire-and-forget, no id); `res {t:'res', id, ok:true, result} | {t:'res', id, ok:false, error:{code,message}}`; `ev {t:'ev', channel, args}` [SOURCE: specs/context/nodeterm-main/src/shared/rpc.ts:6-11]. Coded errors: `E_UNSUPPORTED`, `E_UNAUTHORIZED`, `E_NO_HANDLER`, `E_DISCONNECTED` [SOURCE: specs/context/nodeterm-main/src/shared/rpc.ts:13-18]. Client side: `nextId` increments per request; a `pending Map<id,{resolve,reject}>` correlates; responses delete their entry and resolve/reject with the coded error; unknown ids are ignored; `request()` sends `{t:'req', id, method, ...encodeArgs(args)}`, `cast()` omits the id [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:75-77, 140-150, 163-177]. `parseRpcMessage` validates every shape strictly (type checks per field; junk → null) [SOURCE: specs/context/nodeterm-main/src/shared/rpc.ts:79-115]. The `undef` mechanism solves a real bug class: JSON turns omitted trailing args into `null`, which does not trigger default parameters (`git.history(cwd)` broke exactly this way); an in-band sentinel was rejected because attacker-choosable top-level strings (`pty.write(sessionId, data)`, `fs.write(path, content)`) could forge it — so `undef` is a separate frame field carrying INDEXES of omitted slots; values are never inspected, hostile/out-of-range indexes mark nothing and can never lengthen the array, and meaningful `null`s (e.g. `pty.resize(sid,null,null)` park signal) survive as `null` [SOURCE: specs/context/nodeterm-main/src/shared/rpc.ts:20-77].

**PWA adoption note:** Adopt the envelope verbatim for Pi Remote — it is tiny, strictly validated, and typed. The `undef` index list is worth copying specifically: it prevents the omitted-arg-becomes-null default-parameter bug AND the sentinel-injection hole in one mechanism. Channel-keyed `ev` frames map naturally onto Svelte stores.

### F-6 — Early-event replay buffer closes the open-vs-subscribe race

Events arriving for a channel with no subscriber are buffered (capped 4096, drop-oldest) and flushed on the FIRST subscribe; the unsubscribe removes the listener and deletes empty channel sets [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:78-81, 152-161, 179-199]. The race is real: the server can push an event in the same macrotask as socket `open`, so a subscriber registered one microtask later (after `await ready()`) would otherwise miss it forever [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:78-81].

**PWA adoption note:** In SvelteKit, store subscriptions mount after the connection opens. A capped early-buffer flushed on first subscribe prevents permanently missed initial events (first agent-status snapshot, first presence sync) without any server-side replay support.

### F-7 — The third surface: a stub api whose degrades are typed, deliberate, and compiler-enforced

Where no bridge exists (browser boot before connect; desktop-only capabilities), `buildStubApi()` supplies the rest of `NodeTerminalApi` under an explicit contract: every `on*` subscription returns a callable no-op unsubscribe (the renderer uses it as React effect cleanup — a missing member or non-function return is a mount crash); boot-path-awaited promise members resolve BENIGN values (`updates.getPolicy` → `{minSupported:null, mandatory:false}`, `claude.cliCaps` → fail-open unknown caps, `usage.fetch` → null rendered as nothing); everything else rejects with coded `E_UNSUPPORTED` [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/stubs.ts:1-15, 28-46, 199-214, 274-279]. The return type is `satisfies Omit<NodeTerminalApi, …real members…>`, making the TypeScript compiler the completeness test: a new API member fails typecheck until a stub is declared [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/stubs.ts:13-15, 413-436]. Relay-specific stubs reject hosting/connecting outright (desktop-only capability) while keeping gate/frame void members inert [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/stubs.ts:313-337].

**PWA adoption note:** Pi Remote will hit desktop-only capabilities immediately (native share sheets, file system access). Use the same three-tier degrade — no-op unsubscribe for subscriptions, benign resolved values ONLY where the boot path awaits unguarded, coded `E_UNSUPPORTED` rejections elsewhere — and enforce coverage with a `satisfies`-style exhaustive type so adding an API member forces a conscious stub decision.

## Questions Answered

- **KQ1** — answered in full: transport interface (F1), frame discrimination + binary format (F2), in-flight failure semantics (F3), api-surface rebuild over carriers (F4), RPC envelope + id correlation + undef (F5), plus supporting mechanics (F6, F7). The Electron-preload carrier comparison is anchored by the invoke→request / send→cast / on→subscribe mirror documented in the builders [SOURCE: specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts:207-208, 374-386] and the `relay:*` channel namespace [SOURCE: specs/context/nodeterm-main/src/shared/ipc.ts:379-417].

## Questions Remaining

- KQ2 (E2EE security layers)
- KQ3 (reduceEntry status machine)
- KQ4 (event normalization/transcript tails)
- KQ5 (hook-reply approvals)
- KQ6 (mirror/inbox data contract)
- KQ7 (drop resilience: heartbeat/reap, backpressure, frame caps — partially seeded by F3)
- KQ8 (push-notification decisioning)

## Ruled Out / Dead Ends

- None this iteration. Deferred pointers (not dead ends): WS heartbeat/reap and backpressure/frame-size caps belong to KQ7; NaCl/HKDF/SAS internals belong to KQ2 (only the `ready()`-on-approval edge was in KQ1 scope).

## Edge Cases

- Ambiguous input: none — dispatch focus named exact files.
- Contradictory evidence: none observed across the six files.
- Missing dependencies: none — all six named files read successfully.
- Partial success: none — all planned actions completed within budget.
- Scope note: config has `progressiveSynthesis: true`, but this dispatch's ALLOWED WRITE PATHS exclude `research/research.md`. Per the scope lock, no research.md write was attempted; synthesis defers to the workflow owner.

## SCOPE VIOLATIONS

None executed. No write outside the three allowed paths was attempted; investigated sources under `specs/context/nodeterm-main` were only read.

## Sources Consulted

- specs/context/nodeterm-main/src/renderer/bridge/frame-transport.ts (all 103 lines)
- specs/context/nodeterm-main/src/renderer/bridge/ws-bridge.ts (lines 1-400; RpcClient + builders)
- specs/context/nodeterm-main/src/renderer/bridge/relay-api.ts (all 162 lines)
- specs/context/nodeterm-main/src/renderer/bridge/stubs.ts (all 439 lines)
- specs/context/nodeterm-main/src/shared/rpc.ts (all 141 lines)
- specs/context/nodeterm-main/src/shared/ipc.ts (channel registry, relay namespace)
- specs/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/research/deep-research-config.json
- specs/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/research/deep-research-strategy.md
- specs/005-sveltekit-spa-migration/010-context-repo-research/nodeterm/research/deep-research-state.jsonl

## Assessment

- New information ratio: 1.0 (7/7 findings fully new; first iteration over unread sources)
- Questions addressed: KQ1
- Questions answered: KQ1

## Reflection

- What worked and why: reading the six named files in two batched passes gave complete coverage of the carrier seam in 8 tool calls; the files' own design comments carry the rationale (failPending ordering, undef security reasoning, construction-order gotcha), so findings cite primary intent, not inference.
- What did not work and why: nothing failed; ws-bridge.ts lines 400-907 (remaining builders) were left unread as redundant with relay-api.ts's assembly view — noted for KQ7 if heartbeat/backpressure live there.
- What I would do differently: none material; keep the same batch-read pattern for KQ2's main-process relay files.

## Recommended Next Focus

KQ2 [security]: the layered E2EE relay envelope (NaCl box, HKDF per-session keys, seq anti-replay, role check, SAS mutual approval, approval-from-ciphertext-only rule) in `src/main/remote/*` — it directly extends F1's `ready()`-on-approval observation and the `relay:*` channel namespace seen in ipc.ts.
