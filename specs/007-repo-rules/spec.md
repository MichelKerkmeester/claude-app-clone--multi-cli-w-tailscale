---
title: "Repo rules — the per-repository agent contract"
description: "Establish REPO RULES.md as the per-repository companion to the shared AGENTS.md, carrying the paths, commands, numbers and traps true only in this repository, and improve it against five independent research passes."
trigger_phrases:
  - "repo rules spec requirements"
  - "repo rules packet"
  - "per-repository agent contract"
  - "agents md companion"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-repo-rules"
    last_updated_at: "2026-08-29T19:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the packet and dispatched five research passes over the rules file."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Repo rules — the per-repository agent contract

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Complete |
| **Created** | 2026-08-29 |
| **Scope** | `REPO RULES.md` at the repository root, and the research that improves it |
| **Constraint** | Repo-specific facts only. A universal rule belongs in `AGENTS.md`, never here |
| **Evidence** | Every path, command and number is verified against the tree, not recalled |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
An AI agent starting work in this repository cold reads `AGENTS.md`, which carries the rules true in every repository, and then has nothing that tells it what is true *here*. The facts that decide whether its work is correct — which gate proves a rendering change, which numbers are frozen, which archive is not byte-stable, which validator silently refuses to run — live scattered across a skill, twenty spec packets, and the memory of whoever last hit them. `REPO RULES.md` existed as a five-line stub declaring its own purpose and carrying none of them.

### Purpose
Make `REPO RULES.md` the one document that closes the gap between the universal contract and this repository. It carries paths, commands, numbers and traps; it points at the surface skill for depth rather than duplicating it; and every claim in it is verified against the tree, because a rules file that confidently states something false is worse than one that says nothing.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- `REPO RULES.md`: the first-command traps, the fail-closed seams, the design-system authority, the catalog and archive contract, and the known baselines.
- Five independent research passes over it, each with a distinct lens, to find what is missing, stale or badly structured.
- Folding the confirmed findings back into the document.

### Out of Scope
- Any rule that is true in every repository; that belongs in `AGENTS.md`.
- Duplicating the `sk-code-mobile-cli` skill's reference content. The rules file points; the skill explains.
- Changing any gate, script or application source. This packet documents the contract, it does not alter it.
- The six protected research repositories under `specs/context/`.

### Files to Change
- `REPO RULES.md` — the document itself.
- `specs/007-repo-rules/research/` — one report per research pass.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers
- REQ-001 Every path, command and number in the document resolves or runs against the real tree.
- REQ-002 No universal rule is restated; the document carries only what is repo-specific.
- REQ-003 The document names the surface skill and routes to it rather than duplicating its content.
- REQ-004 No claim is carried forward from memory without verification.

### P1 - Required (complete OR user-approved deferral)
- REQ-005 Five research passes run with distinct lenses, and each produces a written report.
- REQ-006 Every research finding is judged and either folded in or recorded with a reason for rejection.
- REQ-007 The document states the traps that have already cost time here, not generic advice.
- REQ-008 Section order matches how work arrives, so an agent reads the deciding sentence early.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- Every cited path exists, every npm script is defined, and every number matches a measurement.
- An agent reading only this document can run the correct gates for a rendering change without opening the skill.
- Each of the five research reports exists and its findings are dispositioned.
- The packet validates strict.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- The document's value decays silently: a path that moves or a count that changes makes it confidently wrong, and nothing gates it. The mitigation is that every claim is a measurement someone can repeat.
- It is easy to grow into a second copy of the skill. The boundary is that a fact belongs here only if an agent needs it *before* it knows to open the skill.
- Research passes can produce plausible but unverified suggestions; each finding is accepted only with the command or file that proves it.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
The document is read on every cold start in this repository, so length is a cost. Anything that does not change a decision is cut.

### Security
It records the fail-closed posture and the protected repositories, but contains no credential, host or token value.

### Reliability
Claims are measurements rather than recollections, so a reader can re-run any of them and catch decay.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Should the counts in the document be generated rather than written, so they cannot go stale? A generator is more machinery than the file currently justifies.
- Should a gate verify the document's own path claims, the way the surface skill's paths are guarded? That would make decay detectable rather than discovered.
- ~~Where do the spec-kit invocation traps belong?~~ Answered: they are harness properties, so they moved to `AGENTS.md` beside its completion rule.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
Counts such as the golden set and the story total move with ordinary work; they are stated with the command that produced them so a mismatch reads as decay rather than as a contradiction.

### Error Scenarios
A cited script that no longer exists makes the document actively misleading, which is why every path is checked rather than assumed.

### State Transitions
When a rule here and a rule in `AGENTS.md` conflict, the document states the precedence explicitly: the universal file wins on rules, this one wins on paths, commands and numbers.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

Level 2. One document, but its correctness depends on verifying several dozen claims against two repositories, and on five research passes whose findings must each be judged rather than accepted.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `plan.md` - the sequenced approach for this packet.
- `tasks.md` - the task ledger.
- `checklist.md` - the verification checklist.
- `acceptance-criteria.md` - the closure gate.
- `research/` - one report per research pass.
<!-- /ANCHOR:cross-refs -->
