---
title: "Child 019 — Surface skill refresh"
description: "Re-open the sk-code-mobile-cli surface skill once the naming, comment and documentation packets have landed, teach it what actually shipped, and merge the branch that has been stranded since the framework refactor."
trigger_phrases:
  - "sk-code-mobile-cli conventions refresh"
  - "surface skill re-open after editability"
  - "stranded skill branch merge"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/019-surface-skill-refresh"
    last_updated_at: "2026-08-24T03:23:45Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped as the terminal packet of the editability arc."
    next_safe_action: "Wait for 012, 013 and 014; then audit the skill against the shipped tree."
    blockers: ["depends on 012, 013 and 014 landing first"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 019 — Surface skill refresh

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `018-transcript-affordances` · Successor: `020-source-structure`


---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../018-transcript-affordances/spec.md |
| **Successor** | none — terminal packet of the editability arc |
| **Level** | 2 |
| **Layer** | conventions authority — after every packet it must describe |
| **Writer** | Claude (cross-repo worktree, landing discipline, git) |
| **Barrier** | skill teaches the shipped tree; the stranded branch is merged |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The surface skill is the conventions authority every code dispatch on this app loads. It is currently
wrong in one known way and about to become wrong in three more.

**Known:** its Svelte conventions document teaches a compact section-divider form that the codebase
abandoned during the editability pass, which converted forty-five files and two hundred and thirteen
dividers to a different grammar. Because of that, its branch has never been merged into the live skill
line — merging an authority that teaches a superseded convention would propagate the wrong grammar to
every future dispatch. So the refactor exists and nothing loads it.

**About to be:** the naming packet replaces three file-naming grammars with one and re-trees the shared
directory; the comment packet imposes a house commenting grammar on every file; and the documentation
packet puts every folder on a template. After all three land, a skill that describes the pre-packet
tree is not merely stale — it actively instructs dispatches to produce files in a grammar the codebase
just removed.

This packet is deliberately last, and that is the whole design. A conventions authority should
document what shipped, not what was planned, and every earlier attempt to write it mid-flight would
have been rewritten.

There is one exception, held elsewhere: the naming packet lands a minimal correction to the naming
grammar at the moment it renames, so the window between the rename and this packet does not teach the
opposite of the tree.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- Audit the whole skill against the shipped tree: detection markers, smart routing, surface standards,
  verification method, the three checklists, the token and retint references, onboarding.
- Teach the shipped naming grammar — kebab-case for every file and folder, kind-first component names,
  and the routing directory's deliberate exemption with its reason.
- Teach the shipped comment grammar, including the section-divider form the codebase actually uses,
  replacing the superseded one that is blocking the merge.
- Teach the folder documentation convention and which template answers which question.
- Carry the runes self-invalidation doctrine as prose. A lint rule was ruled out on cost, so the
  authority is where this knowledge has to live — nineteen hand-placed suppressions across eleven
  files and seven incidents is a pattern worth writing down properly.
- Merge the stranded branch into the live skill line once it teaches the right thing.

**Out of scope:** the shared workflow documents, which are symlinked into two non-Svelte surfaces and
must not be specialised; any token or design-system contract, which are framework-agnostic and stay as
they are; any change to the app itself.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — The skill describes the shipped tree. Every path, grammar and convention it teaches
  resolves against the repository as it exists after the three editability packets.
- **REQ-002** — The superseded divider grammar is gone. It is the specific reason the branch has been
  held out of the live line, and it must not survive the merge.
- **REQ-003** — The naming grammar is taught with its exemption. An unexplained inconsistency in the
  routing directory invites a future contributor to "fix" it and change a URL.
- **REQ-004** — The runes self-invalidation doctrine is written down, with the failure it prevents
  rather than as a rule to memorise.
- **REQ-005** — The stranded branch merges. Until it does, no workflow loads any of this work.
- **REQ-006** — Nothing is staged in the shared checkout. Its index already holds thousands of another
  session's files, so landing goes through an isolated worktree.
- **REQ-007** — The shared workflow documents are left alone, because specialising them would impose
  Svelte on two surfaces that are not Svelte.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Every path the skill names resolves in the shipped tree.
2. No reference to the superseded divider grammar survives.
3. The naming grammar, its kind-prefix list and its routing exemption are documented.
4. The comment grammar matches what the comment packet actually applied.
5. The folder documentation convention names both templates and when each applies.
6. The self-invalidation doctrine is present with its failure mode.
7. The branch is merged into the live skill line and the skill's own validation passes.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **The shared checkout is dangerous.** Its git index carries another session's staged files, so a
  `git add` there would sweep work that is not this packet's to touch. Isolated worktree only.
- **A grep is not a review.** Confirming that no old instruction survives verbatim does not confirm
  that the new prose is correct. The only real test is a dispatch loading the merged surface, and that
  cannot happen until it is merged.
- **Landing is gated.** Commit-message shape, branch naming through the allocator, and a metadata
  manifest regeneration all gate the push, and each has failed a previous attempt.
- **Reference-document headings have a house format** that the skill's own validation enforces.
- Depends on 012, 013 and 014 having landed. Nothing else depends on this.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **Does the merge happen in this packet or as its own decision?** The branch has been held for a
   reason that this packet removes, so merging here is the natural close. Recommendation: merge here,
   since leaving it stranded a second time would mean two packets have now produced work nothing loads.
2. **Should the skill's version be bumped for a conventions rewrite of this size?** It is a substantial
   rewrite rather than a correction. Recommendation: yes, with a changelog entry, because a dispatch
   that loaded the old version should be able to tell that the guidance moved.
<!-- /ANCHOR:questions -->
