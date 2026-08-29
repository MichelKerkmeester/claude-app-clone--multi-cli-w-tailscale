---
title: "Child 010 plan — context-repo research sweep"
description: "How the five research legs were run, what kept them read-only, and what counts as evidence for a recommendation."
trigger_phrases:
  - "context repo research plan approach"
  - "context repo research packet"
  - "plan approach"
importance_tier: "normal"
contextType: "research"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/010-context-repo-research"
    last_updated_at: "2026-08-23T08:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "All 5 research legs landed; R-01..R-13 consolidated for operator decision."
    next_safe_action: "Operator approves, declines or defers each recommendation by ID."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 010 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Five independent `/deep:research` loops, one per context repo, each bounded by its own charter and
state ledger, followed by a single consolidation pass that ranks findings by cross-repo convergence.

The design principle is that **the legs must not see each other**. A leg that already knows what the
previous four concluded will confirm them; five blind legs that land on the same answer are evidence.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| Five legs landed with `research.md` + state ledger | PASS — ogam, mobilecli, nodeterm, openclaude-android, remote-for-opencode |
| Context repos unmodified | PASS — all five still untracked and byte-unchanged |
| Every recommendation carries a `file:line` citation | PASS — 13/13 |
| Nothing scaffolded | PASS — no phase folder, source edit or dependency added |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

One folder per repo under this packet: `charter.md` (what this leg is asking), `topic.txt`,
`spec.md`, and `research/` holding `deep-research-state.jsonl`, `findings-registry.json`,
`research.md`, `resource-map.md` and the dashboard.

`recommendations.md` sits at the packet root and is the only document written for the operator. It
reads the five legs and nothing else, so its claims are traceable in one hop.

**Invocation.** The loops run through `opencode run` with `NODE_PRESERVE_SYMLINKS=1` — without it the
`.opencode` symlink makes the runtime resolve the repo root into the Public monorepo and the loop
throws a containment error before it starts. The command form is
`/deep:research:auto <topic> --spec-folder=... --max-iterations=10` as the *first* thing in the
prompt, plus an explicit inline-execution directive and a pre-answered Gate 3; without those the
model spawns a nested `opencode run` and hangs.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Charter each leg — Done

Name the repo's relevance and the questions it is expected to answer, so the loop has a stop
condition other than the iteration cap.

### Phase 2: Run the five legs — Done

Three legs stopped at the iteration cap while still productive (ogam 10, mobilecli 10, nodeterm 9);
two converged (openclaude-android at 0.03 after 5, remote-for-opencode at 0.04 after 5).

### Phase 3: Consolidate — Done

Merge into `R-01`..`R-13`, tier by convergence, and add the two sections that stop churn: what the
product already satisfies, and what was explicitly ruled out.

### Phase 4: Operator decision — Open

The packet's terminal state. Not work, a question.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Research has no test suite; its analogue is provenance. Two checks stand in for one:

**Citation integrity** — every recommendation resolves to a real `repo/file:line`. An item that
cannot be resolved is removed rather than softened.

**Non-interference** — the five context repos are confirmed untracked and byte-unchanged after every
leg. This is the only way a read-only sweep can prove it stayed read-only.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The five checkouts under `specs/context/` — read-only inputs, never targets.
- `/deep:research` and its state machine. No packet-local research harness was written.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Nothing to roll back: the packet adds documents and changes no code, no dependency and no
configuration. Deleting the folder removes the research and leaves the product untouched.
<!-- /ANCHOR:rollback -->
