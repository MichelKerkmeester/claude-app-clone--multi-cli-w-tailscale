---
title: "Child 004 — Shared Chrome + Composer & LeavePlanSheet (focus-risk)"
description: "Rewrite the shared chrome (SessionHeader, RuntimeStrip, TodoPanel, plan components, ModelEffortSheet) in parallel, then the composer (SessionComposer + ComposerCommandAutocomplete) and LeavePlanSheet serially and single-focus — these hand-roll focus/IME/slash and are the highest a11y-parity risk. Composer autocomplete uses Melt UI (focus stays in the textarea)."
trigger_phrases:
  - "svelte chrome composer leaveplansheet focus parity"
  - "melt ui composer autocomplete pi remote"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/005-sveltekit-spa-migration/004-chrome-and-composer"
    last_updated_at: "2026-08-19T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Spec authored (L3 child)"
    next_safe_action: "Parallel chrome dispatches, then K=1 composer + LeavePlanSheet after L2 barrier"
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 004 — Shared Chrome + Composer & LeavePlanSheet

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Layer** | L3 — chrome parallel; composer + LeavePlanSheet serial, **K=1** |
| **Writer** | cli-devin (GLM-5.2 High) → Claude verifies |
| **Barrier** | chrome renders + focus/a11y regression tests pass |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Chrome is broad but independent (parallel-safe). The composer and LeavePlanSheet are the opposite —
narrow but focus-critical: they hand-roll focus, IME, and slash handling, where any generator is
most likely to break a11y parity. They are done **serially, single-focus**, with regression tests
that assert the exact focus/`activeElement` behavior.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — shared chrome (parallel, disjoint files):**
- `SessionHeader`, `RuntimeStrip`, `TodoPanel` (on `Collapsible`), the plan components,
  `ModelEffortSheet` — each composes the child-002 primitives; each folds its `style.css` block into
  its scoped `<style>` (scope-audited).

**In scope — focus-sensitive units (serial, K=1):**
- `LeavePlanSheet` — Bits `Dialog` with `onOpenAutoFocus` preventDefault + explicit `stay.focus()`;
  regression test asserts `activeElement === stay` (risk R2).
- `SessionComposer` + `ComposerCommandAutocomplete` — hand-rolled textarea + **Melt UI**
  `createPopover` with focus-trap **off**; `aria-activedescendant` virtual focus keeps focus in the
  textarea; `deriveSlashTrigger` stays pure (ported in child 002). IME/keyboard/slash parity (risk R3).

**Out of scope:** views, shell, routing; any token value; shared files; installs.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- R1: Chrome dispatches are disjoint; the composer/LeavePlanSheet run alone (no concurrent dispatch).
- R2: LeavePlanSheet focus parity is asserted by a regression test (`activeElement === stay`).
- R3: The composer never steals focus from the textarea; slash/IME behavior matches React exactly.
- R4: Every moved CSS block is scope-audited; guardrail fences preserved.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA (barrier gate)

- Chrome renders in the catalog (light + dark) without throw.
- Focus/a11y regression tests pass: LeavePlanSheet `activeElement`, composer focus-retention +
  slash-trigger; `svelte-check` clean; Claude re-verifies token-identity on touched surfaces.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **R2 LeavePlanSheet focus:** Bits `Dialog` default auto-focus differs from the React hand-roll →
  explicit focus + assertion.
- **R3 Composer IME/slash:** highest-parity risk → K=1, pure `deriveSlashTrigger`, non-focus-stealing
  autocomplete, escalate to a stronger model (`glm-5-2-max`/`grok-4-6-high`) for this unit if it stalls (paid — flag to user first).
- Depends on L2 (feature dirs) and L1 primitives.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. Gate 3 pre-resolved by the phase parent.
<!-- /ANCHOR:questions -->
