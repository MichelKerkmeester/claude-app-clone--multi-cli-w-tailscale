---
title: "Phase 6 - Usage/quota, transcript-search, change-review (host-gated)"
description: "Plan the three host-gated read-only surfaces the client renders once the relay publishes their payloads: a per-provider usage/quota card and detail sheet, a cross-session transcript-search UI over a sessions.search RPC, and a per-session change-review PR/git hub, plus host-resolved tap-to-open and client quote/branch. Client-read-only, fail-closed inert until each field lands; the ready-now formatter/harness/detection is buildable against fixtures today."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/006-host-usage-search-review"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored Level-2 plan for the host-gated usage/search/change-review phase; no code."
    next_safe_action: "Build the ready-now client logic (UQ-3/UQ-6 formatter, SH-1 harness, TE-3 detection)."
    blockers:
      - "18 of 21 findings are blocked on relay-authored read-only fields/RPCs (usage payload, sessions.search, PR/git payload, resolveTerminalPath, new-session and branch RPCs)."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 - Usage/quota, transcript-search, change-review (host-gated)

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) (§6.2, §6.3, §6.4, §6.7, §6.8) · Host requests: [`../../007-host-requests/`](../../007-host-requests/) · Findings: [`../research/findings-registry.json`](../research/findings-registry.json)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Priority** | P1 |
| **Status** | Planned |
| **Created** | 2026-08-27 |
| **Findings owned** | UQ-1..8, SH-1, CR-1..9, TE-3, MI-1, MI-3 (21) |
| **Constraint** | Host-authoritative, fail-closed - the client renders only host-pre-resolved tokens, never computes a verdict or mutates |
| **Client vs host** | Host-gated: UQ-3, UQ-6 ready-now; SH-1, TE-3, MI-1 partial (client harness/detection ready); the other 16 blocked-on-host |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Three high-value read-only surfaces are absent because the client has no field to render: a per-provider usage/quota view (am I about to hit a wall), a cross-session transcript search (which conversation was I discussing X in), and a per-session change-review hub (is the agent branch green and mergeable). Each needs a host-authored, client-read-only payload before its render is honest; inventing any of these client-side would fabricate confident-but-wrong numbers, which the fail-closed constraint forbids. Two more findings, host-resolved tap-to-open and quote-into-a-fresh-chat, ride the same rule.

### Purpose
Plan the client consumption of each host payload so the render is thin, fail-closed, and never asserts a verdict the host did not publish. Build the ready-now client logic (the reset-countdown formatter and used/remaining toggle, the search debounce/render harness, the path-detection already shipping in phase 002) against fixtures now, so each surface lights up the moment its relay field lands.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- Usage/quota (UQ-1..8): a home Account-usage card and per-account detail sheet over a per-provider usage payload with independent windows; the pure reset-countdown formatter and used/remaining toggle ship now.
- Transcript search (SH-1): a cross-session search UI over a read-only sessions.search RPC; the debounce/render harness builds now against a fixture.
- Change-review (CR-1..9): a per-session Source Control hub (Changes/PR/Commits) rendering a read-only PR/git payload; CR-4 reuses the phase-002 MA-1 diff enrichment.
- Path-resolve (TE-3): host-resolved tap-to-open with a line:col deep-link; detection (phase-002 TE-2) and scheme gate (phase-002 TE-4) ship first.
- Composer/media host fields (MI-1, MI-3): quote-history-into-a-fresh-chat (excerpt ready via phase-002 MI-4) and a true host-level branch.

### Out of Scope
- Every host RPC/field contract itself (owned by `../../007-host-requests/`); each blocked finding ships inert until its field lands.
- The client-side free-term search and the search UI harness's home half owned by phase 003 (SH-2..5); this phase reuses that harness for the RPC results.
- Any client-computed verdict, quota inference from a percentage, mutation, or fabricated check state.
- Any client-owned or client-edited session truth.

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `app-mobile/src/pages/home/screen-home.svelte` | Modify | UQ-1: the Account-usage card slot |
| `app-mobile/src/pages/home/usage-*.svelte` | Create | UQ-1/UQ-2/UQ-4: per-account detail sheet and window rows |
| `app-mobile/src/shared/format/usage-format.ts` | Create | UQ-3/UQ-6/UQ-5: reset-countdown formatter, used/remaining toggle, usage severity colour kept apart from the context meter |
| `app-mobile/src/shared/format/card-projection.ts` | Modify | UQ-5: keep the `contextPercent` meter colour strictly separate (inverse logic) |
| `app-mobile/src/pages/search/` | Create | SH-1: cross-session search screen over the RPC |
| `app-mobile/src/pages/home/session-list-seams.ts` | Modify | SH-3 operator half cross-ref (phase 003); SH-1 result shaping |
| `app-mobile/src/pages/chat/source-control/` | Create | CR-1..9: the read-only Source Control hub surface |
| `app-mobile/src/pages/chat/artifacts/diff-preview.svelte` | Reuse | CR-4: read-only committed-files diff (incl. phase-002 MA-1 enrichment) |
| `app-mobile/src/routes/` | Modify | CR-9: deep-link the hub (composes with phase-003 NL-1) |
| `app-mobile/src/pages/chat/rich-content/prose-link.ts` | Modify | TE-3: `canRouteProsePathToArtifact` gates on the host ref |
| `app-mobile/src/pages/chat/rich-content/safe-markdown.svelte` | Modify | TE-3: route a resolved path to preview |
| `app-mobile/src/pages/chat/chrome/session-composer.svelte`, `app-mobile/src/shared/commands/` | Modify/Create | MI-1/MI-3: quote-into-fresh-chat and host-level branch |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers

None. No Wave-1 verified quick-win lands in this phase; all 21 findings are P1 and host-gated.

### P1 - Required (complete OR user-approved deferral)

**Usage / quota capability** - host request: a per-provider usage payload, independent windows `{usedPercent, windowMinutes, resetsAt, severity, isActive}` with a host-flagged gating window, kept warm on a host schedule (UQ-8), decayed to unknown after a bounded age (UQ-7).

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | [UQ-1] Home Account-usage card to per-account detail sheet; the anchor of the surface. Blocked-on-host: the usage payload. Client-ready-now: the card/sheet layout scaffold. | With no usage payload the card renders nothing; when present it shows per-account usage and opens the detail sheet. Host field: usage payload. |
| REQ-002 | [UQ-2] Independent quota windows each with `resetsAt` and a host-flagged currently-gating window; never a client-picked fullest bar. Blocked-on-host: `isActive`/`primaryLimit` server verdict. | The headline window is the one the host flags gating, not the fullest; a test asserts the client never infers gating from a percentage. Host field: isActive/primaryLimit. |
| REQ-003 | [UQ-3] Shared pure reset-countdown formatter and boundary-aware tick scheduling (one wakeup per hour, not per second). Client-ready-now: rides `resetsAt`; buildable and unit-tested against a fixture now. | The formatter renders a correct live countdown from a fixture `resetsAt`; the scheduler wakes only at the label rounding boundary; unit test covers hour/minute boundaries. Host field: rides resetsAt. |
| REQ-004 | [UQ-4] Per-window tri-state (loading / unavailable / stale-but-shown): a failed poll keeps last-good, never blanks a real number to a dash. Blocked-on-host: per-window availability. | A failed poll keeps the last-good number and marks it stale; an unavailable window shows unavailable, not a fabricated value. Host field: per-window availability. |
| REQ-005 | [UQ-5] Usage severity colour from the provider verdict first, in a colour fn strictly separate from the `contextPercent` meter (the two invert). Blocked-on-host: the `severity` field. | Usage colour and context-meter colour are two functions; an absent severity reads as unknown, never confident green; a test asserts they do not share a scale. Host field: severity. |
| REQ-006 | [UQ-6] Used-vs-remaining display toggle kept strictly separate from the severity colour; a per-viewer preference. Client-ready-now: rides `usedPercent`. | Switching the label (90% used vs 10% left) never flips what the colour means; the toggle is device-local; unit test covers both labels. Host field: rides usedPercent. |
| REQ-007 | [UQ-7] Stale quota decays to unknown after about 30 minutes; a 24 hour grace after a rate-limited read. Blocked-on-host: host-side stale/grace and a fetch-was-rate-limited flag. | An aged reading decays to unknown, not a confident last-known percent; a rate-limited read gets the longer grace; a test covers both thresholds. Host field: stale/grace + rate-limited flag. |
| REQ-008 | [UQ-8] Poll cadence gated on a remote reader may be watching, not desktop focus. Blocked-on-host (host impl): a host poll-cadence requirement. | Stated as a host-implementation requirement so the phone does not show hours-stale numbers when checked while the laptop sleeps. Host field: poll-cadence requirement. |

**Cross-session transcript search capability** - host request: a read-only `sessions.search(query) → {sessionId, title, snippet, updatedAt}[]` RPC.

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-009 | [SH-1] Cross-session search UI: debounced 180 ms, minimum 2 chars, renders `{sessionId, title, snippet, updatedAt}[]`. Partial: the debounce/render harness builds now against a fixture; live results blocked-on-host. | The harness debounces at 180 ms, gates under 2 chars, and renders fixture results; live results appear only when the RPC lands. Host field: sessions.search RPC. |

**Per-session change-review capability** - host request: a read-only PR/git payload (classified check summary, PR state and comment count, per-check rows and web URLs, committed files with plus/minus and M/A/D/R, commit history with per-commit files, upstream ahead/behind, two-source conflict state, reviewer rows). The client renders only host-pre-resolved tokens.

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-010 | [CR-1] Read-only PR chip: state pill, worst-of check rollup, comment count, to a details sheet; the anchor. Blocked-on-host: a PR summary field. | With no PR summary the chip is absent; when present it renders the host-resolved state and rollup and opens the sheet. Host field: PR summary. |
| REQ-011 | [CR-2] One provider-neutral classified check summary; unknown degrades to a muted unresolved checks, never a fabricated green/red. Blocked-on-host: a classified summary field. | An unclassifiable state renders muted unresolved, never green or red; a test asserts no client classification. Host field: classified summary. |
| REQ-012 | [CR-3] Per-check row list worst-first, auto-expand the first failure, Open on web. Blocked-on-host: per-check rows and URLs. | Rows sort worst-first, the first failure auto-expands, each row opens its host URL; no CI logs are streamed. Host field: per-check rows + URLs. |
| REQ-013 | [CR-4] Committed-on-Branch changed-files list (path, plus/minus, M/A/D/R) to a read-only diff, reusing `diff-preview.svelte` with the phase-002 MA-1 enrichment. Blocked-on-host: the committed-files field. | The file list renders from the host field and opens each file in the read-only enriched diff; a test asserts the reuse of `diff-preview.svelte`. Host field: committed-files. |
| REQ-014 | [CR-5] Commit-history list with lazy per-commit file expansion, fail-closed on disconnect. Blocked-on-host: commit history and per-commit files. | History renders subject/author/relative-time; expanding a commit lazily loads its files; a disconnect shows waiting-for-desktop, never stale-cache fabrication. Host field: commit history + per-commit files. |
| REQ-015 | [CR-6] Ahead/behind sync label and branch identity from `upstreamStatus`, never guessed. Blocked-on-host: upstream status. | The label renders from `upstreamStatus` only; a test asserts no client derivation of ahead/behind. Host field: upstream status. |
| REQ-016 | [CR-7] Conflicting-files section distinguishing provider-reported from locally-confirmed conflicts. Blocked-on-host: two-source conflict state. | A provider-reported conflict and a locally-confirmed one render distinctly; neither is a false alarm nor a hidden blocker. Host field: conflict state (two-source). |
| REQ-017 | [CR-8] Reviewer rows (Approved / Changes-requested / Commented / Pending), colour-coded. Blocked-on-host: reviewer rows. | Each reviewer renders its host-published status and colour; absent data shows pending, not approved. Host field: reviewer rows. |
| REQ-018 | [CR-9] Three-segment Source Control hub (Changes / PR / Commits), one deep-linkable tab set, safe-default on a bad link; composes over the above and the phase-003 NL-1 coordinator. Blocked-on-host: composes over the above payloads. | The hub renders three tabs, deep-links to a tab, and safe-defaults on a bad/stale link; deep-link routing composes with NL-1. Host field: composes over the change-review payloads. |

**Path-resolve and composer/media capability**

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-019 | [TE-3] Host-resolved tap-to-open: path to RPC to existence and open target; a line:col deep-link into the preview; a miss degrades to a toast reusing the send-error banner. Partial: detection (phase-002 TE-2) and scheme gate (phase-002 TE-4) ship first; open blocked-on-host. | With the RPC absent a tapped path is inert (detection still renders); when present it opens the resolved target at line:col and a miss toasts. Host field: `resolveTerminalPath(path, worktreeId) → {exists, isDirectory, openTarget, line, column}`. |
| REQ-020 | [MI-1] Quote-history-into-a-fresh-chat: excerpt and prefill ready via phase-002 MI-4; open a new chat blocked-on-host. Partial. | The excerpt+prefill builds now over MI-4; the new-chat step is inert until the host capability lands. Host field: a new-session / create capability. |
| REQ-021 | [MI-3] True host-level branch (both timelines with exact tool state); pursue only if MI-1 starts-fresh limit hurts. Blocked-on-host. | Named as the ceiling above MI-1; renders nothing until the RPC lands. Host field: a branch/fork RPC returning a new resumable id. |
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: Every task in `tasks.md` cites its finding id and the real app-mobile file it touches; no task is traceless.
- **SC-002**: Every REQ names the exact host field/RPC it needs and splits client-ready-now from blocked-on-host; the ready-now logic (UQ-3, UQ-6, SH-1 harness, TE-3 detection) is unit-tested against a fixture.
- **SC-003**: No REQ proposes the client computing a verdict, inferring quota from a percentage, mutating, or fabricating a check state; every blocked finding renders nothing when its field is absent.
- **SC-004**: The usage severity colour and the `contextPercent` meter colour are two separate functions; CR-4 reuses `diff-preview.svelte`; CR-9 deep-link composes with phase-003 NL-1. token-identity, test:web, a11y-parity green from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Dependency | Usage payload, sessions.search, PR/git payload, resolveTerminalPath, new-session/branch RPCs | 16 findings inert until they land | Build the ready-now logic against fixtures; track each request in `../../007-host-requests/` |
| Risk | Client fabricating a verdict | High: an inferred gating window or a fabricated green check breaks the fail-closed contract | Render only host-pre-resolved tokens; unknown degrades to muted, never a colour verdict |
| Risk | Usage/context colour cross-talk (UQ-5) | Med: a shared colour scale inverts one meter | Two separate colour fns; usage colour in `usage-format.ts`, context meter in `card-projection.ts` |
| Dependency | Phase-002 MA-1 diff enrichment | CR-4 reuses it | Build MA-1 first; CR-4 consumes the enriched `diff-preview.svelte` |
| Dependency | Phase-003 NL-1 coordinator | CR-9 deep-link composes with it | Build NL-1 before the hub renders |
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The reset-countdown scheduler wakes once per rounding boundary (about one wakeup per hour at hour granularity), never per second, so a live countdown causes no redraw storm.

### Security
- **NFR-S01**: The client renders only host-published read-only tokens; it opens web URLs and resolved paths the host supplies and never synthesizes a path or a check verdict.

### Reliability
- **NFR-R01**: Every host-gated surface is fail-closed: an absent field renders nothing, a failed poll keeps last-good marked stale, and a disconnect shows waiting rather than stale-cache fabrication.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty usage payload: the card is absent, not an empty shell.
- Unclassifiable check state: renders muted unresolved, never green/red.

### Error Scenarios
- Rate-limited quota read: UQ-7 applies the 24 hour grace rather than decaying immediately.
- Path-resolve miss: TE-3 degrades to a toast, reusing the send-error banner.
- Bad/stale deep link into the hub: CR-9 safe-defaults to the Changes tab.

### State Transitions
- Window resets while shown: UQ-2 re-reads the host gating flag rather than keeping a stale headline.
- Desktop sleeps: UQ-8 keeps the host poll cadence so the phone is not silently hours-stale.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 20/25 | 21 findings, three new surfaces (usage sheet, search screen, source-control hub) |
| Risk | 14/25 | Fail-closed host contracts; no client verdict or mutation; no breaking change |
| Research | 13/20 | Five host payloads to specify with the relay; ready-now logic needs fixtures |
| **Total** | **47/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- In what order will the relay commit the five payloads (usage, sessions.search, PR/git, resolveTerminalPath, new-session/branch)? That order sets the unblock sequence for this phase.
- Should the change-review hub be a chat sub-surface or a top-level route? CR-9 deep-linking composes with phase-003 NL-1 either way, but the entry point differs.
<!-- /ANCHOR:questions -->
