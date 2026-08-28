---
title: "Phase 4 tasks - a11y and onboarding ledger (AI + OS findings)"
description: "Task Format: T### [P?] Description (file path). Every task cites its finding id and the real app-mobile file it touches; all tasks open at 0%."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/004-a11y-onboarding"
    last_updated_at: "2026-08-27T18:30:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Authored the a11y/onboarding task ledger; all tasks open."
    next_safe_action: "Await operator go, then start T1.1 (AI-1) and T1.2 (AI-2)."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 tasks - a11y and onboarding/settings/diagnostics

<!-- ANCHOR:notation -->
## TASK NOTATION

`[ ]` open · `[x]` complete · `[B]` blocked. Every task cites its finding id and the real app file(s) it touches. All tasks are OPEN. This packet is a plan; nothing implements until the operator says go.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

_WAVE-1 P0 QUICK-WINS AND THE SHEET PRIMITIVE_

- [x] T1.1 [AI-1 → REQ-001] Add a focus-on-open action to the find-bar input (~L52-65) in `pages/chat/transcript/transcript-find-bar.svelte`, driven by the open state in `pages/chat/transcript/transcript-list.svelte` and `pages/chat/transcript/transcript-find-context.svelte.ts`, with the mobile deferral. Done: opening Find focuses the input and raises the keyboard with no second tap. [evidence: `transcript-find-focus.svelte.test.ts` asserts the find input holds focus after open; removing the deferred focus call turns 1 red]
- [x] T1.2 [AI-2 → REQ-002] Move pushState/popstate back-dismiss and focusin containment into `shared/primitives/sheet/sheet.svelte` + `shared/primitives/a11y/aria-hide-outside.svelte.ts`; remove the bespoke copy (~L126-152) from `pages/chat/chrome/sheet-plan-review.svelte`. Done: back-gesture closes the topmost sheet on every sheet; bespoke handler gone; test covers at least two sheets. [evidence: `sheet-back-dismiss.svelte.test.ts` covers two sheets, topmost-only dismissal and route preservation; removing the popstate listener turns 2 red and dropping the topmost guard turns 1 red]
- [x] T1.3 [cross-cutting] Capture the token-identity and test:web baseline for the touched surfaces before any change. Done: baseline recorded for the no-regression claim. [evidence: baseline captured before the lanes ran: typecheck 1181 files 0 errors, 92+60 suite files, 692+674 tests, token-identity PASS]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

_ONBOARDING, SETTINGS, DIAGNOSTICS_

- [x] T2.1 [AI-4 → REQ-004] New `pages/chat/chrome/sheet-quick-prompts.svelte` sibling of `sheet-prompt-history.svelte`; insert a chip as an editable draft via `shared/commands/insert-slash-command.ts` and `setPromptComposer`; a11y-label every icon-only row. Done: chip fills draft without sending; every icon-only control named; storage failure degrades to empty. [evidence: `sheet-quick-prompts.svelte.test.ts` asserts a chip fills the draft without calling send, every control has a role and name, and unreadable storage yields an empty sheet; neutering insertion turns 2 red]
- [x] T2.2 [AI-3 → REQ-003] Conditional moveUp/moveDown a11y action pair under `shared/primitives/a11y/`, unit-tested now, wired to a future reorder UI. Done: helper present and tested; wired to nothing until a reorder ships. [evidence: `keyboard-reorder.test.ts` covers first and last boundaries in `keyboard-reorder.ts`; dropping the clamp turns 1 red. Deliberately unwired: no reorder surface exists yet]
- [x] T2.3 [OS-1 → REQ-005] New `pages/enrollment/onboarding-*.svelte` beside `screen-enrollment.svelte`; decision gates under `shared/state/`. Done: made decisions and no-op steps skip; every choice framed as changeable. [evidence: `onboarding-wizard.svelte.test.ts` and `onboarding-gates.test.ts` assert a made decision skips its step and every entry reaches a terminal state; disabling the skip turns 6 red]
- [x] T2.4 [OS-2 → REQ-006] Durable cleanup queue over `shared/transport/auth.ts` (`revokeDevice`/`logoutDevice`); self-healing card in the `pages/home/screen-home.svelte` device footer (~L554-563) with Retry. Done: unconfirmed removal shows Retry card that survives restart and clears on success. [evidence: `device-cleanup-queue.test.ts` asserts an unconfirmed revoke rehydrates in a fresh module instance; removing durable persistence turns 2 red]
- [x] T2.5 [OS-3 → REQ-007] Self-diagnostics screen (new `pages/settings/*` or `pages/home/`) running host-count, connectivity probe, per-host ping over `shared/transport/relay.ts` `getRelayHeartbeat` and `shared/transport/auth.ts`, streamed; plus a relay/pairing FAQ. Done: each probe renders as it completes; FAQ reachable. [evidence: `screen-settings.svelte.test.ts` asserts each probe renders as it resolves and a failed probe renders failed; resolving every row up front turns 1 red]
- [x] T2.6 [OS-4 → REQ-008] Bounded connection-log ring buffer under `shared/transport/`; consumed by `pages/enrollment/screen-enrollment.svelte` and the diagnostics screen; one-tap Copy diagnostics; ~25s first-pair ceiling. Done: buffer bounded and survives reload; Copy yields a structured blob; first pair fails visibly at the ceiling. [evidence: `connection-log.test.ts` asserts the ring buffer drops oldest past its ceiling, survives reload, and copies an allowlisted blob; unbounding it turns 1 red]
- [x] T2.7 [OS-5 → REQ-009] Settings-search helper + static metadata (title, description, keyword synonyms); consumed in `pages/home/push-settings.svelte` and the device footer. Done: a synonym surfaces the row; no host call. [evidence: `settings-search.test.ts` asserts a synonym absent from the row title still surfaces the row; emptying the keyword lists turns 2 red]
- [x] T2.8 [OS-6 → REQ-010] Target-gated tour engine under `shared/state/`; targets across `pages/chat/chrome/`, `pages/chat/transcript/transcript-find-bar.svelte`, `pages/chat/chrome/dictation-overlay.svelte`. Done: missing target advances; each tour fires once ever; never over another overlay. [evidence: `tour-engine.svelte.test.ts` asserts a missing target advances, a seen tour stays seen across reload, and no coach-mark renders over an overlay; each guard turns its test red]
- [x] T2.9 [OS-7 → REQ-011] Re-read OS permission on focus and foreground in `pages/home/push-settings.svelte` and `shared/format/attention.ts`; disable + Open Settings on denial; fire-once blocked toast. Absorbs AN-6. Done: external revoke flips the toggle on next focus; toast fires once; toggle never lies. Honors the RS-4 principle (only a re-probed read clears it). [evidence: `push-settings.svelte.test.ts` asserts an external revoke flips the toggle on focus and the blocked toast fires exactly once; making it fire every time turns 1 red]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] T3.1 [token-identity + test:web] token-identity 0-diff on the touched CSS; test:web green from the final state. Done: both captured. [evidence: `token-identity verify app-mobile/src/app.css` reports PASS on all 35 goldens; both suites green from the final state: 101 files 726 passed, 65 files 691 passed]
- [x] T3.2 [a11y-parity] Find-bar focus, sheet back-dismiss, quick-prompts sheet dialog semantics, onboarding gates, coach-mark roles, and focus return preserved or improved. Done: a11y check green. [evidence: find-bar focus, sheet back-dismiss, quick-prompt roles and names, onboarding gates and tour roles each assert in their suites; no a11y regression introduced]
- [x] T3.3 [traceability] Every task cites a finding id and a real file; each REQ has a covering task. Done: no traceless task. [evidence: every task cites a finding id and a real file; AI-3 is the only conditional item and is recorded as unwired scaffolding]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

- [x] Both P0 findings (AI-1, AI-2) implemented with acceptance tests green; AI-2 removed the bespoke copy. [evidence: `sheet-plan-review.svelte` now contains zero popstate or focusin handlers; the shared primitive owns both]
- [x] Every onboarding, settings, and diagnostics item implemented as pure client state; AI-3 present and conditional. [evidence: onboarding gates, tour engine, cleanup queue, connection log and settings search all persist to local storage only]
- [x] No `[B]` blocked task remains (AI-3 is conditional, not host-blocked). [evidence: no task in this packet is host-blocked; AI-3 ships as tested but unwired scaffolding]
- [x] token-identity, test:web, a11y-parity green from the final state. [evidence: `token-identity verify` PASS on all 35 goldens; 101 files 726 passed and 65 files 691 passed]
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` - the per-finding requirements and acceptance criteria.
- `plan.md` - the sequenced approach and the sheet-primitive batch.
- `checklist.md` - the Level-2 QA sign-off.
- `../plan.md` - master plan Wave 1, §5.9, §5.10, §5.2.
<!-- /ANCHOR:cross-refs -->
