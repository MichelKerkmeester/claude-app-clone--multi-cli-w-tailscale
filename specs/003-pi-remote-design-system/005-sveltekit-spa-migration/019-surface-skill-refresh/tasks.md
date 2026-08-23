---
title: "Child 019 tasks — surface skill refresh"
description: "Task ledger for the audit, the conventions rewrite, the divider-grammar replacement, the runes doctrine and the merge."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/019-surface-skill-refresh"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Wait for the three editability packets, then audit."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 019 tasks — surface skill refresh

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

The packet is not done at the last edit. It is done when the branch is merged and a dispatch has
loaded the merged surface, because until then nothing actually reads any of this.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [ ] **T1.1** Confirm 012, 013 and 014 have all landed. This packet describes their result, and
      writing it earlier means writing it twice.
- [ ] **T1.2** Audit the whole skill against the shipped tree — detection markers, smart routing,
      surface standards, verification method, the three checklists, token and retint references,
      onboarding — and list every claim that no longer holds.
- [ ] **T1.3** Build the reference-integrity scan: every path the skill names must resolve.
- [ ] **T1.4** Create an isolated worktree. Never stage in the shared checkout, whose index already
      holds thousands of another session's files.
- [ ] **T1.5** Allocate the branch through the allocator rather than naming it by hand.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [ ] **T2.1** Replace the superseded section-divider grammar with the one the codebase actually uses.
      Small edit, and the specific reason the branch has never merged.
- [ ] **T2.2** Teach the shipped naming grammar: kebab-case for every file and folder, the kind-first
      component prefixes, and the enumerated prefix list.
- [ ] **T2.3** Document the routing directory's exemption **with its reason**. An unexplained
      inconsistency invites a future contributor to fix it and change a URL.
- [ ] **T2.4** Teach the shared directory's new shape and the one-reason-to-change grouping rule.
- [ ] **T2.5** Teach the comment grammar as actually applied, not as originally planned.
- [ ] **T2.6** Teach the folder documentation convention and which template answers which question.
- [ ] **T2.7** Write the runes self-invalidation doctrine, expressed as the failure it prevents. A rule
      without its failure gets optimised away by the next reader.
- [ ] **T2.8** Leave the shared workflow documents alone — they are symlinked into two surfaces that
      are not Svelte.
- [ ] **T2.9** Leave the design-system contracts alone — tokens, guardrail grammar and the contrast
      invariant are framework-agnostic.
- [ ] **T2.10** Bump the version and add a changelog entry, so a dispatch that loaded the old guidance
      can tell that it moved.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Reference-integrity scan clean — every named path resolves in the shipped tree.
- [ ] **T3.2** No reference to the superseded divider grammar survives.
- [ ] **T3.3** The skill's own document validation passes.
- [ ] **T3.4** The three pre-push gates pass: commit-message shape, branch naming, metadata manifest
      regeneration. Each has failed a previous attempt, so each is checked rather than assumed.
- [ ] **T3.5** The branch merges into the live skill line.
- [ ] **T3.6** A dispatch loads the merged surface on a small real task, and its output has the shape
      the tree wants. This is the only check that tests meaning rather than form.
- [ ] **T3.7** `validate.sh --strict` exit 0 on this packet through its realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The authority teaches the tree that exists, and the branch that has been stranded since the framework
refactor is finally merged.

Completion is the merge plus one loaded dispatch — not the last edit. Two packets producing work that
nothing loads would be a worse outcome than one, and that is exactly what stopping short would mean.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — what is wrong today and what is about to become wrong.
- `plan.md` — the three groups of change and the landing discipline.
- `checklist.md` — barrier sign-off with evidence.
- `../008-sk-code-svelte-refactor/implementation-summary.md` — the stranded branch and why it was held.
- `../012-naming-and-structure/spec.md` — carries the minimal stop-gap that covers the window.
- `../013-comment-grammar/spec.md` · `../014-folder-documentation/spec.md` — the other conventions.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
