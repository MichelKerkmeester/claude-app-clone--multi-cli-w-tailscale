---
title: "Tasks: Root Feature Catalog"
description: "Ordered task list for authoring and landing the repo-root Pi Remote feature catalog."
version: 1.0.0.0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Tasks: Root Feature Catalog

| # | Task | Owner | Status |
|---|---|---|---|
| T1 | Scaffold `feature-catalog/` at repo root; seed 6 core categories + 29 files from validated app-guide catalog | Claude | pending |
| T2 | Gather source anchors for the 10 `mobile-ui-features/` from epic-002 phase specs + `apps/pi-remote-web/src` | Claude | pending |
| T3 | Gather source anchors for the 4 `design-system/` from epic-003 + `apps/pi-remote-web/src/design-system` | Claude | pending |
| T4 | Dispatch DeepSeek to author 10 `mobile-ui-features/*.md`; persist stdout | DeepSeek | pending |
| T5 | Dispatch DeepSeek to author 4 `design-system/*.md`; persist stdout | DeepSeek | pending |
| T6 | Sonnet verifies each of the 14 new leaves; repair + re-dispatch on FAIL | Sonnet/Claude | pending |
| T7 | Mechanically append root §8 MOBILE UI FEATURES + §9 DESIGN SYSTEM from authored leaves (preserves 29 seeded entries verbatim); Sonnet verifies bijection | Claude/Sonnet | pending |
| T8 | Run `validate_document.py` on root + all leaves; fix cross-file links | Claude | pending |
| T9 | Reduce skill `app-guide/feature-catalog/` to a pointer (Public repo) | Claude | pending |
| T10 | Author `implementation-summary.md`; `validate.sh --strict`; commit; confirm before Mobile CLI push | Claude | pending |

## Verify

- V1: root + every leaf pass `validate_document.py` (exit 0).
- V2: root-entry count == per-feature-file count == 43 (bijection).
- V3: every cross-file link resolves.
- V4: `git status`/diff = documentation only (no app/config change).
- V5: every new leaf carries a Sonnet PASS verdict.
