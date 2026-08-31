---
title: "Rule: Known baselines"
description: "A standing list of failures that are baseline rather than regression here, and the confirmation each one needs before it is believed."
trigger_phrases:
  - "is this a regression"
  - "was this already failing"
  - "known baseline"
  - "flaky test"
  - "flaky screenshot"
  - "auth.test.ts"
  - "menu-plan-mode"
  - "eslint errors"
  - "three eslint errors"
  - "svelte.ts parsing"
  - "judge the delta"
  - "git-live-follow"
  - "did it revert my edits"
  - "who commits"
importance_tier: important
contextType: reference
version: 1.0.0.0
---

# Rule: Known baselines

> Routed from [`REPO RULES.md`](../REPO%20RULES.md). Load it before calling any failure a regression.
> Expands `AGENTS.md`, never overrides it. Where they appear to disagree, `AGENTS.md` wins and this file is wrong. Say so.

## Fires when

- A check fails and you are deciding whether your change caused it.
- Reporting an error count.
- Wondering whether the live-follow script reverted your work.

## The rule

**Confirm against this list before calling anything a regression, and judge your delta rather than the total.**

---

## 1. FLAKY SCREENSHOTS UNDER CONCURRENT CAPTURE

`sandboxed-diagram--valid` (dominant), `plan-mode-button--*`, `composer-tools--*`, `attachment-tile--rejected`, `preview-controls--image`, `review--focused`.

Restore rather than commit. The `composer-tools` members joined when the tools popover gained a background scroll lock: locking the body changes scrollbar-dependent layout, so two consecutive captures of the same story now disagree. **Confirm any of these with a second capture before believing a diff.**

---

## 2. FLAKY TESTS

- **`app-relay/tests/auth.test.ts`** is timing-flaky, 201 versus 403.
- **`app-mobile/tests/menu-plan-mode.svelte.test.ts`** has a keyboard-activation case that flakes at baseline. Confirm flake-versus-regression with a scoped stash and **at least eight runs** never one.

---

## 3. ESLINT CARRIES A STANDING BASELINE

Exactly three errors, all in `app-mobile/src/pages/chat/chrome/sheet-model-effort.svelte` at `:156`, `:626` and `:662`.

`.svelte.ts` files fail eslint parsing repo-wide, **a config gap, not a defect**.

**Judge your delta, not the total.** Reporting three errors as a finding wastes a review; reporting four is the finding.

---

## 4. THE LIVE-FOLLOW SCRIPT IS NON-DESTRUCTIVE

`git-live-follow.sh --live main` is fast-forward-only. **Do not stop it on the assumption that it reverts uncommitted edits.**

Commit promptly anyway: dispatched executors cannot commit for themselves, so **executors never run git; the orchestrating session commits.**

---

## 5. SELF-CHECK

- [ ] Every failure was checked against this list before being called a regression.
- [ ] A moved screenshot got a second capture before a verdict.
- [ ] A flaky test got a scoped stash and at least eight runs.
- [ ] The eslint number reported is a delta, not a total.
