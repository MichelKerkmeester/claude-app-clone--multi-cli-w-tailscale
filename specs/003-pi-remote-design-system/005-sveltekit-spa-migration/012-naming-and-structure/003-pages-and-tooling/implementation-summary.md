---
title: "Child 012/003 implementation summary — pages and tooling"
description: "The whole source tree is kebab-case and kind-first, the tooling that named the old paths was re-baselined, and three more ways a reference can hide were found and closed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/003-pages-and-tooling"
    last_updated_at: "2026-08-23T20:24:46Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Naming stop-gap landed in the conventions authority; the child is complete."
    next_safe_action: "None — 014 and 018 unblock from here."
    blockers:
      - "The conventions-authority correction is a cross-repository edit and is not yet landed."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 012/003 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `012-naming-and-structure` |
| Level | 2 |
| Status | **Complete — in-repository work shipped and the conventions authority corrected** |
| Requirements shipped | REQ-001, REQ-002, REQ-003, REQ-004, REQ-007 |
| Requirements open | None |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

**Every in-scope path is kebab-case, and the kind comes first.** The completeness scan reports zero
offenders across 219 files. The five screens carry `screen-`, so a reader searching for one types
what they would type for any other kind rather than having to already know the five names.

**Which components take a kind prefix is a rule, not a per-file judgement.** A name ending in one of
the closed kinds is an instance of that kind; everything else is a feature component whose name
already is the thing. The rule reads both the PascalCase and the kebab-case spelling and skips
anything already kind-first, so running it twice converges rather than leaving half the tree
kind-last.

**The tooling that named the old paths was re-baselined.** Eighteen story-coverage exemptions pointed
at files that no longer existed — and an exemption that resolves to nothing exempts nothing, so the
gate would have started demanding stories for components that deliberately have none.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Folder by folder, each batch carrying its moves, its generated rewrite and a green typecheck, with
the wider suites run before each commit.

Three more ways a reference can hide turned up here, on top of the six the previous child found:

| Shape | How it fails |
|---|---|
| `readFileSync('app-mobile/src/…/X.svelte')` — a test reading component source by cwd-relative path | Fails late, and reports a missing file rather than a missed rename |
| A bare path string in an array with no call around it | Nothing resolves it until the line using it runs; a relay security test named seven client components this way |
| A kind rule that only reads PascalCase | A folder already kebab-cased kind-last is invisible to a second pass |

The last one bit for a reason worth recording: the manifest is a generated file that is also
committed, so reverting the working tree restored a stale copy of it and a batch landed kind-last.
The rule is now idempotent, which turned an unwind into a second pass.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**A prefix is applied only where the name ends in a closed kind.** That keeps the rule mechanical and
reviewable; adding a kind is a deliberate edit to one list rather than an emergent guess about what
counts as a card.

**The stale-path sweep takes its rename chain from git, not the manifest.** A file that moved twice
still resolves to where it ended up, and only a literal resolving to a file git actually moved is
rewritten — which is what makes a search across every code tree safe.

**Folder documentation stayed where it was.** `CODE.md` and `README.md` files still describe folders
by their old component names in prose. Correcting that text is packet 013 and 014's work.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Gate | Result |
|---|---|
| Completeness scan | PASS — 0 offenders across 219 files, route tree excluded by name and by directory |
| `npm run build` | PASS — exit 0 |
| `npm run typecheck` | PASS — exit 0, 1123 files, 0 errors |
| Backend, four real directories | PASS — 52 files / 390 tests, only the documented auth flake |
| `npm run test:web` | PASS — exit 0, 66/532 and 16/188, both summaries present |
| Token identity, three themes | PASS — 0 CHANGED / 0 VANISHED / 0 ADDED, corpus confirmed at 96 components plus `app.css` |
| Contrast | PASS — 77 pairs at threshold |
| `@ds guardrail:` fences | PASS — 277 before and after |
| CDP structural, 390px | PASS — light and dark, no horizontal overflow |
| Catalog smoke | PASS — 267 stories × 2 themes = 534 frames, 0 throws |
| Story coverage | PASS — every exemption resolves to a file that exists |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The conventions authority now teaches the shipped grammar, as a stop-gap only.** The section
added in `3f53552ed2` states the grammar the tree actually uses; the surrounding document still
predates the migration in other respects, and packet 019 owns that refresh.

**Documentation prose still names old paths.** Ten folder documents and several story-file comments
reference components and folders by names that have changed. Nothing resolves those strings, so
nothing breaks; packets 013 and 014 own the text.

**The kind list is closed by decision, not by discovery.** A component that is plainly an instance of
some kind not on the list keeps its feature name, and nothing flags that.
<!-- /ANCHOR:limitations -->
