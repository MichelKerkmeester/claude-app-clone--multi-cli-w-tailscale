# Iteration 002 — defensive tool-loop semantics

## Focus

Angle 1 [logic]: how OGAM makes tool-calling turns typed, interruption-safe, retry-safe, and bounded across the JavaScript loop, remote providers, and the LiteRT native loop.

## Actions Taken

1. Read the shared tool result types and normalization/model-content boundary in `specs/context/OGAM-main/src/services/tools/types.ts` and `src/services/tools/toolResult.ts`.
2. Traced the single tool execution seam, tool-result persistence, remote streamed-error retry, and local retry policy in `specs/context/OGAM-main/src/services/generationToolLoop.ts`.
3. Traced the LiteRT callback counter and the main per-turn loop's interruption, no-tools fallback, tool execution, and ceiling branches in the same service.
4. Cross-checked typed-result and loop-ceiling behavior against `__tests__/unit/services/tools/toolResult.test.ts`, `__tests__/unit/services/generationToolLoop.branches.test.ts`, and `__tests__/integration/generation/toolExtensionLoop.test.ts`.

## Findings

### F1 — Normalize all tool outcomes before they cross the model/UI boundary

OGAM represents a tool outcome as `ok`, `empty`, or `error`, with a coarse `errorCategory` of `timeout`, `network`, `validation`, `not-found`, or `internal` (`specs/context/OGAM-main/src/services/tools/types.ts:24-45`). `normalizeToolResult` fills the call identity and derives `empty` from blank content; `toolErrorResult` converts thrown exceptions into an error result (`specs/context/OGAM-main/src/services/tools/toolResult.ts:19-55`). The model-facing formatter never returns an empty string: it explicitly tells the model when a tool failed or returned no content, and caps successful content at 24,000 characters (`specs/context/OGAM-main/src/services/tools/toolResult.ts:61-92`). Tests cover category classification, empty-vs-ok, explicit failure text, and truncation (`specs/context/OGAM-main/__tests__/unit/services/tools/toolResult.test.ts:32-101`).

Adopt for Pi Remote: make the wire protocol carry a discriminated tool result, not an untyped string/error pair. Render the same status to the operator, and feed a bounded, explicit representation to the model so timeouts, empty responses, and truncation cannot be mistaken for successful data.

### F2 — Use one defensive execution seam for every tool provider

`executeToolCallSafely` is the only execution boundary for built-in and extension tools: it selects the extension, invokes it, normalizes returned data, catches throws, logs them, and emits `toolErrorResult` (`specs/context/OGAM-main/src/services/generationToolLoop.ts:360-382`). The JS loop calls this seam before creating and persisting the tool-result message (`specs/context/OGAM-main/src/services/generationToolLoop.ts:384-422`), and the LiteRT native callback uses the same seam before persisting its assistant tool-call and tool-result rows (`specs/context/OGAM-main/src/services/generationToolLoop.ts:658-722`). The extension integration test confirms extension execution is selected instead of the built-in executor and that the result reaches the chat store (`specs/context/OGAM-main/__tests__/integration/generation/toolExtensionLoop.test.ts:139-164`).

Adopt for Pi Remote: keep provider-specific failures behind one service-owned adapter. The stream/session layer should receive only typed outcomes and lifecycle events; it should never need separate try/catch behavior for local, remote, or plugin tools.

### F3 — Treat interruption as a per-turn result, not shared service state

`ToolLoopContext` exposes `isAborted`, while `ToolLoopOutcome` returns `interrupted` as the truth for this particular turn (`specs/context/OGAM-main/src/services/generationToolLoop.ts:336-350`, `1231-1244`). The loop checks interruption before starting a round, immediately after generation, after tool execution, and at the top of the next round; once interrupted it returns without a follow-up completion (`specs/context/OGAM-main/src/services/generationToolLoop.ts:1269-1305`, `1383-1403`). The rationale in the source is concrete: a shared abort flag can be reset by a concurrent next turn and otherwise cause a stopped turn to be rendered as a fresh empty response (`specs/context/OGAM-main/src/services/generationToolLoop.ts:1235-1237`, `1292-1305`).

Adopt for Pi Remote: assign each generation a turn token or abort generation, and return an immutable terminal outcome for that turn. A later send may create a new controller, but must not rewrite the prior turn's interrupted/finalized status.

### F4 — Retry without tools only when no output has streamed

Remote generation records whether any token or reasoning chunk was emitted and attaches that fact to a rejected error (`specs/context/OGAM-main/src/services/generationToolLoop.ts:449-505`). A grammar/schema failure retries once with `tools: []` only when the failed attempt streamed nothing; after any streamed chunk it rethrows to avoid a second answer being sent to the same consumer (`specs/context/OGAM-main/src/services/generationToolLoop.ts:508-559`). LiteRT applies the same recovery for malformed tool-call parser failures, rebuilding the native conversation with no tools (`specs/context/OGAM-main/src/services/generationToolLoop.ts:792-817`). The main loop also guards its empty-response fallback with `!state.streamedContent`, `!displayResponse`, and `!ctx.isAborted()` (`specs/context/OGAM-main/src/services/generationToolLoop.ts:1322-1346`).

Adopt for Pi Remote: classify errors by whether the receiver has observed output, not only by HTTP/status code. A retry may replace a pre-stream request; after first output, terminate or continue the existing identity, but never start a second streamed answer under the same turn.

### F5 — Enforce one step ceiling across engines and expose an honest terminal message

OGAM derives a bounded setting from app state, accepting only integer values from 1 through 100 and otherwise using a default of 25 (`specs/context/OGAM-main/src/services/generationToolLoop.ts:29-36`). The JS loop caps each round and each batch of tool calls, emits a user-facing notice, and returns when the ceiling is reached (`specs/context/OGAM-main/src/services/generationToolLoop.ts:1260-1277`, `1317-1319`, `1387-1389`). The LiteRT callback owns a per-turn counter in a closure, rejects calls beyond the ceiling, and marks the native outcome as limit-reached; it uses the same configured notice (`specs/context/OGAM-main/src/services/generationToolLoop.ts:651-722`). The branch tests verify repeated tool calls stop at the configured count and surface `toolStepLimitNotice` (`specs/context/OGAM-main/__tests__/unit/services/generationToolLoop.branches.test.ts:270-318`).

Adopt for Pi Remote: make the ceiling a session policy shared by server and client, count tool calls rather than vague loop iterations, and terminate with an explicit continuation instruction. The cap protects both latency and prompt/context growth while preserving the conversation for a follow-up turn.

## Questions Answered

- [x] [logic] What makes OGAM's tool-calling loop crash-proof and race-proof? Typed normalization, one safe executor, per-turn interruption, pre-output-only no-tools retry, and a shared step ceiling provide the answer.

## Questions Remaining

- [ ] [architecture] How does OGAM enforce reactive-store-as-read-only-projection while a service owns the authoritative state machine, side-effects, and resources?
- [ ] [ux] How does OGAM render streaming transcript items, reasoning, and tool rows as fast, collapsible first-class surfaces?
- [ ] [ux] What mobile composer, keyboard, attachment, haptics, and failure-message ergonomics are directly adoptable?
- [ ] [ease-of-use] How is the theme and design-token system structured and documented?
- [ ] [other] How are long-session context budgets and prompt-injection defenses bounded?

## Next Focus

Angle 2 [architecture]: service-owned generation/session and compaction state versus reactive-store projections, including observable boundaries and persistence ownership.
