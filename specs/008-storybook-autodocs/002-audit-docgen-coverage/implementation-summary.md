---
title: "Implementation Summary: Phase 2 — Audit docgen coverage"
description: "The catalog's 100 docs pages measured and ranked: 910 props of which 118 carry prose, 73 pages whose table is types-only, and zero page errors — which answers the render-gate question with evidence rather than caution."
trigger_phrases:
  - "docgen coverage audit"
  - "which docs pages are thin"
  - "docs render gate decision"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/002-audit-docgen-coverage"
    last_updated_at: "2026-08-30T11:30:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Ranked all 100 docs pages; render gate declined on evidence."
    next_safe_action: "Begin phase 3 against the ranked list."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Implementation Summary: Phase 2 — Audit docgen coverage

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|-------|-------|
| **Spec Folder** | 002-audit-docgen-coverage |
| **Level** | 1 |
| **Status** | Complete |
| **Date** | 2026-08-30 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

`scripts/docgen-coverage.mjs` loads every docs page in a browser and reads the args table the way a
reader sees it, then ranks the pages by how little they convey. It writes
`scripts/docgen-coverage.json` and exits non-zero only on its own failure — a low score is the
finding, not an error.

### The catalog, measured

| Measure | Value |
|---------|-------|
| Docs pages | 100 |
| Props across all of them | 910 |
| Props carrying prose | 118 (13%) |
| Pages with at least one described prop | 25 |
| Pages with props but no prose at all | 73 |
| Pages with no props at all | 2 |
| Pages that threw | 0 |

The two propless pages are `attachments-attachmentrail` and `attachments-attachmentpreviewdialog`.
Both render from context rather than from arguments, so a generated table has nothing to say about
them and never will. They are the clearest candidates for prose and the clearest proof that prop count
alone is the wrong ranking.

At the other end, `primitives-collapsible` carries 54 described props — it extends a third-party
primitive whose own props arrive already documented. Documentation is inherited, not only authored.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

The first version of the metric was wrong in a way worth recording, because it looked right. It
counted a prop as described when its Description cell was non-empty — and that column holds **either**
a prop's JSDoc prose **or**, when there is none, its bare type. Every prop therefore read as
documented: `theme-control` scored 2 of 2 when its real answer is 0 of 2.

The two shapes are mutually exclusive in the rendered cell, so the fix classifies rather than measures
length. It was checked against ground truth before being trusted: `card-plan-ready` carries JSDoc on
exactly 3 of its 6 props and the audit reports 3 of 6; `theme-control` carries none and reports 0 of 2.
Only then was the ranking believed.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Measure the rendered page, not the docgen payload | What reaches the reader is the point, and a payload that renders to nothing is exactly the defect worth catching |
| Rank, never judge | A context-driven component legitimately has no props; the ranking says where prose pays, not which component is deficient |
| **Decline the docs render gate** | All 100 pages render with zero page errors. A gate would currently protect against nothing observed, and a gate that has never caught anything is a build cost plus a false sense of cover. The audit is re-runnable, so the question can be re-asked cheaply if a page ever throws |
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|-------|--------|
| Every tagged component measured once | 100 of 100 docs entries, no duplicates |
| Ranking reproducible | Two consecutive runs produced identical ranking **and** identical scores |
| Classifier correct | `card-plan-ready` 3/6 and `theme-control` 0/2, both matching their source |
| Exits on own failure only | Exit 0 with 73 thin pages present |
| Page errors | 0 across 100 pages |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

Prose is detected by classifying the Description cell, because the rendered table is where prose and
type share one column. The classifier is checked against two components with known answers, not
against all 100. A prop whose JSDoc reads like a type — a single capitalised word, say — would be
counted as undocumented.

The ranking scores what the table conveys. It cannot see whether a component's *contract* is invisible
in its rendering, which is the other half of what earns prose and the reason phase 3 reads the
components rather than only this list.
<!-- /ANCHOR:limitations -->
