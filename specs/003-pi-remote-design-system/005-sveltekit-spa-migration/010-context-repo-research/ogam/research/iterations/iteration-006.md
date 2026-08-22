# Iteration 006 — service-owned generation and compaction boundaries

## Focus

Complete the service-versus-reactive-store ownership map for generation and context compaction from the in-snapshot architecture rules and service implementations. The shared sync package is absent, so paired-device transport ownership is explicitly treated as unconfirmed.

## Actions Taken

- Read the architecture, abstraction, platform, and source-of-truth sections in `specs/context/OGAM-main/rules.md`.
- Traced `generationSession.ts`, `generationService.ts`, `contextCompaction.ts`, and the `useGenerationSession` projection hook.
- Compared service-owned mutable state and lifecycle transitions with store writes used for transcript durability and UI projection.
- Checked the source inventory for the shared sync package; it is not present in this snapshot.

## Findings

### 1. OGAM makes service ownership an explicit architectural contract

The rules define the Service/Model as the owner of the authoritative state machine, resources, and side-effects; the reactive store is a thin read-only projection; and the View observes the projection while dispatching intents to the service (`rules.md:166-175`). The debugging doctrine makes the same boundary operational: identify the one source of truth, find other writers answering the same question, and collapse duplicates (`rules.md:111-151`). For Pi Remote, this is directly portable to a SvelteKit service singleton plus a read-only Svelte adapter.

### 2. Generation identity is service-owned and externally observable

`GenerationSessionService` keeps the active conversation ID private and exposes only `getConversationId`, `isGeneratingFor`, `begin`, `end`, and `subscribe`; `begin` is idempotent for the same ID and every transition is logged (`src/services/generationSession.ts:20-57`). The React hook uses `useSyncExternalStore` against that subscription and never writes the session (`src/hooks/useGenerationSession.ts:5-13`). This is a strong MVVM/MVP seam for the PWA: route all send/stop/regenerate intents into the service and expose `readable` state to components.

### 3. GenerationService owns routing, streaming buffers, abort, finalization, and queue lifecycle

The service keeps its complete generation snapshot, listeners, abort flag, remote abort controller, token/reasoning buffers, and queue processor privately (`src/services/generationService.ts:36-68`). It publishes defensive snapshots through `getState`, `subscribe`, and `updateState` (`src/services/generationService.ts:122-137`), while generation entry routes local versus remote execution behind the provider seam (`src/services/generationService.ts:152-164`). Tool-loop completion flushes buffered output, finalizes the store transcript, then resets service state; error handling preserves shown partial output before reset (`src/services/generationService.ts:186-217`).

### 4. The store is the transcript projection/durability surface, not the generation coordinator

The service explicitly treats the store's `streamingMessage` and `streamingReasoningContent` as the user-visible source for partial output, rather than trusting its own potentially empty engine-specific buffer (`src/services/generationService.ts:220-243`). Stop first marks the service abort, flushes tokens, finalizes shown partials, resets service state, and only then stops local or remote engines (`src/services/generationService.ts:245-299`). This ordering prevents a late engine callback from deciding UI state and gives the PWA a concrete rule: render from the transcript projection, but never let the projection own cancellation or resource cleanup.

### 5. Compaction owns its workflow in a service while persisting only the durable result

`ContextCompactionService` owns the compacting flag and its subscriber set (`src/services/contextCompaction.ts:42-62`), computes summary/recent budgets, walks backward to select recent messages, and handles oversized last-message truncation (`src/services/contextCompaction.ts:88-121`). It persists only the summary and cutoff ID through the chat store after summarization (`src/services/contextCompaction.ts:143-149`), then constructs the reduced context passed onward (`src/services/contextCompaction.ts:151-168`). The lifecycle hook subscribes to this service for UI state (`src/screens/ChatScreen/useChatScreenLifecycle.ts:78-87`), confirming the store is not the owner of the compaction process.

### 6. The compaction seam also demonstrates bounded, injection-aware LLM I/O

The service documents budget allocation and reserves response space (`src/services/contextCompaction.ts:9-15`, `src/services/contextCompaction.ts:96-100`). The summarizer system prompt explicitly says transcript instructions must not be followed, and the transcript is marked up before being sent (`src/services/contextCompaction.ts:38-40`, `src/services/contextCompaction.ts:174-214`). If summarization fails, the service falls back to trim-only and still clears its observable busy state in `finally` (`src/services/contextCompaction.ts:135-170`). These are adoptable browser-service invariants, independent of native inference.

### 7. Paired-device transport ownership remains unconfirmed in this snapshot

The requested shared sync-package lease, sequence-window, expiry, and receiver retirement internals are not available. The local source inventory contains sync adapters and stores, but no confirmed sibling package implementing the transport contract. Therefore no claim is made about producer/receiver ownership, late-frame handling, or tombstone semantics in this iteration. The safe adoption rule is to give transport resources and lifecycle to a dedicated service when its source is available, and expose immutable stream snapshots/events to the Svelte UI; this is an architectural recommendation inferred from the confirmed service/store doctrine, not a source-confirmed OGAM transport behavior.

## Questions Answered

- **Architecture:** How OGAM enforces reactive-store-as-read-only-projection is confirmed: services own mutable state machines, side-effects, resources, and lifecycle; hooks/stores expose projections or durable records.
- **Generation ownership:** The generation/session service boundary is confirmed, including observable snapshots, abort ordering, partial preservation, finalization, and queue reset.
- **Compaction ownership:** The compaction service boundary is confirmed, including budget calculation, summarization, persistence of summary/cutoff, and UI subscription.
- **Long-session safety:** Budgeted compaction and an injection-aware summarizer prompt are confirmed.

## Questions Remaining

- The shared sync package's producer/receiver lease, sequence window, expiry, and late-frame retirement protocol remain unconfirmed.
- The exact SvelteKit/browser persistence strategy for attachment and paired-stream durability still needs a web-surface mapping pass.
- Tool-loop typed-result and retry semantics were not re-read in this architecture-focused pass.

## Next Focus

If another source snapshot exposes the shared sync package, trace its transport service against this established ownership contract. Otherwise, pivot to the tool-loop defensive seam and connect its per-turn interruption/error taxonomy to the service-owned generation state machine.

