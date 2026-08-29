---
title: "Phase 6 plan - host-gated usage/search/change-review, ready-now first, fail-closed"
description: "Sequenced approach for three host-gated read-only surfaces: build the ready-now client logic (UQ-3/UQ-6 formatter+toggle, SH-1 debounce/render harness, TE-3 detection) against fixtures first, then wire each render behind its relay field so it stays inert until the field lands. Proven fail-closed inert without the field, token-identity 0-diff, test:web, a11y-parity from the final state."
trigger_phrases:
  - "host usage search review plan approach"
  - "host usage search review phase"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/006-host-usage-search-review"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the host-gated usage/search/change-review plan; ready-now logic sequenced first."
    next_safe_action: "Await operator go, then build the usage-format formatter and search harness against fixtures."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 plan - host-gated usage/search/change-review

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript, Svelte 5 (runes), SvelteKit PWA |
| **Framework** | app-mobile client (host-authoritative, fail-closed) |
| **Storage** | Device-local view preferences only; all data is host-published read-only |
| **Testing** | Vitest (`test:web`) against fixtures, token-identity CSS resolver |

### Overview
Plan the client consumption of five host payloads (usage, sessions.search, PR/git, resolveTerminalPath, new-session/branch). Build the ready-now client logic against fixtures now (the reset-countdown formatter and used/remaining toggle, the search debounce/render harness, the path-detection shipping in phase 002); wire each render behind its field so it stays inert until the relay lands it. The client renders only host-pre-resolved tokens and never computes a verdict.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Every finding maps to a REQ naming its host field/RPC and the ready-now/blocked split.
- [ ] A fixture exists for each ready-now surface (usage `resetsAt`, search results, resolved path).
- [ ] Each blocked field is tracked in `../../007-host-requests/`.

### Definition of Done
- [ ] Ready-now logic (UQ-3, UQ-6, SH-1 harness, TE-3 detection) unit-tested against fixtures.
- [ ] Every blocked surface renders nothing with its field absent (fail-closed inertness proven).
- [ ] Usage colour and context-meter colour are two functions; CR-4 reuses `diff-preview.svelte`; token-identity 0-diff, test:web green, a11y-parity preserved, all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

Every surface here is a thin read-only render over a host-published payload. The fail-closed rule is structural: absent the field, the surface renders nothing.

**Usage/quota** adds a home Account-usage card slot in `screen-home.svelte` opening a new `usage-*.svelte` detail sheet. The pure logic lives in a new `shared/format/usage-format.ts`: the reset-countdown formatter and boundary-aware tick scheduler (UQ-3), the used/remaining toggle (UQ-6), and the usage severity colour (UQ-5) kept strictly separate from the `contextPercent` meter colour in `card-projection.ts` because the two invert. UQ-2 leads with the host-flagged gating window, never a client-picked fullest bar; UQ-4 holds last-good on a failed poll; UQ-7 decays to unknown after a bounded age; UQ-8 is stated as a host poll-cadence requirement.

**Transcript search** adds a `pages/search/` screen (or a home search-mode) whose debounce (180 ms, minimum 2 chars) and result render (SH-1) build now against a fixture and reuse the phase-003 search UI harness; live results wait on the `sessions.search` RPC.

**Change-review** adds a new `pages/chat/source-control/` hub with three deep-linkable tabs (CR-9), each rendering a host-pre-resolved token: the PR chip and rollup (CR-1), the classified check summary (CR-2), the per-check rows (CR-3), the committed-files diff reusing `diff-preview.svelte` with the phase-002 MA-1 enrichment (CR-4), the commit history (CR-5), the upstream ahead/behind label (CR-6), the two-source conflict section (CR-7), and the reviewer rows (CR-8). Deep-link routing composes with the phase-003 NL-1 coordinator.

**Path-resolve** wires TE-3 through the existing `prose-link.ts canRouteProsePathToArtifact` gate: a detected path (phase-002 TE-2) resolves via `resolveTerminalPath` to an open target with a line:col deep-link; a miss toasts through the send-error banner. **MI-1/MI-3** ride the composer: the excerpt+prefill builds over phase-002 MI-4, the new-chat and branch steps are inert until their host capability lands.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · ready-now client logic against fixtures
Build `usage-format.ts` (UQ-3 formatter + scheduler, UQ-6 toggle, UQ-5 usage colour separate from the context meter) and its unit tests over a fixture `resetsAt`/`usedPercent`. Build the SH-1 debounce/render harness over a fixture result set. Confirm the phase-002 TE-2 detection and TE-4 scheme gate are in place for TE-3. Capture the token-identity and test:web baseline first.

### Phase 2 · wire renders behind their fields (inert)
Scaffold the usage card and detail sheet, the search screen, the source-control hub (CR-1..9), the TE-3 open path, and the MI-1/MI-3 composer entries so each reads its host field and renders nothing when absent. CR-4 reuses the enriched `diff-preview.svelte`; CR-9 deep-link composes with phase-003 NL-1.

### Phase 3 · verification
Prove fail-closed inertness (each blocked surface renders nothing without its field), the ready-now unit tests, the two-colour-fn separation, token-identity on any moved CSS, test:web, and a11y-parity. Confirm every task traces to a finding and every REQ names its host field. Fix and re-run from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Batching dependencies from master plan §8 that apply here:

- **Usage vs context colour** - UQ-5 requires two separate colour fns; keep the usage colour in `usage-format.ts` strictly apart from the `contextPercent` meter in `card-projection.ts`; they invert.
- **Diff reuse** - phase-002 MA-1's `@@`-header parse enriches `diff-preview.svelte`, which CR-4 reuses for the committed-files diff; build MA-1 first (cross-phase dependency).
- **Nav coordinator** - phase-003 NL-1 is a prerequisite for clean deep-linking into the CR-9 source-control hub; build NL-1 before the hub renders (cross-phase dependency).
- **Search harness reuse** - the phase-003 SH-2..5 search UI harness (`session-list-seams.ts filterRoster`) is reused for the SH-1 RPC result render.

| Finding group | Depends On | Blocks |
|---------------|------------|--------|
| UQ-3, UQ-6 (ready-now) | None (fixtures) | UQ-1/2/4/5/7 render polish |
| UQ-1..2, 4..8 | Usage payload | Usage surface render |
| SH-1 | sessions.search RPC (harness ready-now) | Live cross-session results |
| CR-4 | Phase-002 MA-1, committed-files field | Committed-files diff |
| CR-9 | Phase-003 NL-1, CR-1..8 payloads | Deep-linkable hub |
| TE-3 | resolveTerminalPath RPC (detection ready via phase 002) | Tap-to-open |
| MI-1 | Phase-002 MI-4 (excerpt ready), new-session RPC | Quote-into-fresh-chat |
| MI-3 | branch/fork RPC | True host branch |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Ready-now logic + fixtures | Med | usage-format M, SH-1 harness M |
| Wire renders (inert) | High | usage sheet M, source-control hub L, search screen M, TE-3 M |
| Verification | Med | fail-closed inertness + unit + token-identity |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | UQ-3 formatter/scheduler; UQ-6 toggle; UQ-5 two-colour separation; SH-1 debounce | Vitest + fixtures |
| Fail-closed | Every blocked surface renders nothing with its field absent | Vitest fixtures |
| Integration | CR-4 reuse of `diff-preview.svelte`; CR-9 deep-link with NL-1; TE-3 open + miss toast | `test:web` |
| Visual | token-identity 0-diff on any moved CSS | token-identity resolver |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Usage payload | External (host) | Red | UQ-1/2/4/5/7/8 inert |
| sessions.search RPC | External (host) | Red | SH-1 live results inert (harness ready) |
| PR/git payload | External (host) | Red | CR-1..9 inert |
| resolveTerminalPath RPC | External (host) | Red | TE-3 open inert (detection ready) |
| new-session and branch RPCs | External (host) | Red | MI-1 new-chat and MI-3 inert |
| Phase-002 MA-1 diff enrichment | Internal (cross-phase) | Yellow | CR-4 waits on it |
| Phase-003 NL-1 coordinator | Internal (cross-phase) | Yellow | CR-9 deep-link waits on it |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A fabricated verdict slipping into a render, a token-identity diff, or a usage/context colour cross-talk.
- **Procedure**: All changes are confined to `app-mobile/src/pages/{home,search,chat}/**`, `app-mobile/src/shared/{format,commands}/**`, and `app-mobile/src/routes/**` (new source-control surface plus new files). `git checkout -- app-mobile` restores the prior client. No host contract is created by this phase (the requests live in `../../007-host-requests/`), so nothing rolls back on the relay; every surface is inert without its field, so a partial landing is safe.
<!-- /ANCHOR:rollback -->
