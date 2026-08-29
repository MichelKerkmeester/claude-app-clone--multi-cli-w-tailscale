---
title: "Feature Specification: 008 UI/UX features mining - phase parent"
description: "Phase parent for implementing the 99 mined orca+nodeterm UI/UX findings in the host-authoritative, fail-closed SvelteKit mobile client. Decomposes the master plan into 7 independently buildable Level-2 phase children, each a coherent surface, with every finding assigned to exactly one phase and the 2 principle-only items excluded. Phases 8-14 follow on: they own no findings and instead make the screenshot archive trustworthy, then refine every surface it exposes."
trigger_phrases:
  - "uiux features mining spec requirements"
  - "uiux features mining phase"
  - "spec requirements"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Phases 1-7 shipped; added 8-14 for archive integrity and UI refinement."
    next_safe_action: "Operator picks a phase; client phases 001-004 before host phases 005-007."
    blockers:
      - "Phases 005, 006, 007 carry host-gated findings; each blocked finding needs a relay-authored, client-read-only field or RPC before its render unblocks."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Feature Specification: 008 UI/UX features mining (phase parent)

> Lean phase parent. Only this spec.md, description.json, and graph-metadata.json are authored at the parent. Every plan, task ledger, checklist, and decision lives in the phase children listed in the Phase Documentation Map. The master decomposition source is this folder's `plan.md` (the three-wave sequencing of all 99 findings); the finding data is `research/findings-registry.json`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 (phase parent) |
| **Priority** | P1 |
| **Status** | Planned |
| **Created** | 2026-08-27 |
| **Branch** | `main` |
| **Parent Packet** | `007-orca-nodeterm-ux-mining` |
| **Source of truth** | `plan.md` (3-wave sequencing) + `research/findings-registry.json` (99 findings) |
| **Constraint** | Host-authoritative, fail-closed - the client owns no editable session truth |
| **Findings** | 99 total: 97 assigned across phases 1-7, 2 excluded (RS-4, RS-5); phases 8-14 own none |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The orca+nodeterm mining run produced 99 verdict-checked UI/UX findings for the app-mobile client (Pi Remote, a host-authoritative fail-closed SvelteKit PWA). The master `plan.md` sequences them into three waves but is a single flat backlog. It needs a phased packet structure so each coherent surface can be planned, built, verified, and shipped as an independent unit without one finding drifting into two workstreams.

### Purpose
Turn the 99 findings into 7 independently executable Level-2 phase children, one coherent surface each, with every finding assigned to exactly one phase and the 2 not-portable principle-only items formally excluded. Phases 8-14 were added after those seven shipped, to close a gap no gate could see: they own no findings and refine the surfaces the screenshot archive exposes. The client-only phases can ship now; the host-gated phases plan their client work now and unblock as each relay field lands.

> **Phase-parent note:** This spec.md is the only authored narrative document at the parent level. All detailed planning, task breakdowns, checklists, and per-finding requirements live in the child phase folders in the Phase Documentation Map below. This keeps the parent from drifting stale as phases execute.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Implementing the 97 portable findings across 7 phase children, each finding in exactly one phase.
- Client-only surfaces (phases 001-004): composer/send, streaming/reader/media, home/switcher/nav/search, accessibility/onboarding.
- Host-gated surfaces (phases 005-007): cross-session inbox/notifications, usage/search/change-review, live-activity/host DTO fields. Each plans the client render now and stays fail-closed inert until its relay field lands.

### Out of Scope
- The two not-portable, principle-only findings (see Excluded Findings below): no code is planned for them.
- Any relay/host RPC contract itself. The host requests are tracked in the sibling `../007-host-requests/`; this packet only plans the client consumption.
- Any change to backend, `scripts/`, sibling phase folders, or `specs/context/**`.
- Any client-owned or client-edited session truth.

### Files to Change

Per-phase file detail lives in each child's plan.md. Summary of the primary app-mobile surfaces each phase touches:

| Surface root | Change Type | Phase | Description |
|--------------|-------------|-------|-------------|
| `app-mobile/src/pages/chat/chrome/`, `app-mobile/src/shared/transport/` | Modify | 001 | Composer editability, send-outcome model, rejection latch |
| `app-mobile/src/pages/chat/transcript/`, `.../rich-content/`, `.../artifacts/` | Modify/Create | 002 | Streaming clarity, reader gestures, diff/image/mermaid rendering |
| `app-mobile/src/pages/home/`, `app-mobile/src/routes/`, new `.../chat/chrome/` dock | Modify/Create | 003 | Roster sort/density, MRU dock, navigation coordinator, client search |
| `app-mobile/src/pages/enrollment/`, `.../home/`, `app-mobile/src/shared/primitives/a11y/` | Modify/Create | 004 | Find-bar focus, sheet back-dismiss, onboarding/diagnostics/settings |
| `app-mobile/src/pages/inbox/`, `app-mobile/src/shared/format/attention.ts`, service worker | Modify/Create | 005 | Cross-session inbox timeline, push/notification contract |
| new `app-mobile/src/pages/chat/source-control/`, `.../home/usage-*`, new `.../search/` | Create/Modify | 006 | Usage/quota card, transcript-search UI, change-review hub |
| `app-mobile/src/shared/format/`, `app-mobile/src/shared/state/`, service worker | Create/Modify | 007 | Live-Activity arbitration/watchdog, composer/card/media host DTO fields |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:phase-map -->
## PHASE DOCUMENTATION MAP

> This spec uses phased decomposition. Each phase is an independently executable child spec folder. All implementation details (plan, tasks, checklist, per-finding requirements) live inside the phase children. `Client/Host` marks whether the phase is pure-client (ships now) or host-gated (client work plans now, renders when the relay field lands).

| Phase | Folder | Focus | Findings (owned) | Client/Host | Level | Status |
|-------|--------|-------|------------------|-------------|-------|--------|
| 1 | `001-composer-send/` | Composer input and send-ambiguity | CI-1, CI-2, CI-4, CI-5, RS-1, RS-2, RS-3 (7) | Client (CI-5 host-gated) | 2 | Complete |
| 2 | `002-streaming-reader-media/` | Transcript clarity, reader, media rendering | SP-1, SP-2, SP-4, TE-1, TE-2, TE-4, TE-5, MA-1, MA-2, MA-4, MA-5, MI-2, MI-4 (13) | Client | 2 | Complete |
| 3 | `003-home-switcher-nav-search/` | Home/roster, in-session switcher, navigation, client search | HP-1, HP-4, HP-5, SC-2, SC-4, SD-1, SD-2, SD-3, SD-4, SD-5, SD-6, NL-1, NL-2, NL-4, NL-5, SH-2, SH-3, SH-4, SH-5 (19) | Client | 2 | Complete |
| 4 | `004-a11y-onboarding/` | Accessibility, onboarding, settings, diagnostics | AI-1, AI-2, AI-3, AI-4, OS-1, OS-2, OS-3, OS-4, OS-5, OS-6, OS-7 (11) | Client | 2 | Complete |
| 5 | `005-host-inbox-notifications/` | Cross-session inbox (needs sessionId) and push contract | CE-1, CE-2, CE-3, CE-4, CE-5, CE-6, CE-7, AN-1, AN-2, AN-3, AN-4, AN-5, HP-3 (13) | Host (CE-5 ready now) | 2 | Complete |
| 6 | `006-host-usage-search-review/` | Usage/quota, transcript-search RPC, change-review PR/git | UQ-1..8, SH-1, CR-1..9, TE-3, MI-1, MI-3 (21) | Host (UQ-3, UQ-6 ready now) | 2 | Complete |
| 7 | `007-host-liveactivity-fields/` | Live-Activity push contract, composer/card/media host DTO fields, project-grouped home | LA-1..7, SC-1, SC-3, CI-3, MA-3, SP-3, HP-6 (13) | Host (LA-1/2/3/5/7 ready now) | 2 | Complete |

| 8 | `008-screenshot-archive-integrity/` | Make the screenshot archive an honest record before it is used as evidence | n/a - visual QA, not finding-driven | Client | 2 | Complete |
| 9 | `009-refine-artifacts/` | Per-shot UI refinement of the artifacts surfaces (91 shots) | n/a - screenshot-driven | Client | 2 | Complete |
| 10 | `010-refine-chrome/` | Per-shot UI refinement of the chrome surfaces (50 shots) | n/a - screenshot-driven | Client | 2 | Complete |
| 11 | `011-refine-transcript/` | Per-shot UI refinement of the transcript surfaces (39 shots) | n/a - screenshot-driven | Client | 2 | Complete |
| 12 | `012-refine-views/` | Per-shot UI refinement of the whole-screen views (37 shots) | n/a - screenshot-driven | Client | 2 | Complete |
| 13 | `013-refine-rich-content-ask-question/` | Per-shot UI refinement of rendered model output and the question card (54 shots) | n/a - screenshot-driven | Client | 2 | Complete |
| 14 | `014-refine-source-control-and-small-surfaces/` | Per-shot UI refinement of the review hub and remaining small surfaces (31 shots) | n/a - screenshot-driven | Client | 2 | Complete |
| 15 | `015-storybook-designer-adjustability/` | Make every component and view adjustable by a designer inside the catalog | n/a - catalog tooling, not finding-driven | Client | 2 | Complete |
| 16 | `016-reference-structure-and-doc-accuracy/` | Group the surface skill's reference set into subject folders and correct the app documents whose paths the migration invalidated | n/a - documentation, not finding-driven | Client | 2 | Complete |

Coverage: 7 + 13 + 19 + 11 + 13 + 21 + 13 = 97 assigned across phases 1-7. Plus 2 excluded = 99 total. Every finding appears in exactly one phase.

Phases 8-16 are a follow-on workstream and own no mined findings. They exist because a green test suite cannot see a UI defect: phases 1-7 shipped behind passing gates while text overflowed, states rendered identically, and one card lost its styling entirely. Phase 8 makes the screenshot archive trustworthy; phases 9-14 read all 302 shots one at a time and refine the surfaces they expose, split by screenshot group so each is independently verifiable. Phase 15 turns the catalog from something a designer can only read into something they can retune, and in doing so surfaces a further defect class the shots cannot show: a control that renders no difference, which reads as coverage while proving nothing. Phase 16 closes the loop on the evidence itself: the reference set that documents all of this is grouped so it can be routed rather than scanned, and the two app documents that had gone on describing a pre-migration repository are corrected against the real tree.

### Phase Transition Rules

- Each phase passes `validate.sh` independently before it is claimed complete.
- The parent spec tracks aggregate progress via this map and `graph-metadata.json`.
- Client-only phases (001-004) can proceed in any order; the plan orders Wave-1 verified quick-wins first within each.
- Host phases (005-007) can build and unit-test their ready-now client logic against fixtures before the relay field lands; each blocked finding stays fail-closed inert until then.
- Resume a specific phase with `/speckit:resume specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/[NNN-phase]/`.

### Phase Handoff Criteria

| From | To | Criteria | Verification |
|------|-----|----------|--------------|
| Any phase | Next phase | Owning findings shipped or shipped-inert with a stated host dependency; token-identity, test:web, a11y-parity green from the final state | Per-child `checklist.md` all items resolved; `validate.sh --strict` exit 0 |
| 002 (MA-1 diff) | 006 (CR-4) | MA-1 diff-preview enrichment lands first; CR-4 reuses `diff-preview.svelte` | Grep `diff-preview.svelte` reuse in the change-review surface |
| 003 (NL-1 nav) | 006 (CR-9), 005 (AN-4) | NL-1 navigation coordinator lands before host-gated deep-link surfaces render | Deep-link routing composes with the single-slot coordinator |
<!-- /ANCHOR:phase-map -->

---

<!-- ANCHOR:excluded -->
## EXCLUDED FINDINGS (principle-only, no phase)

Two findings are not portable to the host-authoritative client. They get no phase and no code; the reusable rule is recorded here.

- **RS-4 - never optimistically clear a warning banner.** The concrete instances are desktop hardware/binary probes (tmux, pty-pressure) the client has no analog for. Reusable principle: for any future degraded/warning banner with a user-triggered remedy, only re-probed truth clears it. Applies later to the 001 RS-3 reconnect banner and the 004 OS-7 permission banner.
- **RS-5 - deliver-on-idle agent-to-agent message queue.** Cross-session messaging is structurally absent; the client has no local authority to re-validate. Reusable disciplines for any future accept-now-deliver-later surface: bound the queue, TTL-expire loudly, re-validate the full auth chain at flush not at accept.
<!-- /ANCHOR:excluded -->

---

<!-- ANCHOR:questions -->
## 4. OPEN QUESTIONS

- Which phase does the operator sequence first? The plan recommends the client-only Wave-1 quick-wins concentrated in 001 and 002.
- Which host fields will the relay team commit to, and in what order? That order sets the unblock sequence for phases 005, 006, and 007.
<!-- /ANCHOR:questions -->

---

## RELATED DOCUMENTS

- **Master plan**: See `plan.md` (this folder) - the authoritative 3-wave sequencing of all 99 findings.
- **Findings data**: See `research/findings-registry.json` and `research/research.md`.
- **Host requests**: See `../007-host-requests/` for the relay-side field/RPC requests the host phases depend on.
- **Phase children**: See sub-folders `001-*/` through `007-*/` for per-phase spec.md, plan.md, tasks.md, checklist.md.
- **Graph Metadata**: See `graph-metadata.json` for the `derived.last_active_child_id` pointer.
