---
title: "Child 019 tasks — surface skill refresh"
description: "Task ledger for the audit, the conventions rewrite, the divider-grammar replacement, the runes doctrine and the merge."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/019-surface-skill-refresh"
    last_updated_at: "2026-08-24T03:23:45Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Wait for the three editability packets, then audit."
    blockers: []
    completion_pct: 100
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

- [x] **T1.1** Confirm 012, 013 and 014 have all landed. This packet describes their result, and
      writing it earlier means writing it twice. [evidence: 012/003 and 014 both closed with their scans at zero; 013 at 95% with `commentedOutCodeLines : 0`]
- [x] **T1.2** Audit the whole skill against the shipped tree — detection markers, smart routing,
      surface standards, verification method, the three checklists, token and retint references,
      onboarding — and list every claim that no longer holds. [evidence: audited detection markers, the reference map, smart routing and the surface standards against the shipped tree; `scan-skill-references.mjs` reported eight stale path claims]
- [x] **T1.3** Build the reference-integrity scan: every path the skill names must resolve. [evidence: `scripts/naming/scan-skill-references.mjs` resolves every backticked path claim, and reads a "not `x`" counter-example in the opposite direction]
- [x] **T1.4** Create an isolated worktree. Never stage in the shared checkout, whose index already
      holds thousands of another session's files. [evidence: `/Users/michelkerkmeester/worktrees/public/026-019-surface-skill-refresh`; nothing was staged in the shared checkout]
- [x] **T1.5** Allocate the branch through the allocator rather than naming it by hand. [evidence: `worktree-naming.sh create` issued `worktrees/026-019-surface-skill-refresh`; the number was allocated, not counted]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Replace the superseded section-divider grammar with the one the codebase actually uses.
      Small edit, and the specific reason the branch has never merged. [evidence: the module and comment grammar section now teaches the `MODULE:` banner and numbered box-drawing dividers the tree actually uses]
- [x] **T2.2** Teach the shipped naming grammar: kebab-case for every file and folder, the kind-first
      component prefixes, and the enumerated prefix list. [evidence: kebab-case everywhere under `app-mobile/src/`, the closed kind list, `screen-` for screens and no prefix for a feature component]
- [x] **T2.3** Document the routing directory's exemption **with its reason**. An unexplained
      inconsistency invites a future contributor to fix it and change a URL. [evidence: the `routes/**` exemption is stated with its reason — SvelteKit reads `+page`, `+layout`, `+error` and `[param]` as routing directives, so a rename changes a URL]
- [x] **T2.4** Teach the shared directory's new shape and the one-reason-to-change grouping rule. [evidence: a table of the nine shared folders against what makes each one change, with composition kept in `app-mobile/src/pages/`]
- [x] **T2.5** Teach the comment grammar as actually applied, not as originally planned. [evidence: the banner, sentence-case starts, no left-behind commented-out code and the `@ds` seam markers, with `scan-comments.mjs` named as the executable form]
- [x] **T2.6** Teach the folder documentation convention and which template answers which question. [evidence: the README and CODE pair per source folder, which template answers which question, and `scan-folder-docs.mjs` as the gap check]
- [x] **T2.7** Write the runes self-invalidation doctrine, expressed as the failure it prevents. A rule
      without its failure gets optimised away by the next reader. [evidence: a four-step audit in `SKILL.md` stated as the failure it prevents — the effect that dispatches into state it reads cancels its own work; both hard-won details are kept, that two of seven were invisible to a search for a literal `dispatch(` call, and that one file needed fixing twice]
- [x] **T2.8** Leave the shared workflow documents alone — they are symlinked into two surfaces that
      are not Svelte. [evidence: `workflow-implement.md`, `workflow-debug.md` and `workflow-verify.md` untouched — they are symlinked into two other surfaces]
- [x] **T2.9** Leave the design-system contracts alone — tokens, guardrail grammar and the contrast
      invariant are framework-agnostic. [evidence: the token model, `@ds` grammar and contrast rules are unchanged in the `SKILL.md` diff; only stale paths inside them were corrected]
- [x] **T2.10** Bump the version and add a changelog entry, so a dispatch that loaded the old guidance
      can tell that it moved. [evidence: version 1.1.0.0 to 1.2.0.0 with `changelog/v1.2.0.0.md`, and the keyword and ownership comment lines refreshed]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Reference-integrity scan clean — every named path resolves in the shipped tree. [evidence: `scan-skill-references.mjs` reports 18 path claims, 6 filename references, broken 0]
- [x] **T3.2** No reference to the superseded divider grammar survives. [evidence: no reference to `src/style.css` survives; the CSS model is stated as scoped component blocks plus shared `app.css`]
- [x] **T3.3** The skill's own document validation passes. [evidence: `ci-skill-root-metadata.cjs --fix` reports checked=13 passed=13 failed=0 fixed=0]
- [x] **T3.4** The three pre-push gates pass: commit-message shape, branch naming, metadata manifest
      regeneration. Each has failed a previous attempt, so each is checked rather than assumed. [evidence: branch naming issued by the allocator; the metadata manifest gate passes 13/13; the commit-message hook flagged an 82-character subject, which was amended to 75]
- [x] **T3.5** The branch merges into the live skill line. [evidence: fast-forwarded `3f53552ed2..73c7cbc31b` onto `skilled/v4.0.0.0` with the operator's go-ahead; the merged surface reads back through the symlink at version 1.2.0.0 with zero stale path claims]
- [x] **T3.6** A dispatch loads the merged surface on a small real task, and its output has the shape
      the tree wants. This is the only check that tests meaning rather than form. [evidence: a read-only dispatch loaded the merged surface and answered four convention questions from it — `sheet-transcript-density.svelte` in `pages/chat/chrome/`, its sibling story plus the README and CODE pair, `shared/state/` chosen by reason to change, and the runes audit including tracing called methods rather than searching for a `dispatch(` call]
- [x] **T3.7** `validate.sh --strict` exit 0 on this packet through its realpath. [evidence: validate.sh --strict exit 0 through its realpath]
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
