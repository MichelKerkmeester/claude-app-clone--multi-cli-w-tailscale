---
title: "Phase 4 - Accessibility and onboarding/settings/diagnostics"
description: "Plan the accessibility and onboarding/settings/diagnostics findings over the real app-mobile files, host-authoritative and fail-closed. Ships the Wave-1 quick-wins (autofocus the find-bar, move back-gesture sheet-dismiss into the shared Sheet primitive) plus a saved quick-prompts library, a dead-end-proof onboarding wizard, self-healing cleanup, in-app diagnostics, searchable settings, contextual coach marks, and a permission toggle that never lies. All client-side, no host field."
trigger_phrases:
  - "a11y onboarding spec requirements"
  - "a11y onboarding phase"
  - "spec requirements"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/004-a11y-onboarding"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Shipped all eleven accessibility and onboarding findings."
    next_safe_action: "Await operator go, then implement the two Wave-1 P0 quick-wins (AI-1, AI-2) first."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 - Accessibility and onboarding/settings/diagnostics

> **Phase links** - Parent: [`../spec.md`](../spec.md) · Master plan: [`../plan.md`](../plan.md) (Wave 1, §5.9, §5.10, §5.2) · Findings: [`../research/findings-registry.json`](../research/findings-registry.json)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Priority** | P0 |
| **Status** | Complete |
| **Created** | 2026-08-27 |
| **Findings owned** | AI-1, AI-2, AI-3, AI-4, OS-1, OS-2, OS-3, OS-4, OS-5, OS-6, OS-7 (11) |
| **Constraint** | Host-authoritative, fail-closed. The client owns no editable session truth |
| **Client vs host** | 11 client-ready-now; no host field required |
| **Phase chain** | after `003-home-switcher-nav-search` · before `005-host-inbox-notifications` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

### Problem Statement
Two verified accessibility gaps cost every user a tap or a lost gesture: the find-bar input has no focus-on-open, so every Find in transcript costs an extra tap before the keyboard appears, and only one of five chat sheets closes on the hardware back-gesture so the other four fall through to real navigation. Alongside these, the onboarding, settings, and diagnostics surfaces are thin: there is no dead-end-proof wizard, no self-healing after a host removal, no in-app diagnostics, no searchable settings, no just-in-time feature discovery, and a permission toggle that can silently lie about being in effect.

### Purpose
Land the two Wave-1 accessibility quick-wins first, then build the onboarding, settings, and diagnostics surface so first-run, recovery, and self-service paths never dead-end. Every item is pure client state or interaction, so nothing here reads or writes host truth.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

### In Scope
- AI-1: autofocus the find-bar input on open, with the mobile deferral so the keyboard appears without an extra tap.
- AI-2: move the back-gesture close-the-topmost-sheet discipline (pushState/popstate plus focus containment) into the shared Sheet primitive so all sheets inherit back-dismiss.
- AI-3 (conditional): a non-gesture moveUp/moveDown a11y equivalent that ships with any future drag-to-reorder UI.
- AI-4: a saved quick-prompts library of one-tap chips inserted as an editable draft, with an a11y label on every icon-only row.
- OS-1: a dead-end-proof, dynamically-gated onboarding wizard that shows only outstanding decisions and frames every choice as changeable.
- OS-2: a self-healing pending-cleanup card in Settings after a host removal, with a durable queue and Retry.
- OS-3: an in-app self-diagnostics screen (host-count, connectivity probe, per-host ping) plus a relay/pairing FAQ.
- OS-4: a persistent bounded connection-log ring buffer plus one-tap Copy diagnostics, and a ceiling on the first pairing attempt.
- OS-5: searchable, keyword-tagged settings rows over title, description, and keyword synonyms.
- OS-6: target-gated contextual coach marks that only ever point at a real, currently-visible element.
- OS-7: a permission-backed toggle that re-reads OS permission on focus and foreground and never lies about being in effect (absorbs AN-6).

### Out of Scope
- Any host field or RPC. This phase is entirely client-side.
- The drag-to-reorder UI itself. AI-3 ships only alongside a future reorder surface (favorites/pin reorder) and is conditional until then.
- This-session prompt-history recall (owned by `sheet-prompt-history.svelte`). AI-4 quick-prompts are local-only and distinct from it.
- The notification/push contract (phase 005) and usage/change-review surfaces (phase 006). OS-7 only reads the OS permission state, not a host field.
- Any client-owned or client-edited session truth.

### Files to Change

| File Path | Change Type | Description |
|-----------|-------------|-------------|
| `app-mobile/src/pages/chat/transcript/transcript-find-bar.svelte` | Modify | AI-1: focus-on-open action on the input (~L52-65) with the mobile deferral |
| `app-mobile/src/pages/chat/transcript/transcript-list.svelte` | Modify | AI-1: find-bar open state that triggers the focus |
| `app-mobile/src/pages/chat/transcript/transcript-find-context.svelte.ts` | Modify | AI-1: open-state source for the focus action |
| `app-mobile/src/shared/primitives/sheet/sheet.svelte` | Modify | AI-2: absorb pushState/popstate back-dismiss and focus containment into the shared primitive |
| `app-mobile/src/shared/primitives/a11y/aria-hide-outside.svelte.ts` | Modify | AI-2: focusin containment for the dismissed sheet |
| `app-mobile/src/pages/chat/chrome/sheet-plan-review.svelte` | Modify | AI-2: remove the bespoke back-dismiss copy (~L126-152) now that the primitive owns it |
| `app-mobile/src/shared/primitives/a11y/` (new moveUp/moveDown helper) | Create | AI-3: non-gesture reorder a11y actions, conditional on a future reorder UI |
| `app-mobile/src/pages/chat/chrome/sheet-quick-prompts.svelte` | Create | AI-4: saved quick-prompts sheet, sibling of `sheet-prompt-history.svelte` |
| `app-mobile/src/shared/commands/insert-slash-command.ts` | Modify | AI-4: insert a chip as an editable draft via `setPromptComposer` |
| `app-mobile/src/pages/enrollment/onboarding-*.svelte` (new) | Create | OS-1: dynamically-gated onboarding wizard beside `screen-enrollment.svelte` |
| `app-mobile/src/shared/state/` (onboarding gates, tour engine) | Create | OS-1 gates; OS-6 tour engine |
| `app-mobile/src/shared/transport/auth.ts` | Modify | OS-2: durable cleanup queue over `revokeDevice`/`logoutDevice` |
| `app-mobile/src/pages/home/screen-home.svelte` | Modify | OS-2: surface the cleanup card in the device footer (~L554-563) |
| `app-mobile/src/shared/transport/relay.ts` | Modify | OS-3: connectivity/per-host probes over `getRelayHeartbeat` |
| `app-mobile/src/pages/settings/` or `pages/home/` diagnostics screen (new) | Create | OS-3: self-diagnostics screen and FAQ |
| `app-mobile/src/shared/transport/` (new ring buffer) | Create | OS-4: bounded connection-log ring buffer plus first-pair ceiling |
| `app-mobile/src/pages/enrollment/screen-enrollment.svelte` | Modify | OS-4: consume the ring buffer and the first-pair timeout |
| `app-mobile/src/pages/home/push-settings.svelte` | Modify | OS-5 settings-search host; OS-7 permission re-read on focus/foreground |
| `app-mobile/src/shared/format/attention.ts` | Modify | OS-7: push subscribe/foreground permission re-check |
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

### P0 - Blockers (Wave-1 verified quick-wins)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-001 | [AI-1] The find-bar input receives focus when the bar opens, using the mobile deferral so the keyboard appears without an extra tap. | Opening Find in transcript focuses the input and raises the keyboard with no second tap; a test asserts focus lands on `#transcript-find-input` on open. |
| REQ-002 | [AI-2] The pushState marker, popstate interception, and focus containment move into the shared Sheet primitive so every sheet (dictation, leave-plan, model-effort, prompt-history, plan-review) closes the topmost sheet on the back-gesture instead of navigating away. The bespoke copy leaves `sheet-plan-review.svelte`. | A hardware/browser back with any sheet open closes that sheet, not the screen; the bespoke handler is removed from `sheet-plan-review.svelte`; a test covers back-dismiss for at least two sheets. |

### P1 - Required (complete OR user-approved deferral)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| REQ-003 | [AI-3, conditional] A non-gesture moveUp/moveDown a11y action pair exists for any drag-to-reorder UI, so screen-reader and motor-impaired users are not locked out. Ships with the first reorder surface. | When a reorder UI exists, each item exposes moveUp/moveDown actions with correct aria and focus retention; absent a reorder UI, the helper is present and unit-tested but wired to nothing. |
| REQ-004 | [AI-4] A saved quick-prompts sheet lists local one-tap chips; selecting one inserts it as an editable draft (never auto-sends); every icon-only row carries an a11y label. Local-only, no host. | Picking a chip fills the composer draft without sending; every icon-only control has an accessible name; storage failure degrades to an empty library, never an error. |
| REQ-005 | [OS-1] A dynamically-gated onboarding wizard shows only outstanding decisions, skips a step whose action would be a no-op (an OS-denied permission), and frames every choice as changeable. Pure local gates. | A user with a decision already made never sees that step; a denied-permission step is skipped, not dead-ended; every choice screen states it can be changed later. |
| REQ-006 | [OS-2] After a host removal that cannot confirm cleanup, a self-healing pending-cleanup card appears in Settings with a durable queue and Retry, never a silent orphaned secret. | An unconfirmed removal shows a Retry card in the device footer; Retry re-runs the queued cleanup; the queue survives an app restart; success clears the card. |
| REQ-007 | [OS-3] An in-app self-diagnostics screen runs host-count, a connectivity probe, and a per-host ping, streamed as they complete, plus a relay/pairing FAQ. No host field. | Each probe renders its result as it completes rather than after all finish; the FAQ is reachable from the screen; a failed probe shows an actionable message. |
| REQ-008 | [OS-4] A persistent bounded connection-log ring buffer plus a one-tap Copy diagnostics blob, and a ceiling of about 25 seconds on the first pairing attempt (distinct from infinite live retry). | The ring buffer is bounded and survives a reload; Copy diagnostics yields a structured clipboard blob; the first pairing attempt fails visibly at the ceiling instead of spinning forever. |
| REQ-009 | [OS-5] Settings rows are searchable in one box over title, description, and hidden keyword synonyms (for example revoke maps to qr). Static client metadata. | Typing a synonym surfaces the matching row; the search reads only static client metadata; no host call is made. |
| REQ-010 | [OS-6] Contextual coach marks only ever point at a real, currently-visible element, advance past a missing target, fire once per tour, and never fight another overlay. Pure client state. | A coach mark whose target is absent advances rather than pointing at nothing; each tour fires at most once ever; a coach mark never renders over an open sheet. |
| REQ-011 | [OS-7] A permission-backed toggle re-reads OS permission on focus and foreground, disables with an Open Settings action on denial, and fires a one-time OS-silently-blocked-us toast (absorbs AN-6). | A permission revoked outside the app flips the toggle to disabled with Open Settings on the next focus; the blocked toast fires at most once; the toggle never claims to be in effect when the OS denied it. |
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- **SC-001**: Every task in `tasks.md` cites its finding id and the real app-mobile file it touches; no task is traceless.
- **SC-002**: The two Wave-1 P0 findings (AI-1, AI-2) ship as pure interaction with a regression test each, and AI-2 removes the bespoke copy from `sheet-plan-review.svelte`.
- **SC-003**: Every onboarding, settings, and diagnostics item is pure client state, and AI-3 is clearly marked conditional on a future reorder UI.
- **SC-004**: token-identity resolves 0 diffs on the touched surfaces, test:web is green, and the a11y contract (focus, roles, dismissal, live regions) is preserved and, for AI-1/AI-2, improved, all from the final state.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

| Type | Item | Impact | Mitigation |
|------|------|--------|------------|
| Risk | AI-2 primitive regression | High: moving back-dismiss into the shared Sheet could break sheets that never had it | Land AI-2 first; test back-dismiss on every sheet; keep focus containment intact |
| Risk | AI-1 focus timing | Med: focusing before mount could no-op or fight the virtualized list | Use the mobile deferral (runAfterInteractions style) and assert focus post-open |
| Risk | OS-7 permission drift | Med: a toggle that lies erodes trust | Re-read on focus and foreground; disable with Open Settings on denial; note the RS-4 principle below |
| Risk | OS-6 overlay collision | Low: a coach mark over a sheet is worse than none | Gate on a real visible target and never over another overlay |
| Dependency | A future reorder UI (AI-3) | AI-3 stays conditional until it exists | Build and unit-test the helper now; wire it when a reorder ships |

**Design note (RS-4 principle):** the RS-4 rule (excluded at the parent, never optimistically clear a warning banner) applies to the OS-7 permission banner. Only a re-probed permission read clears the disabled state; opening Settings must never imply the permission was granted.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## L2: NON-FUNCTIONAL REQUIREMENTS

### Performance
- **NFR-P01**: The settings search and the coach-mark target scan run on client metadata and add no perceptible frame cost on open.

### Security
- **NFR-S01**: The quick-prompts library, onboarding gates, tour state, and connection log are client-only and never reach the host; the Copy diagnostics blob carries no secret material.

### Reliability
- **NFR-R01**: Every persisted store (quick-prompts, cleanup queue, ring buffer, tour state) is try/catch guarded and degrades to an empty state, never an error.
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## L2: EDGE CASES

### Data Boundaries
- Empty quick-prompts library: the sheet shows an empty state, never an error.
- Ring buffer full: the oldest entries drop; the buffer never grows unbounded.

### Error Scenarios
- Cleanup Retry still fails: the OS-2 card stays with a clear retry-again state, never silently clears.
- First pairing exceeds the ceiling: OS-4 fails visibly with a diagnostics path rather than spinning.

### State Transitions
- Permission revoked while backgrounded: OS-7 flips the toggle to disabled on the next foreground.
- Coach-mark target scrolled off: OS-6 advances past it rather than pointing at empty space.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## L2: COMPLEXITY ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scope | 16/25 | 11 findings across transcript, sheets, enrollment, settings, diagnostics; many new files |
| Risk | 10/25 | AI-2 touches a shared primitive; no schema/breaking change; all client-side |
| Research | 6/20 | Paths grounded; OS-1/OS-3 surfaces are new and need layout design |
| **Total** | **32/70** | **Level 2** |
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- Where does the diagnostics/settings screen live, under a new `pages/settings/` route or inside `pages/home/`? OS-3, OS-4, and OS-5 all target it.
- Does a reorder UI (favorites/pin reorder) land in this packet or later? AI-3 stays conditional until one exists.
<!-- /ANCHOR:questions -->
