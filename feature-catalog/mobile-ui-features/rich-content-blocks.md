---
title: "Rich Content Blocks"
description: "Renders three typed read-only projections of already-redacted transcript envelopes."
trigger_phrases:
  - "show rich content cards"
  - "render code and command blocks"
  - "display rich transcript blocks"
version: 1.0.0.0
---

# Rich Content Blocks (rich-content-blocks)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Renders three typed read-only projections of already-redacted transcript envelopes.

The transcript surfaces paired bash command/output cards, fenced-code cards, and explicit or substantial text-artifact cards. Each card gives a bounded inline preview, unit-level Copy of the exact canonical redacted unit, and an Open action into the shared F6 full-screen viewer. Syntax highlighting is progressive and bounded, and no download, publishing, editing, execution, or host-file access is added.

Current status: shipped.

---

## 2. HOW IT WORKS

### Typed block routing

A router inspects each already-redacted envelope and routes it to the correct typed card: paired bash command/output, fenced code, or a text-artifact projection. Unrecognized or legacy shapes fall back to a plain, fully usable rendering rather than dropping content.

### Copy honors the canonical unit

Copy always exports exactly the named canonical redacted unit — nothing more. This is a projection of the redacted ledger only, with no second data path introduced; the copied value is byte-for-byte the same already-redacted unit the card previews.

### Bounded preview, shared viewer, progressive highlighting

Each card shows a bounded inline preview and an Open action that adapts the card's redacted snapshot into the shared F6 full-screen viewer — there is no parallel modal or own history. Highlighting is progressive and bounded: plaintext is immediate, settled supported code may be highlighted in a worker, and large or unsupported content stays fully usable as plaintext.

### Read-only, honor-preserving surfaces

Cards add no download, publishing, editing, execution, or host-file access. Visual treatment follows ink-on-parchment tokens, holds WCAG AA contrast, and reflows at the 320px constraint. Every projection honors the invariant that the redacted ledger is the sole source; the interface never re-derives or exposes beyond it.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/rich-content/RichContentRouter.tsx` | Component | Routes redacted blocks to the correct typed card |
| `apps/pi-remote-web/src/rich-content/CommandOutputCard.tsx` | Component | Paired bash command/output card with Copy |
| `apps/pi-remote-web/src/rich-content/CodeCard.tsx` | Component | Fenced-code card with progressive highlighting |
| `apps/pi-remote-web/src/rich-content/F6ViewerAdapter.tsx` | Shared | Adapts a card's redacted snapshot into the shared full-screen viewer |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/RichContentRouter.test.tsx` | component | Block-to-card routing and legacy fallback |
| `apps/pi-remote-web/tests/CommandOutputCard.test.tsx` | component | Command/output pairing and Copy behavior |
| `apps/pi-remote-web/tests/CodeCard.test.tsx` | component | Code card preview, highlighting, and Copy |

---

## 4. SOURCE METADATA

- Group: mobile-ui-features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/rich-content-blocks.md`
- Current status: shipped

Related references:

- [file-preview.md](file-preview.md) - the shared full-screen viewer these cards open into
- [inbound-media.md](inbound-media.md) - another transcript surface that promotes content into the same shared viewer
