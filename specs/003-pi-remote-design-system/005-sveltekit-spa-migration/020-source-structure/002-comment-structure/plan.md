---
title: "Phase B plan — disjoint directory batches, fences and @ds re-checked per batch"
description: "Harmonize section banners across the .svelte tree in disjoint directory batches dispatched to cli-codex Luna xhigh fast, each verified fence-stable and @ds-unchanged before the next lands."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/020-source-structure/002-comment-structure"
    last_updated_at: "2026-08-24T11:01:11Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Seven batches landed; fences 277; whole gate green."
    next_safe_action: "None for Phase B — proceed to Phase C (skill update)."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase B plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Normalize the numbered section banners across the `.svelte` tree to one canonical vocabulary and order,
add banners to the significant bare files, and leave `@ds` comments and the guardrail fences untouched.
The files are disjoint by directory, so the work runs as concurrent cli-codex batches, each proven
fence-stable and `@ds`-unchanged before it lands.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Per batch: the guardrail fence count stays 277, every `@ds` line is unchanged (git diff shows no `@ds`
add or delete), and `npm run typecheck` passes. Whole from the final state before the phase closes:
build, typecheck, `npm test`, `test:web`, token identity, catalog smoke, and `validate.sh --strict`.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Section banners are comments, so a correct pass changes no rendered value and no token — token identity
stays at zero diffs and is a cheap sanity net. The real invariants are structural: the fence count and
the `@ds` line set. Both are measured before the phase and re-measured after every batch; a batch that
moves either is reverted whole.

A banner reorders the sections of a file only when the move introduces no forward reference — a
`$derived` or `$effect` must never end up declared above the `$state` it reads. Where the canonical
order would create that, the file keeps its safe order and the deviation is noted. Build and `test:web`
from the final state catch a temporal-dead-zone break that value resolution cannot.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

Seven disjoint directory batches, one cli-codex Luna xhigh fast agent each, fences and `@ds` verified
after each.

### Phase 1 · artifacts
`pages/chat/artifacts/*` — the largest group, including the domain-section files (`markdown-preview`,
`image-status`, `artifact-status`) whose specific section names are preserved.

### Phase 2 · chrome
`pages/chat/chrome/*` — composer, sheets, command palette, plan-mode; several carry `@ds` fences.

### Phase 3 · transcript
`pages/chat/transcript/*` — block, list, card previews, todo projection.

### Phase 4 · rich-content and features
`pages/chat/rich-content/*`, `pages/chat/features/ask-question/*`, `pages/chat/attachments/*`.

### Phase 5 · pages and routes
`pages/home/*`, `pages/review/*`, `pages/enrollment/*`, `routes/*`.

### Phase 6 · shared chrome
`shared/chrome/*` — header, status pill, session-state icon, theme control.

### Phase 7 · shared primitives
`shared/primitives/*` — banner only the significant ones; the trivial pass-through primitives stay bare.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — this is a comment pass, and the existing suite plus the fence and `@ds` checks are the
oracle. Each batch: fences 277, `@ds` line count unchanged, typecheck green. The phase closes only after
the whole gate runs green from the final state and a grep for the old synonym labels returns zero.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The frozen canonical vocabulary, order, synonym map, and coverage split (measured from the tree).
- The baseline fence count (277) and `@ds` line count captured before any batch.
- cli-codex at gpt-5.6-luna, xhigh, fast — the live executor route.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Each batch is one commit over one directory. A batch that moves the fence count or a `@ds` line is
reverted with `git checkout HEAD -- <dir>`; nothing else is affected, because the batches are disjoint.
No behavior, no data, no irreversible step — a pure comment pass.
<!-- /ANCHOR:rollback -->
