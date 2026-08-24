---
title: "Child 003 — Pages rename and tooling catch-up"
description: "Kind-first renames across every feature folder under pages/, then the configs, globs, story ids and coverage allowlist that make the renamed tree testable, plus the minimal conventions correction and the nine-gate barrier."
trigger_phrases:
  - "pages kind first rename"
  - "storybook glob rebaseline"
  - "css corpus glob rename"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/012-naming-and-structure/003-pages-and-tooling"
    last_updated_at: "2026-08-23T20:24:46Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped as the wide rename plus the tooling catch-up and barrier."
    next_safe_action: "Wait for children 001 and 002."
    blockers: ["depends on children 001 and 002"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 003 — Pages rename and tooling catch-up

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../002-shared-tree-split/spec.md |
| **Successor** | ../../013-comment-grammar/spec.md |
| **Level** | 2 |
| **Layer** | naming pass — widest file surface, then the barrier |
| **Writer** | executor (`app-mobile/src/pages/**` renames) + Claude (configs, conventions, git) |
| **Barrier** | nine program gates green + completeness scan returns zero |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Two things remain after `shared/` is settled, and they are different kinds of work.

The first is wide and mechanical: roughly a hundred component files under `pages/` still carry
PascalCase names that say nothing about what kind of thing they are. `PlanModeMenu`, `LeavePlanSheet`
and `AttachmentPreviewDialog` are a menu, a sheet and a dialog, and the directory listing does not
group them.

The second is narrow and easy to forget: the tooling still points at the old tree. Storybook titles
derive from paths, so every story id shifts at once. The CSS-corpus builder globs source files, and a
stale glob would make the token-identity gate pass by reading nothing at all — a gate that passes
because it found no input is worse than one that fails.

This child also closes the packet, so it carries the nine-gate barrier and the completeness scan.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- Kind-first renames per feature folder: `chat/artifacts` (24 files), `chat/transcript` (10),
  `chat/rich-content` (12), `chat/chrome` (17), `chat/attachments` (9),
  `chat/features/ask-question` (12), then the screen components.
- Screens take the `screen-` prefix — `screen-chat.svelte`, `screen-home.svelte`,
  `screen-review.svelte`, `screen-attention-inbox.svelte`, `screen-enrollment.svelte` — so a prefix
  search reaches them the same way it reaches every other kind.
- The three `$shared` alias definitions, if any sub-path is hard-coded.
- Storybook globs, re-baselined story ids, and the 009 coverage-gate allowlist.
- The CSS-corpus builder's glob, and both vitest web configs including any cwd-relative
  `readFileSync` path in a web test.
- A minimal correction to the conventions authority's naming section, landed through an isolated
  Public worktree, so the window before 019 does not teach the opposite of the tree.
- The nine program gates and the rename-completeness scan.

**Out of scope:** the full conventions refresh and the stranded-branch merge, which are 019's packet;
any module's contents; `routes/**`; anything already moved by children 001 and 002.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Every in-scope path under `app-mobile/src/`, `routes/**` excluded, is kebab-case. The
  completeness scan returns zero.
- **REQ-002** — Components that are an instance of a UI kind carry the kind first, screens included.
  Feature components carry no prefix, because their name already is the thing.
- **REQ-003** — The CSS-corpus glob resolves the renamed tree. A stale glob makes the token-identity
  gate pass on an empty corpus, which is a false green rather than a failure.
- **REQ-004** — Story ids and the 009 coverage allowlist re-baseline in the same commit as the renames
  that shifted them.
- **REQ-005** — A minimal naming correction lands in the conventions authority. It is one section, not
  a rewrite — the rewrite is 019's, after every convention has shipped.
- **REQ-006** — The conventions edit lands through an isolated Public worktree. The shared checkout's
  index holds another session's staged files.
- **REQ-007** — All nine program gates are green from the final state, re-run whole rather than as the
  subset that was failing.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Completeness scan returns zero non-kebab in-scope paths.
2. `npm run build` and `npm run typecheck` exit 0.
3. `npm test` and `npm run test:web` exit 0.
4. Token-identity 0 CHANGED / 0 VANISHED / 0 ADDED across all three theme states, over a corpus that
   demonstrably contains files.
5. Contrast pairs at threshold and the `@ds guardrail:` fence count preserved.
6. CDP structural gate green at 390px in both themes.
7. Catalog smoke green in both themes after the story ids shift.
8. `validate.sh … --strict` exit 0 through the script's realpath.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A stale CSS-corpus glob is a false green.** The token-identity gate is the load-bearing proof for
  this whole packet, and it passes trivially over an empty corpus. Confirm the corpus is non-empty
  before trusting the result.
- **Story identity churn is total.** Every id shifts at once, so the catalog smoke and the coverage
  allowlist both re-baseline in the same commit or the gate red-lines for a reason that is not a
  regression.
- **The widest file surface in the packet** — roughly a hundred files across seven feature folders,
  one dispatch each.
- **The conventions stop-gap is cross-repo**, so it lands separately from the app commits and reverts
  independently.
- Depends on children 001 and 002. Neither `pages/` nor the globs are touched before `shared/` settles.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **How minimal is the stop-gap?** Proposal: the naming section only — kebab-case, the closed prefix
   list, and the `routes/**` exemption with its reason. Recommendation: keep it to that. Anything more
   duplicates 019 and creates two places to disagree.
2. **Should the 009 coverage allowlist be re-baselined or regenerated?** Recommendation: regenerate,
   because a hand-edited allowlist after a hundred-file rename is a transcription exercise, and
   transcription is where a silent omission enters.
<!-- /ANCHOR:questions -->
