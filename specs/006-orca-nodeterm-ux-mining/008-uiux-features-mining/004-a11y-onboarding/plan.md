---
title: "Phase 4 plan - a11y and onboarding over real files, quick-wins first, sheet-primitive batched"
description: "Sequenced approach for the accessibility and onboarding/settings/diagnostics findings: land the two Wave-1 P0 quick-wins (AI-1 find-bar focus, AI-2 back-dismiss into the shared Sheet) first, sequence AI-2 before every new sheet so they inherit back-dismiss for free, then build the onboarding wizard, self-healing cleanup, diagnostics, searchable settings, coach marks, and the honest permission toggle. Proven by token-identity 0-diff, test:web, a11y-parity from the final state."
trigger_phrases:
  - "a11y onboarding plan approach"
  - "a11y onboarding phase"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/004-a11y-onboarding"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the a11y/onboarding phase plan; quick-wins and sheet primitive sequenced first."
    next_safe_action: "Await operator go, then build AI-1 and AI-2 as the first quick-wins."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 plan - a11y and onboarding/settings/diagnostics

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript, Svelte 5 (runes), SvelteKit PWA |
| **Framework** | app-mobile client (host-authoritative, fail-closed) |
| **Storage** | Client-only localStorage/session-scoped (quick-prompts, gates, tour, cleanup queue, ring buffer) |
| **Testing** | Vitest (`test:web`), token-identity CSS resolver |

### Overview
Land the two Wave-1 accessibility quick-wins first, sequence the shared-Sheet back-dismiss before every new sheet so the onboarding and quick-prompts sheets inherit it, then build the onboarding, settings, and diagnostics surfaces as pure client state. No host field is read or written.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Every finding maps to a REQ in spec.md with acceptance criteria.
- [ ] The touched-surface token-identity and test:web baseline is captured before any change.
- [ ] AI-2 is scheduled before AI-4 and the OS-* sheets.

### Definition of Done
- [ ] The two Wave-1 P0 findings (AI-1, AI-2) pass their acceptance tests and AI-2 removes the bespoke copy.
- [ ] Every onboarding, settings, and diagnostics item is pure client state with a regression or fail-closed test.
- [ ] token-identity 0-diff on the touched CSS, test:web green, a11y-parity preserved or improved, all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**AI-1** adds a focus-on-open action to the find-bar input in `transcript-find-bar.svelte` (~L52-65), driven by the open state in `transcript-list.svelte` and `transcript-find-context.svelte.ts`, using the mobile deferral so the keyboard rises without a second tap.

**AI-2** lifts the pushState marker, popstate interception, and focusin containment out of `sheet-plan-review.svelte` (~L126-152) and into the shared Sheet primitive (`sheet.svelte` plus `aria-hide-outside.svelte.ts`), so every sheet closes the topmost sheet on the back-gesture. The bespoke copy is then deleted from `sheet-plan-review.svelte`. This lands before any new sheet so AI-4 and the OS-* sheets inherit back-dismiss for free.

**AI-3** adds a moveUp/moveDown a11y action pair under `shared/primitives/a11y/`, unit-tested now and wired to the first reorder UI later. It is conditional until a reorder surface ships.

**AI-4** adds `sheet-quick-prompts.svelte` beside `sheet-prompt-history.svelte`; a chip inserts as an editable draft via `insert-slash-command.ts` and `setPromptComposer`, never auto-sends, and every icon-only row carries an a11y label. The library is local-only, distinct from this-session prompt-history recall.

**OS-1** adds a dynamically-gated onboarding wizard under `pages/enrollment/` beside `screen-enrollment.svelte`, with the decision gates under `shared/state/`; only outstanding decisions show, no-op steps skip, and every choice is framed as changeable.

**OS-2** adds a durable cleanup queue over `auth.ts` (`revokeDevice`/`logoutDevice`) and a self-healing card surfaced in the `screen-home.svelte` device footer (~L554-563), with Retry, so a failed cleanup never leaves a silent orphaned secret.

**OS-3** adds a self-diagnostics screen that runs host-count, a connectivity probe, and a per-host ping over `relay.ts` `getRelayHeartbeat` and `auth.ts`, streaming each result as it completes, plus a relay/pairing FAQ.

**OS-4** adds a bounded connection-log ring buffer under `shared/transport/`, consumed by `screen-enrollment.svelte` and the diagnostics screen, with a one-tap Copy diagnostics blob and a first-pairing ceiling of about 25 seconds distinct from infinite live retry.

**OS-5** adds a settings-search helper plus static metadata (title, description, keyword synonyms) consumed in `push-settings.svelte` and the device footer.

**OS-6** adds a target-gated tour engine under `shared/state/` whose coach marks only point at a real visible element, advance past a missing target, fire once per tour, and never render over another overlay. Targets span the chrome, the find-bar, and the dictation overlay.

**OS-7** re-reads OS permission on focus and foreground in `push-settings.svelte` and `attention.ts` (push subscribe/foreground), disables with Open Settings on denial, and fires a one-time blocked toast. It absorbs AN-6 and honors the RS-4 principle: only a re-probed read clears the disabled state.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · Wave-1 P0 quick-wins and the sheet primitive
Land AI-1 (find-bar focus-on-open) and AI-2 (back-dismiss into the shared Sheet primitive, bespoke copy removed from `sheet-plan-review.svelte`). Capture the token-identity and test:web baseline for the touched surfaces first. AI-2 lands before any new sheet.

### Phase 2 · onboarding, settings, diagnostics
Build OS-1 (onboarding wizard), OS-2 (self-healing cleanup card), OS-3 (diagnostics screen and FAQ), OS-4 (ring buffer, Copy diagnostics, first-pair ceiling), OS-5 (settings search), OS-6 (coach marks), OS-7 (honest permission toggle), and AI-4 (quick-prompts sheet, inheriting the AI-2 back-dismiss). Author the AI-3 helper as a conditional, unit-tested a11y action pair.

### Phase 3 · verification
Run token-identity on the touched CSS, the AI-1/AI-2 and OS-* regression and fail-closed tests, test:web, and the a11y-parity check. Confirm every task traces to a finding and each REQ has a covering task. Fix and re-run from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Batching dependencies from master plan §8 that apply here:

- **Sheet primitive batch** - AI-2 (back-dismiss into the shared Sheet) benefits every sheet; do it before AI-4 (quick-prompts sheet) and the OS-* sheets so they inherit it for free.

| Finding | Depends On | Blocks |
|---------|------------|--------|
| AI-1 | None | None |
| AI-2 | None | AI-4, OS-1 (sheets inherit back-dismiss) |
| AI-3 | A future reorder UI | None (conditional) |
| AI-4 | AI-2 | None |
| OS-1 | AI-2 | None |
| OS-2 | None | None |
| OS-3 | None | OS-4 (shares the diagnostics screen) |
| OS-4 | OS-3 | None |
| OS-5 | None | None |
| OS-6 | None | None |
| OS-7 | None | Later RS-4 principle on the permission banner |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Wave-1 P0 + sheet primitive | Med | AI-1 S, AI-2 M |
| Onboarding/settings/diagnostics | Med/High | OS-1 M, OS-3 M/L, OS-4 M, others M, AI-4 M, AI-3 S conditional |
| Verification | Low/Med | token-identity, test:web, a11y-parity |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Interaction | AI-1 focus-on-open; AI-2 back-dismiss on multiple sheets; OS-1 gate skipping | `test:web` |
| Unit | AI-3 move actions; OS-5 synonym match; OS-4 ring-buffer bound; OS-6 target-gate | Vitest |
| Fail-closed | OS-7 permission re-read on foreground; OS-2 Retry persistence | Vitest |
| Visual | token-identity 0-diff on the touched CSS | token-identity resolver |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| Shared Sheet primitive and `aria-hide-outside.svelte.ts` | Internal | Green | AI-2 pivots on it |
| `sheet-prompt-history.svelte` pattern | Internal | Green | AI-4 mirrors it |
| `auth.ts` `revokeDevice`/`logoutDevice`, `relay.ts` `getRelayHeartbeat` | Internal | Green | OS-2 queue, OS-3 probes |
| A future reorder UI | Internal | Deferred | AI-3 stays conditional |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A sheet that no longer dismisses correctly after AI-2, or a token-identity diff on a touched surface.
- **Procedure**: All changes are confined to `app-mobile/src/pages/{chat,enrollment,home,settings}/**` and `app-mobile/src/shared/{primitives,state,transport,commands,format}/**`. `git checkout -- app-mobile` restores the prior surfaces. Every new store is client-only localStorage; clearing its key removes it. No host contract is created, so nothing rolls back on the relay.
<!-- /ANCHOR:rollback -->
