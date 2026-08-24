# OGAM Pattern Mining for Pi Remote SvelteKit PWA — Research Synthesis

Session: `research-20260822-7de4901f` · Generation 1 · 10 iterations · Stop reason: `maxIterationsReached` · Target: `specs/context/OGAM-main` (READ-ONLY)

---

## 1. Executive Summary

Ten research passes mined the Off Grid AI (OGAM) React Native chat application for patterns adoptable by the Pi Remote SvelteKit mobile chat / remote-agent PWA. The loop produced **48 structured findings, 15 invariants, and 23 verified observations**, every one cited to `specs/context/OGAM-main/file:line`, plus 9 explicitly ruled-out directions.

Seven charter angles were each answered at least once:

1. **Streaming-reply single-identity state machine** — one UUID minted before first token spans stream frames, durable row, and peer previews; forming-state resets are typed and centralized; ephemeral state always retires *before* the durable mutation; segment resets change content but never identity; stop/error finalize shown partials rather than orphaning them.
2. **Crash-proof tool-calling loop** — discriminated `ok|empty|error` results with a coarse error category; one defensive execution seam (`executeToolCallSafely`) for every provider; interruption is per-turn truth, never shared abort state; retry-without-tools only before any streamed output; one integer step ceiling shared across engines.
3. **Service-vs-store architecture** — an explicit written contract (`rules.md`) makes services own state machines, side-effects, and resources while reactive stores are read-only projections; generation/session/compaction services confirm the pattern in code with observable snapshots.
4. **Transcript rendering performance** — reference-stable finalized rows + memo comparator so only the streaming row re-renders; reasoning and tool activity are first-class collapsible surfaces keyed by stable IDs that survive the streaming→finalized remount.
5. **Mobile chat ergonomics** — near-bottom-gated autoscroll with jump-to-bottom affordance, keyboard-settled popover measurement, send/stop/voice action precedence state machine, attachment preview ownership, and failure messages that separate actionable repair from capability absence.
6. **Theme & design-token system** — small semantic token vocabulary, theme-dependent colors/elevation split from invariant typography/spacing, a hook + memoized themed-style factory seam, and a documented component checklist whose enforcement is guidance rather than mechanical.
7. **Long-session context budget & LLM I/O hardening** — explicit budget ledger (55% prompt / 12% summary), summarize-older-keep-recent with persisted cutoff, anti-injection summarizer prompt with escaped transcript prefixes, trim-only fallback, and retry fencing against turn cancellation.

One evidence boundary recurs throughout: OGAM's paired-device transport (`@offgrid/sync`) is imported from a sibling package **absent from this snapshot**. Consumer contracts and store projections are confirmed; wire-level lease, sequence-window, expiry, and late-frame semantics are UNKNOWN and were never inferred.

---

## 2. Research Charter & Scope

- **Goal:** mine adoptable patterns for the Pi Remote SvelteKit mobile chat / remote-agent PWA; findings only, no code changes; cite `specs/context/OGAM-main/file:line`.
- **Non-goals:** on-device inference, native modules, platform-specific behavior that cannot transfer to a web PWA; any modification of `specs/context/**`.
- **Charter:** `specs/005-sveltekit-spa-migration/010-context-repo-research/ogam/charter.md`.
- **Stop conditions:** convergence (`newInfoRatio < 0.05`) or 10 iterations. The run ended at the 10-iteration cap with ratios still high (every angle kept yielding net-new information).

---

## 3. Methodology

Each iteration dispatched a fresh leaf agent bound to one focus area with a strict output contract (iteration narrative + canonical JSONL record + per-iteration delta). The orchestrator evaluated convergence after every iteration using the composite vote (rolling ratio average, MAD noise floor, question coverage) combined with a coverage-graph gate, then ran the reducer to synchronize strategy/registry/dashboard. Iterations deepened earlier angles where the reducer directed (runs 1→4 on streaming identity) or pivoted when evidence boundaries were hit (runs 5, 9). Run 8 was a citation-verification sweep over the thinnest chains; run 10 mapped confirmed patterns onto browser/SvelteKit primitives.

Ratio trace: 0.78 → 0.84 → 0.86 → 0.88 → 0.90 → 0.92 → 0.92 → 0.58 → 0.42 → 0.78.

---

## 4. Findings

### A. Streaming-reply single-identity state machine (iterations 1, 4)

**A1 — Mint identity at stream start; carry it through every surface.** The reply UUID is minted when streaming starts and reused across ephemeral frames, the persisted message, and remote deduplication, so peers can match live previews to later durable records without heuristics (`src/stores/chatStore.ts`). Minting at finalization was evaluated and rejected (see §8).

**A2 — Typed single-source forming reset.** Every lifecycle transition writes the same typed `NO_REPLY_FORMING` value, making "add a streaming field" a compile-time error until it is cleared in exactly one place (`src/stores/chatStore.ts`; test `__tests__/unit/stores/chatStore.test.ts`).

**A3 — Ephemeral ends before the durable mutation.** The ephemeral stream is retired before emitting the durable upsert; the durable row replaces the preview by the same identity (`src/stores/chatStoreReplyFinalization.ts:52-64`, `src/stores/chatStore.ts:380-403`).

**A4 — Explicit end disposition distinguishes finalize from orphan cleanup.** A pure predicate persists only when the stream's conversation matches the target AND answer-or-reasoning is non-empty; the result lands in `lastReplyEnd`. `persisted=true` means "retire preview, expect the record"; `persisted=false` means "retire, nothing coming" — including stop-before-first-token (`chatStoreReplyFinalization.ts:52-64`; `chatStore.ts:417-428`).

**A5 — Segment reset is a content boundary, not an identity boundary.** `resetStreamingSegment` clears only text buffers; conversation ID, reply UUID, and streaming flag survive, so multi-segment reasoning/tool/answer flows render as one turn (`chatStore.ts:368-370`; `generationServiceHelpers.ts:197-207`; test `chatStore.test.ts:974-991`).

**A6 — Crash recovery restores records, not streams.** Persistence `partialize` excludes all forming fields (`chatStore.ts:489-498`; test `chatStore.test.ts:1163-1185`); the remote preview store is documented non-durable (`remoteChatStreamStore.ts:17-24`). After a crash, restore finalized transcript rows only; never resurrect an in-flight bubble.

**A7 — Partials survive stop, provider failure, and reasoning-only turns.** The service flushes buffers, treats the store's *shown* content as truth, and finalizes whenever a streaming conversation exists — even reasoning-only; clear runs only when nothing streams (`generationService.ts:209-243`).

**A8 — Receiver snapshots replace; durable arrival retires the preview.** Previews filter on matching durable IDs; successive frames update one synthetic stable-ID row; an empty set removes the completed preview because the real record arrives via the op-log (`ChatScreen/types.ts:137-185`; `remoteChatStreamStore.test.ts:49-70`).

**A9 — Resend needs a tombstone before preview discard.** `supersedeSyncedReplies` emits delete mutations for matching preview IDs *before* invoking discard, preventing an in-flight put from restoring the old reply mid-replacement (`services/sync/supersedeSyncedReplies.ts:10-27`).

### B. Crash-proof tool-calling loop (iterations 2, 7)

**B1 — Discriminated tool results.** Outcomes are `ok | empty | error` plus `errorCategory ∈ {timeout, network, validation, not-found, internal}` (`tools/types.ts:24-45`). `normalizeToolResult` derives `empty` from blank content; `toolErrorResult` converts throws (`tools/toolResult.ts:19-55`). The model-facing formatter never returns empty strings, reports failures explicitly, and caps success content at 24,000 chars (`toolResult.ts:61-92`).

**B2 — One defensive seam.** `executeToolCallSafely` is the sole execution boundary for built-in and extension tools: select provider, invoke, normalize, catch, log, emit typed error (`generationToolLoop.ts:360-382`). Both the JS loop and the native LiteRT callback route through it (`generationToolLoop.ts:384-422`, `658-722`).

**B3 — Interruption is per-turn result, not shared flag.** `ToolLoopContext.isAborted` vs `ToolLoopOutcome.interrupted`: the loop checks abort before each round, after generation, after tool execution, and returns without follow-up completion once interrupted. The source documents the race: a shared abort flag reset by a concurrent next turn paints a stopped turn as a fresh empty response (`generationToolLoop.ts:336-350`, `1231-1244`, `1269-1305`).

**B4 — Retry-without-tools only before first streamed output.** Failed attempts record whether anything streamed; a grammar/schema failure retries with `tools: []` only when nothing streamed, else rethrows to avoid double-answering the same consumer (`generationToolLoop.ts:449-559`). Empty-response fallbacks are guarded by `!streamedContent && !displayResponse && !isAborted()` (`1322-1346`).

**B5 — One step ceiling, honest terminal notice.** A validated integer setting (1–100, default 25) caps rounds per turn across engines; reaching it emits the user-facing `toolStepLimitNotice` and terminates resumably (`generationToolLoop.ts:29-36`, `1260-1277`, `1387-1389`; tests `generationToolLoop.branches.test.ts:270-318`).

### C. Service-owned architecture: store as read-only projection (iterations 6, 8)

**C1 — The contract is written down.** `rules.md:166-175`: the Service owns the authoritative state machine, resources, side-effects; the reactive store is a thin read-only projection; Views observe and dispatch intents. The SSOT debugging doctrine (`rules.md:111-151`) operationalizes it: find every writer answering the same question; collapse duplicates into one source.

**C2 — Session identity is service-owned and observable.** `GenerationSessionService` keeps the active conversation private, exposes `getConversationId / isGeneratingFor / begin / end / subscribe`; `begin` is idempotent per ID; the UI reads via `useSyncExternalStore` and never writes (`services/generationSession.ts:20-57`; `hooks/useGenerationSession.ts:5-13`).

**C3 — GenerationService owns routing, buffers, abort, finalization, queue.** All mutable generation machinery is private; consumers get defensive snapshots via `getState/subscribe/updateState` (`generationService.ts:36-68`, `122-137`). Local-vs-remote routing sits behind a provider seam (`152-164`). Stop ordering: mark abort → flush tokens → finalize shown partials → reset service state → only then stop engines (`245-299`) — a late engine callback can never decide UI state.

**C4 — Compaction owns its workflow; persists only the durable result.** `ContextCompactionService` owns the compacting flag and subscribers (`contextCompaction.ts:42-62`), computes budgets and recent-window selection (`88-121`), persists summary + cutoff through the store (`143-149`), and clears busy state in `finally` even on fallback (`135-170`). UI subscribes; the store never coordinates compaction.

### D. Streaming transcript rendering (iterations 5, 10)

**D1 — Memoize around stable identity.** Finalized message objects stay referentially stable; only the synthetic streaming item changes per token; a focused comparator ignores recreated callbacks so historical rows never re-render during streaming (`MessageRenderer.tsx:133-166`).

**D2 — Reasoning and tool activity are first-class collapsible rows.** Thinking renders as a named accordion with closed-preview/open-content modes (`ThinkingBlock.tsx:13-53`); tool call and tool result are distinct rows with status tone and details (`ToolMessages.tsx:55-141`, `243-275`).

**D3 — Disclosure state survives remount.** Expansion lives in `accordionStore` keyed by stable ID; tool rows key on `toolCallId`/turn-derived keys, not transient message IDs, because the streaming row's key changes at finalization (`accordionStore.ts:4-53`; `ToolMessages.tsx:179-229`); rows are memoized to keep press targets stable during token churn (`134-141`).

**D4 — Chunk-safe reasoning-tag parsing.** The ThinkTagParser buffers incomplete opener/closer suffixes across chunks and binds close tags to their opener format, so partial control tags never leak into visible answers (`openAICompatibleStream.ts:21-117`).

### E. Mobile chat ergonomics (iterations 5, 10)

**E1 — Autoscroll respects the reader.** Near-bottom threshold (100px) gates scroll-to-end; otherwise a haptic jump-to-bottom button appears; keyboard show and mode switches re-anchor (`ChatScreen/index.tsx:115-181`; `ChatMessageArea.tsx:255-303`).

**E2 — Composer actions are an exclusive priority state machine.** `send` (when canSend) > `stop` (while generating) > voice; send clears draft+attachments, refocuses input, resets one-shot modes (`ChatInput/index.tsx:196-210`, `323-352`).

**E3 — Defer overlay measurement until the keyboard settles.** The keyboard-aware popover dismisses the keyboard, waits for hide, waits ~300ms for composer raise, then measures (`useKeyboardAwarePopover.ts:30-75`).

**E4 — Failure copy separates repairable from impossible.** `buildNoVisionAlert` distinguishes remote-unsupported, local-model-missing-file (offers Download Manager), and model-lacks-vision; the same gate guards send and resend (`ChatInput/index.tsx:68-106`; `useChatGenerationActions.ts:143-167`).

**E5 — Attachments have stable IDs and owned affordances.** Horizontal previews with type-specific actions, removal, optional full-screen viewing (`Attachments.tsx:234-302`).

### F. Theme & design-token system (iteration 3)

**F1 — Small semantic vocabulary over raw values.** Documented brutalist/terminal language compiled into explicit typography/spacing/color tables; three-tier surfaces (`background → surface → surfaceLight`) plus semantic text/border/focus/error/overlay roles (`docs/design/DESIGN_PHILOSOPHY_SYSTEM.md:3-134`).

**F2 — Theme-dependent vs invariant tokens are separate modules.** Light/dark palettes + elevation live in `theme/palettes.ts`; `FONTS/TYPOGRAPHY/SPACING` constants are theme-independent (`constants/index.ts:160-242`), so theme switches never disturb layout rhythm.

**F3 — One themed-style seam.** `useTheme()` resolves persisted/system mode and memoizes; `useThemedStyles(factory)` memoizes the derived StyleSheet by theme mode; non-component code uses pure `getTheme(mode)` (`theme/useTheme.ts:27-47`; `useThemedStyles.ts:6-23`).

**F4 — Compliance is checklist-enforced, not compiler-enforced.** The documented checklist (touch targets ≥44, contrast, uppercase labels, states) is real but ChatInput still contains literal values and palette tests don't scan components — adopt the checklist as a review gate and treat raw values as named, local exceptions (`DESIGN_PHILOSOPHY_SYSTEM.md:331-345`; `ChatInput/styles.ts:1-32`; `palettes.test.ts:11-81`).

**F5 — Keep docs and runtime tokens synchronized.** Documented dark-shadow values drift from executable palette values; make the runtime token file authoritative and test what materially affects the product language (`DESIGN_PHILOSOPHY_SYSTEM.md:118-126` vs `palettes.ts:108-120`).

### G. Context budget & LLM I/O hardening (iterations 5, 6, 7)

**G1 — Explicit budget ledger.** 55% prompt / 12% summary reserved; recent messages fill the remainder; generation and overhead sit outside the allocation (`contextCompaction.ts:9-36`; `llmHelpers.ts:13-16`).

**G2 — Deterministic, durable compaction.** Walk backward to retain recent, truncate oversized last message, summarize older under a hard cap, persist summary + last-old-message cutoff, fall back to trim-only if summarization fails; cutoff reapplied on every context build (`contextCompaction.ts:78-168`; `chatStore.ts:136-140`, `448-461`).

**G3 — Injection-aware summarization.** Summarizer system prompt states transcript instructions are data, not commands; transcript role prefixes escaped with `>`; input/output capped (`contextCompaction.ts:38-40`, `174-215`).

**G4 — Racey retries fenced.** On context-full: stop engines, compact, retry once — refusing the retry if the generation owner aborted while summarization ran; compaction status exposed via service subscription, not store coordination (`useChatGenerationActions.ts:505-544`; `useChatScreenLifecycle.ts:62-87`).

---

## 5. Pi Remote SvelteKit Adoption Map

Iteration 10 mapped the confirmed patterns onto browser/SvelteKit primitives:

| OGAM pattern | SvelteKit/PWA transfer |
|---|---|
| Service-owned stream + replace-all projection | Svelte 5 service singleton + `$state` read-only adapter; components subscribe, never coordinate |
| Volatile forming state | In-memory only; IndexedDB/localStorage persistence carries finalized records exclusively |
| Page lifecycle (bfcache/visibility) | Pause presentation on `visibilitychange`/`pageshow`; restore from persisted records, never resurrect in-flight replies |
| Near-bottom autoscroll + FAB | Scroll-position listener + measured keyboard geometry via `visualViewport` |
| Keyboard-settled overlays | `visualViewport` resize + settle-delay before measuring popovers |
| Send/stop/voice precedence | Single derived action state in the composer store |
| Memo-per-row streaming | Keyed each-blocks with immutable finalized items + isolated streaming row |
| Stable disclosure keys across remount | Disclosure map keyed by turn/toolCallId outside the row component |
| Token tables + themed factory | CSS custom properties + derived style helpers; runtime tokens authoritative |
| Budgeted, injection-aware summarization | Server-side summarizer with escaped transcripts, persisted cutoff |

---

## 6. Evidence Boundaries & Unknowns

- **`@offgrid/sync` transport internals are UNKNOWN.** The manifest points at `file:../shared/packages/sync` (`package.json:33-40`), absent from the snapshot. Confirmed: consumer/store contracts, receiver retirement ordering (tombstone-before-discard), snapshot-replace semantics. Unknown: lease duration, sequence-window acceptance, expiry timers, heartbeat, producer-side crash recovery, exact late-frame protocol. Four independent iterations declined to infer these values.
- **RN-native specifics** (haptic engine, FlatList recycling, native keyboard events) inform the pattern shape but require web-equivalent implementation choices recorded in §5.

---

## 7. Negative Knowledge (Ruled-Out Directions)

Consolidated from per-iteration delta records:

1. **Mint durable identity only at finalization** — breaks preview↔record matching without heuristics; duplicates risk (iter 1).
2. **Retry failed streamed requests under the same turn identity** — duplicates streamed output to the same consumer; retry only pre-output (iter 2).
3. **Assuming theme tests mechanically enforce no-hardcoding** — they cover elevation structure/blur only (iter 3).
4. **Restoring streams from persisted in-progress text after a crash** — forming fields are excluded by design; recovery starts from records (iter 4).
5–9. **Inferring sync lease/sequence-window/expiry/late-frame semantics from consumers** — repeatedly refused; the implementing package is absent (iters 5, 6, 8, 9, 10).

## Eliminated Alternatives

- **Two-source coordination (store + service both owning generation state)** — eliminated by OGAM's SSOT doctrine and the concrete stopped-turn race documented in `generationToolLoop.ts:1235-1244`; adopt only the single-owner form.
- **Content-based preview matching as primary identity** — retained only as a same-origin guard; stable-ID matching is authoritative (iter 4, A8).
- **Optimistic answer replacement ("clear the bubble, start again")** — replaced by tombstone-before-discard ordering to defeat late writes (iter 4, A9).
- **HTTP-status-driven retry classification** — replaced by observed-stream classification: whether the consumer saw output decides retry legality (iter 2, B4).
- **Hardcoding visual exceptions ad hoc** — allowed only as named, local, justified exceptions under the review checklist (iter 3, F4).

## Divergence Map

No divergent-mode pivots fired in this session (`convergence_mode=default`): the loop terminated at the hard cap, not through divergent expansion.

- Completed pivots: 0 · Failed pivots: 0 · Audited overrides: 0
- Saturated directions: none formally saturated; the `@offgrid/sync` wire-protocol surface is *evidence-blocked* (absent package), pursued across five iterations that each correctly refused inference.
- Remaining frontier: paired-device transport internals (blocked on source availability); web-persistence strategy for attachments (implementation follow-up, not research).

---

## 12. Open Questions

1. Exact `@offgrid/sync` producer/receiver lease, sequence-window, expiry, heartbeat, and late-frame retirement algorithms — requires the sibling package source.
2. Concrete SvelteKit/browser persistence design for attachments and paired-stream durability (web-surface mapping pass).
3. Whether Pi Remote wants lint/grep enforcement (vs review-gate only) for its token-compliance rule.
4. Which haptic vocabulary entries survive on iOS Safari PWA (non-blocking fallback documented in iter 10).

---

## References

Primary: `specs/context/OGAM-main` sources as cited inline (`file:line` at read time), including `src/stores/chatStore.ts`, `src/stores/chatStoreReplyFinalization.ts`, `src/stores/chatPersistence.ts`, `src/stores/remoteChatStreamStore.ts`, `src/stores/accordionStore.ts`, `src/services/generationToolLoop.ts`, `src/services/generationService.ts`, `src/services/generationServiceHelpers.ts`, `src/services/generationSession.ts`, `src/services/contextCompaction.ts`, `src/services/tools/{types,toolResult}.ts`, `src/services/providers/openAICompatibleStream.ts`, `src/services/sync/supersedeSyncedReplies.ts`, `src/screens/ChatScreen/*`, `src/components/ChatInput/*`, `src/components/ChatMessage/*`, `src/theme/*`, `src/constants/index.ts`, `rules.md`, `docs/design/DESIGN_PHILOSOPHY_SYSTEM.md`, `docs/standards/CODEBASE_GUIDE.md`, plus unit/integration tests cited per finding.

Per-iteration narratives: `research/iterations/iteration-001.md` … `iteration-010.md` (authoritative detail trail). Structured deltas: `research/deltas/iter-*.jsonl`.

Resource inventory: `research/resource-map.md`.

---

## Appendix: Convergence Report

- Stop reason: `maxIterationsReached`
- Total iterations: 10
- Questions answered: registry-tracked coverage stayed conservative (leaf narratives answered all seven charter angles across runs; formal resolution markers were not emitted into the registry inbox flow)
- Last 3 iteration summaries: run 8: citation verification & depth sweep (0.58); run 9: sync-package evidence boundary, constrained (0.42); run 10: browser lifecycle & viewport mapping (0.78)
- Convergence threshold: 0.05 (never approached — the target stayed productive through the cap)
- Divergence summary: no divergent pivots (default mode)
