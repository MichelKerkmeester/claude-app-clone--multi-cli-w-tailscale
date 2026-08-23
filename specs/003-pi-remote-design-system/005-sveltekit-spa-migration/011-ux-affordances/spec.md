---
title: "Child 011 — Post-migration UX affordances"
description: "The home for deliberate, operator-requested UX and visual changes to the shipped Svelte app — the first packet in this program that is ALLOWED to change a rendered value. The migration children (001-007) and the 007-EXT quality pass are all bound by a hard zero-rendered-change invariant, so a request like 'make the scroll-to-latest control glass' has nowhere else to live. Each change here is opt-in, individually scoped, and must still honour the frozen --pi-* token set, the a11y contracts, and the security posture."
trigger_phrases:
  - "ux affordance change"
  - "glass scroll to latest button"
  - "post migration visual change"
importance_tier: "normal"
contextType: "implementation"
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 011 — Post-migration UX affordances

---

## 1. METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 1 |
| Status | in-progress |
| Depends on | 007 cutover (shipped) |

---

## 2. WHY THIS PACKET EXISTS

Every other child of this parent is bound by the program invariant: **re-hosting, not redesign —
never change a rendered value.** That invariant is what makes the migration provable; the
token-identity gate exists specifically to enforce it.

An operator request to change how something *looks* is therefore not a defect and not migration
work — it is new scope, and putting it anywhere else would either violate a frozen invariant or
quietly weaken the gate that protects it. This packet is that scope.

**What changes here:** deliberate, individually-approved visual and interaction affordances on the
shipped app.

**What does not change, ever:** the `--pi-*` primitive token values, the security posture, the
routing behaviour, and the a11y contracts (roles, focus order, `≥44px` targets, reduced-motion,
`prefers-contrast`, `forced-colors`). A change that reduces contrast must state how it stays legible.

---

## 3. REQUIREMENTS

### R1 — Glass scroll-to-latest control

The transcript already ships a scroll-to-latest affordance
(`app-mobile/src/pages/chat/transcript/TranscriptList.svelte`): a 2.75rem circular button holding a
down-chevron, centred above the composer, revealed only when the reader has left the live edge
(`!atLiveEdge`, a 96px threshold), carrying an unread-count badge and hiding itself while the slash
palette is open. Tapping it calls `followToBottom()`.

Its background is the solid `var(--surface-raised)`. The request is for the **glass** treatment the
operator recognises from the Claude app.

**Requirement:** restyle that control to the app's existing glass idiom — the one already used by
`Header.svelte` and `SessionHeader.svelte`, `color-mix(in oklch, <surface> N%, transparent)` plus
`backdrop-filter: blur(12px)` — without changing its geometry, position, reveal logic, badge,
a11y labelling, or hit target.

**Acceptance:**
1. The control reads as translucent over scrolled transcript content, with the content behind it
   blurred rather than merely showing through.
2. Geometry, position, reveal threshold, badge and `aria-label` are byte-identical to today.
3. A browser without `backdrop-filter` support still gets the fully opaque control — never a
   washed-out translucent button with unblurred text behind it.
4. Under `prefers-contrast: more` the control returns to an opaque surface and carries the
   `--line-strong` border, matching the app's existing high-contrast guarantee.
5. No `--pi-*` primitive value is added, removed, or changed.

---

## 4. OUT OF SCOPE

- Any change to `followToBottom()`, the live-edge threshold, virtualization, or turn grouping —
  those sit behind a `@ds guardrail: do-not-edit` fence.
- Introducing a new design token. The glass treatment composes existing tokens.
- Any other visual change not separately requested and approved.
