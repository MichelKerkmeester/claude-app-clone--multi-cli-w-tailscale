---
title: "Phase 6 tasks - host-gated usage/search/change-review ledger"
description: "Task Format: T### [P?] Description (file path). Every task cites its finding id, real app-mobile file, host field, and done-condition; all open at 0%."
trigger_phrases:
  - "host usage search review task ledger"
  - "host usage search review phase"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/006-host-usage-search-review"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the host-gated usage/search/change-review task ledger; all tasks open."
    next_safe_action: "Await operator go, then build the ready-now UQ-3/UQ-6 and SH-1 harness."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 tasks - host-gated usage/search/change-review

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked-on-host. Every task cites its finding id, the real app file(s), and (for blocked tasks) the host field it waits on. All tasks are OPEN - this packet is a plan; nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_READY-NOW CLIENT LOGIC (fixtures)_

- [x] T1.1 [UQ-3 → REQ-003] Build the reset-countdown formatter + boundary-aware tick scheduler (one wakeup per hour) in new `shared/format/usage-format.ts`, unit-tested against a fixture `resetsAt`. Done: correct live countdown, scheduler wakes only at the rounding boundary. [evidence: `usage-format.ts` countdown plus an hourly boundary-aligned scheduler, covered by `usage-format.test.ts`; the delay is asserted rather than slept]
- [x] T1.2 [UQ-6 → REQ-006] Build the used-vs-remaining display toggle in `shared/format/usage-format.ts`, device-local, kept separate from severity colour. Done: switching the label never flips colour meaning; unit test covers both labels. [evidence: used/remaining toggle changes wording only; a test asserts the severity result is unchanged for the same input]
- [x] T1.3 [UQ-5 → REQ-005] Build the usage severity colour fn in `usage-format.ts` STRICTLY separate from the `contextPercent` meter colour in `shared/format/card-projection.ts` (they invert). Done: two functions, absent severity reads unknown not green; test asserts no shared scale. [evidence: usage `severityColor` is separate from the `contextPercent` meter colour in `card-projection.ts`; delegating one to the other turns 1 red]
- [x] T1.4 [SH-1 → REQ-009] Build the cross-session search debounce (180 ms, min 2 chars) + result render harness over a fixture `{sessionId,title,snippet,updatedAt}[]`, reusing the phase-003 search UI harness, in new `pages/search/`. Done: harness debounces/gates/renders fixture results. [evidence: `session-search.ts` debounces at 180 ms with a 2-character minimum, covered by `session-search.test.ts`; zeroing either constant turns 1 red]
- [x] T1.5 [cross-cutting] Capture the token-identity and test:web baseline for `screen-home.svelte`, `card-projection.ts`, and the artifacts diff surface before any change. Done: baseline recorded. [evidence: baseline captured before the lanes ran: typecheck 1200 files 0 errors, 103+73 suite files, 735+727 tests, token-identity PASS]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_WIRE RENDERS BEHIND HOST FIELDS (inert)_

- [x] T2.1 [UQ-1 → REQ-001] [B] Account-usage card slot in `pages/home/screen-home.svelte` + new `pages/home/usage-*.svelte` detail sheet; inert without the usage payload. Host: usage payload. [evidence: usage card slot in `screen-home.svelte` plus `usage-sheet.svelte`, both inert without the payload, covered by `usage-sheet.svelte.test.ts`]
- [x] T2.2 [UQ-2 → REQ-002] [B] Render the host-flagged gating window as the headline in `usage-*.svelte`, never a client-picked fullest bar. Host: isActive/primaryLimit. [evidence: `selectGatingWindow` uses the host `isActive`/`primary` marker; replacing it with a client-side maximum turns 2 red in `usage-window.test.ts`]
- [x] T2.3 [UQ-4 → REQ-004] [B] Per-window tri-state (loading/unavailable/stale-but-shown) in `usage-*.svelte`; a failed poll keeps last-good. Host: per-window availability. [evidence: per-window loading, unavailable and stale-but-shown states; a failed poll keeps the last good value rather than falling back to zero]
- [x] T2.4 [UQ-7 → REQ-007] [B] Stale decay to unknown after ~30 min, 24 h grace after a rate-limited read, in `usage-format.ts`. Host: stale/grace + rate-limited flag. [evidence: thirty-minute decay and twenty-four hour grace are pinned constants tested with literal offsets; making either infinite or zero turns 1 red]
- [x] T2.5 [UQ-8 → REQ-008] [B] Document the poll-cadence-gated-on-remote-reader requirement for the relay. Host: poll-cadence requirement. [evidence: the poll-cadence-gated-on-remote-reader requirement is filed as part of REQ-014 in `../../007-host-requests/spec.md`]
- [x] T2.6 [SH-1 → REQ-009] [B] Wire the search screen to the live `sessions.search` RPC behind the fixture harness. Host: sessions.search RPC. [evidence: `session-search.ts` is capability-gated and issues no query without the RPC, covered by `session-search.test.ts`]
- [x] T2.7 [CR-1 → REQ-010] [B] Read-only PR chip (state pill + worst-of rollup + comment count) → details sheet in new `pages/chat/source-control/`. Host: PR summary field. [evidence: `pr-chip.svelte` and `sheet-pr-details.svelte` render the host rollup only; an independent probe confirms both are empty with no host data]
- [x] T2.8 [CR-2 → REQ-011] [B] Render the provider-neutral classified check summary; unknown → muted unresolved. Host: classified summary field. [evidence: `check-summary.svelte` renders an unknown classification as muted-unresolved; making unknown fall through to passing turns 1 red]
- [x] T2.9 [CR-3 → REQ-012] [B] Per-check row list worst-first, auto-expand first failure, Open on web. Host: per-check rows + URLs. [evidence: `check-list.svelte` orders worst-first and opens host-supplied URLs only; no provider URL is constructed client-side]
- [x] T2.10 [CR-4 → REQ-013] [B] Committed-on-Branch changed-files list → read-only diff REUSING `pages/chat/artifacts/diff-preview.svelte` (with phase-002 MA-1 enrichment). Host: committed-files field. [evidence: `changed-files.svelte` reuses `parseUnifiedDiff` from `diff-preview.svelte`; no second parser exists in `pages/chat/source-control`]
- [x] T2.11 [CR-5 → REQ-014] [B] Commit-history list with lazy per-commit file expansion, fail-closed on disconnect. Host: commit history + per-commit files. [evidence: `commit-history.svelte` expands per-commit files lazily and shows a failure rather than an empty list on disconnect]
- [x] T2.12 [CR-6 → REQ-015] [B] Ahead/behind sync label + branch identity from `upstreamStatus`, never guessed. Host: upstream status. [evidence: `upstream-status.svelte` renders ahead/behind from host `upstreamStatus` only; absent status renders no sync label at all]
- [x] T2.13 [CR-7 → REQ-016] [B] Conflicting-files section distinguishing provider-reported vs locally-confirmed. Host: two-source conflict state. [evidence: `conflict-list.svelte` labels provider-reported and locally-confirmed conflicts separately rather than merging them]
- [x] T2.14 [CR-8 → REQ-017] [B] Reviewer rows (Approved/Changes-requested/Commented/Pending), colour-coded. Host: reviewer rows. [evidence: `reviewer-list.svelte` renders host reviewer rows with their states colour-coded]
- [x] T2.15 [CR-9 → REQ-018] [B] Three-segment Source Control hub (Changes/PR/Commits), deep-linkable via `routes/` composing with phase-003 NL-1, safe-default on a bad link. Host: composes over the change-review payloads. [evidence: `source-control-hub.svelte` plus the segment route; an unknown segment lands on the safe default, and breaking the fallback turns 1 red]
- [x] T2.16 [TE-3 → REQ-019] [B] Wire host-resolved tap-to-open through `pages/chat/rich-content/prose-link.ts` (canRouteProsePathToArtifact) + `safe-markdown.svelte`; line:col deep-link into the preview; miss toasts via the send-error banner. Detection ready (phase 002). Host: `resolveTerminalPath(path, worktreeId)`. [evidence: `safe-markdown.svelte` opens only host-resolved paths through `canRouteProsePathToArtifact`; forcing an unresolved path tappable turns 2 red]
- [x] T2.17 [MI-1 → REQ-020] [B-partial] Quote-history-into-a-fresh-chat: excerpt+prefill over phase-002 MI-4 in `pages/chat/chrome/session-composer.svelte`; the new-chat step inert until the host capability lands. Host: new-session/create capability. [evidence: the composer quote action routes through `excerptToBudget` and never calls send; bypassing the excerpt turns 1 red]
- [x] T2.18 [MI-3 → REQ-021] [B] True host-level branch entry in `shared/commands/`; renders nothing until the RPC lands. Host: branch/fork RPC returning a new resumable id. [evidence: `shared/commands/branch-entry.ts` returns null without the RPC and never fabricates a session id]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] T3.1 [fail-closed] Prove every blocked surface renders nothing with its host field absent (usage card, search results, PR chip, source-control tabs, TE-3 open, MI-1 new-chat, MI-3). Done: inertness asserted per surface. [evidence: an independent probe rendered all seven source-control surfaces with no host data and every one produced empty output]
- [x] T3.2 [ready-now] UQ-3/UQ-6/UQ-5 unit tests and the SH-1 harness test green against fixtures; two-colour-fn separation asserted. Done: all green. [evidence: `usage-format.test.ts` and `session-search.test.ts` are green against fixtures; the two-colour separation is asserted and negative-controlled]
- [x] T3.3 [token-identity + test:web] token-identity 0-diff on any moved CSS; `test:web` green from the final state; CR-4 reuse of `diff-preview.svelte` confirmed. Done: evidence captured. [evidence: `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens; 108 files 760 passed and 77 files 749 passed; `parseUnifiedDiff` reuse confirmed]
- [x] T3.4 [a11y-parity] Usage sheet, search screen, and source-control hub preserve dialog/listbox/tab a11y semantics and focus return. Done: a11y-parity confirmed. [evidence: the usage sheet is a labelled dialog and the hub exposes tab semantics, asserted in `usage-sheet.svelte.test.ts` and `source-control.svelte.test.ts`]
- [x] T3.5 [traceability] Every task cites a finding id, a real file, and (for blocked) its host field; every REQ has a covering task. Done: no traceless task. [evidence: every task cites a finding id and a real file; the sixteen blocked findings are filed as REQ-014 through REQ-018 in `../../007-host-requests/spec.md`]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] Ready-now findings (UQ-3, UQ-6, SH-1 harness, TE-3 detection) implemented and unit-tested against fixtures. [evidence: `usage-format.test.ts` and `session-search.test.ts` cover the countdown, toggle, colour separation and search boundaries]
- [x] Every blocked finding shipped inert behind its host field, each documented against `../../007-host-requests/`. [evidence: an independent probe confirmed every source-control surface is empty without host data; the fields are filed as REQ-014 through REQ-018]
- [x] No client-computed verdict, quota inference, mutation, or fabricated check state anywhere. [evidence: `git status packages/` is clean, unknown checks render muted-unresolved, and the gating window comes from the host marker rather than a client maximum]
- [x] token-identity, test:web, a11y-parity green from the final state; CR-4 reuses `diff-preview.svelte`; CR-9 deep-link composes with phase-003 NL-1. [evidence: `token-identity verify app-mobile/src/app.css` PASS on all 35 goldens; 108 files 760 passed and 77 files 749 passed; `changed-files.svelte` imports `parseUnifiedDiff` from `diff-preview.svelte`; the segment route safe-defaults an unknown link]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the per-finding requirements, host fields, and ready-now/blocked splits.
- `plan.md` - the sequenced approach and the cross-phase batching.
- `checklist.md` - the Level-2 QA sign-off.
- `../../007-host-requests/` - the relay-side field/RPC requests this phase depends on.
- `../plan.md` - master plan §6.2, §6.3, §6.4, §6.7, §6.8.
<!-- /ANCHOR:cross-refs -->
