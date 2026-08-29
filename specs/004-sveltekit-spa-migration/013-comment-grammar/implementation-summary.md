---
title: "Child 013 implementation summary — comment grammar"
description: "Banners on 47 of 48 modules, why-comments replacing what-comments across 192 files, and two measuring instruments corrected before their numbers were used as evidence."
trigger_phrases:
  - "comment grammar implementation summary"
  - "comment grammar packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/013-comment-grammar"
    last_updated_at: "2026-08-24T17:58:13.720Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Comment pass complete across the source tree; one module and three fences remain."
    next_safe_action: "Start 014, which documents the tree this packet just made readable."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 013 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `004-sveltekit-spa-migration` |
| Level | 2 |
| Status | **Shipped, with a named remainder** |
| Requirements shipped | REQ-002 … REQ-007 |
| Requirements partial | REQ-001 — one module of 143 still lacks a banner |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

A hundred and ninety-two files across the shared and page trees gained section banners in the house
grammar, and the comments that restated the line beneath them are gone rather than reworded. Fences
whose reason spilled onto a second comment line now give it in one.

| Measure | Before | After |
|---|---|---|
| Modules without a section banner | 48 | 1 |
| Comment sentences starting lowercase | 16 | 0 |
| Commented-out code lines | 5 | 0 |
| Fence reasons spilling to a second line | 46 | 3 |
| `@ds guardrail:` fences | 277 | 277 |
| `do-not-edit` markers | 184 | 184 |

Both ends of every row were measured with the same instrument, after that instrument was corrected.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Three batches, smallest first: the shared primitives and chrome as a proving ground, then the
artifacts and transcript trees, then everything remaining. Each batch was verified comment-only
before it was committed.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**The comment-only check was rebuilt twice before it was trusted.** A grep for comment markers
reported twelve violations that were continuation lines of block and HTML comments — such a line
carries no marker and reads as code to a line-shaped test. A character-level lexer replaced it and
broke on the `\n` escape inside `text.split('\n')`, ending string mode early and swallowing the
comments that followed; fixed, it still could not tell a regex literal from a division. The verifier
now strips whole comment lines from both versions and compares what remains. It cannot make either
mistake, and its failure mode is to report a trailing-comment edit as a code change — the packet bans
trailing comments anyway, so a gate that errs toward stopping is the right kind of wrong.

**The fence counter was counting a narrower scope than the gate.** It reported fences rising from 140
to 145 when none had been added: a reformatted fence moved into the set it recognised. It now counts
the marker exactly as the gate does, and the two agree at 277.

**The scan was told to skip commented-out code, which was the wrong correction.** Five commented-out
declarations survived in `app.d.ts` — SvelteKit's list of augmentable interfaces — and making the
counter ignore that category is how the category survives. The checklist already required that no
commented-out code be *left*. The scan now counts them, the five are gone, and the file says in one
sentence what the commented-out lines were there to say.

**The capitalisation counter was counting wrapped prose.** Every line of a comment run read as a
sentence start, which turned sixteen real violations into seven hundred and forty-six. Acting on that
number would have meant capitalising the middle of sentences. The packet's own recorded baseline of
403 is very likely the same artifact.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Comment-only, batch 1 | PASS — 0 code changes across 27 files |
| Comment-only, batch 2 | PASS — 0 code changes across 60 files |
| Comment-only, batch 3 | PASS — 0 code changes across 105 files |
| `@ds guardrail:` fence total | PASS — 277 before and after, confirmed two independent ways |
| `do-not-edit` markers | PASS — 184 before and after |
| Comment hygiene | PASS — zero artifact identifiers in any added comment |
| `npm run typecheck` | PASS — exit 0, 0 errors |
| `npm run test:web:svelte` | PASS — exit 0, 66 files / 532 passed |
| `npm run test:web:logic` | PASS — exit 0, 16 files / 188 passed |
| Backend, four real directories | PASS — 53 files / 392 tests, only the documented auth flake |
| Token identity, three themes | PASS — 0 CHANGED / 0 VANISHED / 0 ADDED |

A red `typecheck` and `test:web` pair during the third batch was the documented bits-ui
body-scroll-lock teardown throw under load from the still-finishing dispatch; both exit 0 when run
against a quiet machine.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**One module still lacks a banner** — `pages/chat/artifacts/card-artifact.svelte` — along with three
fence reasons that still run to a second line. They are named rather than rounded away.

**Whether a comment says why rather than what cannot be measured**, and this packet does not pretend
otherwise. The three counted properties are proxies; the substance was reviewed by reading diffs, and
a reader who disagrees with a particular comment has no scan to appeal to.

**The ambient declaration files carry no banner by design.** `app.d.ts` and `vite-env.d.ts` are
short SvelteKit template files; adding house sections to them would be structure for its own sake.
<!-- /ANCHOR:limitations -->
