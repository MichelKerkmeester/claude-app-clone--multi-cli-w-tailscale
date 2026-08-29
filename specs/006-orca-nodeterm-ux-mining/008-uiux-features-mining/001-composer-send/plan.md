---
title: "Phase 1 plan - composer/send over real files, quick-wins first, fail-closed"
description: "Sequenced approach for the composer and send-ambiguity findings: land the four Wave-1 P0 quick-wins (CI-4 editability, CI-1 keyed draft cache, CI-2 hold-before-restore, RS-1 three-outcome send) first, then RS-2 scope-safe deferred error and RS-3 rejection latch, then the host-gated CI-5 picker as an inert scaffold. Proven by token-identity 0-diff, test:web, a11y-parity from the final state."
trigger_phrases:
  - "composer send plan approach"
  - "composer send phase"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/001-composer-send"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the composer/send phase plan; quick-wins sequenced first."
    next_safe_action: "Await operator go, then build CI-4 and CI-1 as the first quick-wins."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 plan - composer/send

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

### Technical Context

| Aspect | Value |
|--------|-------|
| **Language/Stack** | TypeScript, Svelte 5 (runes), SvelteKit PWA |
| **Framework** | app-mobile client (host-authoritative, fail-closed) |
| **Storage** | Client-only localStorage/session-scoped for the draft cache; no host writes |
| **Testing** | Vitest (`test:web`), token-identity CSS resolver |

### Overview
Land the composer editability fix and the send-ambiguity mechanism as small changes over the real composer and transport files. The four Wave-1 P0 quick-wins ship first; RS-2 and RS-3 harden the deferred-error and reconnect paths; CI-5 is an inert scaffold pending a host skills catalog.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

### Definition of Ready
- [ ] Every finding maps to a REQ in spec.md with acceptance criteria.
- [ ] The composer token-identity and test:web baseline is captured before any change.
- [ ] The host dependency for CI-5 is noted in `../../007-host-requests/`.

### Definition of Done
- [ ] The four Wave-1 P0 findings each pass their acceptance test.
- [ ] CI-5 is inert with its catalog field absent; RS-2 and RS-3 carry regression tests.
- [ ] token-identity 0-diff on the composer CSS, test:web green, a11y-parity preserved, all from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The composer already fences a mutation path in `session-composer.svelte`; the send gate (`canSubmit`, the `inputLock` derivation in `streaming-derivations.ts`) already carries every lock. These findings sit around that seam.

**CI-4** narrows the `<textarea disabled>` predicate: the transient locks (`connection !== 'live'`, `awaitingSnapshot`, sending) move off the textarea and stay only on the send gate, so the keyboard is never yanked mid-typing. Confirm the send gate still refuses a send during each lock.

**CI-1** adds a small sessionId-keyed draft plus attachment cache under `shared/state/`. On leaving a chat the raw draft and staged attachments are parked; on return they are restored. `attachment-draft-provider.svelte` stops wiping attachments on `sessionId` change and instead reads the keyed cache; all reads are try/catch guarded.

**CI-2 plus RS-1** are one mechanism. `submitPrompt` in `relay.ts` tags each outcome `accepted | rejected | unknown`, reusing the existing `delivery-unknown` pattern (runtime-control/ask-question/slash already do this at ~L815/831); the ambiguity is tagged on the Error so it survives re-throw. `sendPrompt` in `screen-chat.svelte` holds an unknown outcome, watches the transcript for the echoed turn via epoch/optimistic reconcile, and restores the exact raw draft only after a 20 second deadline. Each outcome gets its own copy.

**RS-2** stamps each held send error with its `scopeKey` (sessionId) in a small held-error store, checks live scope before painting the `data-send-error-announcer` region, and falls back to a toast when the banner has unmounted.

**RS-3** counts consecutive E2EE-auth rejections in `use-sync-socket.svelte.ts`/`auth.ts`; the reconnect banner (via `state.ts connectionReducer`) flips to revoked/re-pair only on the third strike, and only a full auth clears the latch.

**CI-5** (host-gated) reuses a host-catalog shape analogous to `host-command-catalog.svelte.ts`: a picker that inserts a canned prompt as an editable draft with a collision/duplicate-source badge. Absent the catalog field the picker is inert; only the chrome and badge logic are built now against a fixture.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · Wave-1 P0 quick-wins
Land CI-4 (narrow the disabled predicate; confirm the send gate carries the lock), CI-1 (the keyed draft+attachment cache), then CI-2 plus RS-1 as the single ambiguous-send mechanism (three-outcome model in `relay.ts` `submitPrompt`, hold-before-restore in `screen-chat.svelte` `sendPrompt`). Capture the composer token-identity and test:web baseline first.

### Phase 2 · harden the send path
Add RS-2 (scope-safe deferred error, the natural follow-on in the same `sendPrompt` file) then RS-3 (rejection-budget latch across the socket/auth/banner state). Sequence RS-1 to CI-2 to RS-2 as the plan §8 ambiguous-send batch prescribes.

### Phase 3 · CI-5 scaffold and verification
Author the CI-5 picker as an inert host-gated scaffold with a fixture catalog. Run token-identity on the composer CSS, the send-outcome and latch regression tests, test:web, and the a11y-parity check. Confirm every task traces to a finding. Fix and re-run from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:phase-deps -->
## L2: PHASE DEPENDENCIES

Batching dependencies from master plan §8 that apply here:

- **Ambiguous-send batch** - CI-2 and RS-1 are one mechanism (three-outcome model plus hold-before-restore) in `screen-chat.svelte sendPrompt` and `relay.ts submitPrompt`. RS-2 is the natural follow-on in the same file. Sequence RS-1 to CI-2 to RS-2.
- **Draft-persistence batch** - CI-1 builds the keyed draft store so CI-3 (host `launchDraft` adopt, owned by phase 007) slots in when its host field lands. Build CI-1's store with that seam in mind.

| Finding | Depends On | Blocks |
|---------|------------|--------|
| CI-4 | None | None |
| CI-1 | None | Phase-007 CI-3 (shares the draft store) |
| RS-1 | None | CI-2 |
| CI-2 | RS-1 | RS-2 |
| RS-2 | CI-2 | None |
| RS-3 | None | Later RS-4 principle on the reconnect banner |
| CI-5 | Host skills-catalog RPC | None |
<!-- /ANCHOR:phase-deps -->

---

<!-- ANCHOR:effort -->
## L2: EFFORT ESTIMATION

| Phase | Complexity | Estimated Effort |
|-------|------------|------------------|
| Wave-1 P0 quick-wins | Med | CI-4 S, CI-1 M, CI-2+RS-1 M |
| Harden send path | Med | RS-2 M, RS-3 M |
| CI-5 scaffold + verify | Low/Med | CI-5 scaffold M (inert), verification |
<!-- /ANCHOR:effort -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

| Test Type | Scope | Tools |
|-----------|-------|-------|
| Unit | Three-outcome tagging in `submitPrompt`; RS-3 blip-sequence latch; RS-2 scope-mismatch | Vitest |
| Interaction | CI-4 keyboard-not-dismissed on reconnect; CI-1 draft restore on navigation; CI-2 held-outcome no-duplicate | `test:web` |
| Fail-closed | CI-5 inert with catalog absent | Vitest fixture |
| Visual | token-identity 0-diff on composer CSS | token-identity resolver |
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

| Dependency | Type | Status | Impact if Blocked |
|------------|------|--------|-------------------|
| `session-composer.svelte` send gate and `streaming-derivations.ts` | Internal | Green | CI-4 pivots on it |
| `relay.ts` `delivery-unknown` pattern | Internal | Green | RS-1 reuses it |
| Host skills-catalog RPC | External (host) | Red | CI-5 body inert until it lands |
| `shared/state/state.ts` storage helpers | Internal | Green | CI-1 draft cache and RS-2 store |
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

- **Trigger**: A send-path regression (duplicate send, dropped draft) or a token-identity diff on the composer.
- **Procedure**: All changes are confined to `app-mobile/src/pages/chat/**` and `app-mobile/src/shared/{transport,state,commands}/**`. `git checkout -- app-mobile` restores the prior composer. The draft cache is client-only localStorage; clearing its key removes it. No host contract is created, so nothing rolls back on the relay.
<!-- /ANCHOR:rollback -->
