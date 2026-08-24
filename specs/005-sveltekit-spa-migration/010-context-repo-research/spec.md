---
title: "Child 010 — Context-repo research sweep"
description: "Mine five checked-out reference codebases for patterns that a phone-remote for an AI coding CLI has to get right, and hand the operator a decision-ready recommendation list. Research only: the sweep reads the context repos and writes findings, it never modifies them and never scaffolds anything into the product without approval."
trigger_phrases:
  - "context repo research"
  - "five repo research sweep"
  - "research recommendations decision"
importance_tier: "important"
contextType: "research"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/010-context-repo-research"
    last_updated_at: "2026-08-24T06:03:41Z"
    last_updated_by: "claude-opus-5"
    recent_action: "All 5 research legs landed; R-01..R-13 consolidated for operator decision."
    next_safe_action: "Operator approves, declines or defers each recommendation by ID."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 010 — Context-repo research sweep

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../009-storybook-experience/spec.md |
| **Successor** | ../011-ux-affordances/spec.md |
| Parent | `005-sveltekit-spa-migration` |
| Level | 1 |
| Status | Complete — recommendations awaiting operator decision |
| Depends on | nothing; runs independently of the migration children |
| Owner | Claude |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Five reference codebases sit checked out under `specs/context/`. Each one is somebody else's answer
to a problem this product also has: drive an AI coding agent from a phone, over an unreliable link,
without losing output or leaking authority.

Left unread they are dead weight. Read individually they are opinions. The value is in **convergence**
— where four independent teams solved the same problem the same way, that is far stronger evidence
than any single repo's design, and it points at bug classes this product has not yet hit.

The purpose of this packet is to extract that signal and stop, so the operator decides what to adopt.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** reading the five repos; recording cited findings per repo; consolidating them into one
decision-ready recommendation list with evidence, the failure each item prevents, effort and blast
radius.

**Out of scope, hard:** any modification to `specs/context/**`. Those checkouts are read-only research
inputs. No `git clean`, no `stash -u`, no `add -A` may touch them.

**Out of scope by standing rule:** scaffolding. The program goal states that research "may create new
phases or update existing phases — but present ALL research recommendations first; scaffold nothing
without approval." This packet therefore ends at a document, not at a branch.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### REQ-001 — One research leg per repo, independently stated

Each of the five repos gets its own research folder under this packet, with its own charter, state
ledger and `research.md`. Legs stay separate so a weak leg cannot dilute a strong one, and so every
claim keeps a traceable owner.

### REQ-002 — Every finding cited to a line

A finding carries `specs/context/<repo>/<file>:<line>`. An uncited observation is an opinion and does
not enter the recommendation list.

### REQ-003 — One consolidated, decision-ready list

`recommendations.md` holds every adoptable item as `R-01`..`R-13`, tiered by how many repos converge
on it, each carrying evidence, the concrete failure it prevents, rough effort, blast radius and a
proposed home. It also records what the product **already satisfies** and what was **explicitly ruled
out**, so a declined item stays declined rather than resurfacing.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. All five legs landed, each with a `research.md` and a state ledger.
2. Every recommendation cites at least one `repo/file:line`.
3. The five context repos are byte-unchanged — `git status` shows them untracked and undisturbed.
4. Nothing is scaffolded into the product: no new phase folder, no source edit, no dependency.
5. The operator can act on the list by ID alone, without re-reading the underlying research.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Risk | Mitigation |
|---|---|
| A research tool writes into a context repo | Legs run read-only; the repos are verified untracked-and-clean after each leg. |
| Findings get adopted silently because they look obviously right | The standing approval rule; this packet's deliverable is a question, not a change. |
| A single repo's idiosyncratic design reads as a general lesson | Recommendations are tiered by cross-repo convergence; single-repo items are marked as such. |

**Depends on:** nothing in the migration. Ran in parallel with the 007-EXT quality pass.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. Which of `R-01`..`R-13` are approved, declined or deferred. This is the packet's only open item and
   it is the operator's alone.
2. Whether approved items become children of this parent or a separate top-level packet — answerable
   only once the approved set is known.
<!-- /ANCHOR:questions -->
