---
title: "Designer Editability"
description: "Audited design-system editability for low-code designer tasks, and the shipped designer guide covering editable seams and hard limits."
trigger_phrases:
  - "audit designer editability"
  - "edit the design system safely"
  - "check the designer guardrails"
version: 1.0.0.0
---

# Designer Editability (designer-editability)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Audited design-system editability for real low-code designer edit tasks, and the shipped designer guide covering editable seams and hard limits.

The migrated surface has been checked against actual designer edit workflows, with ergonomic and guardrail gaps fixed and the accessibility/contrast pass repeated. The deliverable is editability evidence plus the guide — not new runtime code. No source palette value and no security boundary is changed.

Current status: shipped.

---

## 2. HOW IT WORKS

### The designer guide

`designer-guide.md` is the operator-facing practical guide to the layered token model. It documents the four editable seam kinds — token, slot, state, and layout — with worked edit examples proven safe in production, and states clearly the lines a designer must never cross. `tokens.md` is the companion token reference those edit rules depend on.

### Guardrails keep edits out of logic and the security boundary

The `@ds` guardrail comments in `style.css` anchor the editability surface. Following them keeps a designer edit confined to the token model and design surface, preventing it from reaching component logic or the security boundary. The guardrails are honored invariants, not boundaries to be changed: the ink-on-parchment palette and source token values are frozen, and no access or redaction controls are relaxed by any design edit.

### Review and accessibility pass

The audit re-checks WCAG AA compliance against the frozen palette. Keyline contrast constraints remain invariant — clay is never the sole state signal, and state is always carried by an additional channel. Where contrast, token, slot, state, or layout interactions proved easy to edit incorrectly, the gaps are closed so the guided path (not a user's ad-hoc change) is the way the palette and seams are exercised.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/design-system/designer-guide.md` | Shared | Designer guide: seams, worked edits, and hard limits |
| `apps/pi-remote-web/src/design-system/tokens.md` | Shared | Companion token reference for edit rules |
| `apps/pi-remote-web/src/style.css` | Shared | @ds edit/guardrail seam comments audited for safe editability |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/contrast.test.tsx` | unit | Guardrail proof that the frozen palette / applied contrast stays intact (no dedicated editability test; deliverable is audit + guide) |

---

## 4. SOURCE METADATA

- Group: Design System
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `design-system/designer-editability.md`
- Current status: shipped

Related references:

- [token-library.md](token-library.md) - the layered token model the design guide's edit rules build on
