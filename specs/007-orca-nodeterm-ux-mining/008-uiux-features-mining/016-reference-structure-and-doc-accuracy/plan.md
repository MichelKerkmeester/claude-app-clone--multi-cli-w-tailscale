---
title: "Plan - Phase 16 Reference structure and documentation accuracy"
description: "The sequenced approach: measure the flat set, group by subject, repoint every referrer, then correct the app documents whose paths the migration invalidated."
trigger_phrases:
  - "reference structure and doc accuracy plan approach"
  - "reference structure and doc accuracy phase"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/016-reference-structure-and-doc-accuracy"
    last_updated_at: "2026-08-29T17:20:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Grouped the loose references and corrected the stale app-document paths."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Plan: Phase 16 Reference structure and documentation accuracy

<!-- ANCHOR:summary -->
## 1. SUMMARY

Group fourteen loose reference documents into four subject folders, give each a routing entry
document, and repoint every referrer. Then correct the two app documents that still describe the
pre-migration repository. Both halves are verified by resolvers that read the real tree.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Command | Pass condition |
|------|---------|----------------|
| Link integrity | `node .opencode/skills/system-spec-kit/scripts/check-markdown-links.cjs` | no broken link introduced by this work |
| App-path resolution | `node scripts/naming/scan-skill-references.mjs <doc>` | `broken : 0` for the README and every entry document |
| Relative links | resolution count inside `references/` | every link resolves, counted not sampled |
| Skill metadata | `node .opencode/skills/sk-doc/sk-create-skill/scripts/ci-skill-root-metadata.cjs` | `checked=14 passed=14 failed=0` |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

`references/` already used purpose-named folders with a `<folder>/<folder>.md` entry document. The
loose set is grouped the same way, by **subject** rather than by task: the skill's `RESOURCE_MAP`
already routes by intent and several documents legitimately serve more than one intent, so folders
must not try to duplicate that axis.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · read and cluster
Read all fourteen descriptions, cluster by the question each answers, and confirm the existing folder
convention before adding to it.

### Phase 2 · move, route and repoint
Move the documents, author the entry documents, rewrite the referrers, and correct the app documents.

### Phase 3 · resolve every claim
Run every gate from the final state and confirm the sibling surface is untouched.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Setup precedes the move because the grouping decides the folder names. Verification must follow the
referrer rewrite, since a link check before it reports failures that the rewrite is about to fix.
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

Fifty-three documents across two repositories. Mechanical in shape; the cost is in the referrer
sweep and in proving no sibling surface was caught by it.
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

There is no unit test for documentation. The substitute is three resolvers that read the real tree:
the repository-wide markdown link guard, the cross-repo app-path scanner, and a relative-link
resolution count. Each reports a number, so a claim of correctness is a measurement.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The `sk-code-mobile-cli` surface skill in the Public monorepo, landed through a pull request.
- `ci-skill-root-metadata.cjs` for the regenerated leaf manifest.
- The Mobile CLI repository for app-path resolution, since the scanner resolves across repositories.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Every change is a documentation move in one commit per repository. Reverting either commit restores
the previous layout exactly; no gate, script or app source depends on the new paths beyond the
regenerated manifest, which the same revert restores.
<!-- /ANCHOR:rollback -->
