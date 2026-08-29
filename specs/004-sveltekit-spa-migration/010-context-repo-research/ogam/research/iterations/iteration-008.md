# Iteration 008 — verification and evidence-depth sweep

## Focus

Re-open the thinnest load-bearing chains from iterations 1–6, verify their exact file/line citations, and add corroborating test sources. The sweep covered context-budget and LLM-input hardening, the tool-loop defensive seam, and the service-versus-reactive-store boundary. The shared sync package remains intentionally unresearched because it is absent from this snapshot.

## Actions Taken

- Re-read `src/services/contextCompaction.ts`, its unit tests, `src/stores/chatStore.ts`, and the generation retry path.
- Re-read `src/services/tools/types.ts`, `toolResult.ts`, `generationToolLoop.ts`, and the tool-loop branch tests.
- Re-read `rules.md`, `src/services/generationSession.ts`, and `src/services/generationService.ts` to verify the ownership boundary against concrete service behavior.
- Compared the citations used in iterations 1, 2, 5, and 6 with the current source snapshot. No referenced line range was stale; two claims were narrowed for precision below.

## Findings

### F1 — Context compaction is a bounded, persisted, injection-aware ledger

The budget is explicit in executable code: summary receives 12% of the context window, while the prompt budget subtracts summary and system tokens before walking backward through recent messages (`specs/context/OGAM-main/src/services/contextCompaction.ts:9-14`, `29-30`, `96-121`). Older messages are summarized under a hard output cap; the summary and the last summarized message ID are persisted together, and the returned context is rebuilt as system + summary + recent messages (`specs/context/OGAM-main/src/services/contextCompaction.ts:135-170`). The unit tests corroborate bounded summary generation, persisted cutoff state, and trim-only fallback when summarization fails (`specs/context/OGAM-main/__tests__/unit/services/contextCompaction.test.ts:118-174`, `194-210`).

The summarizer is treated as an untrusted-input boundary: its system instruction says transcript instructions are data, role prefixes are escaped before inclusion, and both input and output are bounded (`specs/context/OGAM-main/src/services/contextCompaction.ts:38-40`, `174-215`). Compaction state belongs to the service and is exposed through a subscription rather than being coordinated by the UI (`specs/context/OGAM-main/src/services/contextCompaction.ts:42-62`). Adopt for Pi Remote: persist `{summary, cutoffId}` atomically, make compaction status observable, and fence any context-full retry against the current turn’s cancellation token.

### F2 — Tool execution and recovery have separate, composable defensive seams

`ToolResult` carries `ok | empty | error` status plus a coarse error category; the status union is internal to the module, not an exported enum (`specs/context/OGAM-main/src/services/tools/types.ts:25-43`). `normalizeToolResult` and `toolErrorResult` classify returned, empty, and thrown outcomes, while `toolResultModelContent` prevents an empty model-facing string (`specs/context/OGAM-main/src/services/tools/toolResult.ts:15-53`). The focused tests verify timeout classification, empty-versus-ok distinction, and explicit error/empty text (`specs/context/OGAM-main/__tests__/unit/services/tools/toolResult.test.ts:31-78`). Every JS and extension tool call passes through `executeToolCallSafely`, then writes the typed result back into both loop context and the transcript (`specs/context/OGAM-main/src/services/generationToolLoop.ts:360-420`).

LLM-request recovery is a different seam, not the same enum: grammar failures retry once without tools only when the first attempt emitted no stream data, preventing duplicate output (`specs/context/OGAM-main/src/services/generationToolLoop.ts:449-558`). A per-turn `interrupted` outcome ends the turn before any follow-up completion, even if a shared service abort flag has been reset by a concurrent turn (`specs/context/OGAM-main/src/services/generationToolLoop.ts:1235-1305`). The configured tool-step ceiling emits a resumable notice and is covered by the bounded-loop test (`specs/context/OGAM-main/src/services/generationToolLoop.ts:1260-1277`, `1383-1403`; `specs/context/OGAM-main/__tests__/unit/services/generationToolLoop.branches.test.ts:288-317`). Adopt for Pi Remote: keep typed tool outcomes, request-error predicates, per-turn cancellation, streamed-output fencing, and step ceilings as distinct seams with explicit tests.

### F3 — Service ownership is concrete; the store remains a projection and durable record surface

OGAM’s architecture rule states that the service owns the authoritative state machine, resources, and side effects; the reactive store is a thin projection; and the View dispatches intents rather than coordinating imperative work (`specs/context/OGAM-main/rules.md:111-151`, `166-175`). This is not merely documentation: `GenerationSessionService` owns the active conversation ID, exposes `begin/end`, and publishes changes through `subscribe` (`specs/context/OGAM-main/src/services/generationSession.ts:5-18`, `20-67`). `GenerationService` publishes snapshots to listeners, uses the store’s already-rendered stream as the source for preserving partial output, finalizes before engine shutdown, and only clears when no stream exists (`specs/context/OGAM-main/src/services/generationService.ts:122-137`, `220-243`, `245-299`).

Precision correction to the broader earlier wording: the store is not “read-only” in the literal sense—it owns visible transcript and durable compaction fields (`specs/context/OGAM-main/src/stores/chatStore.ts:448-461`). The adoptable invariant is narrower and safer: UI/store projections must not become a second owner of generation cancellation, routing, resource cleanup, or other imperative coordination.

## Questions Answered

- **Long-session budget and LLM I/O hardening:** Confirmed with implementation and tests: explicit budget ratios, recent-message retention, durable summary/cutoff, anti-instruction summarization, bounded input/output, observable compaction state, and trim-only fallback.
- **Tool-loop crash/race resistance:** Confirmed with implementation and tests: typed tool results, one safe execution seam, distinct request-error classification, no-duplicate streamed retry, per-turn interruption, and a bounded step ceiling.
- **Service versus reactive-store ownership:** Confirmed and refined: services own imperative state machines/resources/side effects; stores expose UI and durable projections, including transcript persistence.

## Questions Remaining

- The exact shared sync-package producer/receiver lease, sequence window, expiry, and late-frame retirement protocol remains **UNKNOWN** because the package is absent from the snapshot.
- The exact SvelteKit/browser persistence mapping for attachments and paired-stream durability remains open.
- The streaming identity chain and transcript rendering ergonomics are source-backed, but still need a direct Pi Remote mapping pass for browser lifecycle and viewport primitives.

## Next Focus

Run one final synthesis pass that maps the verified OGAM seams to Pi Remote’s SvelteKit services, stores, browser cancellation, and transcript projections. Do not revisit the absent sync package unless a source snapshot containing that package appears.
