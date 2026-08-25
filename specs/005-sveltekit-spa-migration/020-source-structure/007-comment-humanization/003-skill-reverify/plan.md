---
title: "Phase 3 plan — reconcile the skill with the shipped source"
description: "Re-read the sk-code-mobile-cli skill against the .svelte/app.css/.ts reality phase 2 shipped and the edge cases it surfaced (the do-not-edit marker form, the re-anchored fence gate, any residual @ds-named artifact). Fix drift; bump the version if the skill changes."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/003-skill-reverify"
    last_updated_at: "2026-08-25T21:00:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Skill reconciled with shipped source; last @ds-named file renamed (v1.7.1.0)."
    next_safe_action: "None — phase 3 complete; the comment-humanization packet is done."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Phase 3 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Confirm the skill teaches exactly what the source now does, and remove any residue the retirement left.
The reconciliation read found the skill accurate; the one residue was a manual-testing routing file still
named for the retired grammar, which was renamed. Any skill change lands via the Public worktree flow.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The reconciliation holds when the skill's convention claims match the shipped source, no `@ds`-named
artifact remains, the router-sync bijection passes, and the packet-scoped drift-guard delta is 0.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Phase 1 wrote the convention before the refactor; phase 2 is where the exact wording settled. This phase
closes the loop by reading the landed skill against the shipped `.svelte`/`app.css` reality and the
re-anchored `scan-comments` marker, then fixing the one place a name still pointed at the retired grammar.
The skill is authoritative for teaching; the source is authoritative for reality; this phase makes them agree.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · reconcile
Read `comment-grammar.md`, `editability-guardrails.md`, and the touched references against the shipped
convention and the re-anchored fence gate.

### Phase 2 · fix + land
Grep the skill tree for any residual `@ds`-named artifact; rename it, bump the version, and land via the
Public worktree with the router-sync and drift-guard checks.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Reconciliation is proven by a fresh grep of the skill's claims against the shipped source, the router-sync
bijection, and the drift guards — the same gates phase 1 used. No app behaviour is touched.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The landed phase-1 skill (v1.7.0.0) and the shipped phase-2 source.
- The Public worktree landing flow and the `run-all-drift-guards.sh` / router-sync gates.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The only change is confined to the skill under Public `skilled/v4.0.0.0` (a file rename + version bump).
`git revert` on that branch restores the prior filename. No app source or data is touched.
<!-- /ANCHOR:rollback -->
