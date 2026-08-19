---
title: "Checklist: Root Manual Testing Playbook"
description: "Level-2 QA gate for the repo-root Pi Remote manual testing playbook."
version: 1.0.0.0
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Checklist: Root Manual Testing Playbook

## Structure
- [x] `manual-testing-playbook/manual-testing-playbook.md` exists with frontmatter + H1 intro
- [x] Root carries global preconditions, evidence rules, category summaries, and a feature-catalog cross-ref index (§16)
- [x] Eight category directories, kebab-case, no numeric prefixes
- [x] 43 per-feature scenario files present; unique `PR-NNN` IDs; ID count == file count == 43

## Content
- [x] Every scenario has OVERVIEW / SCENARIO CONTRACT / TEST EXECUTION / SOURCE FILES / SOURCE METADATA
- [x] Every scenario is deterministic: exact prompt, exact command, expected signals, evidence, binary verdict
- [x] Verdicts limited to PASS / FAIL / SKIP(specific blocker); no fabricated PASS on device-only steps (Sonnet-checked)
- [x] Automatable scenarios cite a real Vitest command + test file (all command test files exist on disk)
- [x] Every scenario links to its feature-catalog entry — 0 broken links
- [x] Prompt fields synchronized (contract vs execution block) — Sonnet-verified/fixed

## Pipeline
- [x] Each scenario authored by DeepSeek (cline-pass, xhigh) from the isolated Mobile CLI session
- [x] Each scenario carries a Sonnet 5 (xhigh) PASS verdict; FAILs repaired + re-dispatched (PR-019 harness bug, PR-042 command, PR-027 fact)

## Validation
- [x] `validate_document.py` exit 0 on root + every scenario — 44/44 VALID, 0 issues
- [x] Cross-file + catalog links resolve — 0 broken
- [x] Skill app-guide gains a pointer to this root playbook — done in Public dedup `75a88918b5` (landed main `f6b0278975`, v4 `f34997b189`); `app-guide/manual-testing-playbook.md` pointer + SKILL.md §2 updated
- [x] `git status`/diff is documentation-only
- [x] `validate.sh <phase-folder> --strict` exit 0 — passed 2026-08-18
