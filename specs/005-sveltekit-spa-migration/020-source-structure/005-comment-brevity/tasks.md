---
title: "Phase E tasks — web-client comment brevity ledger"
description: "Baseline, batched trims, and the verification barrier for the app-mobile comment brevity. Each task carries its evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/005-comment-brevity"
    last_updated_at: "2026-08-25T04:09:46.405Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Web-client comments trimmed; comment-only, token identity 0-diff, gates green."
    next_safe_action: "Proceed to 006-bem-css."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase E tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Each task carries its evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Capture the token-identity baseline over `app.css` plus every `.svelte` `<style>`. [evidence: `token-identity.mjs snapshot` — 77 tokens × 3 themes, `diff` 0/0/0 against itself]
- [x] **T1.2** Self-test the `.svelte`-aware region checker on the unchanged tree. [evidence: `sveltediff.cjs` reports `223/223` comment-only, 0 changed before any edit]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** Dispatch the cli-cursor (composer-2.5) comment-trim over the app-mobile source in batches. [evidence: batches dispatched over the 223 `.svelte`/`.ts` source files]
- [x] **T2.2** Keep section banners, `@ds` fences and every rendered value; trim only comments. [evidence: banners and `@ds` fences kept; token identity 0-diff proves no CSS value moved]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Region-check every touched file comment-only. [evidence: `sveltediff.cjs` — `.ts` AST and `.svelte` script/style/markup regions unchanged; 0 code-changed]
- [x] **T3.2** Diff token identity against the baseline across three themes. [evidence: `token-identity.mjs diff` 0 CHANGED / 0 VANISHED / 0 ADDED for `light`/`dark`/`system`]
- [x] **T3.3** Confirm the fence count stays 277 and run `test:web` and catalog smoke. [evidence: `scan-comments.mjs` fences 277; `test:web` green; `catalog-smoke-cdp.mjs` 534 frames 0 throws]
- [x] **T3.4** `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every touched file is comment-only by the AST and region checks, token identity holds at zero diffs, the
fence count is 277, and `test:web` and catalog smoke are green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the batched trim and the comment-only proof.
- `checklist.md` — barrier sign-off.
<!-- /ANCHOR:cross-refs -->
