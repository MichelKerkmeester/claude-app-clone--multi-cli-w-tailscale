---
title: "sk-code Mobile-CLI Surface"
description: "Read-only sk-code surface that routes app code work to pi-remote-web's design system, carryings its token library, ds-grammar, and guardrails."
trigger_phrases:
  - "load the mobile-cli sk-code surface"
  - "use the pi-remote design-system code mode"
  - "route app work to sk-code-mobile-cli"
version: 1.0.0.0
---

# sk-code Mobile-CLI Surface (sk-code-mobile-cli)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Read-only sk-code surface that routes app code work to pi-remote-web's design system, carrying its token library, ds-grammar, and guardrails.

A dedicated, read-only `sk-code-mobile-cli` SURFACE evidence packet lives under the `sk-code` parent hub so code work on apps/pi-remote-web/ auto-loads this app's design system instead of detecting a generic frontend. When the hub bundles this surface, a code workflow gains the three-layer token library, the `@ds` inline-comment editability grammar, the guardrails that keep a designer edit out of logic and the security boundary, and the browser-free verification gate. The surface is evidence and doctrine, not runtime app code.

Current status: shipped.

---

## 2. HOW IT WORKS

### Surface routing and auto-load

The hub bundles `sk-code-mobile-cli` as a surface-evidence entry with detection markers, so when a code workflow targets apps/pi-remote-web/ the surface loads automatically and its design-system doctrine governs the session rather than a generic frontend default. The routing is convention-encoded: the surface's authoring conventions are carried forward and reused by the code surface rather than reinterpreted per session.

### The three-layer token library

The token library reference is organized primitive → semantic → component, giving a code workflow a staged foundation on which to build and verify design work. App source token values are treated as frozen: the surface documents their role as invariants the feature honors, never as values to change through the guidance layer.

### The `@ds` editability grammar and guardrails

The `@ds` inline-comment grammar reference marks where and how a designer edit is permitted during code work. Guardrails keep a designer edit confined to design surfaces and out of both logic and the security boundary — the read-only-by-default posture and the allowlist-plus-structural-redaction redaction barrier are honored as invariants. Clay tone is never permitted to be the sole state signal, and all design output stays accessible (ink-on-parchment palette, Inter + Source Serif 4, light and dark, WCAG AA, controls `>=44px`). Mutations, where permitted, remain ticket-revision-bound and fail-closed by default.

### The browser-free verification gate

The verification reference defines a browser-free gate rather than screenshots: a CSS-resolver-based check that preserves the app's source values, run alongside typecheck/build/test:web. Because verification comes from the resolver and not from a browser render, the gate holds a code workflow to value-preserving, headless proof of design correctness.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `.opencode/skills/sk-code/sk-code-mobile-cli/SKILL.md` | Script | Routable surface-evidence entry with detection markers and doctrine |
| `.opencode/skills/sk-code/sk-code-mobile-cli/references/token-library.md` | Shared | Primitive/semantic/component token library reference |
| `.opencode/skills/sk-code/sk-code-mobile-cli/references/ds-grammar.md` | Shared | @ds inline-comment editability grammar reference |
| `.opencode/skills/sk-code/sk-code-mobile-cli/references/verification.md` | Shared | Browser-free resolver verification gate |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `.opencode/skills/sk-code/sk-code-mobile-cli/references/verification.md` | contract | Browser-free resolver value-preservation gate + typecheck/build/test:web |

---

## 4. SOURCE METADATA

- Group: design-system
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `design-system/sk-code-mobile-cli-surface.md`
- Current status: shipped

Related references:

- [token-library.md](token-library.md) - the primitive/semantic/component token library this surface carries as reference
- [designer-editability.md](designer-editability.md) - the editability guardrails this surface's ds-grammar reference builds on
