---
title: "Child 010 tasks — context-repo research sweep"
description: "Task ledger for the five-repo research sweep and the consolidation that closes it."
contextType: "research"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/010-context-repo-research"
    last_updated_at: "2026-08-23T08:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "All 5 research legs landed; R-01..R-13 consolidated for operator decision."
    next_safe_action: "Operator approves, declines or defers each recommendation by ID."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 010 tasks

---

<!-- ANCHOR:notation -->
## Task Notation

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason.
Each task carries its evidence inline, so the ledger is readable without the plan.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## Phase 1: Setup

- [x] **T1.1** Charter each of the five legs with its own questions and stop condition.
      Five `charter.md` + `topic.txt` pairs under this packet.
- [x] **T1.2** Establish the read-only rule for `specs/context/**` and the commands that must never
      touch it (`git clean`, `stash -u`, `add -A`, `add .`).
- [x] **T1.3** Solve the invocation. `NODE_PRESERVE_SYMLINKS=1` for the symlink containment throw;
      `/deep:research:auto ...` first in the prompt; an explicit inline-execution directive; a
      pre-answered Gate 3. Without all four the loop either throws or hangs at 0% CPU.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## Phase 2: Implementation

- [x] **T2.1** `ogam` — React Native offline-AI chat app. 10 iterations, stopped at cap while still
      productive.
- [x] **T2.2** `mobilecli` — Rust daemon, phone remote for AI coding CLIs; the closest product
      analog. 10 iterations, stopped at cap.
- [x] **T2.3** `nodeterm` — desktop/server/mobile trio for remote agent control. 9 iterations.
- [x] **T2.4** `openclaude-android` — agent CLI plus phone remote-control layer. 5 iterations,
      converged at 0.03.
- [x] **T2.5** `remote-for-opencode` — iOS client with a documented v1 protocol. 5 iterations,
      converged at 0.04.
- [x] **T2.6** Consolidate into `recommendations.md`: `R-01`..`R-13`, tiered by convergence, each with
      evidence, prevented failure, effort, blast radius and proposed home; plus "already satisfied"
      and "explicitly ruled out".
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## Phase 3: Verification

- [x] **T3.1** Citation integrity — 13/13 recommendations resolve to a real `repo/file:line`.
- [x] **T3.2** Non-interference — all five context repos still untracked and byte-unchanged.
- [x] **T3.3** Nothing scaffolded — no phase folder, source edit, dependency or configuration change
      landed from this research.
- [ ] **T3.4** Operator decision on `R-01`..`R-13`. Open by design; this is the packet's terminal
      state, and the standing rule forbids acting before it.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

The research is complete: five legs landed, every claim cited, the context repos untouched, nothing
scaffolded. What remains is not work but a decision — `T3.4` stays open until the operator rules on
each recommendation by ID.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## Cross-References

- `recommendations.md` — the operator-facing deliverable; the only document that needs reading to decide.
- `spec.md` — scope, the read-only constraint and the no-scaffolding rule.
- `plan.md` — leg design, invocation and gates.
- Program goal: `../goal.md` — the standing research-approval rule this packet exists to honour.
<!-- /ANCHOR:cross-refs -->
