# Iteration 9: KQ2 — E2EE Relay Security Envelope

## Focus

KQ2 [security]: the exact layered security envelope of nodeterm's untrusted-relay E2EE design — NaCl box (Curve25519 + XSalsa20-Poly1305), per-session HKDF traffic key from fresh nonces, sealed-plaintext `[role][seq][tag]` header, strictly-increasing inbound anti-replay seq, role-byte-must-equal-peer check, handshake-processed-exactly-once (no mid-session re-key + peer-key pin), out-of-band 6-digit SAS with mutual approval and pin-once peer keys, and the approval-advances-only-from-ciphertext rule — with each layer mapped to the specific attack it defeats, endianness traps noted, and a PWA adoption note per finding.

This was the final open key question (7/8 answered before this iteration; strategy §3). No exhausted approach or saturated direction touches it (strategy §9/§10A). Selected interpretation: the envelope is the Stage-4 mutual-trust design as implemented in `src/main/remote/` and specified in `docs/ios-protocol-migration.md` §2/§3/§7; the legacy one-way pin-once model is treated as the "before" state only.

## Actions Taken

1. Read state (config, strategy, state log) and verified the write boundary: 8 prior iteration records, `iteration-009.md` and `deltas/iter-009.jsonl` absent (write-once safe), 12-call budget confirmed.
2. Batched full read of the four core security sources: `src/main/remote/e2ee.ts` (107 lines), `src/main/remote/relay-trust.ts` (132), `src/main/remote/mutual-approval-core.ts` (98), `src/main/remote/framing.ts` (88).
3. Full read of `docs/ios-protocol-migration.md` (638 lines) — the wire-level contract that transcribes `relay-socket.ts`'s sealed-header construction (its lines 250–265, 284–289, 318–347) and receiver checks byte-for-byte, used as the citation source for the relay-socket enforcement points.
4. Cross-verified every documented rule against the code and extracted each layer's stated attack rationale from the code's own SECURITY comments.

## Findings

### F-01 — NaCl box authenticated encryption with strict key validation and fail-closed decrypt

The primitive is NaCl `box` = Curve25519 + XSalsa20-Poly1305 over the wire format `nonce ‖ ciphertext ‖ mac`, chosen so an interoperable peer can be implemented against it [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:1-5]. `encrypt` prepends a fresh 24-byte random message nonce to `box.after(plaintext, nonce, shared)` per message [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:76-84]; `decrypt` pre-checks length and returns `null` on malformed input or MAC failure — never throws, so a bad box is dropped, not crashed on [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:97-107]. Both base64 key decoders enforce exact length because `Buffer.from(x,'base64')` silently drops non-alphabet characters and truncates — without the check a corrupt blob decodes to a short-but-accepted key that only fails deep inside a later `nacl.box` call [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:22-39]. **Attack defeated:** relay eavesdropping and tampering — the relay is a "dumb byte-forwarder … it never decrypts" [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:160-163], and any bit it flips breaks the Poly1305 MAC → null → drop. **PWA adoption:** use tweetnacl-js or libsodium.js (`crypto_box`) in the SvelteKit PWA, keep the identical wire format for interop, validate every decoded key's length at the boundary, and treat decrypt-null as drop-not-error everywhere.

### F-02 — Two-key separation: stable baseKey (identity/SAS) vs per-session HKDF traffic key

`deriveSharedKey` is the raw ECDH precompute (`nacl.box.before`), stable per device-pair because both endpoints use static pin-once keys, and is explicitly barred from encrypting traffic [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:41-48]. The traffic key is `deriveSessionKey` = HKDF-SHA256(ikm = baseShared, salt = hostNonce ‖ clientNonce, info = "nodeterm-relay-session-v2", 32 bytes) [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:55-73]; the code comment states the attack verbatim: with static keys the raw ECDH is identical on every reconnect, so encrypting with it would let a malicious relay replay a whole recorded session's boxes against a fresh connection — the seq counter resets per connection and cannot stop this — whereas fresh per-session nonces make recorded boxes never decrypt under a later session's key [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:56-61]. Session nonces are 16 random bytes exchanged in the handshake, distinct from the 24-byte box nonce; salt order is host-nonce-then-client-nonce in BOTH roles [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:176-185]. **Attack defeated:** cross-session replay of recorded ciphertext. **PWA adoption:** WebCrypto `subtle.deriveBits` with HKDF is native in browsers — derive the traffic key per connection, persist only the identity keypair (IndexedDB), and version the `info` string for protocol evolution.

### F-03 — Sealed-plaintext header `[role][seq][tag]`: all security metadata inside the box

Before sealing, the sender prepends a 9-byte header INSIDE the plaintext: byte 0 = sender role (host=1, client=2), bytes 1..9 = seq as uint64 little-endian split high-uint32-LE @1..5 then low-uint32-LE @5..9, then a tag-prefixed payload (`0x01` RPC/handshake/keepalive, `0x02` legacy frame, `0x03` tunnel-text, `0x04` tunnel-binary) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:232-259, transcribing relay-socket.ts 250–265 and 284–289]. Because role/seq/tag live inside the authenticated plaintext, the untrusted relay can neither read them nor forge a valid box carrying modified ones. **Attack defeated:** relay-side metadata forgery — any header the relay rewrites invalidates the MAC (F-01), so routing/trust metadata cannot be manipulated in flight. **PWA adoption:** put ALL authoritative metadata inside the encrypted payload; the relay-visible WebSocket frame carries nothing the security posture depends on.

### F-04 — Role-byte-must-equal-peer check (anti-reflection)

Receiver check order after decrypt: (1) box decrypts under sessionKey and is ≥ 9 bytes; (2) the header role byte must equal the PEER's role — "a box tagged with your own role is a relay *reflection* — drop it" (host accepts role 2, client accepts role 1); (3) seq strictly greater than last accepted inbound; (4) strip header, dispatch by tag [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:261-270, transcribing relay-socket.ts 318–347]. **Attack defeated:** reflection — a relay bouncing our own encrypted frames back at us so our own frames are processed as peer frames (which would otherwise let a relay reflect an auth marker or a confirm). **PWA adoption:** a one-line check immediately after decrypt; unit-test it by feeding the client its own outbound box.

### F-05 — Strictly-increasing inbound anti-replay seq

Inbound seq must be strictly greater than the last accepted inbound seq (`recvSeq` initialised to −1, drop any `seq <= recvSeq`), defeating replay and reorder; counters reset per (re)connection, outbound starts at 0 and increments once per box, with independent per-direction counters [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:261-273]. **Attack defeated:** intra-session capture-and-replay/reorder of boxes by the relay. Layering note: cross-session replay is F-02's job (fresh HKDF key per session) — the two layers compose because seq resets are only safe when the key also rotates. **PWA adoption:** one monotonic counter per direction, drop `<=`, reset on reconnect in the same code path that derives the new session key so the two can never drift apart.

### F-06 — Handshake processed exactly once: no mid-session re-key + per-frame peer-key pin

Once the session is `ready`, a plaintext `e2ee_hello`/`e2ee_ready` control frame MUST be ignored — never re-processed — because re-processing one would let a relay MITM re-key a live session under its own keypair (re-deriving base/session keys, overwriting the peer pubkey) and then forge the peer's encrypted `trust:confirm` under the swapped key, degrading mutual approval to one-way; the correct behavior is drop WITHOUT re-keying and WITHOUT closing the socket (closing gives a MITM a trivial teardown) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:275-288, transcribing relay-socket.ts handleControl 350–398]. The host additionally re-asserts on every tunnel frame that the live peer key still equals the key bound at handshake and cuts the session on mismatch (`relay-host.ts` `peerKeyIntact`) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:289-295]. **Attack defeated:** live-session key substitution / re-key injection by the relay. **PWA adoption:** freeze the handshake state machine after `ready` (later hellos are no-ops, not errors), and assert the pinned peer key on every inbound frame.

### F-07 — Out-of-band 6-digit SAS with mutual approval and pin-once peer keys

Both ends derive the identical SAS from the baseKey (not the session key): SHA-512, first 4 bytes folded big-endian into a uint32, `% 1_000_000`, formatted "NNN NNN" [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:86-95; specs/context/nodeterm-main/docs/ios-protocol-migration.md:312-326]. A MITM on the relay terminates two DIFFERENT ECDH exchanges, so the two humans read out different digits and refuse — which is exactly why neither confirmation alone may unlock the session [SOURCE: specs/context/nodeterm-main/src/main/remote/mutual-approval-core.ts:6-10]. Approval requires BOTH `localConfirmed && remoteConfirmed` via separate one-way transitions, so replaying one side's confirm can never stand in for the other's [SOURCE: specs/context/nodeterm-main/src/main/remote/mutual-approval-core.ts:73-81]; `recordApproval` refuses unless both confirmed and pins ONLY the key carried by the state (no separate key argument exists to misuse), each end pinning the other's key into its own approved-devices store [SOURCE: specs/context/nodeterm-main/src/main/remote/mutual-approval-core.ts:88-98]. The `MutualApproval` type is branded/opaque with a sole constructor binding peerKey + sessionId INTO the state, turning "safe if every caller is disciplined" into "safe by construction" — a hand-forged approved state is a compile error [SOURCE: specs/context/nodeterm-main/src/main/remote/mutual-approval-core.ts:29-54]. Reconnect from an already-pinned peer can auto-approve (pin-once); the doc leaves full-SAS-every-time vs pin-once-after-first-mutual-approval as an open decision with a recommendation [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:376-386, 600-604]. **Attack defeated:** relay MITM / key substitution — the doc is explicit that the out-of-band human comparison is "the only defence against a relay MITM" [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:571-573]. **PWA adoption:** render the SAS on both PWA and desktop, require an explicit confirm tap on each side, persist the pinned peer key, and warn loudly if a previously pinned key ever changes.

### F-08 — Approval advances ONLY from ciphertext: the single trust choke point

`onTunnelText` is called ONLY from `connectRelay`'s `onTunnel` callback, which fires only for a payload that (1) DECRYPTED under THIS session's key, (2) carried the PEER's role byte, and (3) beat the per-direction monotonic replay counter; a plaintext frame from the relay reaches `handleControl` (which understands only `e2ee_hello`/`e2ee_ready`) and dies there — it can never reach the trust module [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-trust.ts:9-16]. The SECURITY block makes the maintenance rule explicit: NEVER add a second call site for `confirmRemote` — not `onRpc`, not `onFrame`, not an IPC message from the renderer, not a plaintext handshake control — because if a confirm can arrive any other way, mutual approval degrades back to ONE-WAY (the local human alone unlocks shell access while believing the remote human agreed), and the SAS-mismatch backstop does NOT catch it (it catches key substitution, not a same-key relay forging the confirm DIRECTION) [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-trust.ts:16-21]. `TRUST_CONFIRM` is deliberately NOT a routable RPC method: the gate consumes it and never forwards it to any dispatcher (`onTunnelText` returns true = consumed) [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-trust.ts:40-46, 120-128]. Obligation (b): exactly ONE `MutualApproval` per pairing attempt, seeded from THIS session's ECDH peer key, with each connection hanging its own gate off its own `onTunnel` so a confirm on session A is physically unable to reach session B's state [SOURCE: specs/context/nodeterm-main/src/main/remote/relay-trust.ts:23-27, 87-88; specs/context/nodeterm-main/src/main/remote/mutual-approval-core.ts:23-31]. **Attack defeated:** relay-injected or replayed confirm frames — the attacker-supplied-confirmation attack where a single local confirm then pins the attacker [SOURCE: specs/context/nodeterm-main/src/main/remote/mutual-approval-core.ts:16-21]. **PWA adoption:** implement one trust-gate module as the only consumer of tunnel trust frames, route it BEFORE the RPC dispatcher, and treat any new confirm call site in review as a security regression.

### F-09 — Endianness discipline traps (three different byte orders in one protocol)

Box seq is little-endian (2× uint32 LE, high then low) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:242-245, 590-592]; `encodePtyData`'s sidLen is a BIG-endian uint16 [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:137-148]; the SAS folds `h[0..4]` big-endian [SOURCE: specs/context/nodeterm-main/src/main/remote/e2ee.ts:90-93]; the legacy framing.ts 16-byte header is little-endian throughout [SOURCE: specs/context/nodeterm-main/src/main/remote/framing.ts:7-15, 58-61]. The doc's checklist item is "Do not cross them" [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:590-592]. **Attack defeated:** not a direct attack — a mixed byte order silently corrupts seq decoding, which would blind the anti-replay check (F-05) and break peer interop; it is the trap class that turns a correct design into an exploitable one. **PWA adoption:** use `DataView` with explicit per-field endianness flags and golden-vector unit tests per layer (encode→decode round-trip against the doc's byte layouts).

## Questions Answered

- **KQ2 [security]** — ANSWERED. The envelope is nine composed layers, each mapped to its attack: (1) NaCl box AE defeats eavesdropping/tampering; (2) baseKey/sessionKey separation with per-session HKDF from fresh 16-byte nonces defeats cross-session replay of recorded boxes; (3) the sealed `[role][seq][tag]` header keeps all security metadata inside the authenticated plaintext; (4) the role-byte-equals-peer check defeats relay reflection; (5) the strictly-increasing inbound seq (recvSeq init −1, drop `<=`) defeats intra-session replay/reorder; (6) handshake-frozen-after-ready plus per-frame peer-key pinning defeats live re-key/key substitution; (7) the out-of-band 6-digit SAS with mutual (both-humans-confirm) approval and pin-once-both-ends defeats the relay MITM; (8) the approval-from-ciphertext-only rule with a single trust choke point defeats relay-injected/replayed confirms; (9) endianness discipline keeps layers 3–5 decodable. Full citations in F-01–F-09.

## Questions Remaining

- None. All 8 key questions are now answered (KQ2 closed this iteration; KQ1/3/4/5/6/7/8 closed in iterations 1–8).

## Next Focus

Iteration 10 of 10 is the cap (config `maxIterations: 10`). With all 8 KQs answered, recommend a consolidation/verification close-out rather than a new question: (a) direct-read `relay-socket.ts` to upgrade the two doc-transcribed enforcement points (sealed-header construction, receiver checks) from doc citations to primary code citations, closing this iteration's missing-dependency note; and (b) let the reducer/synthesis pass assemble the cross-KQ adoption-priority picture for the Pi Remote PWA. No new focus area is needed for coverage.

## Ruled Out

- **framing.ts as a live KQ2 security layer.** Read in full per the focus list; it is the LEGACY opcode dialect the Stage-4 migration deletes (`OP.*` codes, snapshot flow) [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:471-489, 636]. Its residual relevance is the little-endian 16-byte header pattern (F-09) and the shared backpressure constant `MAX_BINARY_BUFFERED_AMOUNT` (KQ7 territory) — not security enforcement. Not retried as a security source.
- **relay-client.ts / relay-socket.ts direct reads this iteration.** Deferred under the 12-call budget in favor of the four core security files + the protocol doc; see Edge Cases.

## Dead Ends

None. Every named layer was found, cited, and attack-mapped; no approach failed.

## Edge Cases

- **Missing dependency (recorded, mitigated):** `relay-socket.ts` and `relay-client.ts` were named in the focus "Where" list but not directly read — the 12-call budget went to the four small core files plus the 638-line protocol doc. Mitigation: the doc states it is "the only contract" with wire shapes "transcribed byte-for-byte from the nodeterm source cited in each section" [SOURCE: specs/context/nodeterm-main/docs/ios-protocol-migration.md:6-8], and its §2 cites the exact relay-socket.ts line ranges for every check quoted here. Residual uncertainty: low, but the two enforcement points in F-03/F-04/F-05/F-06 cite the doc rather than primary code; the Next Focus proposes closing that in iteration 10.
- **Contradictory evidence:** none. Code comments and the protocol doc agree on every rule cross-checked (HKDF salt order, seq semantics, role values, SAS derivation, confirm routing).
- **Ambiguous input:** none material; the focus named the legacy framing.ts alongside the E2EE files — resolved by scoping it to F-09/Ruled Out per the migration doc.
- **Partial success:** none; all five research reads succeeded in one batched pass.
- **Progressive synthesis note:** config has `progressiveSynthesis: true`, but the dispatch prompt pack's ALLOWED WRITE PATHS omit `research/research.md` (strategy §13 also names it workflow-owned canonical synthesis output). Per the pack's scope lock, `research.md` was NOT written this iteration; synthesis ownership stays with the workflow.

## SCOPE VIOLATIONS

None. All writes stayed within the three allowed paths; all researched files were read-only.

## Sources Consulted

- specs/context/nodeterm-main/src/main/remote/e2ee.ts:1-5, 22-39, 41-48, 50-53, 55-73, 76-84, 86-95, 97-107
- specs/context/nodeterm-main/src/main/remote/relay-trust.ts:9-27, 40-46, 86-88, 112-131
- specs/context/nodeterm-main/src/main/remote/mutual-approval-core.ts:1-31, 35-54, 61-98
- specs/context/nodeterm-main/src/main/remote/framing.ts:7-15, 45-49, 51-64, 66-88
- specs/context/nodeterm-main/docs/ios-protocol-migration.md:6-8, 160-163, 176-185, 232-273, 275-302, 306-386, 471-489, 569-594, 598-604, 629-638

## Assessment

- New information ratio: 1.0 (9 of 9 findings fully new — KQ2 had zero prior coverage; every layer, attack mapping, and citation is first-appearance)
- Questions addressed: KQ2
- Questions answered: KQ2

## Reflection

- What worked and why: the batched full-read pattern that won iterations 1–8 again covered all five sources in a single parallel pass (5 of 12 calls), and nodeterm's own SECURITY comments carried the rationale — the relay-trust.ts and mutual-approval-core.ts header blocks state the exact degradation attack each rule prevents, so findings cite primary intent at specific lines instead of inference. Reading the four small code files before the doc meant the doc functioned as a cross-check (zero contradictions found) rather than a substitute.
- What did not work and why: the focus list's inclusion of framing.ts cost one read that yielded no security layer — it is the deleted legacy dialect; and the budget left relay-socket.ts/relay-client.ts unread, so four enforcement points cite the doc's byte-for-byte transcription rather than primary code.
- What I would do differently: substitute the framing.ts read for a direct relay-socket.ts read (the doc already covers framing.ts's deletion), and pre-check file roles against the migration doc's source-of-truth list before batching.
