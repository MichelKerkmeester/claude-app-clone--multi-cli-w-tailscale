---
title: "Phase E checklist — web-client comment brevity barrier"
description: "Barrier sign-off for trimming verbose inline comments across the app-mobile source: comment-only per the AST and region checks, token identity 0-diff, fences 277, test:web and catalog green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/005-comment-brevity"
    last_updated_at: "2026-08-25T04:09:46.405Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; web comments trimmed, token identity 0-diff, gates green."
    next_safe_action: "Proceed to 006-bem-css."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase E checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A `.svelte` comment
trim is proven by three region checks — `<script>` AST, comment-stripped `<style>`, comment-stripped
markup — plus the token-identity value oracle, not by a line diff.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The token-identity baseline is captured before the trim. [evidence: `token-identity.mjs snapshot` — `77` tokens × 3 themes, diff `0/0/0` against itself]
- [x] **CHK-PRE-02** [P1] The `.svelte`-aware region checker is self-tested on the unchanged tree. [evidence: `sveltediff.cjs` reports `223/223` comment-only, 0 changed before any edit]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] Every touched file is comment-only by the AST and region checks. [evidence: `sveltediff.cjs` — `223/223` comment-only, 0 code/markup/style changed]
- [x] **CHK-CQ-02** [P1] Verbose blocks are shortened; comment-line count drops. [evidence: `138/223` files trimmed across four `cli-cursor` batches]
- [x] **CHK-CQ-03** [P1] Section banners and `@ds` fences are unchanged. [evidence: `scan-comments.mjs` guardrailFences `277`, unchanged; banners intact]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] Token identity holds at zero diffs across three themes. [evidence: `token-identity.mjs diff` — light/dark/system all `0` CHANGED / `0` VANISHED / `0` ADDED]
- [x] **CHK-TEST-02** [P0] `test:web` passes from the final state. [evidence: `test:web` 68 files / 545 passed + 3 skipped, and 17 files / 189 passed]
- [x] **CHK-TEST-03** [P0] Catalog smoke renders every story with zero throws. [evidence: `catalog-smoke-cdp.mjs` 267 stories × 2 themes = `534` frames, 0 throws]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] A trim inside a `.svelte` inline handler is still comment-only. [evidence: `session-composer.svelte` inline `oncompositionend` comment shortened; `<script>` AST and code unchanged — the region checker was hardened to strip JS comments in markup]
- [x] **CHK-FIX-02** [P1] No banner comment was trimmed. [evidence: `// MODULE:` and `// N.` banners present; fence count `277`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P1] No rendered value, a11y contract, route or behaviour changed — a pure comment trim. [evidence: token identity `0/0/0`; `test:web` and catalog smoke green]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched; only `app-mobile/src` changed. [evidence: `git status` — changes only under `app-mobile/src`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
- [x] **CHK-DOC-02** [P1] No trimmed comment introduces a spec path or artifact id. [evidence: `scan-comments.mjs` comment-hygiene clean]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The trim is scoped to `app-mobile/src`; the backend and root are a separate child. [evidence: `git diff` names only `app-mobile/src` files]
- [x] **CHK-ORG-02** [P2] Web-client comments now read at a concise density matching the backend pass. [evidence: verbose multi-line blocks collapsed to one-line durable-WHY across 138 files]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Verbose inline comments across the app-mobile source were trimmed to a concise durable-WHY form, proven
comment-only by an AST-and-region check (223/223), with token identity at zero diffs across three themes,
the fence count at 277, and test:web and catalog smoke green.
<!-- /ANCHOR:summary -->
