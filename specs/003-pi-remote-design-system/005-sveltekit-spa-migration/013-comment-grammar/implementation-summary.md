---
title: "Child 013 implementation summary — inline comment grammar and quality"
description: "Continuity anchor for the comment packet. Nothing is implemented yet: this records the measured starting state, the standard being applied, and the gate tension that must be resolved first."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/013-comment-grammar"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet scoped from measured comment inventory; no code changed."
    next_safe_action: "Re-scope the fence-text check, then start banner coverage."
    blockers: ["fence-text diff check must be re-scoped before fence prose can be rewritten"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 013 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | **Scoped, not started** |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing. No comment has been edited.

The measured starting state, which is what makes the deltas checkable later:

| Measurement | Value |
|---|---|
| In-scope source files | 148 |
| Files with no section banner | 51 |
| Comment sentences starting lowercase | 403 |
| Trailing comments (after code, same line) | 5 |
| `@ds guardrail:` fences | 277 |
| Fences whose explanation spills onto a continuation line | 45 |

The standard being applied is `sk-code-opencode`'s commenting rules — WHY not WHAT, at most three
comments per ten lines, one purpose line above a function, sentence capitalisation, comments above
their code, no commented-out code, no ephemeral artifact pointers.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Two passes. Banner coverage first, because it is mechanical and builds confidence in the diff-review
loop. The WHY rewrite second, per folder, smallest first.

The executor writes comments. Claude inspects every diff for a non-comment line and owns git. That
inspection is the packet's actual safety mechanism; the scans only count.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Delete rather than reword.** A comment that costs the reader nothing when removed should be removed.
Rewording it produces a denser file of restatements, which reads as more thorough and is not.

**Sample the WHY pass against the code, not the prose.** A rewritten comment can be well-written and
wrong, and a wrong reason is worse than narration because a reader will act on it. One in five
rewritten comments is checked against the code it sits above.

**Preserve the fence markers exactly, rewrite only the prose.** The `@ds guardrail: do-not-edit`
markers are the design system's editing boundary and are counted by a gate. The sentence after them is
explanation and is fair game.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Banner-coverage scan | not run — baseline 51 |
| Capitalisation scan | not run — baseline 403 |
| Multi-line fence scan | not run — baseline 45 |
| Comment-only diff inspection | not run |
| Nine program gates | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**The central requirement has no mechanical check.** "No comment narrates the line below it" cannot be
scanned for. It is verified by sampled human review, which means the packet's headline claim rests on
a sample rather than on a gate. Stating the sample rate as a number is the honest mitigation, not a
solution.

**A gate has to be loosened to do this work.** The per-file unchanged-fence-TEXT diff was added
deliberately as a safety proof, and this packet rewrites exactly the text it watches. Re-scoping it to
the marker and count keeps the editing boundary enforced while letting explanations improve — but it
is still a loosening, and it is recorded as an operator-facing open question rather than done quietly.

**Two packets contend for the same files.** This packet and 012 both touch all 148 source files, and
nothing enforces their sequencing except discipline.
<!-- /ANCHOR:limitations -->
