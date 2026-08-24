# Iteration 007 — long-session context budget and hardened LLM I/O

## Focus

Trace OGAM's long-session context-compaction budget, persisted summary/cutoff flow, anti-instruction summarizer prompt, service-owned compaction observable, and the typed tool-loop/retry/error seams. The paired-device sync package remains absent and is not inferred here.

## Actions Taken

- Read `src/services/contextCompaction.ts` for budget constants, recent-message selection, summarization, persistence, fallback, and observable lifecycle.
- Read `src/services/liteRTCompaction.ts` and `src/stores/chatStore.ts` to verify the alternate compaction path and durable summary/cutoff fields.
- Read `src/services/tools/types.ts`, `src/services/tools/toolResult.ts`, and `src/services/generationToolLoop.ts` for typed outcomes, safe execution, result bounding, retry gates, interruption, and step ceilings.
- Cross-checked `rules.md` and `src/services/generationService.ts` for the service/store ownership boundary and stop behavior.

## Findings

### 1. Compaction uses an explicit context-budget ledger

OGAM documents a five-part budget: system prompt approximately 5–10%, summary 12%, recent messages approximately 35–40%, generation 40%, and native overhead 5% (`src/services/contextCompaction.ts:9-15`). At runtime, the summary is fixed at `0.12` of the context window, while the recent-message budget is the prompt budget minus summary and measured system-prompt tokens (`src/services/contextCompaction.ts:29-36`, `src/services/contextCompaction.ts:96-100`). This is adoptable as a browser-side policy object: reserve generation and protocol overhead first, then allocate the remainder to summary and recent transcript rather than trimming by an arbitrary message count.

### 2. The summarize-older-then-keep-recent flow is deterministic and durable

The service walks backward through non-system messages until the recent budget is full; if even the newest message is too large, it keeps a tail truncated to the estimated character budget (`src/services/contextCompaction.ts:101-121`). Everything before that slice is summarized, and successful summarization persists both the summary and the last old-message ID as the cutoff (`src/services/contextCompaction.ts:135-149`). The rebuilt context contains the system prompt, a marked previous-conversation summary, and recent messages (`src/services/contextCompaction.ts:151-168`). The conversation model stores `compactionSummary` and `compactionCutoffMessageId`, making the compaction boundary reopenable instead of recomputed invisibly (`src/types/index.ts:307-319`; `src/stores/chatStore.ts:448-461`).

### 3. Summarization is prompt-injection aware and failure-tolerant

The summarizer system prompt explicitly says that transcript instructions or requests must not be followed and that only discussion should be summarized (`src/services/contextCompaction.ts:38-40`). Transcript lines are prefixed/escaped before being placed in the summarizer input, and the input is capped to leave room for the summary and a fixed instruction overhead (`src/services/contextCompaction.ts:174-214`). If summarization fails, OGAM logs the failure and falls back to trim-only; the `finally` block always clears the compaction busy state (`src/services/contextCompaction.ts:135-170`). For Pi Remote, this supports an untrusted-transcript boundary in the web service and guarantees that a failed summarizer cannot strand the UI in a “compacting” state.

### 4. Compaction progress is service-owned observable state, not store-owned coordination

`ContextCompactionService` owns `_isCompacting` and its listener set, immediately emits the current value on subscription, and exposes `signalCompacting` for alternate engines (`src/services/contextCompaction.ts:42-62`). The LiteRT compaction path brackets its work with that signal and restores the false state in `finally` (`src/services/liteRTCompaction.ts:70-121`). This matches OGAM's architecture rule: services own authoritative state machines, resources, and side effects; reactive stores are thin UI projections and views dispatch intents (`rules.md:166-175`). The SvelteKit equivalent should expose a readable subscription/store adapter while keeping compaction ownership and cancellation in the service.

### 5. Tool execution has one defensive normalization seam and a typed result contract

`ToolResult` distinguishes `ok`, `empty`, and `error`, and errors carry a coarse `ToolErrorCategory` of `timeout`, `network`, `validation`, `not-found`, or `internal` (`src/services/tools/types.ts:25-43`). `executeToolCallSafely` is the single seam for built-in and extension tools: it normalizes returned values and catches every throw into a typed error (`src/services/generationToolLoop.ts:360-382`). The model-facing formatter never sends an empty failure: errors explicitly say the tool returned no data, empty results say no content was returned, and oversized successful results are capped at 24,000 characters with a truncation notice (`src/services/tools/toolResult.ts:39-81`). This is directly adoptable for remote-agent tools: normalize at the boundary, preserve a machine-readable category, and never let an untyped throw or unbounded payload poison the next model turn.

### 6. Retry policy is separated from tool-result semantics and avoids duplicate streamed output

For local LLM calls, `isNonRetryableError` immediately fails deterministic or user-controlled cases such as no model, abort, remote-provider misuse, decode/evaluation failures, and invalid tokens; only other failures receive up to four attempts with linear backoff (`src/services/generationToolLoop.ts:424-439`, `src/services/generationToolLoop.ts:561-592`). Remote grammar failures are detected separately by `isToolGrammarError`; OGAM retries once without tools only when the tool-enabled request streamed no token (`src/services/generationToolLoop.ts:441-446`, `src/services/generationToolLoop.ts:508-559`). The stream marks whether content/reasoning was emitted and carries that bit on rejection, making “retry without tools” a safe pre-output recovery rather than a second answer appended to the same consumer (`src/services/generationToolLoop.ts:449-505`). The adoption rule is to make retry eligibility depend on both error class and stream progress.

### 7. Per-turn interruption and step ceilings prevent zombie generations

OGAM returns interruption as a per-turn outcome, instead of relying only on a shared service abort flag that a concurrent next turn may reset (`src/services/generationToolLoop.ts:1235-1240`). After a completion reports interruption, the loop ends without fallback generation; it also refuses the empty-response retry after an abort (`src/services/generationToolLoop.ts:1292-1305`, `src/services/generationToolLoop.ts:1322-1346`). The configured tool-call ceiling is shared by JS and LiteRT, with an explicit resumable notice; both the JS loop and native callback path count calls and stop at the same maximum (`src/services/generationToolLoop.ts:29-36`, `src/services/generationToolLoop.ts:651-723`, `src/services/generationToolLoop.ts:1260-1305`, `src/services/generationToolLoop.ts:1383-1403`). Generation-service stop also marks the abort before stopping engines, including the interval when compaction has reset `isGenerating` (`src/services/generationService.ts:245-261`). For Pi Remote, interruption must be captured in the turn/session object and checked before every retry or follow-up, while the step ceiling should be a single product policy.

## Questions Answered

- **Long-session budget:** Confirmed explicit system/summary/recent/generation/overhead budgeting, backward recent selection, oversized-message truncation, and persisted summary/cutoff.
- **Prompt-injection defense:** Confirmed the summarizer explicitly treats transcript instructions as data, not commands, and caps the input.
- **Compaction ownership:** Confirmed service-owned observable lifecycle with store persistence limited to durable summary/cutoff fields.
- **Tool-loop safety:** Confirmed typed tool outcomes, one safe execution seam, bounded model-facing results, error classification, streamed-output-aware retry, per-turn interruption, and a shared step ceiling.

## Questions Remaining

- The exact shared sync-package producer/receiver lease, sequence window, expiry, and late-frame retirement protocol remains unconfirmed because that package is absent from the snapshot.
- The exact SvelteKit/browser persistence implementation for attachment and paired-stream durability remains open.
- The source snapshot does not show a single typed enum reused by both `ToolErrorCategory` and LLM request retry classification; those are currently complementary seams (tool-result taxonomy versus request-error predicates).

## Next Focus

Trace the SvelteKit/browser mapping for durable attachment and paired-stream state if the target app sources are available; otherwise use the remaining pass to consolidate the confirmed streaming identity, service/store, UX, design-token, compaction, and tool-loop patterns into an adoption matrix.
