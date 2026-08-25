---
title: "Phase E — Comment brevity: trim verbose inline descriptions in the web client"
description: "Shorten over-long inline comment descriptions across the app-mobile source toward a concise durable-WHY style, keeping section banners and guardrail fences. Comment-only, proven by an AST re-print for scripts, a region check for .svelte, token identity 0-diff, and the web gates."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/005-comment-brevity"
    last_updated_at: "2026-08-25T04:09:46.405Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "app-mobile comments trimmed; comment-only, token identity 0-diff, web gates green."
    next_safe_action: "Proceed to 006-bem-css."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase E — Comment brevity (web client)

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `004-styles-into-svelte` · Successor: `006-bem-css`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Level | 2 |
| Writer | CLI executor (comment trim) + Claude (contract, verification, git) |
| Barrier | comment-only per file + token identity 0-diff + fences 277 + test:web + catalog green |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The web client's source is well-structured but some files carry inline comment descriptions that run
several lines to narrate what the code already says. This phase shortens those to a concise durable
style — a comment states the non-obvious WHY in a line or two — across the app-mobile `.svelte` and `.ts`
source. The section banners stay, the `@ds` guardrail fences stay, and no code, markup or CSS value
changes.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** verbose comment blocks in the app-mobile source — `//`, `/* */`, JSDoc and `<!-- -->` prose
in the `<script>`, markup and `<style>` of `.svelte` files and in the `.ts` modules — collapsed to
concise WHY-comments. Section banners, `@ds` fences and every rendered value stay verbatim.

**Out of scope:** the backend and root comment brevity (a separate child under packet 006); the BEM
class rename (the next child here); any code, markup, class-name or CSS-value change.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Over-long inline comment descriptions are shortened to a concise durable-WHY form; a
  comment that only restates the code is removed.
- **REQ-002** — The change is comment-only per file: a `.ts` module's AST re-print (comments removed) is
  identical, and a `.svelte` file's `<script>` AST, comment-stripped `<style>` and comment-stripped
  markup are each unchanged.
- **REQ-003** — Token identity resolves to 0 CHANGED / 0 VANISHED / 0 ADDED across light, dark and system
  — no CSS value moved when a `<style>` comment was trimmed.
- **REQ-004** — Section banners and every `@ds` guardrail fence are unchanged; the fence count stays 277.
- **REQ-005** — `test:web` and the catalog smoke stay green from the final state.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Verbose comment blocks in the web client read concisely, banners intact.
2. Every touched file is comment-only by the AST and region checks.
3. Token identity holds at zero diffs across three themes; the fence count is 277.
4. `test:web` and catalog smoke stay green from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A trim in a `<style>` block changes a CSS value.** Guarded by token identity, the value oracle: any
  changed resolved value fails the gate.
- **A trim silently changes script code or markup.** Guarded by a `<script>` AST re-print and a
  comment-stripped markup compare per `.svelte`, plus `test:web` and catalog smoke.
- **A `@ds` fence is trimmed.** Guarded by keeping `@ds` comments verbatim and the fence count at 277.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The concise-WHY target follows the sk-code convention and the backend pass; the executor makes the
per-comment judgement of what to keep.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../../../006-relay-source-structure/007-comment-brevity/` — the backend and root comment pass this
  mirrors on the web client.
- `../../007-verify-and-cutover/` — the token-identity baseline this diffs against.
<!-- /ANCHOR:cross-refs -->
