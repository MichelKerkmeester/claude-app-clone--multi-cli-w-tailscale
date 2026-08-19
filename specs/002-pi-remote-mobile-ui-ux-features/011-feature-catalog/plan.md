---
title: "Implementation Plan: Root Feature Catalog"
description: "The DeepSeek-writes / Sonnet-verifies pipeline, dispatch mechanics, and landing plan for the repo-root Pi Remote feature catalog."
version: 1.0.0.0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Implementation Plan: Root Feature Catalog

## 1. APPROACH

Author a repo-root `feature-catalog/` package under the sk-doc `create-feature-catalog` contract, covering all 44 features across eight categories. Six core categories are seeded from the already-validated `sk-code-mobile-cli` `app-guide/feature-catalog/`; the two new categories (`mobile-ui-features/`, `design-system/`) and the integrated root catalog are authored by DeepSeek and verified by Sonnet.

Division of labor (frozen):
- **Claude** — orchestrates, authors spec docs, composes dispatch briefs, runs validators and git.
- **DeepSeek v4 flash (xhigh, cline-pass)** — writes each new per-feature file and the integrated root catalog, with a markdown-agent persona.
- **Sonnet 5 (xhigh) markdown agents** — verify each written file against the sk-doc contract and the source truth.

## 2. DISPATCH MECHANICS

Confirmed working on this machine (probe returned the control token):

```bash
pi --offline --approve -p "<BRIEF>" \
  --provider cline-pass --model cline-pass/cline-pass/deepseek-v4-flash \
  --thinking xhigh --no-extensions
```

- `--no-extensions` avoids the deep-pi statistics-lock contention from concurrent pi sessions.
- Print mode (`-p`) returns authored markdown to stdout; Claude persists it to the target path. Each brief carries the sk-doc template, the exact source anchors, and the frozen non-negotiables so flash stays focused (flash over-reads on sprawling scope — keep one file per dispatch).

## 3. WRITE PATHS (Mobile CLI repo root)

```
feature-catalog/feature-catalog.md                     # integrated root (all 8 categories)
feature-catalog/mobile-ui-features/*.md                # 10 new per-feature files
feature-catalog/design-system/*.md                     # 4 new per-feature files
feature-catalog/{auth-and-boundary,approval-and-mutation,command-and-push,transport-and-state,pwa,release}/*.md   # 29 seeded
```

Public repo (skill pointer): `.opencode/skills/sk-code/sk-code-mobile-cli/references/app-guide/feature-catalog/` reduced to a pointer.

## 4. SEQUENCE

1. Seed the six core categories + their 29 files into the root `feature-catalog/` from the validated app-guide copy (Claude, mechanical copy).
2. Gather per-feature source anchors for the two new categories (Claude: epic-002/003 phase specs + `apps/pi-remote-web/src/` greps).
3. Dispatch DeepSeek per new per-feature file (14 files) with a tight brief; persist stdout.
4. Sonnet verifies each new file (contract shape, anchor reality, current-state wording); Claude repairs on FAIL and re-dispatches.
5. Claude mechanically appends root sections §8 `MOBILE UI FEATURES` and §9 `DESIGN SYSTEM` to the existing `feature-catalog.md` from the authored leaves (the root is a navigation index; this preserves the 29 validated entries verbatim rather than risking a full-root flash rewrite). Sonnet verifies root↔leaf bijection.
6. Run `validate_document.py` on the root + every leaf; fix links.
7. Reduce the skill `app-guide/feature-catalog/` to a pointer (Public repo).
8. Author `implementation-summary.md`; run `validate.sh --strict`; commit (Mobile CLI + Public); confirm before Mobile CLI push.

## 5. VERIFICATION

- Objective gate: `validate_document.py` exit 0 on root + all leaves; bijection count root-entries == per-feature-files == 44; cross-file links resolve.
- Sonnet verdict PASS on every new file before it is accepted.
- Documentation-only diff (no `apps/`, `packages/`, `extensions/`, or config change) confirmed by `git status`/diff review.

## 6. RISKS

- **Flash over-read on sprawl** — mitigated by one-file-per-dispatch tight briefs.
- **Fabricated source anchors** — Sonnet verification checks every anchor path resolves; Claude spot-checks the security-critical leaves.
- **Root↔leaf drift** — bijection check + validator.
- **Mobile CLI push authorization** — held; confirm with operator before pushing the Mobile CLI repo.
