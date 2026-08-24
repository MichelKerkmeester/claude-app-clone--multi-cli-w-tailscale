---
title: "OGAM Pattern Mining for Pi Remote SvelteKit PWA"
description: "Deep-research packet: mine specs/context/OGAM-main (READ-ONLY) for adoptable patterns — streaming-reply state machine, crash-proof tool loop, store/service SSOT architecture, transcript rendering, mobile chat ergonomics, design-token system, and long-session resilience — feeding the Pi Remote SvelteKit mobile chat/remote-agent PWA."
trigger_phrases:
  - "ogam"
  - "ogam pattern mining"
  - "off grid ai patterns"
  - "pi remote sveltekit migration"
  - "adoptable patterns"
importance_tier: "normal"
contextType: "research"
---
# OGAM Pattern Mining for Pi Remote SvelteKit PWA

<!-- SPECKIT_LEVEL: 1 -->
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 1 |
| **Priority** | P1 |
| **Status** | In Research |
| **Created** | 2026-08-22 |

<!-- /ANCHOR:metadata -->
---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
The Pi Remote SvelteKit mobile chat / remote-agent PWA (see `005-sveltekit-spa-migration`) needs proven patterns for streaming assistant replies, tool-call robustness, store/service state ownership, transcript rendering, mobile chat ergonomics, theming/design tokens, and long-session context resilience. The sibling repo `specs/context/OGAM-main` ("Off Grid AI", React Native) has production-hardened answers to all seven problem areas, but those patterns are undocumented relative to Pi Remote's needs.

### Purpose
Mine `specs/context/OGAM-main` (strictly READ-ONLY) for adoptable patterns and produce findings with `specs/context/OGAM-main/file:line` citations, mapped to the Pi Remote SvelteKit web-PWA context. Full angles and where-to-look pointers: `charter.md` in this folder. Findings only — no code changes here and no writes to the target repo.

<!-- /ANCHOR:problem -->
---

<!-- ANCHOR:scope -->
## 3. SCOPE

<!-- DR-SEED:SCOPE -->
### In Scope
- Streaming-reply single-identity state machine (before-first-token through finalization; no duplicate/orphan/leaked stream state)
- Crash-proof, race-proof tool-calling loop (typed results, defensive seam, interruption semantics, retry-without-tools, step limits)
- Store-as-read-only-projection vs service-owned authoritative state machine (MVVM/MVP boundary, capability-as-data, SSOT debugging doctrine)
- Fast streaming-transcript rendering with first-class reasoning and tool call/result surfaces (memoization, stable keys, collapsible rows, chunked reasoning-tag parsing)
- Mobile chat ergonomics (composer, autoscroll, keyboard, attachments, haptics, actionable failure messaging)
- Theme + design-token system with zero hardcoded values and documented design language
- Long-session bounded-context budgeting and LLM I/O hardening (compaction flow, anti-injection summarizer prompt, coarse error taxonomy)

### Out of Scope
- On-device inference, native modules, or anything platform-specific that does not transfer to a web PWA
- Any modification of `specs/context/**` (target is READ-ONLY)
- Implementation of any adopted pattern in this packet (research-only; findings feed later planning)
- Non-chat surfaces of OGAM unrelated to the charter angles

### Files to Change
None (research-only packet). Canonical output: `research/research.md`. Evidence target: `specs/context/OGAM-main` sources cited by `file:line`.

<!-- /ANCHOR:scope -->
---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

<!-- DR-SEED:REQUIREMENTS -->
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | Mine each charter angle for adoptable patterns with file:line citations into specs/context/OGAM-main | Every finding names its source file and line; no uncited pattern claims |
| REQ-002 | Map mined patterns to the Pi Remote SvelteKit mobile PWA context | Each finding states what transfers to a web PWA and any RN-specific adaptation needed |
| REQ-003 | Respect the READ-ONLY contract on specs/context/** | Zero writes under specs/context/**; research packet writes only under this folder |
| REQ-004 | Cover all seven charter angles across logic, architecture, ux, ease-of-use, and safety | Each angle's question is answered or explicitly carried forward as open |
| REQ-005 | Synthesize into research/research.md with convergence report | Canonical synthesis exists; spec.md carries only the abridged generated fence |

<!-- BEGIN GENERATED: deep-research/spec-findings -->
## Research Findings Summary

Deep-research completed (session research-20260822-7de4901f, 10 iterations, stop `maxIterationsReached`). Canonical synthesis: `research/research.md`. 48 key findings, 15 invariants, 9 ruled-out directions across all seven charter angles; every claim cited to `specs/context/OGAM-main/file:line`.

Headline adoptable patterns for the Pi Remote SvelteKit PWA:

- **Streaming identity:** one UUID minted before first token spans frames, durable row, and peer previews; typed forming-state reset; ephemeral-before-durable ordering; segment resets keep identity; stop/error finalize shown partials; crash recovery restores records, never streams; resend requires tombstone-before-discard.
- **Tool loop:** discriminated ok/empty/error results with coarse error categories; one defensive execution seam; per-turn interruption truth (never shared abort); retry-without-tools only before first streamed output; one integer step ceiling with honest terminal notice.
- **Architecture:** services own state machines/side-effects/resources; reactive stores are read-only projections; SSOT debugging doctrine written in rules.md and confirmed in generation/session/compaction services with observable snapshots.
- **Transcript UX:** stable finalized rows + memo comparator so only the streaming row re-renders; reasoning/tool rows are first-class collapsible surfaces keyed by IDs that survive remount; chunk-safe reasoning-tag parser.
- **Ergonomics:** near-bottom-gated autoscroll + jump FAB; send/stop/voice exclusive precedence; keyboard-settled overlay measurement; failures separate actionable repair from capability absence.
- **Tokens:** small semantic vocabulary; theme-dependent colors/elevation split from invariant typography/spacing; hook + memoized themed-style factory; compliance via review checklist (not mechanically enforced — docs/runtime drift exists).
- **Resilience:** 55%/12% context budget ledger; summarize-older-keep-recent with persisted cutoff; anti-injection summarizer prompt with escaped transcript prefixes; trim-only fallback; retries fenced against turn cancellation.

Evidence boundary: `@offgrid/sync` wire-level lease/sequence/expiry semantics UNKNOWN (sibling package absent from snapshot) — consumer contracts only. Research-only packet; implementation is a separate follow-up.
<!-- END GENERATED: deep-research/spec-findings -->

<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: research/research.md exists, synthesizing all iterations with citations (`specs/context/OGAM-main/file:line`)
- **SC-002**: Every adoptable-pattern finding states the transfer path to a SvelteKit/Svelte 5 web PWA and flags non-transferable platform specifics
- **SC-003**: All seven charter angles addressed; unanswered ones listed as Open Questions
- **SC-004**: No modifications to specs/context/** (verified by git status cleanliness of that subtree)

<!-- /ANCHOR:success-criteria -->
---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | Accidental writes to the read-only target repo | Violates hard constraint | Read-only discipline in every dispatch prompt; verify git status post-loop |
| Risk | RN-specific patterns misread as web-transferable | Wrong recommendations | Each finding must judge transferability explicitly against the charter non-goals |
| Dependency | Citation accuracy depends on line numbers at read time | Stale citations if target changes | Target repo is versioned context; cite as-of-read lines |

<!-- /ANCHOR:risks -->
---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- How does OGAM model a streaming assistant reply as a single-identity state machine from before-first-token through finalization so stream, persisted record, and paired device never duplicate, orphan, or leak state?
- What makes OGAM's tool-calling loop crash-proof and race-proof (typed ToolResult, executeToolCallSafely, per-turn interrupted flag, retry-without-tools, step-limit ceiling)?
- How does OGAM enforce reactive-store-as-read-only-projection while a service owns the authoritative state machine (MVVM/MVP rule, capability-as-data, SSOT debugging doctrine)?
- How does OGAM keep a streaming transcript fast and render reasoning/tool rows as first-class collapsible surfaces?
- What mobile chat ergonomics does OGAM use for composer, autoscroll, keyboard, attachments, haptics, and failure messaging?
- How is OGAM's theme + design-token system structured so components never hardcode style values?
- How does OGAM bound long-session context budget and harden LLM I/O against prompt injection and untyped failures?

<!-- /ANCHOR:questions -->

---
