---
title: "Phase 6 tasks - host-gated usage/search/change-review ledger"
description: "Task Format: T### [P?] Description (file path). Every task cites its finding id, real app-mobile file, host field, and done-condition; all open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/006-host-usage-search-review"
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

- [ ] T1.1 [UQ-3 → REQ-003] Build the reset-countdown formatter + boundary-aware tick scheduler (one wakeup per hour) in new `shared/format/usage-format.ts`, unit-tested against a fixture `resetsAt`. Done: correct live countdown, scheduler wakes only at the rounding boundary.
- [ ] T1.2 [UQ-6 → REQ-006] Build the used-vs-remaining display toggle in `shared/format/usage-format.ts`, device-local, kept separate from severity colour. Done: switching the label never flips colour meaning; unit test covers both labels.
- [ ] T1.3 [UQ-5 → REQ-005] Build the usage severity colour fn in `usage-format.ts` STRICTLY separate from the `contextPercent` meter colour in `shared/format/card-projection.ts` (they invert). Done: two functions, absent severity reads unknown not green; test asserts no shared scale.
- [ ] T1.4 [SH-1 → REQ-009] Build the cross-session search debounce (180 ms, min 2 chars) + result render harness over a fixture `{sessionId,title,snippet,updatedAt}[]`, reusing the phase-003 search UI harness, in new `pages/search/`. Done: harness debounces/gates/renders fixture results.
- [ ] T1.5 [cross-cutting] Capture the token-identity and test:web baseline for `screen-home.svelte`, `card-projection.ts`, and the artifacts diff surface before any change. Done: baseline recorded.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_WIRE RENDERS BEHIND HOST FIELDS (inert)_

- [ ] T2.1 [UQ-1 → REQ-001] [B] Account-usage card slot in `pages/home/screen-home.svelte` + new `pages/home/usage-*.svelte` detail sheet; inert without the usage payload. Host: usage payload.
- [ ] T2.2 [UQ-2 → REQ-002] [B] Render the host-flagged gating window as the headline in `usage-*.svelte`, never a client-picked fullest bar. Host: isActive/primaryLimit.
- [ ] T2.3 [UQ-4 → REQ-004] [B] Per-window tri-state (loading/unavailable/stale-but-shown) in `usage-*.svelte`; a failed poll keeps last-good. Host: per-window availability.
- [ ] T2.4 [UQ-7 → REQ-007] [B] Stale decay to unknown after ~30 min, 24 h grace after a rate-limited read, in `usage-format.ts`. Host: stale/grace + rate-limited flag.
- [ ] T2.5 [UQ-8 → REQ-008] [B] Document the poll-cadence-gated-on-remote-reader requirement for the relay. Host: poll-cadence requirement.
- [ ] T2.6 [SH-1 → REQ-009] [B] Wire the search screen to the live `sessions.search` RPC behind the fixture harness. Host: sessions.search RPC.
- [ ] T2.7 [CR-1 → REQ-010] [B] Read-only PR chip (state pill + worst-of rollup + comment count) → details sheet in new `pages/chat/source-control/`. Host: PR summary field.
- [ ] T2.8 [CR-2 → REQ-011] [B] Render the provider-neutral classified check summary; unknown → muted unresolved. Host: classified summary field.
- [ ] T2.9 [CR-3 → REQ-012] [B] Per-check row list worst-first, auto-expand first failure, Open on web. Host: per-check rows + URLs.
- [ ] T2.10 [CR-4 → REQ-013] [B] Committed-on-Branch changed-files list → read-only diff REUSING `pages/chat/artifacts/diff-preview.svelte` (with phase-002 MA-1 enrichment). Host: committed-files field.
- [ ] T2.11 [CR-5 → REQ-014] [B] Commit-history list with lazy per-commit file expansion, fail-closed on disconnect. Host: commit history + per-commit files.
- [ ] T2.12 [CR-6 → REQ-015] [B] Ahead/behind sync label + branch identity from `upstreamStatus`, never guessed. Host: upstream status.
- [ ] T2.13 [CR-7 → REQ-016] [B] Conflicting-files section distinguishing provider-reported vs locally-confirmed. Host: two-source conflict state.
- [ ] T2.14 [CR-8 → REQ-017] [B] Reviewer rows (Approved/Changes-requested/Commented/Pending), colour-coded. Host: reviewer rows.
- [ ] T2.15 [CR-9 → REQ-018] [B] Three-segment Source Control hub (Changes/PR/Commits), deep-linkable via `routes/` composing with phase-003 NL-1, safe-default on a bad link. Host: composes over the change-review payloads.
- [ ] T2.16 [TE-3 → REQ-019] [B] Wire host-resolved tap-to-open through `pages/chat/rich-content/prose-link.ts` (canRouteProsePathToArtifact) + `safe-markdown.svelte`; line:col deep-link into the preview; miss toasts via the send-error banner. Detection ready (phase 002). Host: `resolveTerminalPath(path, worktreeId)`.
- [ ] T2.17 [MI-1 → REQ-020] [B-partial] Quote-history-into-a-fresh-chat: excerpt+prefill over phase-002 MI-4 in `pages/chat/chrome/session-composer.svelte`; the new-chat step inert until the host capability lands. Host: new-session/create capability.
- [ ] T2.18 [MI-3 → REQ-021] [B] True host-level branch entry in `shared/commands/`; renders nothing until the RPC lands. Host: branch/fork RPC returning a new resumable id.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] T3.1 [fail-closed] Prove every blocked surface renders nothing with its host field absent (usage card, search results, PR chip, source-control tabs, TE-3 open, MI-1 new-chat, MI-3). Done: inertness asserted per surface.
- [ ] T3.2 [ready-now] UQ-3/UQ-6/UQ-5 unit tests and the SH-1 harness test green against fixtures; two-colour-fn separation asserted. Done: all green.
- [ ] T3.3 [token-identity + test:web] token-identity 0-diff on any moved CSS; `test:web` green from the final state; CR-4 reuse of `diff-preview.svelte` confirmed. Done: evidence captured.
- [ ] T3.4 [a11y-parity] Usage sheet, search screen, and source-control hub preserve dialog/listbox/tab a11y semantics and focus return. Done: a11y-parity confirmed.
- [ ] T3.5 [traceability] Every task cites a finding id, a real file, and (for blocked) its host field; every REQ has a covering task. Done: no traceless task.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [ ] Ready-now findings (UQ-3, UQ-6, SH-1 harness, TE-3 detection) implemented and unit-tested against fixtures.
- [ ] Every blocked finding shipped inert behind its host field, each documented against `../../007-host-requests/`.
- [ ] No client-computed verdict, quota inference, mutation, or fabricated check state anywhere.
- [ ] token-identity, test:web, a11y-parity green from the final state; CR-4 reuses `diff-preview.svelte`; CR-9 deep-link composes with phase-003 NL-1.
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
