---
title: "Task Ledger: Phase 1 — Enable the docs layer"
description: "The task ledger for enabling the docs layer, each task closed against observed command output."
trigger_phrases:
  - "enable docs layer tasks"
  - "addon-docs task ledger"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs/001-enable-docs-layer"
    last_updated_at: "2026-08-30T09:20:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed every task with observed command evidence."
    next_safe_action: "Begin phase 2: measure docgen coverage."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Task Ledger: Phase 1 — Enable the docs layer

---

<!-- ANCHOR:notation -->
## Task Notation

`[ ]` open · `[x]` complete. Each closed task names the output that proves it.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:tasks -->
## Tasks

- [x] T-001 Baseline the build. Evidence: 7.60s and 7.68s across two clean runs.
- [x] T-002 Install the addon into the web workspace. Evidence: `"@storybook/addon-docs": "^9.1.20"` in the web manifest.
- [x] T-003 Confirm `playwright` survived. Evidence: it still resolves; the four gates that need it ran afterwards.
- [x] T-004 List the addon in `main.ts`. Evidence: index entry types `{"docs":100,"story":337}`.
- [x] T-005 Prove the table is derived. Evidence: `value*` with `"system" | "light" | "dark"` from the `ThemePreference` type, 0 page errors.
- [x] T-006 Measure the build cost. Evidence: 7.99s and 8.94s after, against the recorded baseline.
- [x] T-007 Find what the addon broke. Evidence: two dock shots grew `398x136` to `402x874`; the walker showed `sb-errordisplay` as the tallest painter at 874.
- [x] T-008 Trace it to its cause. Evidence: `lifecycle_outside_component` from `setContext` called inside the story's `render`.
- [x] T-009 Repair via a story host. Evidence: story root renders `RECENT SESSIONS 5 Release readiness review`; error shell present but `display:none` at 0x0, as on every healthy story.
- [x] T-010 Close the gate blind spot. Evidence: with the broken story restored the gate reports `FAIL: 4/674 frames`; it had reported `0 throws`.
- [x] T-011 Allowlist the host for story coverage. Evidence: `PASS: story coverage`.
- [x] T-012 Re-run every gate and the archive. Evidence: 674 frames 0 throws, state-visibility PASS, 39 token goldens, geometry PASS, typecheck 0 errors, 783 and 776 tests, 0 shots moved.
- [x] T-013 Cut what proved unnecessary. Evidence: the capture-walker change reverted; re-capture moved only the two shots REPO RULES names as flaky.
<!-- /ANCHOR:tasks -->

---

<!-- ANCHOR:completion -->
## Completion Criteria

Thirteen tasks closed against observed output, both exposed defects repaired at cause and
negative-controlled, and a working tree carrying only the intended files.
<!-- /ANCHOR:completion -->
