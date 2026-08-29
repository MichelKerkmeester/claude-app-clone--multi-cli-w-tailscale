---
title: "Child 011 — Post-migration UX affordances"
description: "The home for deliberate, operator-requested UX and visual changes to the shipped Svelte app — the first packet in this program allowed to change a rendered value. The migration children and the 007-EXT quality pass are bound by a hard zero-rendered-change invariant, so a request like 'make the scroll-to-latest control glass' has nowhere else to live. Each change is opt-in, individually scoped, and must still honour the frozen --pi-* token set, the a11y contracts and the security posture."
trigger_phrases:
  - "ux affordance change"
  - "glass scroll to latest button"
  - "post migration visual change"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/011-ux-affordances"
    last_updated_at: "2026-08-24T03:25:13Z"
    last_updated_by: "claude-opus-5"
    recent_action: "REQ-001 glass scroll-to-latest shipped; board green."
    next_safe_action: "Operator confirms the glass on a device (T3.4)."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 011 — Post-migration UX affordances

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../010-context-repo-research/spec.md |
| **Successor** | ../012-naming-and-structure/spec.md |
| Parent | `004-sveltekit-spa-migration` |
| Level | 1 |
| Status | Complete |
| Depends on | 007 cutover (shipped) |
| Owner | Claude |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Every other child of this parent is bound by the program invariant: **re-hosting, not redesign —
never change a rendered value.** That invariant is what makes the migration provable, and the
token-identity gate exists to enforce it.

An operator request to change how something *looks* is therefore neither a defect nor migration
work — it is new scope. Putting it anywhere else would either violate a frozen invariant or quietly
weaken the gate that protects it. This packet is that scope: the one place a deliberate, approved
visual change is allowed to land.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** deliberate, individually-approved visual and interaction affordances on the shipped app.

**Out of scope, permanently:** the `--pi-*` primitive token values, the security posture, routing
behaviour, and the a11y contracts (roles, focus order, `≥44px` targets, reduced-motion,
`prefers-contrast`, `forced-colors`). A change that reduces contrast must state how it stays legible.

**Out of scope for REQ-001 specifically:** `followToBottom()`, the live-edge threshold, virtualization and
turn grouping — all sit behind a `@ds guardrail: do-not-edit` fence. No new design token is
introduced; the glass treatment composes existing ones.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### REQ-001 — Glass scroll-to-latest control

The transcript already ships this affordance
(`app-mobile/src/pages/chat/transcript/TranscriptList.svelte`): a 2.75rem circular button holding a
down-chevron, centred above the composer, revealed only once the reader leaves the live edge
(`!atLiveEdge`, a 96px threshold), carrying an unread-count badge and hiding itself while the slash
palette is open. Tapping it calls `followToBottom()`.

Its background is the solid `var(--surface-raised)`. The request is for the **glass** treatment the
operator recognises from the Claude app.

Restyle that control to the app's existing glass idiom — the one already used by `Header.svelte` and
`SessionHeader.svelte`, `color-mix(in oklch, <surface> N%, transparent)` plus
`backdrop-filter: blur(12px)` — without changing its geometry, position, reveal logic, badge,
a11y labelling or hit target.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

All five trace to REQ-001; the packet ships only when every one of them holds.

1. The control reads as translucent over scrolled transcript content, with the content behind it
   blurred rather than merely showing through.
2. Geometry, position, reveal threshold, badge and `aria-label` are byte-identical to today —
   evidenced by a diff containing zero removed lines.
3. A browser without `backdrop-filter` support still gets the fully opaque control, never a
   washed-out translucent button over unblurred text.
4. Under `prefers-contrast: more` the control returns to an opaque surface carrying the
   `--line-strong` border, matching the app's existing high-contrast guarantee.
5. No `--pi-*` primitive value is added, removed or changed — evidenced by `token-identity verify`.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Risk | Mitigation |
|---|---|
| Translucency lowers the chevron's contrast against scrolling content | The `prefers-contrast: more` branch restores an opaque surface plus the stronger border. |
| A browser without `backdrop-filter` renders a washed-out button | The glass rules live inside `@supports`; the opaque rule is the base, not dead code. |
| A restyle silently disturbs the reveal logic behind the guardrail fence | The change is append-only; a diff with zero deletions is the proof. |

**Depends on:** the 007 cutover (shipped). No dependency on 007-EXT, 008 or 009.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

Both answered by the operator.

1. **Reword the two runtime strings that read as terminal but are recoverable?**
   `foreground-required` and `host-unavailable`. **Not selected.** Remains available; nothing depends
   on it.
2. **Allow aborting a turn without discarding the draft?** **Answered: yes, do it.** The earlier
   recommendation against this was wrong about the user's actual expectation: losing typed text on
   abort is surprising regardless of whether an interrupt path exists, and the operator asked
   specifically for behaviour closer to a familiar chat client. Preserve the draft on abort.

<!-- /ANCHOR:questions -->
