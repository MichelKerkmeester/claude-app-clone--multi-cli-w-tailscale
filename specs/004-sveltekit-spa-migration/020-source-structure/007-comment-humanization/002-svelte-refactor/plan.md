---
title: "Phase 2 plan — apply the natural comment convention to the source, comment-only"
description: "Dispatch luna to retire @ds from every .svelte file, app.css, and the 3 .ts files, comment-only, matching the screen-chat.svelte pilot; Claude owns the fence-gate re-anchor and all verification. Proven per file by a non-comment byte-identical check, and suite-wide by @ds=0, banners intact, frozen-seam fences preserved, token-identity 0-diff, and test:web green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/020-source-structure/007-comment-humanization/002-svelte-refactor"
    last_updated_at: "2026-08-25T20:45:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Source @ds retired via luna; verified comment-only and pushed."
    next_safe_action: "None — phase 2 complete; phase 3 reverifies the skill."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 2 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Retire `@ds` from all app source comments and apply the natural convention, comment-only. luna 5.6
(gpt-5.6-luna) at xhigh edits the 99 files; Claude owns the delicate `scan-comments.mjs` fence re-anchor
and every verification gate. The `screen-chat.svelte` pilot is the reference voice.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Per file: non-comment content byte-identical to HEAD (comment-span strip + hash). Suite: `@ds`=0 in app
source; the `MODULE` and numbered section banners intact; the frozen-seam fence count preserved under the
re-anchored gate; token-identity 0-diff (65 tokens x 3 themes); `test:web` green.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Every `@ds` lives inside a comment, so retirement is comment-only: the marker syntax is removed and its
meaning kept as durable-WHY prose. `@ds guardrail: do-not-edit` becomes a consistent, greppable
`Do not edit - <why>` note so the frozen-seam net stays enumerable. The `scan-comments` gate is re-anchored
from counting `@ds guardrail:` to counting the new marker — the last step, after every guardrail is
converted, so no transient count gap opens. The split of labor puts the mechanical per-file conversion on
luna and the safety-critical gate change on Claude.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · convert
luna retires `@ds` from every `.svelte`, `app.css`, and `.ts` file, comment-only, matching the pilot.

### Phase 2 · re-anchor
Claude re-anchors `scan-comments.mjs` onto the `Do not edit` marker and confirms the fence count.

### Phase 3 · verify
Per-file comment-only check, `@ds`=0, banner integrity, token-identity diff, and `test:web`, then commit.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — a comment change keeps behaviour. The per-file non-comment hash proves comment-only,
token-identity proves the CSS values are unchanged, and `test:web` proves behaviour, all from the final
state.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The landed phase-1 skill convention (the written authority luna follows).
- The `screen-chat.svelte` pilot as the reference voice.
- `token-identity.mjs` and `scan-comments.mjs` for the value and fence gates; `test:web` for behaviour.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The change touches only `app-mobile/src` comments and the `scan-comments.mjs` fence marker.
`git revert` of the phase-2 commit restores the prior comments and the old gate; there is no data or
behaviour migration.
<!-- /ANCHOR:rollback -->
