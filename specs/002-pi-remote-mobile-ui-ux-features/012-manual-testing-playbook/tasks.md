---
title: "Tasks: Root Manual Testing Playbook"
description: "Ordered task list for authoring and landing the repo-root Pi Remote manual testing playbook."
version: 1.0.0.0
trigger_phrases:
  - "manual testing playbook task ledger"
  - "manual testing playbook packet"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/002-pi-remote-mobile-ui-ux-features/012-manual-testing-playbook"
    last_updated_at: "2026-08-29T18:00:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Backfilled template and continuity metadata for the drift sweep."
    next_safe_action: "None; this packet is an archived record."
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Tasks: Root Manual Testing Playbook

| # | Task | Owner | Status |
|---|---|---|---|
| T1 | Build PR-NNN → feature map (43) from feature-catalog taxonomy; write scenario-source index | Claude | pending |
| T2 | Compose playbook brief preamble (persona + 5-section template + determinism rules) | Claude | pending |
| T3 | Dispatch DeepSeek per scenario, per category, from isolated Mobile CLI session; persist stdout | DeepSeek | pending |
| T4 | Sonnet verifies each scenario (contract, anchors, determinism, SKIP honesty, catalog link); repair + re-dispatch on FAIL | Sonnet/Claude | pending |
| T5 | Assemble root `manual-testing-playbook.md` (policy + category summaries + catalog cross-ref) | Claude | pending |
| T6 | Run `validate_document.py` on root + all 43 scenarios; fix links; verify ID/file bijection | Claude | pending |
| T7 | Skill pointer (Public) — batched with 011 pointer | Claude | pending |
| T8 | Author `implementation-summary.md`; `validate.sh --strict`; consolidated commit; confirm before Mobile CLI push | Claude | pending |

## Verify

- V1: root + every scenario pass `validate_document.py` (exit 0).
- V2: PR-ID count == scenario-file count == 43 (bijection).
- V3: every cross-file + catalog link resolves.
- V4: every scenario is deterministic (exact prompt + command + signals + evidence + binary verdict).
- V5: every non-automatable step is a marked SKIP with a specific blocker (no fabricated PASS).
- V6: `git status`/diff = documentation only.
