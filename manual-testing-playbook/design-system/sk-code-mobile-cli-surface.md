---
title: "PR-042 -- sk-code Mobile-CLI Surface"
description: "This scenario validates sk-code Mobile-CLI Surface for `PR-042`. It focuses on the read-only sk-code surface that routes app code work to pi-remote-web's design system, carrying its token library, ds-grammar, and guardrails."
stage: routing
version: 1.0.0.0
---

# PR-042 -- sk-code Mobile-CLI Surface

This document captures the realistic user-testing contract, current behavior, execution flow, source anchors, and metadata for `PR-042`.

---

## 1. OVERVIEW

This scenario validates sk-code Mobile-CLI Surface for `PR-042`. It focuses on the read-only `sk-code-mobile-cli` SURFACE evidence packet that routes app code work to pi-remote-web's design system, carrying its token library, ds-grammar, and guardrails, and on the automated web-suite gate that keeps that design system intact.

### Why This Matters

A dedicated, read-only `sk-code-mobile-cli` SURFACE under the `sk-code` parent hub ensures code work on apps/pi-remote-web/ auto-loads this app's design system instead of detecting a generic frontend. If this surface silently regressed, a code workflow would lose the three-layer token library, the `@ds` inline-comment editability grammar, the guardrails that keep a designer edit out of logic and the security boundary, and the browser-free verification gate. The surface is evidence and doctrine, not runtime app code, so the deterministic proxy is that the design system this surface documents stays green across the app's web suite.

---

## 2. SCENARIO CONTRACT

Operators run the exact prompt and command sequence for `PR-042` and confirm the expected signals without contradictory evidence.

- Objective: Prove the design system this read-only surface points at remains intact by passing the app's web suite with 0 failures.
- Real user request: `Confirm code work on the app still loads the right design-system surface and that the underlying design system is still green.`
- Prompt: `Run the app's web suite and confirm the design-system value-preservation and contrast gate this surface documents passes with 0 failures.`
- Expected execution process: running `npm run test:web` exercises the app web test suite, including the design-system contrast and value-preservation assertions the `sk-code-mobile-cli` surface documents.
- Expected signals: the web suite passes with 0 failures (including `apps/pi-remote-web/tests/contrast.test.tsx`), exit code 0.
- Desired user-visible outcome: a green run proves the token library, ds-grammar, and guardrails this surface carrie remain consistent and that routing to this surface does not break the design system it enshrines.
- Pass/fail: PASS if the web suite runs with 0 failures and exit code 0; FAIL if any test fails or the command exits non-zero.

---

## 3. TEST EXECUTION

### Prompt

- Prompt: `Run the app's web suite and confirm the design-system value-preservation and contrast gate this surface documents passes with 0 failures.`

### Commands

1. `npm run test:web`

### Expected

The web suite passes with 0 failures, including `apps/pi-remote-web/tests/contrast.test.tsx`, and the command exits with code 0 — proving the design system this surface points at is intact.

### Evidence

What to capture: the vitest summary line for the web suite showing 0 failures (including the named `contrast.test.tsx` file) and the exit code (0).

### Pass / Fail

- **Pass**: `npm run test:web` completes with 0 failures and exit code 0.
- **Fail**: any test in the web suite fails, or the command exits non-zero.

### Failure Triage

Re-read the primary implementation anchor `.opencode/skills/sk-code/sk-code-mobile-cli/SKILL.md` to confirm the documented token/contrast contract still matches the assertions in `apps/pi-remote-web/tests/contrast.test.tsx`. If the contrast or value-preservation assertion fails, inspect that test's expected token values against the current token library before touching any implementation.

### Optional Supplemental Checks

- Routing and evidence behavior (that `sk-code` loads this packet for apps/pi-remote-web work) is verified by the `sk-code` skill-benchmark, not by an app test. This leg is **SKIP** with blocker 'verified by the sk-code skill-benchmark harness, not an app Vitest run'.

---

## 4. SOURCE FILES

### Playbook Sources

| File | Role |
|---|---|
| `manual-testing-playbook.md` | Root directory page and scenario summary |
| `../../feature-catalog/design-system/sk-code-mobile-cli-surface.md` | Feature-catalog source describing the implementation contract |

### Implementation And Test Anchors

| File | Role |
|---|---|
| `.opencode/skills/sk-code/sk-code-mobile-cli/SKILL.md` | Primary implementation anchor |
| `apps/pi-remote-web/tests/contrast.test.tsx` | Regression or validation anchor |

---

## 5. SOURCE METADATA

- Group: design-system
- Playbook ID: PR-042
- Canonical root source: `manual-testing-playbook.md`
- Feature file path: `design-system/sk-code-mobile-cli-surface.md`
