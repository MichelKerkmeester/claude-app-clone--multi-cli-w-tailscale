---
title: "Goal: Storybook autodocs"
description: "The durable directive for finishing the catalog's documentation layer, and the criteria that decide when it is done."
trigger_phrases:
  - "packet goal"
  - "durable directive"
  - "completion criteria"
  - "autodocs goal"
importance_tier: "important"
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs"
    last_updated_at: "2026-08-30T10:10:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "All four phases closed"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---
# Goal: Storybook autodocs

<!-- SPECKIT_TEMPLATE_SOURCE: goal | v2.2 -->

> Everything above the log is DURABLE. It is what an operator sets as the session
> objective and must stay true for the life of the packet.

---

<!-- ANCHOR:directive -->
## 1. DURABLE DIRECTIVE

**Objective:** Finish the catalog's documentation layer — measure what the generator already produces, write prose only where it falls short, and make the layer findable from the surface skill and the repo rules.

### Decisions

Frozen choices. Changing one is an amendment.

| ID | Decision |
|----|----------|
| D1 | All 100 `autodocs` tags stay. The generated half — props table, stories, controls — is derived on every build and cannot drift, so it costs nothing to keep. |
| D2 | Prose is written only where the audit ranks a page thin, or where a component's contract is invisible in its rendering. A description that restates the props table is a defect. |
| D3 | Additive only: no story renamed, added or removed; no token value moved; the presentation gates keep filtering `entry.type === 'story'`. |
| D4 | Phase 4 lands in the Public monorepo through an isolated worktree and the sk-git branch allocator, never from this checkout. |
<!-- /ANCHOR:directive -->

---

<!-- ANCHOR:binding -->
## 2. BINDING

**Read the child goal before working a phase.** Each is authoritative for its
phase and binds as if written here.

| Phase | Goal document |
|-------|---------------|
| 002-audit-docgen-coverage | `002-audit-docgen-coverage/goal.md` |
| 003-author-component-prose | `003-author-component-prose/goal.md` |
| 004-skill-and-repo-integration | `004-skill-and-repo-integration/goal.md` |

**Precedence.** Decisions above outrank child detail; child detail outranks any
summary of it. Name a conflict rather than resolving it silently.

**Stop.** Only the criteria below decide done.
<!-- /ANCHOR:binding -->

---

<!-- ANCHOR:completion -->
## 3. COMPLETION CRITERIA

- [x] A coverage script exists, reports every `autodocs`-tagged component exactly once, and produces the same ranking on two consecutive runs.
- [x] Every component the audit ranks thin either carries a description or is recorded with the reason it needs none.
- [x] `sk-code-mobile-cli` routes to a docs-layer reference, and `REPO RULES.md` states what the layer guarantees and what it does not.
- [x] `validate.sh --strict` reports `RESULT: PASSED` for the parent and all four children, read per RESULT line.
- [x] `npm run typecheck` exits 0 and `catalog-smoke-cdp` reports 674 frames with 0 throws.
- [x] A full re-capture moves no screenshot outside the documented flake set.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:log -->
## 4. LOG

Everything below is VOLATILE and is not part of the directive.

### Progress

| Item | State | Evidence |
|------|-------|----------|
| Phase 1 enable the docs layer | Done | Index `{"docs":100,"story":337}`; props table renders `value*` with `"system" \| "light" \| "dark"`; 0 shots moved |
| Phase 2 audit docgen coverage | Done | 100 pages, 0 errors, ranking reproducible |
| Phase 3 author component prose | Done | 26 descriptions, matching the candidate set |
| Phase 4 skill and repo integration | Done | Reference routed and landed on both branches |

### Deviations and findings

| Item | Note |
|------|------|
| Two latent defects surfaced in phase 1 | A story called `setContext` from `render`, and the smoke gate returned on first mount so it could not see the resulting failure. Both fixed at cause |
| Docs pages are unswept | Every gate filters `entry.type === 'story'`, which is what keeps them unaffected and equally means 100 docs pages render unchecked. Phase 2 decides whether that warrants a gate |
<!-- /ANCHOR:log -->
