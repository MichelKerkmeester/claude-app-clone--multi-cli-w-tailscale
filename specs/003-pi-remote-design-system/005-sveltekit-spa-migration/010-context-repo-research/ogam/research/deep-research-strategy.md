---
title: Deep Research Strategy - OGAM Pattern Mining
description: Session tracking for the OGAM-main adoptable-pattern research loop feeding the Pi Remote SvelteKit mobile PWA migration.
trigger_phrases:
  - "deep research strategy"
  - "ogam pattern mining"
  - "research session tracking"
importance_tier: normal
contextType: planning
version: 1.14.0.19
---

# Deep Research Strategy - OGAM Pattern Mining

Runtime template copied to `{spec_folder}/research/` during initialization. Tracks research progress across iterations.

## 1. OVERVIEW

### Purpose

Serves as the "persistent brain" for a deep research session. Records what to investigate, what worked, what failed, and where to focus next. Read by the orchestrator and agents at every iteration.

### Usage

- **Init:** Orchestrator copies this template to `{spec_folder}/research/deep-research-strategy.md` and populates Topic, Key Questions, Known Context, and Research Boundaries from config and memory context.
- **Per iteration:** Agent reads Next Focus, writes iteration evidence, and the reducer refreshes What Worked/Failed, answered questions, carried-forward questions, ruled-out directions, and Next Focus.
- **Mutability:** Mutable — analyst-owned sections remain stable, while machine-owned sections are rewritten by the reducer after each iteration. Section 3 is a generated projection from the reducer registry.
- **Protection:** Shared state with explicit ownership boundaries. Orchestrator validates consistency on resume.

---

## 2. TOPIC
Mine specs/context/OGAM-main (READ-ONLY) for adoptable patterns for the Pi Remote SvelteKit mobile chat + remote-agent PWA, across ease-of-use, architecture, UX, and logic. Angles + where-to-look: specs/003-pi-remote-design-system/005-sveltekit-spa-migration/010-context-repo-research/ogam/charter.md. Produce adoptable-pattern findings with specs/context/OGAM-main/file:line citations. NEVER modify specs/context/**.

Research charter: `specs/003-pi-remote-design-system/005-sveltekit-spa-migration/010-context-repo-research/ogam/charter.md` (target READ-ONLY; findings only).

---

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)
- [ ] [logic] How does OGAM model a streaming assistant reply as a single-identity state machine from before-first-token through finalization so stream, persisted record, and paired device never duplicate, orphan, or leak state (uuid-at-startStreaming, NO_REPLY_FORMING Pick type, ephemeral-before-durable ordering, resetStreamingSegment, clear vs finalize)?
- [ ] [logic] What makes OGAM's tool-calling loop crash-proof and race-proof — typed ToolResult (ok|empty|error + errorCategory), executeToolCallSafely as single defensive seam, per-turn interrupted flag vs shared abort, retry-without-tools with streamed-error dedup, step-limit ceiling?
- [ ] [architecture] How does OGAM enforce reactive-store-as-read-only-projection while a service owns the authoritative state machine, side-effects, and resources (MVVM/MVP rule, capability-as-data, SSOT debugging doctrine)?
- [ ] [ux] How does OGAM keep a streaming transcript fast and render reasoning/thinking and tool call+result rows as first-class collapsible surfaces (memo-per-item, stableKey surviving remount, accordionStore, ThinkTagParser across chunked reasoning tags)?
- [ ] [ux] What mobile chat ergonomics does OGAM use for composer, autoscroll, keyboard, attachments, haptics, and failure messaging (isNearBottomRef gating, jump-to-bottom FAB, keyboard-aware popover, canSend/stop action state machine, buildNoVisionAlert actionable failures)?
- [ ] [ease-of-use] How is OGAM's theme + design-token system structured so components never hardcode color/spacing/typography and stay consistent under a documented brutalist/terminal language (useTheme()/useThemedStyles factory, three-tier surfaces, token tables, component checklist)?
- [ ] [other] How does OGAM bound long-session context budget and harden LLM I/O against prompt injection and untyped failures (budget ratios, summarize-older compaction with persisted cutoff, service-owned observable, anti-injection summarizer prompt, coarse error taxonomy)?

<!-- /ANCHOR:key-questions -->

---

## 4. NON-GOALS
From the research charter:
- On-device inference / native modules / anything platform-specific that does not transfer to a web PWA.
- Any modification of `specs/context/**` (target repo is strictly READ-ONLY).
- Code changes in this packet — findings only, no implementation.
- Non-goals do not include Pi Remote app code; this packet mines patterns only.

---

## 5. STOP CONDITIONS
- Convergence: newInfoRatio < 0.05 (rolling composite per convergence contract).
- Hard cap: 10 iterations (`maxIterations`).
- Charter stop conditions mirror config; session ends into synthesis when either fires.

---

<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS
[None yet]

<!-- /ANCHOR:answered-questions -->

---

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED
[None yet]

<!-- /ANCHOR:what-worked -->

---

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED
[None yet]

<!-- /ANCHOR:what-failed -->

---

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)
[No exhausted approach categories yet]

<!-- /ANCHOR:exhausted-approaches -->

---

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS
[None yet]

<!-- /ANCHOR:ruled-out-directions -->

---

<!-- ANCHOR:divergence-frontier -->
## 10A. SATURATED DIRECTIONS AND DIVERGENCE FRONTIER
- Completed pivots: 0
- Failed pivots: 0
- Audited overrides: 0
- Saturated: none yet
- Pivot lineage: none yet
- Remaining frontier: none recorded

<!-- /ANCHOR:divergence-frontier -->

---

<!-- ANCHOR:carried-forward-open-questions -->
## 11A. CARRIED-FORWARD OPEN QUESTIONS
- Transcript rendering, remote stream preview transport, and the exact receiver-side retirement protocol need separate UX/architecture passes. (iteration 1)
- The service-versus-reactive-store ownership boundary needs evidence from the generation/session and compaction services. (iteration 1)
- Tool-loop defensive semantics remain to be researched: typed tool outcomes, safe execution, per-turn interruption, retry without tools, streamed-error deduplication, and step ceilings. (iteration 1)
- [ ] [ux] How does OGAM render streaming transcript items, reasoning, and tool rows as fast, collapsible first-class surfaces? (iteration 2)
- [ ] [architecture] How does OGAM enforce reactive-store-as-read-only-projection while a service owns the authoritative state machine, side-effects, and resources? (iteration 2)
- [ ] [ux] What mobile composer, keyboard, attachment, haptics, and failure-message ergonomics are directly adoptable? (iteration 2)
- [ ] [other] How are long-session context budgets and prompt-injection defenses bounded? (iteration 2)
- [ ] [ease-of-use] How is the theme and design-token system structured and documented? (iteration 2)
- [ ] [logic] How does OGAM model a streaming assistant reply as a single-identity state machine from before-first-token through finalization? (iteration 3)
- The broader service-versus-reactive-store ownership question remains open for the architecture-focused iteration. (iteration 4)
- A future pass should trace the service-owned paired-device stream transport when that shared package is available, especially the receiver's handling of `persisted=false` and late frames after tombstone. (iteration 4)
- The exact `@offgrid/sync` producer/receiver lease, sequence-window, and expiry implementation remains unconfirmed because its sibling package is absent from the snapshot. (iteration 4)
- Pi Remote still needs a concrete mapping from these React Native affordances to SvelteKit/browser primitives, especially keyboard viewport behavior and attachment persistence. (iteration 5)
- The complete service-versus-reactive-store ownership map for generation and paired-device transport needs a source pass when the shared package is available. (iteration 5)
- The exact SvelteKit/browser persistence strategy for attachment and paired-stream durability still needs a web-surface mapping pass. (iteration 6)
- The shared sync package's producer/receiver lease, sequence window, expiry, and late-frame retirement protocol remain unconfirmed. (iteration 6)
- Tool-loop typed-result and retry semantics were not re-read in this architecture-focused pass. (iteration 6)
- The source snapshot does not show a single typed enum reused by both `ToolErrorCategory` and LLM request retry classification; those are currently complementary seams (tool-result taxonomy versus request-error predicates). (iteration 7)
- The exact SvelteKit/browser persistence implementation for attachment and paired-stream durability remains open. (iteration 7)
- The exact shared sync-package producer/receiver lease, sequence window, expiry, and late-frame retirement protocol remains unconfirmed because that package is absent from the snapshot. (iteration 7)
- The exact SvelteKit/browser persistence mapping for attachments and paired-stream durability remains open. (iteration 8)
- The streaming identity chain and transcript rendering ergonomics are source-backed, but still need a direct Pi Remote mapping pass for browser lifecycle and viewport primitives. (iteration 8)
- The exact shared sync-package producer/receiver lease, sequence window, expiry, and late-frame retirement protocol remains **UNKNOWN** because the package is absent from the snapshot. (iteration 8)
- The exact producer/receiver lease duration, renewal/heartbeat, sequence-window acceptance, expiry clock/timer, and late-frame retirement behavior remain UNKNOWN until `../shared/packages/sync` or an equivalent source snapshot is available. (iteration 9)
- The final Pi Remote mapping still needs browser lifecycle and viewport details, but those should be designed against the confirmed projection/tombstone contract rather than invented wire semantics. (iteration 9)
- Pi Remote must choose and test browser attachment durability (ephemeral object URLs versus IndexedDB/File System Access/upload-backed records). (iteration 10)
- The exact `@offgrid/sync` producer/receiver lease, renewal, sequence-window, expiry, and late-frame retirement behavior remains UNKNOWN. (iteration 10)
- Pi Remote must define whether hidden tabs keep the producer alive, pause transport, or rely on server-side continuation; OGAM's native lifecycle only establishes that presentation/resource ownership needs explicit cleanup. (iteration 10)

<!-- /ANCHOR:carried-forward-open-questions -->

---

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS
Pi Remote must define whether hidden tabs keep the producer alive, pause transport, or rely on server-side continuation; OGAM's native lifecycle only establishes that presentation/resource ownership needs explicit cleanup.

<!-- /ANCHOR:next-focus -->

---

<!-- MACHINE-OWNED: END -->
## 12. KNOWN CONTEXT
Memory daemon was unavailable at init (advisory timeout); prior_context = None.

resource-map.md not present; skipping coverage gate.

### Bounded Context Snapshot

Target under study (READ-ONLY): `specs/context/OGAM-main` — privacy-first mobile AI suite ("Off Grid AI"), React Native streaming chat/transcript UI with tool calls, reasoning display, attachments, draft-then-approve actions, OpenAI-compatible remote servers.

- Source pointers (from charter): `src/stores/chatStore.ts`, `src/stores/chatStoreReplyFinalization.ts`, `src/stores/chatMessageMutationActions.ts`, `src/stores/chatPersistence.ts`, `src/services/generationToolLoop.ts`, `src/services/tools/{types,toolResult,registry}.ts`, `rules.md`, `src/services/{contextCompaction,generationSession,generationService}.ts`, `src/screens/ChatScreen/*`, `src/components/ChatMessage/*`, `src/components/ChatInput/*`, `src/theme/`, `docs/design/*`.
- Consumer surface: Pi Remote SvelteKit mobile PWA (Svelte 5 runes migration track `005-sveltekit-spa-migration`).
- Constraints: target repo strictly read-only; findings must cite `specs/context/OGAM-main/file:line`; only patterns transferable to a web PWA count.
- Risks: RN-specific APIs (Reanimated, native haptics, List components) need translation judgment to web equivalents.

---

## 13. RESEARCH BOUNDARIES
- Max iterations: 10
- Convergence threshold: 0.05
- Per-iteration budget: 12 tool calls, 10 minutes
- Progressive synthesis: true (default)
- research/research.md ownership: workflow-owned canonical synthesis output
- Lifecycle branches: `resume`, `restart` (live); `fork`, `completed-continue` (deferred, not runtime-wired)
- Machine-owned sections: reducer controls Sections 3, 6, 7-11A, including Section 10A pivot lineage
- Question injection surface: `{spec_folder}/research/inbox.jsonl`
- Question conflict owner: reducer registry; `question_conflict` events surface inbox/registry disagreements for operator decision
- Canonical pause sentinel: `research/.deep-research-pause`
- Capability matrix: `.opencode/skills/system-deep-loop/deep-research/assets/runtime-capabilities.json`
- Capability matrix doc: `.opencode/skills/system-deep-loop/deep-research/references/guides/capability-matrix.md`
- Capability resolver: `.opencode/skills/system-deep-loop/deep-research/scripts/runtime-capabilities.cjs`
- Current generation: 1
- Started: 2026-08-22T20:22:34Z
