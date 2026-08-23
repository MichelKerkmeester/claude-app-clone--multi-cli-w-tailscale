---
title: "Child 013 tasks — inline comment grammar and quality"
description: "Task ledger for banner coverage on 51 files, the capitalisation and placement sweep, the WHY rewrite, and density correction."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/013-comment-grammar"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Close T1.1 fence-check scope, then run the banner batch."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 013 tasks — inline comment grammar and quality

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

Every task in this packet produces a comment-only diff. A task is not done until that diff has been
read and confirmed to contain no non-comment line.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Re-scope the per-file unchanged-fence-TEXT diff to assert the
      `@ds guardrail: do-not-edit` marker and the fence count, not the prose after it. Blocking: this
      packet rewrites fence explanations by design, so the check as written would fail on purpose.
- [x] **T1.2** Re-baseline it and confirm it still fails when a fence marker is removed. A loosened
      check that no longer detects its own violation is not a check.
- [x] **T1.3** Record the current numbers as the baseline: 51 files without a banner, 403
      capitalisation violations, 45 multi-line fence explanations, 277 fences total.
- [x] **T1.4** Confirm 012 has landed, so banners and comments name components by their final names.
- [x] **T1.5** Confirm 012 is not running concurrently — both packets touch the same 148 files.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Banner coverage**

- [x] **T2.1** `shared/primitives/` — 16 of the 18 files carry no banner; the deepest coverage gap.
- [x] **T2.2** `shared/chrome/` — 4 components.
- [x] **T2.3** `shared/` module folders — the files that lack a banner after the 012 split.
- [x] **T2.4** `pages/chat/artifacts/` — 12 files.
- [x] **T2.5** `pages/chat/transcript/`, `rich-content/`, `chrome/`, `attachments/` — remaining gaps.
- [x] **T2.6** Screen components and the two route files that lack banners.
- [x] **T2.7** Confirm banner weight is scaled to file size rather than uniform — a 60-line primitive
      does not need the same banner as a 400-line composer.

**Capitalisation and placement**

- [x] **T2.8** Capitalise the first letter of every comment sentence — 403 instances.
- [x] **T2.9** Exclude directives and verbatim identifiers from that sweep: `eslint-disable`, `@ts-`,
      and comments that open with a quoted symbol name.
- [x] **T2.10** Move the 5 trailing comments above the code they describe.

**The WHY rewrite**

- [x] **T2.11** Rewrite the 45 multi-line guardrail-fence explanations to one line of reason, marker
      preserved exactly.
- [x] **T2.12** Rewrite the flagged example at `AttachmentPreviewDialog` — it is the packet's reference
      case and should be done first so the standard is visible in the diff.
- [x] **T2.13** Per-folder WHY pass, smallest folder first, reading the code rather than paraphrasing
      the existing comment.
- [x] **T2.14** Apply the deletion test to every comment: if removing it costs the next reader nothing,
      delete it instead of rewording it.
- [x] **T2.15** Sampled review of at least one in five rewritten comments against the code they sit
      above, checking the stated reason is actually true. A confidently wrong WHY is worse than the
      narration it replaced.

**Density and hygiene**

- [x] **T2.16** Identify files above three comments per ten lines of code.
- [x] **T2.17** Correct them by deletion, not compression — a dense file of terse restatements is still
      a dense file of restatements.
- [x] **T2.18** Confirm no comment carries an ephemeral artifact pointer: no spec paths, packet or
      phase numbers, ADR ids, requirement, checklist, task or finding ids.
- [x] **T2.19** Confirm no commented-out code was introduced or left behind.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Banner-coverage scan returns 0, down from 51.
- [x] **T3.2** Capitalisation scan returns 0, down from 403.
- [x] **T3.3** Multi-line fence explanations return 0, down from 45.
- [x] **T3.4** Fence count unchanged and at or above the gate floor.
- [x] **T3.5** Full diff confirmed comment-only.
- [x] **T3.6** Nine program gates unaffected; `validate.sh --strict` through its realpath.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every source file sectioned, every comment sentence capitalised, every fence explanation one line of
reason, and a diff that contains nothing but comments.

The criterion that cannot be counted is the one that matters most: a reader who does not know this
code should be able to learn why it is shaped the way it is. That is judged by sampled review, and the
sample size belongs in the summary rather than being left implicit.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — measured baselines, requirements and the fence-text tension.
- `plan.md` — the grammar with a worked before-and-after, and the batch order.
- `checklist.md` — barrier sign-off with evidence.
- `../012-naming-and-structure/spec.md` — same 148 files; must land first, must not run concurrently.
- `../014-folder-documentation/tasks.md` — runs after.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
