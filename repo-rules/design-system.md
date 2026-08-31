---
title: "Rule: The design system"
description: "One script is the only authority on a token value, one stylesheet holds everything cross-component, and the CSP means a browser cannot be asked what a token resolves to."
trigger_phrases:
  - "change a token"
  - "token value"
  - "token identity"
  - "goldens"
  - "primitive semantic component"
  - "retint"
  - "where does this css go"
  - "scoped style"
  - "app.css"
  - "global selector"
  - "class naming"
  - "block--element"
  - "is- prefix"
  - "rename a class"
  - "renders as nothing"
  - "CSP"
  - "read a computed value"
importance_tier: important
contextType: reference
version: 1.0.0.0
---

# Rule: The design system

> Routed from [`REPO RULES.md`](../REPO%20RULES.md). Load it before changing a token, adding CSS, or renaming a class.
> Expands `AGENTS.md`, never overrides it. Where they appear to disagree, `AGENTS.md` wins and this file is wrong. Say so.

## Fires when

- Changing any token value.
- Deciding where a CSS rule belongs.
- Renaming a class, or constructing one dynamically.
- Trying to read a resolved value out of a browser.

## The rule

**`scripts/token-identity.mjs` is the only authority on a token value, and cross-component CSS belongs in `app.css`.**

---

## 1. TOKENS HAVE ONE AUTHORITY

`scripts/token-identity.mjs` holds **39 goldens** across light, dark and system. A change that moves one without updating the goldens is **a regression no test reports**. The catalog's token playground deliberately writes no stylesheet for this reason; it hands back a `:root` block to paste.

Three layers, edited highest-first: **primitive → semantic role → component token.** Edit the highest layer that still isolates the change; retinting a primitive moves everything downstream.

---

## 2. CSS OWNERSHIP

The app has exactly **one** `.css` file, `app-mobile/src/app.css`, and **95** component-scoped `<style>` blocks.

Svelte scoped CSS reaches only the component that declares it. **A rule needed by two renderers, by a `class` prop, or across a parent/child boundary belongs in `app.css`** usually behind `:global()`.

**The failure this prevents:** putting it in the wrong file is the most common way a change renders as nothing at all, and a byte-identical screenshot is what exposes it.

---

## 3. CLASS GRAMMAR

`block--element`, with `is-*` as a single-dash state prefix.

A mechanical rename once broke rendering **four separate ways** through dynamically constructed class names, and only a before/after image diff caught it.

---

## 4. THE CSP FORBIDS ASKING A BROWSER

The web app sets `default-src 'self'` in `app-mobile/svelte.config.js`, and the relay serves `default-src 'none'; frame-ancestors 'none'`. Headless Chrome renders the app unstyled.

**Resolve token chains to final literals instead of screenshotting them.** Screenshots remain the right tool for layout, legibility, and whether two states actually look different.

---

## 5. SELF-CHECK

- [ ] Any moved token value came with its golden updated.
- [ ] The change was made at the highest layer that still isolates it.
- [ ] Cross-component rules went to `app.css`, not a scoped block.
- [ ] A rename was checked against dynamically constructed class names, by image diff.
- [ ] No token value was read out of a browser.
