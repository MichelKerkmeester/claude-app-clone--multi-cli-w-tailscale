---
title: "Feature Specification: Pi Remote — Root Manual Testing Playbook"
description: "A repo-root manual testing playbook with deterministic per-feature validation scenarios covering every shipped Pi Remote capability, authored via a DeepSeek-writes / Sonnet-verifies pipeline."
trigger_phrases:
  - "pi remote manual testing playbook"
  - "root testing playbook"
  - "app validation scenarios"
importance_tier: "normal"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/002-pi-remote-mobile-ui-ux-features/012-manual-testing-playbook"
    last_updated_at: "2026-08-18T20:15:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Scaffolded phase child; defined playbook taxonomy + feature-ID map + DeepSeek/Sonnet pipeline"
    next_safe_action: "Dispatch DeepSeek per scenario from the catalog leaves + test anchors, then Sonnet-verify"
    blockers: []
    key_files:
      - "spec.md"
      - "plan.md"
      - "tasks.md"
    completion_pct: 0
    open_questions: []
    answered_questions:
      - "Spec home: extend epic 002 as phase child 012"
      - "Coverage: all 43 features (mirrors the feature catalog)"
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Feature Specification: Pi Remote — Root Manual Testing Playbook

## 1. METADATA

- **Packet:** `app-mobile-cli/002-pi-remote-mobile-ui-ux-features/012-manual-testing-playbook`
- **Parent:** phase-parent packet `002-pi-remote-mobile-ui-ux-features`.
- **Kind:** phase child (standard, documentation authoring).
- **Deliverable location:** the **Mobile CLI repo root** `manual-testing-playbook/`.
- **Sibling:** `011-feature-catalog` — this playbook cross-references its per-feature entries.
- **Authoring pipeline:** DeepSeek v4 flash (xhigh, cline-pass) writes deterministic scenarios; Sonnet 5 (xhigh) verifies; Claude orchestrates, validates, commits.

## 2. PROBLEM & PURPOSE

### Problem Statement

Pi Remote has automated Vitest coverage of internals but no reproducible, operator-facing validation package that maps each shipped capability to a deterministic scenario — exact prompt, command sequence, expected signals, evidence, and a binary verdict. Release readiness currently relies on ad-hoc checks.

### Purpose

Ship one canonical, repo-root manual testing playbook with a deterministic scenario per feature, covering every capability the feature catalog inventories, so any operator can reproduce a PASS/FAIL/SKIP verdict with captured evidence.

## 3. SCOPE

### In Scope

- A `manual-testing-playbook/` package at the Mobile CLI repo root under the sk-doc `create-manual-testing-playbook` contract (root `manual-testing-playbook.md` + kebab-case `category/feature.md`, 5-section scenarios, `PR-NNN` IDs).
- One scenario per feature across the same eight categories as the feature catalog (43 scenarios).
- A pointer from the skill so the root is the single source.

### Out of Scope (frozen)

- Design system and security posture — validated, never changed.
- The feature inventory itself — that is sibling `011-feature-catalog`.
- Any app source/behavior change.

## 4. TAXONOMY & FEATURE-ID MAP

Eight categories mirror the feature catalog; IDs are stable `PR-NNN`:

| Category dir | IDs | Count |
|---|---|---|
| `transport-and-state/` | PR-001…006 | 6 |
| `auth-and-boundary/` | PR-007…012 | 6 |
| `approval-and-mutation/` | PR-013…018 | 6 |
| `command-and-push/` | PR-019…021 | 3 |
| `pwa/` | PR-022…025 | 4 |
| `release/` | PR-026…029 | 4 |
| `mobile-ui-features/` | PR-030…039 | 10 |
| `design-system/` | PR-040…043 | 4 |

## 5. ACCEPTANCE CRITERIA

1. `manual-testing-playbook/manual-testing-playbook.md` exists at the repo root with frontmatter, global preconditions, evidence rules, and category summaries.
2. 43 per-feature scenario files, each with the 5-section contract (OVERVIEW / SCENARIO CONTRACT / TEST EXECUTION / SOURCE FILES / SOURCE METADATA), a unique `PR-NNN` ID, exact prompt, exact command sequence, expected signals, evidence, binary PASS/FAIL/SKIP criteria, and failure triage.
3. Every scenario links to its matching feature-catalog entry.
4. Automatable scenarios cite the real Vitest command + test file; operator/device-only scenarios are honestly marked with a specific SKIP blocker.
5. `validate_document.py` passes on the root + every scenario leaf; cross-file links resolve; feature-ID count == scenario-file count == 43.
6. Documentation-only diff.

## 6. NON-NEGOTIABLES (documented, not changed)

- Determinism: every scenario reproducible by another operator; verdicts limited to PASS / FAIL / SKIP(reason).
- Honesty: destructive or device-only scenarios marked and isolated; unmeasurable steps marked operator-required, never fabricated PASS.
- Frozen design + security posture documented as validation targets, never altered.
