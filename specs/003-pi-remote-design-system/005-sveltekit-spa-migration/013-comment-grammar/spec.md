---
title: "Child 013 — Inline comment grammar and quality"
description: "Bring every source file up to the sk-code-opencode commenting standard: section banners on the 51 files that lack them, and a rewrite of in-section comments from WHAT-narration to durable WHY. No behaviour, token or a11y change."
trigger_phrases:
  - "inline comment quality why not what"
  - "section banner coverage svelte"
  - "comment grammar sk-code-opencode"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/013-comment-grammar"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet scoped from measured comment-quality inventory."
    next_safe_action: "Resolve the guardrail-fence text-diff tension, then start the banner pass."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 013 — Inline comment grammar and quality

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../012-naming-and-structure/spec.md |
| **Successor** | ../014-folder-documentation/spec.md |
| **Level** | 2 |
| **Layer** | post-cutover editability — comment pass |
| **Writer** | executor (`app-mobile/**` comments) + Claude (diff inspection, gates, git) |
| **Barrier** | nine program gates green + comment-grammar scan clean |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The earlier editability pass sectioned the large files and stopped. What is left is two distinct
problems that look like one.

**Coverage.** 51 of 148 source files carry no section banner at all — the primitives, the smaller
artifact and transcript components, and most of `shared/`. Those files were skipped because they were
small, but a 90-line component with four responsibilities is exactly where a reader gets lost.

**Wording.** Where comments exist, many narrate mechanics instead of stating reasons. The standard
this codebase is meant to follow is explicit that comments explain WHY, not WHAT, and 403 line
comments additionally start lowercase against a rule that says every comment sentence begins with a
capital.

The example the operator flagged shows the failure exactly, at
`pages/chat/attachments/AttachmentPreviewDialog.svelte:64`:

```
// @ds guardrail: do-not-edit — the removal focus handoff moves focus to the adjacent tile
// (or the add-photo control) after the previewed item is removed and the dialog closes.
```

Two lines that restate what the twelve lines below them plainly do. The reader still does not know the
one thing the comment exists to convey: that removing the tile destroys the focused node, so focus
must be handed to a live neighbour or it falls to `<body>` and a screen-reader user loses their place.

The purpose here is that a reader who does not already know the code can learn why it is shaped this
way. Nothing about behaviour changes.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- **Banner coverage** on the 51 files that lack one: 67-character `─` (U+2500) rules, ALL-CAPS
  numbered section labels, banner weight scaled to file size, matching the grammar already used in the
  97 sectioned files.
- **Comment rewrite** against `sk-code-opencode`'s commenting standard: WHY not WHAT; at most three
  comments per ten lines; a single-line purpose comment above a function; sentence capitalisation;
  comments placed before the code, never trailing it.
- **Guardrail-fence prose.** The 45 fences whose explanation spills onto a continuation line get
  rewritten to one line of reason. The `@ds guardrail: do-not-edit` marker itself is untouched.
- **Density correction** where a file exceeds the three-per-ten-lines ceiling, by deleting comments
  that restate the line beneath them rather than by rewording them.
- **Comment hygiene**, already a hard block: no spec paths, packet or phase numbers, ADR ids,
  requirement, checklist, task or finding ids in any comment.

**Out of scope:** any code change whatsoever. This packet edits comments and only comments. No token
value, no behaviour, no routing, no a11y contract, no test.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — All 148 in-scope source files carry a section banner in the house grammar. Coverage is
  measured, not asserted: a scan for files lacking a `─` rule returns zero.
- **REQ-002** — No comment narrates what the line below it does. This is the requirement that cannot
  be checked mechanically, so it is verified by sampled human diff review rather than claimed by a
  script.
- **REQ-003** — Every comment sentence starts with a capital letter, excepting directives such as
  `eslint-disable` and `@ts-` and identifiers quoted verbatim. The current count of violations is 403.
- **REQ-004** — Comment density stays at or below three comments per ten lines of code, corrected by
  deletion rather than by compression.
- **REQ-005** — The `@ds guardrail: do-not-edit` markers are preserved exactly and the fence count does
  not fall. Gate 6 counts them, and the fences are the design system's editing boundary.
- **REQ-006** — The diff contains comment lines only. Claude inspects every diff for a non-comment
  line, because the whole safety argument of this packet rests on that being true.
- **REQ-007** — No comment gains an ephemeral artifact pointer. Comment hygiene is a hard block with
  a pre-commit gate behind it.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Banner-coverage scan returns 0 files without a section rule, up from 51.
2. Capitalisation scan returns 0 violations, down from 403.
3. Multi-line guardrail-fence explanations return 0, down from 45.
4. `@ds guardrail:` fence count is unchanged and remains at or above the gate's floor.
5. The full diff is comment-only, confirmed by inspection rather than by trust.
6. The nine program gates stay green, `validate.sh` invoked through its realpath.

Gates 1 through 8 should be *unaffected* rather than merely passing — a comment-only change that
moves a gate is evidence the change was not comment-only.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **The fence-text diff tension.** The earlier editability pass introduced a per-file
  unchanged-fence-TEXT diff as one of its safety proofs. This packet deliberately rewrites fence
  prose, so that check must be re-scoped to the marker rather than the sentence, and re-baselined in
  the same commit. Left unresolved, it either blocks this packet or silently stops proving anything.
- **A comment rewrite can encode a misunderstanding.** A wrong WHY is worse than no comment, because
  a reader will believe it. Sampled review has to read the code, not just the comment.
- **Collision with 012** — both packets touch all 148 files; they must not run concurrently.
- **The live-follow daemon** reverts uncommitted edits, so batches commit atomically.
- Depends on 012 landing first, so banners name components by their final names.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **How should the fence-text check be re-scoped?** Proposed: assert the `@ds guardrail: do-not-edit`
   marker and the fence count, and stop asserting the prose after it. That keeps the editing boundary
   machine-enforced while letting the explanation improve. Operator confirmation wanted, because it
   loosens a check that was deliberately added.
2. **Does the three-per-ten-lines ceiling apply to `.svelte` markup blocks**, or only to script
   blocks? Proposed: script blocks only, since markup comments are structural labels rather than
   explanations. Not blocking; a default is stated and can be corrected.
<!-- /ANCHOR:questions -->
