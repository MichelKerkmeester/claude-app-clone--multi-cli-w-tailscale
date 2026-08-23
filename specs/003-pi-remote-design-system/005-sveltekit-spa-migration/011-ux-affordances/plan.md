---
title: "Child 011 plan — post-migration UX affordances"
description: "Approach and verification for operator-requested visual changes to the shipped Svelte app, starting with the glass scroll-to-latest control."
contextType: "implementation"
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 011 plan

---

## 1. APPROACH

Each affordance is a separate, individually-approved requirement. The house rule for this packet:
a change is expressed by **composing existing tokens and existing idioms**, never by inventing a
new primitive. That keeps the design system single-sourced even while rendered output changes.

Verification differs from the rest of the program. The token-identity gate is the migration's proof
that nothing moved; here output is *meant* to move, so identity alone cannot be the acceptance
signal. Instead each requirement states its own observable acceptance criteria, and the frozen
token set is verified separately via `token-identity.mjs verify`, which checks the `--pi-*` goldens
themselves rather than the rendered corpus.

## 2. R1 — GLASS SCROLL-TO-LATEST

**Where:** `app-mobile/src/pages/chat/transcript/TranscriptList.svelte`, the `.scroll-to-latest`
rule inside the component's scoped `<style>`.

**Why it is additive only.** The control's geometry, absolute placement, reveal condition, badge and
`aria-label` are all correct already and several sit behind a `do-not-edit` fence. The change
therefore appends rules rather than editing the base rule, so a diff with zero removed lines is
itself the proof that behaviour did not move.

**The three layers:**

1. **Base (unchanged):** the existing opaque `var(--surface-raised)` rule stays exactly as written.
   It is the fallback, not dead code.
2. **`@supports (backdrop-filter: blur(12px))`:** swaps in
   `color-mix(in oklch, var(--surface-raised) 88%, transparent)` plus the blur. The guard is
   load-bearing — without a real backdrop blur, a translucent button would sit over unblurred
   transcript text and degrade the legibility of both, which is worse than the solid control.
   88% sits just below the header bars' 90–91%, since a small floating control needs slightly more
   translucency to read as glass at that size.
3. **`@media (prefers-contrast: more)`:** returns the control to opaque and adds `--line-strong`,
   matching the app's existing high-contrast carry for raised surfaces. Ordered last so it wins.

## 3. VERIFICATION

| Check | Result |
|---|---|
| `token-identity.mjs verify` — the frozen `--pi-*` goldens | PASS, 35 goldens across light/dark/system |
| `npm run build -w @pi-remote/web` | RC 0 |
| `npm run typecheck -w @pi-remote/web` | 0 errors / 1123 files |
| Svelte component suite | 65 files, 530 passed, 3 skipped |
| Diff shape — removed lines must be zero | 29 insertions, 0 deletions |

The zero-deletions result is the acceptance evidence for criteria 2 of R1: nothing that governs
geometry, position, reveal threshold, badge or labelling was touched.
