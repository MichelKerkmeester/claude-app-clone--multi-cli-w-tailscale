---
title: "Implementation Plan: Root Manual Testing Playbook"
description: "The DeepSeek-writes / Sonnet-verifies pipeline, dispatch mechanics, and landing plan for the repo-root Pi Remote manual testing playbook."
version: 1.0.0.0
trigger_phrases:
  - "manual testing playbook plan approach"
  - "manual testing playbook packet"
  - "plan approach"
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

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Implementation Plan: Root Manual Testing Playbook

## 1. APPROACH

Author a repo-root `manual-testing-playbook/` package under the sk-doc `create-manual-testing-playbook`
contract, one deterministic scenario per feature (43), mirroring the feature-catalog taxonomy. Each
scenario is authored by DeepSeek from a brief carrying the feature behavior, the real test anchors (from
the sibling feature catalog leaves), the playbook template, and the determinism rules; Sonnet verifies.

Division of labor (frozen): Claude orchestrates, authors spec docs, composes briefs, runs validators and
git. DeepSeek v4 flash (xhigh, cline-pass) writes each scenario with a markdown-agent persona. Sonnet 5
(xhigh) markdown agents verify each scenario against the contract and the source truth.

## 2. DISPATCH MECHANICS

Same proven mechanics as Phase 011, but ALL dispatches run from the **isolated Mobile CLI `.pi` session**
(not Public) to avoid the cross-session bleed observed in 011:

```bash
( cd "<Mobile CLI>" && pi --offline --approve -p "<BRIEF>" \
    --provider cline-pass --model cline-pass/cline-pass/deepseek-v4-flash \
    --thinking xhigh --no-extensions </dev/null )
```

STRICT print-only brief (text generator, no tools, no narration, no phase/packet numbers). A SUSPECT
guard (empty / no-frontmatter / <20 lines) triggers a re-dispatch. Source per scenario = the matching
`feature-catalog/<category>/<slug>.md` leaf (behavior + test anchors) + the anchor map.

## 3. WRITE PATHS (Mobile CLI repo root)

```
manual-testing-playbook/manual-testing-playbook.md      # root policy + category summaries
manual-testing-playbook/<category>/<slug>.md            # 43 scenarios, PR-NNN ids
```

Public repo (skill pointer): app-guide gains a pointer to this root playbook.

## 4. SCENARIO SHAPE (per leaf)

5 sections: `## 1. OVERVIEW`, `## 2. SCENARIO CONTRACT`, `## 3. TEST EXECUTION`,
`## 4. SOURCE FILES`, `## 5. SOURCE METADATA`. Contract carries: Feature ID (PR-NNN), objective,
realistic user request, exact prompt, exact command sequence, expected signals, evidence, PASS/FAIL/SKIP
criteria, failure triage, feature-catalog link.

Automatable scenarios cite the real Vitest command (`npm run test:web` / `npm test`) and the specific
test file. Device/operator-only scenarios (enrollment on a physical phone, Serve ingress, push delivery)
are marked with a specific SKIP blocker — never a fabricated PASS.

## 5. SEQUENCE

1. Build the PR-NNN → feature map from the feature-catalog taxonomy.
2. Compose the playbook brief preamble (persona + 5-section template + determinism rules).
3. Dispatch DeepSeek per scenario (per category, background, SUSPECT-guarded); persist stdout.
4. Sonnet verifies each scenario (contract, anchor reality, determinism, SKIP honesty, catalog link); repair + re-dispatch on FAIL.
5. Assemble the root `manual-testing-playbook.md` (global policy + category summaries + catalog cross-ref index).
6. Run `validate_document.py` on root + every scenario; check links + ID/file bijection.
7. Skill pointer (Public) — batched with the 011 pointer.
8. Author implementation-summary; validate.sh --strict; consolidated commit (Mobile CLI + Public), confirm before Mobile CLI push.

## 6. VERIFICATION

- `validate_document.py` exit 0 on root + all 43 scenarios; PR-ID count == scenario-file count == 43; links resolve.
- Sonnet PASS on every scenario; determinism + SKIP-honesty checked.
- Documentation-only diff.

## 7. RISKS

- Flash over-read / glitch → SUSPECT guard + isolated session + re-dispatch.
- Fabricated PASS on device-only steps → Sonnet checks every non-automatable step is a marked SKIP with a specific blocker.
- Prompt-field desync (contract vs table) → Sonnet checks synchronization.
