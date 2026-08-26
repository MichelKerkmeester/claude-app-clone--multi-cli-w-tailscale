# Iteration 13: Incremental transcript assembly and live status

## Focus

Inspect Orca’s desktop incremental assembler, live-status precedence, and mobile streaming gate for a chat that feels live without duplicating or prematurely settling host content.

## Findings

### F-LUNA-013-A — Incremental append with a full-rebuild correctness fallback

**Orca file/pattern:** `src/renderer/src/components/native-chat/native-chat-incremental-assembler.ts:1-13,18-41,44-75,78-100` resets from authoritative base snapshots, merges appends by id/turn, fast-paths sorted tail appends, and re-sorts on ambiguity.

**Copy:** Maintain an id-deduped transcript accumulator: replace on authoritative snapshot, merge live appends, and use a full stable sort whenever an append collides, removes, or arrives out of order. Keep the displayed array reference stable when no new frame arrives.

**Constraint mapping:** The transcript host snapshot remains content authority; incremental state is only a projection. Never drop an out-of-order frame merely for performance. If identity or ordering is ambiguous, rebuild from the host window rather than guessing.

**Verdict:** `drop-in view affordance` and logic.

### F-LUNA-013-B — Host working state drives Stop/typing; transcript lifecycle reconciles it

**Orca file/pattern:** `src/renderer/src/components/native-chat/native-chat-live-status.ts:36-85,87-168` makes errors win, keeps hook `working` authoritative until an explicit terminal lifecycle marker, preserves working subagent state, and uses clock-skew slack; `mobile-native-chat-streaming-gate.ts:3-9,50-92` hides a synthetic bubble only after the transcript tail actually advances.

**Copy:** Show a typing/streaming affordance only while the host reports live work; suppress it once the authoritative assistant turn lands. Keep Stop enabled only for the active live scope, and use a stable baseline to avoid repeating a previous assistant prefix.

**Constraint mapping:** Client timeouts cannot declare completion. A stale or missing lifecycle marker leaves the conservative working/loading state until host evidence settles it. Session scope must reset the streaming baseline; no prior session tail may suppress the new stream.

**Verdict:** `drop-in view affordance` and logic.

## Negative knowledge

- A text prefix comparison alone is not enough to decide whether the transcript caught up; repeated answers can share a prefix.
- A client spinner or stream timer must not be treated as proof that the host is still working.

## Questions answered

- Efficient streaming and honest status are portable as state-machine logic when host lifecycle/status remains authoritative.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-incremental-assembler.ts:1-13,18-41,44-75,78-100]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-live-status.ts:36-85,87-168]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-streaming-gate.ts:3-9,50-92]
