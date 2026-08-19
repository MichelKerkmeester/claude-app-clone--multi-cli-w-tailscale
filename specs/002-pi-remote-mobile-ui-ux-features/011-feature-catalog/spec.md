---
title: "Feature Specification: Pi Remote — Root Feature Catalog"
description: "A canonical, repo-root feature catalog covering every shipped Pi Remote capability, authored via a DeepSeek-writes / Sonnet-verifies pipeline and validated by the sk-doc catalog contract."
trigger_phrases:
  - "pi remote feature catalog"
  - "root feature catalog"
  - "app feature inventory"
importance_tier: "normal"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/002-pi-remote-mobile-ui-ux-features/011-feature-catalog"
    last_updated_at: "2026-08-18T19:15:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Scaffolded phase child; defined catalog taxonomy and the DeepSeek/Sonnet authoring pipeline"
    next_safe_action: "Seed the six core categories from the validated app-guide catalog, then dispatch DeepSeek for the two new categories"
    blockers: []
    key_files:
      - "spec.md"
      - "plan.md"
      - "tasks.md"
    completion_pct: 0
    open_questions: []
    answered_questions:
      - "Spec home: extend epic 002 as phase child 011"
      - "Coverage: everything (core + epic-002 UI + epic-003 design system)"
      - "Skill copy: root canonical, skill app-guide slimmed to a pointer"
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Feature Specification: Pi Remote — Root Feature Catalog

## 1. METADATA

- **Packet:** `app-mobile-cli/002-pi-remote-mobile-ui-ux-features/011-feature-catalog`
- **Parent:** phase-parent packet `002-pi-remote-mobile-ui-ux-features`.
- **Kind:** phase child (standard, documentation authoring — no research sub-phase).
- **Deliverable location:** the **Mobile CLI repo root** `feature-catalog/` (not inside this spec folder).
- **Authoring pipeline:** DeepSeek v4 flash (xhigh, cline-pass) writes with a markdown-agent persona; Sonnet 5 (xhigh) markdown agents verify; Claude orchestrates, validates, and commits.

## 2. PROBLEM & PURPOSE

### Problem Statement

Pi Remote's feature documentation is split and incomplete. A six-category feature catalog exists inside the `sk-code-mobile-cli` skill (`app-guide/feature-catalog/`) covering only the secure-foundation domains. It does not carry the ten epic-002 mobile UI/UX features or the epic-003 design system, and it lives inside the skill rather than at the app repo root where an operator or reviewer expects to find it.

### Purpose

Ship one canonical, repo-root feature catalog that inventories **every shipped Pi Remote capability** — the secure foundation, the mobile UI/UX features, and the design system — as the single source of truth, with the skill copy reduced to a pointer.

## 3. SCOPE

### In Scope

- A `feature-catalog/` package at the Mobile CLI repo root following the sk-doc `create-feature-catalog` contract (root `feature-catalog.md` + kebab-case `category/feature.md` per-feature files).
- Eight categories covering all features (see §4).
- Reducing the skill's `app-guide/feature-catalog/` to a pointer at the root canonical (lands in the Public repo).

### Out of Scope (frozen)

- **Design system:** ink-on-parchment; Inter + Source Serif 4; light + dark; WCAG AA. Documented, never changed.
- **Security posture:** read-only default; ticketed fail-closed mutations; allowlist redaction. Documented, never changed.
- The manual testing playbook — that is sibling phase `012-manual-testing-playbook`.
- Any app source/behavior change. This packet writes documentation only.

## 4. CATALOG TAXONOMY (coverage = all features)

| # | Category dir | Per-feature files | Source |
|---|---|---|---|
| 1 | `auth-and-boundary/` | device-enrollment, serve-identity-anchor, application-sessions, one-use-tickets, default-deny-authorization, revocation | seed from validated app-guide catalog |
| 2 | `approval-and-mutation/` | exact-action-leases, cas-decision-settle, accept-edits-grants, final-gate-digest, mutation-containment, kill-switch | seed from app-guide |
| 3 | `command-and-push/` | prompt-steering-transport, attention-inbox, vapid-content-free-push | seed from app-guide |
| 4 | `transport-and-state/` | rpc-supervision, lf-jsonl-framing-and-demux, canonical-redaction, redacted-durable-ledger, sync-replay-barrier, transcript-projection | seed from app-guide |
| 5 | `pwa/` | compose-box, session-list, typed-block-transcript, approval-card | seed from app-guide |
| 6 | `release/` | whole-gate-runner, numeric-thresholds, staged-rollout, rollback-drill | seed from app-guide |
| 7 | `mobile-ui-features/` **(new)** | change-model, change-effort, slash-commands, plan-mode-tab, file-preview, rich-content-blocks, media-upload, inbound-media, ask-question, todos | DeepSeek authors from epic-002 phase specs + app source |
| 8 | `design-system/` **(new)** | token-library, component-migration, designer-editability, sk-code-mobile-cli-surface | DeepSeek authors from epic-003 phase specs + `apps/pi-remote-web/src/design-system/` |

The root `feature-catalog.md` integrates all eight categories in numbered sections; DeepSeek rewrites it to include categories 7–8; Sonnet verifies parity.

## 5. ACCEPTANCE CRITERIA

1. `feature-catalog/feature-catalog.md` exists at the repo root with frontmatter, an H1 intro, numbered all-caps H2 sections, and no Table of Contents.
2. Every root entry links to exactly one per-feature file; every per-feature file is represented in the root (bijection).
3. Every per-feature file carries the four-section shape (OVERVIEW / HOW IT WORKS / SOURCE FILES / SOURCE METADATA), frontmatter with ≥3 trigger phrases and a four-part version, and real implementation + validation source anchors.
4. All 43 features across the eight categories are present (29 seeded core + 14 new).
5. `validate_document.py` passes on the root catalog and every per-feature leaf; cross-file links resolve.
6. The skill `app-guide/feature-catalog/` is a pointer to the root canonical.
7. No app source or behavior changed; the diff is documentation-only.

## 6. NON-NEGOTIABLES (documented, not changed)

- Frozen design tokens (8 `--pi-*` primitives; ink-on-parchment; light+dark; AA; ≥44px).
- Frozen security posture (read-only default; ticketed fail-closed mutations; allowlist/structural redaction; content-free push; operator-only full-access).
- Current-state only — the catalog describes shipped behavior, never roadmap.
