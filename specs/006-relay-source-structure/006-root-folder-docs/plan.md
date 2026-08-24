---
title: "Phase F plan — root folder docs"
description: "How the four missing folder READMEs are written and checked: read each extension and package, write the READMEs from what they actually do following the repo pattern, then verify no code changed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/006-root-folder-docs"
    last_updated_at: "2026-08-24T21:41:28.315Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Plan executed; four READMEs written from the real folders."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Write four missing READMEs — two Pi extensions (`inbound-media`, `plan`) and the `packages` and
`extensions` container maps — so every repo-root code folder is navigable from a README. Each is drawn
from the real folder and follows the repo's existing README pattern. No code changes.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Each README names the real package, entry point and behaviour of its folder, checked against the source;
the container maps link to every child README; and the only changes under `packages`/`extensions` are the
four new README files, confirmed by `git status`.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The repo already has a strong extension-README pattern in `pi-remote-approval`: frontmatter with title,
description and trigger phrases, then an overview naming the package, its entry point and current
behaviour. The two new extension READMEs follow it, each drawn from its own `src` and package.json. The
two container READMEs are lighter — a one-line map of the folder's children linking to their READMEs — so
a reader lands on the right leaf without duplication.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · read
Read the `inbound-media` and `plan` extensions' `src` and package.json, and list the children of
`packages` and `extensions`.

### Phase 2 · write
Write the two extension READMEs following the `pi-remote-approval` pattern and the two container maps.

### Phase 3 · verify
Confirm each README against its source and that the only changes are the four new files.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Documentation-only, so the check is accuracy: each README's package name, entry point and behaviour is
confirmed against the real source. The affected suites are not expected to change and are proven green by
phase E's final run.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The `inbound-media` and `plan` extension source and package.json.
- The `pi-remote-approval` README as the pattern reference.
- Phase E, which banners the extension source first.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Four added files. `git rm` removes them with no other effect; no existing file is modified.
<!-- /ANCHOR:rollback -->
