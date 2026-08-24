---
title: "Child 011 plan — post-migration UX affordances"
description: "Approach, quality gates and verification for operator-requested visual changes to the shipped Svelte app, starting with the glass scroll-to-latest control."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/011-ux-affordances"
    last_updated_at: "2026-08-24T03:21:51Z"
    last_updated_by: "claude-opus-5"
    recent_action: "REQ-001 glass scroll-to-latest shipped; board green."
    next_safe_action: "Operator confirms the glass on a device (T3.4)."
    completion_pct: 90
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 011 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Each affordance is a separate, individually-approved requirement. The house rule: a change is
expressed by **composing existing tokens and existing idioms**, never by inventing a new primitive.
That keeps the design system single-sourced even while rendered output deliberately changes.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Verification differs from the rest of the program. The token-identity *corpus diff* is the
migration's proof that nothing moved; here output is meant to move, so it cannot be the acceptance
signal. The frozen token set is instead verified with `token-identity.mjs verify`, which checks the
`--pi-*` goldens themselves rather than the rendered corpus.

| Gate | Result |
|---|---|
| `token-identity.mjs verify` — frozen `--pi-*` goldens | PASS, 35 goldens across light/dark/system |
| `npm run build -w @pi-remote/web` | RC 0 |
| `npm run typecheck -w @pi-remote/web` | 0 errors / 1123 files |
| Svelte component suite | 65 files, 530 passed, 3 skipped |
| Catalog smoke (CDP, both themes) | 267 stories × 2 = 534 frames, 0 throws |
| Diff shape — removed lines must be zero | 29 insertions, 0 deletions |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**Where:** `app-mobile/src/pages/chat/transcript/TranscriptList.svelte`, the `.scroll-to-latest` rule
inside the component's scoped `<style>`.

**Why append-only.** The control's geometry, absolute placement, reveal condition, badge and
`aria-label` are already correct, and several sit behind a `do-not-edit` fence. The change therefore
appends rules rather than editing the base rule, so a diff with zero removed lines is itself the
proof that behaviour did not move.

**Three layers, in cascade order:**

1. **Base (unchanged):** the existing opaque `var(--surface-raised)` rule. It is the fallback, not
   dead code.
2. **`@supports (backdrop-filter: blur(12px))`:** swaps in
   `color-mix(in oklch, var(--surface-raised) 88%, transparent)` plus the blur. The guard is
   load-bearing — without a real backdrop blur a translucent button would sit over unblurred
   transcript text and degrade the legibility of both, which is worse than the solid control. 88%
   sits just below the header bars' 90–91%, since a small floating control needs slightly more
   translucency to read as glass at that size.
3. **`@media (prefers-contrast: more)`:** returns the control to opaque and adds `--line-strong`,
   matching the app's existing high-contrast carry for raised surfaces. Ordered last so it wins.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Survey — Done

Confirm the affordance already exists rather than building a second one, and identify the app's
established glass idiom instead of inventing one.

### Phase 2: Implementation — Done

Append the `@supports` glass layer and the `prefers-contrast` opaque fallback, leaving the base rule
and every behavioural line untouched.

### Phase 3: Verification — Done

Run the gate board and the zero-deletions diff proof.

### Phase 4: Operator confirmation — Deferred

Whether the control reads as glass on a device is a judgement no gate can make.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The change is presentational, so the test strategy is protective rather than additive: prove the
surrounding behaviour did not move. The Svelte suite covers the transcript's live-edge behaviour and
must stay green; the catalog smoke renders every story in both themes; the zero-deletions diff is
the structural proof for the reveal logic and a11y attributes.

No new test is added, because there is no new behaviour to assert — asserting a computed
`backdrop-filter` string under jsdom would test the stylesheet, not the product.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The 007 cutover (shipped) — the Svelte transcript is the surface being restyled.
- The existing `--surface-raised`, `--surface-muted` and `--line-strong` tokens. Nothing new.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change is a contiguous append inside one scoped `<style>` block. Reverting is deleting the two
appended at-rules, or `git revert` of the single commit. No data, schema, protocol or persisted
state is involved, so rollback is immediate and total.
<!-- /ANCHOR:rollback -->
