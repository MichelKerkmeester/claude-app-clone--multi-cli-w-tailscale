---
title: "Plan - Repo rules"
description: "The sequenced approach: establish the document from verified facts, run five independent research lenses over it, judge every finding, then fold the confirmed ones in."
trigger_phrases:
  - "repo rules plan approach"
  - "repo rules packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-repo-rules"
    last_updated_at: "2026-08-29T19:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Authored the packet and dispatched five research passes over the rules file."
    next_safe_action: "Fold the research findings into REPO RULES.md, then validate strict."
    completion_pct: 40
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Plan: Repo rules

<!-- ANCHOR:summary -->
## 1. SUMMARY

Fill `REPO RULES.md` with what is true only in this repository, verifying every claim against the tree
rather than recalling it. Then run five research passes with distinct lenses, judge each finding on
whether it changes what an agent would do, and fold the confirmed ones back in.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Command | Pass condition |
|------|---------|----------------|
| Path claims | resolve every cited path against the tree | every path exists |
| Command claims | check each npm script against `package.json` | every script is defined |
| Number claims | re-run the measurement that produced it | the number still matches |
| Packet | `validate.sh specs/007-repo-rules --strict` | `RESULT: PASSED` |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Two documents, one boundary. `AGENTS.md` is a symlink to a shared cross-repository rules file and
carries what is true everywhere. `REPO RULES.md` sits beside it and carries what is true here. The
precedence is stated in the document itself: the shared file wins on rules, this one wins on paths,
commands and numbers.

A third layer sits below both: the `sk-code-mobile-cli` skill holds the depth. The rules file routes
to it rather than duplicating it, so a fact belongs in the rules file only when an agent needs it
*before* it knows to open the skill.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 - establish from verified facts
Write the document from measurements: the gate ladder, the design-system authority, the catalog and
archive contract, the frozen seams, the known baselines, and the git and spec-kit traps.

### Phase 2 - five research lenses
Build and tooling surface; what the skill and specs know that the rules do not; failure archaeology
from git history; structure and scannability for an AI reader; and an adversarial accuracy audit.

### Phase 3 - judge and fold
Disposition every finding. Fold in what is verified and decision-changing; record what is rejected and
why, so the rejection is a decision rather than an omission.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

The research lenses need a document to critique, so phase 1 precedes phase 2. The accuracy audit in
particular is only meaningful against written claims. Phase 3 waits on all five reports, because a
finding accepted from one lens may be contradicted by another.
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

One document of a few hundred lines, but its correctness rests on verifying several dozen claims
across two repositories, and on five research passes whose output must be judged rather than accepted.
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

A rules document has no unit test. The substitute is that every claim is a re-runnable measurement:
a path resolved, a script found in `package.json`, a count produced by a named command. A reader who
doubts any line can repeat the check, which is what makes decay detectable rather than invisible.

The adversarial research lens is the closest thing to a test: it exists to falsify the document rather
than to confirm it, and reports CONFIRMED, STALE, WRONG or UNVERIFIABLE per claim.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- `AGENTS.md`, symlinked to the shared cross-repository rules file, which defines the boundary.
- The `sk-code-mobile-cli` skill, which the document routes to for depth.
- Grok 4.6 xhigh-fast via the Cursor CLI, as the research executor for the five lenses.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The document is a single tracked file with no consumer that breaks if it changes. Reverting the commit
restores the previous content exactly; nothing builds against it, and no gate reads it.
<!-- /ANCHOR:rollback -->
