---
title: "Child 013 plan — inline comment grammar and quality"
description: "The house grammar restated with a worked before-and-after, the batch order, how a comment-only diff is proven, and the rollback."
trigger_phrases:
  - "comment grammar plan approach"
  - "comment grammar packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/013-comment-grammar"
    last_updated_at: "2026-08-24T04:43:05Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored with worked rewrite example and batch order."
    next_safe_action: "Resolve the fence-text check scope, then run the banner batch."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 013 plan — inline comment grammar and quality

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Two passes over the same 148 files. The first adds section banners to the 51 files without one. The
second rewrites in-section comments to the house grammar — WHY not WHAT, capitalised, above the code,
at most three per ten lines.

The first pass is mechanical and safe. The second is judgement work and carries the packet's only real
risk: a confidently wrong explanation is worse than the narration it replaces.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The gate that matters is not a test. It is Claude reading every diff and confirming it contains
comment lines only. Every other safety argument in this packet depends on that being true, and no
script can substitute for it — a script can tell you a line changed, not that the change was inert.

Alongside it: the banner-coverage scan, the capitalisation scan, the guardrail-fence count, and the
nine program gates, which should be *unaffected* rather than merely green.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The standard is `sk-code-opencode`'s commenting rules: explain WHY not WHAT; at most three comments
per ten lines; one purpose line above a function; every comment sentence capitalised; comments before
the code, never trailing it; no commented-out code; and no ephemeral artifact pointers, which is a
hard block with a pre-commit gate behind it.

The flagged example makes the difference concrete. Today, at
`pages/chat/attachments/AttachmentPreviewDialog.svelte:64`:

```
// @ds guardrail: do-not-edit — the removal focus handoff moves focus to the adjacent tile
// (or the add-photo control) after the previewed item is removed and the dialog closes.
```

Two lines describing what the twelve lines below plainly do. A reader who scrolls past learns nothing
they could not have read from the code.

The rewrite states the reason the code is shaped this way, in one line:

```
// @ds guardrail: do-not-edit — removing the tile destroys the focused node, so focus must be
// handed to a live neighbour first or it falls to <body> and the reader loses its place.
```

Same length, entirely different content: it names the failure the code is avoiding. That is the test
to apply to every comment in the pass — *if I delete this comment, what does the next reader have to
work out for themselves?* If the answer is "nothing", the comment should be deleted, not reworded.

Section banners follow the grammar already in the 97 sectioned files: a `// ` prefix, a 67-character
`─` rule, an ALL-CAPS numbered label between two rules, banner weight scaled to file size.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 0: Resolve the fence-text check

The earlier pass added a per-file unchanged-fence-TEXT
diff. This packet rewrites fence prose by design, so that check is re-scoped to the marker and the
count, and re-baselined. Doing this first prevents the packet from tripping a gate it was always going
to trip.

### Phase 1: Banner coverage

The 51 files without a section rule, in folder batches. Mechanical, so
it goes first and builds confidence in the diff-review loop.

### Phase 2: Capitalisation and placement

The 403 lowercase comment starts and the 5 trailing
comments. Near-mechanical; a script proposes, a human confirms, because the exceptions are real.

### Phase 3: The WHY rewrite

Per folder, smallest first. This is the judgement pass, and the one
where the executor must read the code rather than paraphrase the comment.

### Phase 4: Density correction

Files over the three-per-ten ceiling, corrected by deleting comments
that restate the line beneath them.

### Phase 5: Barrier

Scans, comment-only diff confirmation, nine gates.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new test is written, because there is no new behaviour. The existing suites serve as the proof that
nothing moved: if a comment-only change turns a suite red, the change was not comment-only, and that
is the signal worth having.

The scans are counting exercises rather than tests: banner coverage, capitalisation violations,
multi-line fence explanations, fence count. Each has a measured starting number in `spec.md`, so the
delta is checkable rather than asserted.

REQ-002 — no comment narrates the line below it — has no mechanical check and should not pretend to
have one. It is verified by sampled diff review, and the sample size should be stated in the summary
rather than left vague.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 012 must land first, so banners and comments name components by their final names.
- 012 must not run concurrently — same 148 files.
- 014 runs after, and can quote comment text into folder documentation once it has settled.
- The comment-hygiene pre-commit hook is a hard dependency: it blocks the commit rather than warning.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Per-folder commits, each revertable independently. Because the diff is comment-only, a revert cannot
regress behaviour — which also means a bad rewrite is cheap to undo and there is no reason to leave
one in place while debating it.

The one non-trivial item is the Phase 0 fence-check re-baseline, which changes a gate. It reverts with
its own commit and should be sequenced first precisely so it can be unwound without touching the
comment work.
<!-- /ANCHOR:rollback -->
