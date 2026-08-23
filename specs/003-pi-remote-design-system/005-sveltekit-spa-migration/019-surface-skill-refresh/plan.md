---
title: "Child 019 plan — surface skill refresh"
description: "Audit against the shipped tree, rewrite what moved, land through an isolated worktree, and finally merge the branch that has been held back."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/019-surface-skill-refresh"
    last_updated_at: "2026-08-23T22:48:08Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored; audit-first, merge-last."
    next_safe_action: "Wait for the three editability packets to land."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 019 plan — surface skill refresh

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Audit the skill against the shipped tree, rewrite what moved, land through an isolated worktree, and
merge the branch that has been waiting on exactly this.

The packet is last on purpose. A conventions authority describes what shipped; writing it any earlier
means writing it twice.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The mechanical gate is reference integrity: every path the skill names must resolve in the shipped
tree. That is scriptable and it catches the failure this packet exists to prevent.

The honest gate is not scriptable. A grep proves no old instruction survives verbatim; it cannot prove
the new prose is right about Svelte. The only real test is a dispatch loading the merged surface,
which is impossible until the merge — so the merge is the last step rather than a follow-up, and the
first dispatch afterwards is treated as part of this packet's verification.

Three landing gates sit in front of the push: commit-message shape, branch naming through the
allocator, and a metadata manifest regeneration. Each has failed a previous attempt at this, so each
is a task rather than an assumption.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The skill is the conventions authority every code dispatch on this app loads, and it lives in a
different repository reached through a symlink. That geography drives most of the mechanics.

What has to change falls into three groups.

**What the editability packets moved:** file and folder naming, the shared directory's shape, the
comment grammar, and the folder documentation convention. These are straightforward rewrites once the
packets have landed, and impossible to write correctly before.

**What was already wrong:** the section-divider form. The skill teaches a compact variant the codebase
abandoned mid-programme. This single inconsistency is why the branch has never been merged, so it is
simultaneously the smallest edit here and the one unblocking everything else.

**What has never been written down:** the runes self-invalidation doctrine. A lint rule was ruled out
on cost — the toolchain does not exist and standing one up over a codebase this size, on a one-person
project, buys a tenth permanent gate. That decision only holds if the knowledge lives somewhere, and
the conventions authority is the somewhere. Nineteen hand-placed suppressions across eleven files and
seven separate incidents is not a footnote; it is the most expensive recurring defect in this
programme's history.

Two things deliberately do not change. The shared workflow documents are symlinked into two surfaces
that are not Svelte, so specialising them would impose this stack on unrelated work. And the design
system contracts are framework-agnostic — tokens, the guardrail grammar, the contrast invariant — so
they carry across untouched.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Audit

Walk the whole skill against the shipped tree and produce a list of every claim that no longer holds:
paths, grammars, detection markers, routing, verification method, checklists, onboarding.

### Phase 2: Rewrite what moved

Naming grammar with its kind-prefix list and the routing exemption; the comment grammar as actually
applied; the folder documentation convention and which template answers which question.

### Phase 3: Replace the superseded divider grammar

The specific blocker on the merge. Small edit, disproportionate consequence.

### Phase 4: Write the doctrine

The runes self-invalidation pattern, expressed as the failure it prevents rather than as a rule to
memorise, since a rule without its failure gets optimised away by the next reader.

### Phase 5: Land and merge

Isolated worktree, allocator-assigned branch, the three pre-push gates, then merge into the live skill
line. Bump the version and add a changelog entry.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Two mechanical checks: the skill's own document validation, and a reference-integrity scan confirming
every named path resolves in the shipped tree.

Beyond that, the verification is a dispatch. Load the merged surface on a small real task and see
whether the guidance produces the right shape. That is the only check that tests meaning rather than
form, it can only happen after the merge, and it is therefore counted as part of this packet rather
than as someone's future problem.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 012, 013 and 014 must all have landed. This packet describes their result.
- The naming packet's minimal stop-gap covers the window between the rename and this refresh.
- The branch waiting to merge came out of the earlier framework refactor and has been stranded since.
- Nothing depends on this packet, which is why it can absorb a delay without blocking anything.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Everything lands in a different repository, so rollback is independent of this one: revert the merge
commit on the skill line and the previous guidance returns.

The asymmetry worth noting is that a bad conventions document does not break a build — it
misdirects dispatches quietly, and the damage shows up later as work in the wrong shape. So the
rollback trigger is not a red gate; it is the first dispatch that produces something the tree does not
want, and that is a judgement call rather than a signal.
<!-- /ANCHOR:rollback -->
