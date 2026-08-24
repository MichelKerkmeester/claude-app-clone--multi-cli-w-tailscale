---
title: "Feature Specification: Nodeterm Adoptable-Pattern Research for Pi Remote"
description: "Findings-only deep research mining specs/context/nodeterm-main for patterns adoptable by the Pi Remote SvelteKit mobile chat + remote-agent PWA."
trigger_phrases:
  - "nodeterm"
  - "adoptable patterns"
  - "Pi Remote PWA"
  - "pattern mining"
  - "deep research"
importance_tier: "normal"
contextType: "general"
---

# Feature Specification: Nodeterm Adoptable-Pattern Research for Pi Remote

<!-- SPECKIT_LEVEL: 1 -->
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 1 |
| **Priority** | P0 |
| **Status** | Active |
| **Created** | 2026-08-22 |
| **Branch** | n/a (research packet) |

<!-- /ANCHOR:metadata -->
---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The Pi Remote SvelteKit mobile chat + remote-agent PWA is being designed without systematically harvesting the proven solutions its sibling app nodeterm already shipped for the same remote-agent-control problem (carrier abstraction, E2EE relay security, agent status reduction, approvals, mobile inbox, push decisioning).

### Purpose
Produce a cited, synthesized findings document of adoptable patterns from specs/context/nodeterm-main that the Pi Remote SPA migration can plan against, across architecture, security, logic, ease-of-use, and UX angles defined in charter.md.

<!-- /ANCHOR:problem -->
---

<!-- ANCHOR:scope -->
## 3. SCOPE

<!-- DR-SEED:SCOPE -->

### In Scope
- Read-only investigation of specs/context/nodeterm-main source and docs at the paths enumerated in charter.md.
- Extract one finding set per charter angle: FrameTransport/RPC carrier abstraction; relay E2EE security envelope; agent status state machine; transcript/event normalization and tails; hook-reply Approve/Deny; MirrorFile/MirrorInbox mobile contract; session drop resilience; push-notification decisioning.
- Every finding carries a specs/context/nodeterm-main file:line citation and an adoption note for a web PWA.

### Out of Scope
- Any modification of specs/context/** (READ-ONLY target).
- Code changes to any repository; implementation planning happens in later packets.
- On-device inference, native modules, platform-specific mechanisms that do not transfer to a web PWA.

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| research/iterations/*, research/deltas/*, research/research.md | Create | Iteration evidence and final synthesis (workflow-owned) |

<!-- /ANCHOR:scope -->
---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

<!-- DR-SEED:REQUIREMENTS -->

### P0 - Blockers (MUST complete)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | Investigate all eight charter angles | Each KQ1–KQ8 has findings or an explicit ruled-out/negative-knowledge record |
| REQ-002 | Cite every finding | Findings reference specs/context/nodeterm-main file:line locations |
| REQ-003 | Preserve target integrity | Zero writes to specs/context/**; any attempted mutation is reported as a scope violation instead |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-004 | Synthesize into research/research.md | 17-section canonical synthesis including Eliminated Alternatives and Divergence Map |
| REQ-005 | Flag adoptability | Each pattern notes transfer-to-PWA feasibility and known constraints |

<!-- /ANCHOR:requirements -->
---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: research/research.md exists with per-angle findings, file:line citations, and negative knowledge.
- **SC-002**: Loop terminated legally (convergence below threshold after min iterations, or iteration cap reached).

<!-- /ANCHOR:success-criteria -->
---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | Accidental writes into READ-ONLY target | Violates charter | Prompt-pack allowed-write list scoped to research packet; write-containment enforcement on dispatch |
| Dependency | Target repo present at specs/context/nodeterm-main | Cannot investigate | Verified present before loop start |

<!-- /ANCHOR:risks -->
---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Mine the sibling app at specs/context/nodeterm-main (read-only) for patterns adoptable by the pi remote sveltekit mobile chat remote agent pwa across ease of use architecture ux and logic
- Which nodeterm relay security pieces are worth adopting wholesale vs simplifying for Pi Remote's threat model?
- Does the mirror/inbox mobile contract fit Pi Remote's single-user model unchanged?

<!-- BEGIN GENERATED: deep-research/spec-findings -->
### Deep-Research Findings (generated)

Loop completed 2026-08-23; stop reason `maxIterationsReached`; 10 iterations (9 productive), 65 cited findings, all eight charter angles answered on primary-source evidence. Canonical synthesis: `research/research.md`.

- KQ1 architecture: four-method `FrameTransport` seam (send/onMessage/onClose/ready) carries one agent core over Electron IPC, browser WS, and E2EE relay; adopt seam + RPC envelope (incl. `undef`) + fail-pending close semantics verbatim.
- KQ2 security: nine-layer untrusted-relay envelope (NaCl box, per-session HKDF, sealed `[role][seq][tag]`, anti-reflection role check, seq anti-replay, handshake freeze, SAS mutual approval, approval-from-ciphertext-only, endianness discipline), each layer attack-mapped; zero discrepancies between protocol doc and primary source.
- KQ3 logic: reduceEntry guards (DONE_HOLDOFF, stale sweeper, interrupt inference, awaitingInput hold, idle rescue, newTurn gating, transient-vs-persisted labels) eliminate race-condition false flips.
- KQ4 logic: `NormalizedAgentEvent` union + six per-agent normalizers behind one dispatcher; capped byte-offset transcript tails stream subagent fan-out and context fill.
- KQ5 ease-of-use: hold-hook + answer-file approval tickets (`pendingId`, PENDING_ID_RE traversal guard, fail-open TTL, askKind stripping, re-read-before-send) replace keystroke injection.
- KQ6 ux: additive MirrorFile/MirrorInbox contract (hard caps, title dedup, host-owned resolution, live-card activity strings) powers the mobile screen over an 8 s poll.
- KQ7 ux: connected/connecting/offline sessions, reconnect-in-place bookmarks, ready()-hang race fix, server-side heartbeat/reap, 8 MiB frame cap keep sessions usable across drops.
- KQ8 ease-of-use: push decisioning = shared actionable seam, 2 s batch ≤10 events, 5 s/node throttle, presence-aware hold queue flushed on present→away, capability-file grants, deliver-on-idle with flush-time re-validation.
- Adoption priority for Pi Remote PWA: transport+envelope and status guards first (P0); approvals+inbox and drop resilience next (P1); push skeleton and E2EE checklist when scope opens (P2).

Open residuals: backpressure.test.ts unread (deferred twice under budget); pin-once vs full-SAS is nodeterm's own open product decision; union-targeting double-push tradeoff likely collapses under Pi Remote's single-user model.
<!-- END GENERATED: deep-research/spec-findings -->

<!-- /ANCHOR:questions -->
