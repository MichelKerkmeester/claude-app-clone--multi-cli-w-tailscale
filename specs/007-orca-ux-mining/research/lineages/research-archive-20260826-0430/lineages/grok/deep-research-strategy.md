# Deep Research Strategy - Orca UX mining (grok lineage)

Runtime strategy for lineage `fanout-grok-1787717167874-ti5kfp`. Tracks research progress across iterations.

## 1. OVERVIEW

Detached fan-out lineage investigating orca mobile + Electron surfaces for portable chat and home session-selection UX under our host-authoritative/fail-closed constraint.

---

## 2. TOPIC
Mine specs/context/orca-main for portable UI/UX and chat-feature logic to improve our SvelteKit mobile client, prioritising (1) user chat UX and (2) home-screen session-selection UX. Investigate orca's `mobile/` (React Native) and `src/renderer/` (Electron) surfaces. For each finding: name the orca file/pattern, the concrete UX or logic to copy, how it maps onto our host-authoritative/fail-closed constraint, and a portability verdict (drop-in view affordance / needs a new host field / not portable). Weight findings toward session-selection and chat UX.

---

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)
Generated from the reducer registry. Add external or late questions through inbox.jsonl; direct edits are imported as compatibility input and may be replaced on the next reduce step.

- [ ] How does orca list, group, sort, filter, and badge parallel sessions on mobile home and Electron sidebar, and which of those affordances can sit on our existing SessionCardDto?
- [ ] Exactly which fields does an orca session card show, how are human titles/summaries/previews derived, and which map to our DTO vs a new host field?
- [ ] What message-level chat affordances exist (menu, copy, reply/quote, edit-and-resend, regenerate, search, turn nav), and which are portable under host-authoritative/fail-closed?
- [ ] What composer patterns (attachments, paste-image, voice, @-mentions, slash/command-arg UI, prompt history) can we copy without the client owning session truth?
- [ ] How do session-to-chat transitions, peek/preview, resume markers, tabs, and back-swipe work, and what is view-only versus a new host field?
<!-- /ANCHOR:key-questions -->

---

## 4. NON-GOALS
- Implementing UI, protocol, or host changes in this lineage.
- Porting orca patterns that require the client to own mutable session truth (rename, pin, archive, local title edits) without an explicit new host field.
- Mining desktop-only IDE surfaces (git graph, PTY panes, plugin host) except where they directly inform session-selection or chat UX.
- Broad product strategy for orca itself; we extract portable patterns for our SvelteKit client only.
- Mutating `specs/007-orca-ux-mining/spec.md` or any path outside this lineage directory.

---

## 5. STOP CONDITIONS
- `config.maxIterations` (20) reached. `stopPolicy` is `max-iterations`; convergence before that is telemetry only — broaden angles instead of synthesizing early.
- `config.convergenceThreshold` 0.05 is recorded for telemetry, not as a legal stop.
- Stuck recovery may widen focus but must not exit to synthesis before iteration 20.
- Save phase (`generate-context.js`, `validate.sh`, git writes) is forbidden in this lineage.

---

<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS
[None yet — populated as iterations answer questions]
<!-- /ANCHOR:answered-questions -->

---

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED
[First iteration — populated after iteration 1 completes]
<!-- /ANCHOR:what-worked -->

---

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED
[First iteration — populated after iteration 1 completes]
<!-- /ANCHOR:what-failed -->

---

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)
[Populated when an approach has been tried from multiple angles without success]
<!-- /ANCHOR:exhausted-approaches -->

---

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS
[Approaches that were investigated and definitively eliminated — consolidated from iteration dead-end data]
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
[Self-owned open questions from iteration write-back — populated after iteration 1 completes]
<!-- /ANCHOR:carried-forward-open-questions -->

---

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS
Orca mobile Agent Session History list: card fields, section grouping, expand-to-peek preview, pull-to-refresh, and resume action — map each to SessionCardDto vs new host field.
<!-- /ANCHOR:next-focus -->

---

<!-- MACHINE-OWNED: END -->
## 12. KNOWN CONTEXT

### Resource map
resource-map.md not present; skipping coverage gate.

### Spec anchoring
`specs/007-orca-ux-mining/spec.md` is absent (`folder_state: no-spec`). This lineage's write surface is `specs/007-orca-ux-mining/research/lineages/grok` only, so the no-spec seed branch is skipped (would write outside the lineage). `research.md` in this directory remains canonical for the lineage.

### Memory / MCP
Spec Kit Memory MCP tools were not available in this Cursor runtime; Known Context is sourced from direct file reads, not `memory_context()`.

### Bounded Context Snapshot

- Source pointers (ours): `packages/pi-rpc-protocol/src/types.ts` `SessionCardDto` (`id`, `status`, `updatedAt`, `messageCount`); `app-mobile/src/pages/home/screen-home.svelte` (status pill, compacted id, `messageCount` blocks, coarse `relativeTime`, whole-card tap); `specs/007-orca-ux-mining/research-angles.md` (gaps + constraint).
- Source pointers (orca mobile): `mobile/src/agent-history/agent-history-session-card.ts`, `agent-history-sections.ts`, `MobileAgentSessionHistoryList.tsx`; `mobile/src/worktree/home-resume-card.ts`.
- Source pointers (orca shared/renderer): `src/shared/ai-vault-types.ts` (`AiVaultSession`); `src/shared/ai-vault-session-filters.ts`; `src/shared/ai-vault-session-display.ts`; `src/renderer/src/components/sidebar/WorktreeCardAgents.tsx`; `src/renderer/src/components/right-sidebar/AiVaultSessionRow.tsx`.
- Reuse candidates: orca's shared filter/group/preview core (already lifted out of renderer so mobile can import it); our existing status pill + relative time + messageCount as the only legal drop-in fields today.
- Integration points: any ported card content that needs title, last-message, agent, cwd, branch, model, tokens, or preview turns requires a new host field or a host-provided projection — the client must not invent those.
- Constraints and risks: host-authoritative/fail-closed; client holds no editable session metadata; `epoch` exists on other DTOs but not on `SessionCardDto`; memory graph unavailable; do not run `reduce-state.cjs` (it calls `resolveArtifactRoot` against the parent spec folder).

### Host DTO vs orca card (init snapshot, not a finding yet)
Our home card currently renders: `status`, compacted `id`, `messageCount`, `updatedAt`. Orca's `AiVaultSession` already carries `title`, `cwd`, `branch`, `model`, `previewMessages`, `totalTokens`, `agent`, `queuedMessageCount`, `subagentTranscriptCount`, plus host identity.

---

## 13. RESEARCH BOUNDARIES
- Max iterations: 20
- Convergence threshold: 0.05 (telemetry only under `stopPolicy: max-iterations`)
- Per-iteration budget: 12 tool calls, 10 minutes
- Progressive synthesis: true
- research.md ownership: workflow-owned canonical synthesis output at this lineage root
- Lifecycle branches: `resume`, `restart` (live); `fork`, `completed-continue` (deferred)
- Machine-owned sections: reducer controls Sections 3, 6, 7-11A, including Section 10A pivot lineage
- Question injection surface: `{artifact_dir}/inbox.jsonl`
- Canonical pause sentinel: `{artifact_dir}/.deep-research-pause`
- Current generation: 1
- Started: 2026-08-26T04:16:26Z
- Write surface: `specs/007-orca-ux-mining/research/lineages/grok` only
