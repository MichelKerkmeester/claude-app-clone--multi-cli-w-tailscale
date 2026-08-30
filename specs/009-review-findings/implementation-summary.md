---
title: "Implementation Summary: Review findings"
description: "Five gaps closed where a check reported success without looking: an unchecked config directory, a formatter that could rewrite vendored repositories, two dependencies resolved from leftovers, and goal logs contradicting their own packet."
trigger_phrases:
  - "review findings closed"
  - "typecheck coverage gap"
  - "formatter vendored repos"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/009-review-findings"
    last_updated_at: "2026-08-30T15:20:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed five verification gaps"
    next_safe_action: "None; the packet is closed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Implementation Summary: Review findings

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 009-review-findings |
| **Level** | 1 |
| **Status** | Complete |
| **Date** | 2026-08-30 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

Five checks that could not fail can now fail, and two accidental dependencies are declared.

| Gap | Before | After |
|-----|--------|-------|
| Catalog config unchecked | typecheck saw 1253 files | 1267 files, 0 errors |
| Formatter could not read Svelte | "No parser could be inferred" | reports style issues |
| Formatter reached vendored repos | 22,719 warnings, `specs/` was 22,232 of them | 488, own source only |
| `playwright` undeclared | removed by an ordinary install mid-session | root devDependency |
| `react` undeclared | hoisted transitive | web devDependency |
| Goal logs contradicted the packet | 4 reading "Phase not started" | 4 matching their own documents |

The formatter finding was the one with teeth. `npm run format` is `prettier --write .`, and with no
`specs/` exclusion it would have rewritten the six read-only research repositories that
`REPO RULES.md` opens by forbidding anyone to touch. Nobody had run it, so nothing had gone wrong yet.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Sized first, and the sizing is the point. `recommend-level.sh --loc 120 --files 12` returns Level 1
with a phase score of **0/50** against a threshold of 25 — phases explicitly not recommended. The
instruction was to create phases as needed; the honest reading of "as needed" was that they were not,
so this is four documents rather than the twenty-one the previous packet used for comparable work.

Adding the config directory to the typecheck include surfaced six errors. One was written yesterday —
a cast of the docgen payload that the framework's own story-context type does not carry. Four were
pre-existing index-access strictness in the editable-seams page, one a pre-existing narrowing in the
token playground. Leaving them would have traded an invisible gap for a permanently red gate, so all
six were fixed.

Declaring `playwright` was not planned. Installing the Svelte plugin removed it — exactly the trap
`REPO RULES.md` §4 documents — and four gates broke silently. Restoring the leftover would have left
the trap armed, so it is now declared.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Rationale |
|----------|-----------|
| No phased packet | The scorer returned 0/50. The review's central criticism was applying phase apparatus to small work; repeating that here would have been the same error with extra irony |
| Do not reformat | 488 files do not conform. That is a large mechanical diff which would move screenshots; the gap was the formatter's blindness, not the codebase's shape |
| Fix the pre-existing type errors rather than exclude them | Excluding would keep the gate green by keeping it blind, which is the failure this packet exists to close |
| Declare rather than restore `playwright` | A leftover that resolves by luck fails again on the next install |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| `typecheck` | exit 0 across 1267 files, up from 1253 |
| `test:web` | exit 0; 787 svelte and 776 logic |
| `catalog-smoke-cdp` | 674 frames, 0 throws |
| `catalog-state-visibility` | PASS — proves `playwright` resolves again |
| `token-identity` | 39 goldens matched |
| `format:check` scope | own source only; `specs/` and `screenshots/` excluded |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

`format:check` still fails, now on 488 real non-conformances rather than 22,617 phantom ones. It is a
gate nobody can currently use as a pass/fail signal, and conforming the codebase is deliberately left
as separate work.

Two gaps from the review are recorded and not closed: nothing gates the catalog's 26 written
descriptions against the components they describe, and 26 packets in this repository fail
`ANCHORS_VALID` on legacy spec documents. Both are larger than this packet and neither was caused by it.
<!-- /ANCHOR:limitations -->
