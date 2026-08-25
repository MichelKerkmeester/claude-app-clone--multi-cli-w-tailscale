---
title: "Phase 2 tasks — source @ds retirement ledger"
description: "Dispatch luna to convert the source, re-anchor the fence gate, and prove the change comment-only and behaviour-preserving. Evidence inline."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/002-svelte-refactor"
    last_updated_at: "2026-08-25T20:45:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All tasks done; source @ds retired, verified, and pushed."
    next_safe_action: "None — phase 2 complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 2 tasks

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred with a stated reason. Evidence inline.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Compose the luna brief with the convention, the file scope, and the comment-only constraint. [evidence: brief bound the pilot as reference, excluded `scripts/`/`specs/`/`.opencode/`, autonomous-child Gate-3 suppression]
- [x] **T1.2** Dispatch luna 5.6 (gpt-5.6-luna) xhigh on Mobile CLI main with the daemon disabled. [evidence: `codex exec` background run; the `--live main` daemon killed to protect the long edit]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

- [x] **T2.1** luna retires `@ds` from every `.svelte`, `app.css`, and `.ts` file, comment-only. [evidence: `99` files edited; `grep -rl '@ds' app-mobile/src` = `0`; typecheck + build pass]
- [x] **T2.2** Claude re-anchors `scan-comments.mjs` from `@ds guardrail:` to the `Do not edit` marker. [evidence: `scan-comments.mjs` lines 93/96/125 re-anchored; `guardrailFences` = `273`]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Per-file comment-only check across all 99 files. [evidence: comment-span strip + hash — `98/99` non-comment content byte-identical to HEAD; only `catalog-registry.ts` differs, by 3 editability-description strings]
- [x] **T3.2** Frozen-seam preservation and banner integrity. [evidence: prior guardrail comment fences `273` = new `Do not edit` markers `273`; `MODULE` banners `63` = HEAD; `0` modules without a banner]
- [x] **T3.3** token-identity and `test:web` from the final state. [evidence: token-identity `0` diffs across `65` tokens x 3 themes; `test:web` `734` pass (`545`+`189`, 3 skip)]
- [x] **T3.4** Commit and push. [evidence: `9309e3f..614a08e` on `main`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

`@ds` is retired from all app source, the change is comment-only bar three catalog description strings,
frozen seams and banners are preserved, and token-identity and `test:web` are green from the final state.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `plan.md` — the convert / re-anchor / verify architecture.
- `checklist.md` — the barrier sign-off.
<!-- /ANCHOR:cross-refs -->
