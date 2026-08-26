---
title: Deep Research Strategy - Orca UX Mining / Luna
description: Detached lineage strategy for portable chat and session-selection research.
contextType: planning
version: 1.14.0.20
---

# Deep Research Strategy - Orca UX Mining / Luna

## 1. OVERVIEW

This is the `cli-codex` detached lineage for the bounded research packet. The lineage owns only files under this directory. The target code and authored spec are read-only inputs.

## 2. TOPIC

Mine `specs/context/orca-main` for portable UI/UX and chat-feature logic to improve the SvelteKit mobile client, prioritising user chat UX and home-screen session selection.

<!-- ANCHOR:key-questions -->
## 3. KEY QUESTIONS (remaining)

- [x] What session-list/card model in `mobile/` or `src/renderer/` best improves selection, grouping, status, attention, and navigation?
- [x] Which message-level chat affordances and reconciliation patterns are concrete, well evidenced, and portable?
- [x] Which composer, attachment, command, and prompt-history patterns improve chat without client-owned session truth?
- [x] Which streaming, progress, retry, and interruption patterns improve trust while remaining fail-closed?
- [x] Which findings require new host fields, and which are drop-in view affordances or not portable?
<!-- /ANCHOR:key-questions -->

## 4. NON-GOALS

- Do not implement changes in the SvelteKit client.
- Do not change orca, the host protocol, the authored spec, memory indexes, or git state.
- Do not recommend client-owned mutable session metadata, optimistic authority, or fail-open behavior.

## 5. STOP CONDITIONS

- Run all 20 iterations because `max-iterations` makes convergence telemetry-only.
- Stop only for an unrecoverable execution failure; synthesis must preserve partial evidence if that occurs.

<!-- ANCHOR:answered-questions -->
## 6. ANSWERED QUESTIONS

All five are answered. The session-selection answer is a host-scanned card projection plus deterministic local selection views; the chat answer is scoped presentation and reconciliation; the composer answer is local draft state fenced by host capabilities; the streaming answer is canonical rebuild plus explicit unknown outcomes; the host-field answer is a minimal title/preview/attention/identity/capability/artifact/follow envelope.
<!-- /ANCHOR:answered-questions -->

<!-- MACHINE-OWNED: START -->
<!-- ANCHOR:what-worked -->
## 7. WHAT WORKED

- Initial source inventory is separated by angle and verified with exact file citations.
- Home selection evidence was expanded through mobile history/worktree, Electron AI-vault, ordering, attention, refresh, peek, resume, and route transitions.
- Chat evidence was expanded through message rows, grouping, copy, attachments, paste, drafts, autocomplete, history, stream assembly, reconciliation, ask cards, and Stop outcomes.
- Executable Orca tests were used as contract evidence for incremental assembly, image reconciliation, send-error scope, and last-tab identity behavior.
- A final cross-angle audit confirmed a minimal host-field request and explicit negative knowledge.
<!-- /ANCHOR:what-worked -->

<!-- ANCHOR:what-failed -->
## 8. WHAT FAILED

- The normal executor and spec validation paths cannot be used because the detached lineage must not write outside its artifact directory.
- Continuity save and packet-level spec synchronization remain intentionally deferred; this lineage has no authority to write those surfaces.
<!-- /ANCHOR:what-failed -->

<!-- ANCHOR:exhausted-approaches -->
## 9. EXHAUSTED APPROACHES (do not retry)

- Basic status/count/time card polish is saturated; further value requires richer host fields.
- Raw file-path permission inference and client-owned session metadata are exhausted and ruled out.
- Native-chat regenerate/edit/reply/reaction behavior remains unverified rather than a reusable pattern.
<!-- /ANCHOR:exhausted-approaches -->

<!-- ANCHOR:ruled-out-directions -->
## 10. RULED OUT DIRECTIONS

- Direct authored-spec synchronization is out of scope for this lineage because its write target is outside the authorized artifact directory.
- Client-derived title/preview, hostless capability actions, arbitrary file opening, and unconfirmed-success reporting are ruled out by the fail-closed constraint.
<!-- /ANCHOR:ruled-out-directions -->

<!-- ANCHOR:divergence-frontier -->
## 10A. SATURATED DIRECTIONS AND DIVERGENCE FRONTIER

- Completed pivots: 6
- Failed pivots: 0
- Audited overrides: 0
- Saturated: basic status/count/time polish; raw-path and unsupported mutation directions
- Pivot lineage: home-selection → message-UX → composer → streaming/control → navigation → contract-audit
- Remaining frontier: implementation planning, host contract design, and future evidence for unsupported message mutations.
<!-- /ANCHOR:divergence-frontier -->

<!-- ANCHOR:carried-forward-open-questions -->
## 11A. CARRIED-FORWARD OPEN QUESTIONS

No unresolved charter questions. Open implementation questions are whether the host can supply the proposed card envelope, how artifact references are authorized/expired, and whether a follow/tab activation command belongs in the first contract.
<!-- /ANCHOR:carried-forward-open-questions -->

<!-- ANCHOR:next-focus -->
## 11. NEXT FOCUS

Research synthesis complete after iteration 20; no next research focus remains.
<!-- /ANCHOR:next-focus -->

<!-- MACHINE-OWNED: END -->
## 12. KNOWN CONTEXT

### Bounded Context Snapshot

- Source pointers: `mobile/src/agent-history/`, `mobile/src/components/WorktreeListRow.tsx`, `mobile/src/components/WorktreeAgentList.tsx`, `mobile/src/history/`, `mobile/src/native-chat/`, `mobile/src/components/MobileSearchField.tsx`, `src/renderer/` session/chat surfaces.
- Client pointers: `app-mobile/src/routes/+page.svelte`, `app-mobile/src/routes/session/[id]/+page.svelte`, shared session DTO/transport and transcript/composer components.
- Existing strengths: the client already has streaming transcript follow, composer command palette, model/effort sheets, plan/review sheets, artifact viewing, attention/review surfaces, and accessibility live regions.
- Primary gaps: home selection search/filter/grouping/attention/title/preview/new-session affordances; message menus/search/retry/quote; richer composer attachments/history/mentions.
- Constraint: the host owns session truth; client views must derive from existing DTOs or request explicit fields, and unknown or stale authority must fail closed.

## 13. RESEARCH BOUNDARIES

- Max iterations: 20
- Convergence threshold: 0.05; convergence is telemetry only under `max-iterations`
- Per-iteration budget: 12 tool calls, 10 minutes
- Progressive synthesis: enabled
- Canonical output: `research.md` in this lineage
- External spec sync, memory save, validation, and git writes: deferred/forbidden by lineage contract
- Session ID: `fanout-luna-1787718935950-gxg4a7`
- Started: 2026-08-26T04:46:00Z
