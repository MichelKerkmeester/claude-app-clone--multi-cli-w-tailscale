---
title: "Child 006 — Storybook 8 Catalog for SvelteKit"
description: "Stand up @storybook/sveltekit, seed stories from registry.ts's pure-data index, and add a mock-context decorator that injects a runtime over demo.ts fixtures so socket-coupled surfaces render — targeting ~60 of 64 surfaces live (vs 6 today). @storybook/addon-a11y + a data-theme toggle decorator replace the bespoke catalog affordances."
trigger_phrases:
  - "storybook sveltekit catalog mock context decorator"
  - "pi remote catalog surfaces live stories"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/005-sveltekit-spa-migration/006-catalog"
    last_updated_at: "2026-08-19T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Spec authored (L6 child)"
    next_safe_action: "Parallel story dispatches per surface after L5 barrier"
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 006 — Storybook 8 Catalog

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Layer** | L6 — stories in parallel per surface (with the verification migration) |
| **Writer** | cli-devin (Gemini 3.7 Flash High) → Claude verifies |
| **Barrier** | catalog smoke (light + dark) — every component-backed surface renders |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The bespoke React catalog renders only 6 of 64 surfaces because most are socket-coupled. Storybook 8
for SvelteKit plus a mock-context decorator over `demo.ts` fixtures unlocks the socket-coupled
surfaces, giving designers a live gallery of ~60/64 — the primary "see and edit one component"
affordance and the L6/L7 smoke-gate substrate.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- `@storybook/sveltekit` set up; the `/catalog` route (child 005) coexists.
- Stories seeded from `registry.ts`'s pure-data index (one story per registered surface), authored
  in parallel per surface.
- A **mock-context decorator** injecting a runtime over `demo.ts` fixtures so socket-coupled surfaces
  render without a live relay.
- `@storybook/addon-a11y` + a `data-theme` toggle decorator (replaces the bespoke theme/a11y
  affordances).

**Out of scope:** the CSS-corpus builder / token-identity gate / test rewrite (child 007); any token
value; app-logic changes; installs (Storybook deps were installed in L0).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- R1: ~60 of 64 surfaces render live (the ≤4 that cannot are documented, not silently dropped).
- R2: Stories are pure-data seeded from `registry.ts`; no story reaches a live socket.
- R3: The `data-theme` decorator renders both themes; the a11y addon runs per story.
- R4: Story dispatches are disjoint (one surface each), parallel-safe.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA (barrier gate)

- Catalog smoke: every component-backed surface renders in Storybook (light + dark) without throw.
- The count of live surfaces is reported (target ~60/64); any excluded surface is listed with reason.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- Socket-coupled surfaces need the mock-context decorator to render; a missing fixture leaves a
  surface dark — mitigation: seed fixtures from `demo.ts`, list any gap.
- Depends on L2–L5 (the components must exist to have stories).
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. Gate 3 pre-resolved by the phase parent.
<!-- /ANCHOR:questions -->
