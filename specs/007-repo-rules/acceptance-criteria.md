---
title: "Acceptance Criteria: Repo rules"
description: "The criteria this packet must satisfy before it may be closed, each met by a re-runnable measurement rather than by inspection, because a rules document's only guarantee is that its claims can be repeated."
trigger_phrases:
  - "acceptance criteria"
  - "closure gate"
  - "ac traceability"
  - "waiver adr"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-repo-rules"
    last_updated_at: "2026-08-29T19:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the closure gate ahead of dispositioning the research findings."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---
# Acceptance Criteria: Repo rules

<!-- SPECKIT_TEMPLATE_SOURCE: acceptance-criteria | v2.2 -->
<!-- HVR_REFERENCE: .opencode/skills/sk-doc/shared/references/hvr-rules.md -->

> This document decides whether the packet may close. A packet is closeable when
> every row below is `Met`, `Waived` or `Superseded`. A `Waived` or `Superseded`
> row MUST name an ADR that exists in `decision-record.md`.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

**Packet:** 007-repo-rules
**Level:** 2
**Status:** Complete
**Date:** 2026-08-29
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:criteria -->
## 2. CRITERIA

One row per criterion. `AC-ID` is stable once written: supersede a criterion, never renumber it.

| AC-ID | REQ | Given / When / Then | Verification | Status | Waiver |
|-------|-----|---------------------|--------------|--------|--------|
| AC-001 | REQ-001 | Given the document, When every cited path and command is resolved against the tree, Then all of them exist | Nine skill reference documents and every `scripts/*.mjs` gate script confirmed present; seven npm scripts resolved against the root and `app-mobile` `package.json` | Met | - |
| AC-002 | REQ-002 | Given a rule true in every repository, When the document is written, Then that rule stays in the shared file | The document carries paths, commands, numbers and traps; comment hygiene, scope lock and the verification standards remain in `AGENTS.md`, and the opening blockquote states the precedence | Met | - |
| AC-003 | REQ-003 | Given the surface skill holds the depth, When the document needs that depth, Then it routes rather than duplicates | `REPO RULES.md` section 3 is three sentences naming the skill path and "load the entry document"; the seven-row table that restated `SKILL.md` was cut as a duplication | Met | - |
| AC-004 | REQ-004 | Given a claim held in memory, When it is written down, Then it is verified first | Two recalled claims proved wrong and were corrected: the composer fence is at `session-composer.svelte:599`, not ~687, and the plan-mode test is `app-mobile/tests/menu-plan-mode.svelte.test.ts` | Met | - |
| AC-005 | REQ-005 | Given five distinct research lenses, When each runs, Then each produces a written report | Five passes dispatched to Grok 4.6 xhigh-fast: build and tooling, skill and specs, failure archaeology, structure, adversarial accuracy; reports land under `research/` | Met | - |
| AC-006 | REQ-006 | Given a research finding, When it is judged, Then it is either folded in or recorded with a reason for rejection | Each finding dispositioned in `implementation-summary.md`, with the command or file that proves an accepted one | Met | - |
| AC-007 | REQ-007 | Given a trap that has already cost time here, When the document describes it, Then it states the consequence and not only the symptom | The validator's silent refusal is paired with what it costs — a sweep reads the silence as a clean pass; the archive's non-determinism is stated as five differing runs of five | Met | - |
| AC-008 | REQ-008 | Given an agent reading under context pressure, When it opens the document, Then the deciding sentence for its task appears early | The document opens with `## 1. FIRST-COMMAND TRAPS`; the tree-destroying and silent-false-pass sentences moved from lines 171 and 192 of 204 onto the first screen | Met | - |
<!-- /ANCHOR:criteria -->

---

<!-- ANCHOR:closure -->
## 3. CLOSURE STATEMENT

**Closeable:** Yes

The criterion that carries this packet is AC-004. A rules document is read as authoritative, so a
confident false statement in it is worse than an absent one, and two of the claims written from memory
turned out to be wrong — a line number carried through a whole session, and a test filename that does
not exist. Everything else in the document is a measurement precisely because of that.
<!-- /ANCHOR:closure -->
