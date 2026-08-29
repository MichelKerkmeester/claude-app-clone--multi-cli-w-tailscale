---
title: "Phase 4 implementation summary — accessibility, onboarding, and diagnostics (COMPLETE)"
description: "Client implementation of the eleven accessibility and onboarding findings: Find focuses its own input, every sheet inherits back-dismiss from the shared primitive, a quick-prompts sheet fills the draft without sending, onboarding skips decisions already made, a durable queue finishes an interrupted device removal, a bounded connection log feeds a streaming self-diagnostics screen, settings rows answer to synonyms, coach-marks fire once and never over an overlay, and the notification toggle can no longer claim a permission the OS has denied."
trigger_phrases:
  - "a11y onboarding implementation summary"
  - "a11y onboarding phase"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/004-a11y-onboarding"
    last_updated_at: "2026-08-28T14:40:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Shipped all eleven findings; three vacuous tests found by control and rewritten."
    next_safe_action: "Operator picks phase 005, the first heavily host-gated phase."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 implementation summary — accessibility, onboarding, and diagnostics

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Findings** | AI-1, AI-2, AI-3, AI-4, OS-1, OS-2, OS-3, OS-4, OS-5, OS-6, OS-7 (11) |
| **Commits** | `d4f1c24` |
| **Executors** | Six file-disjoint lanes in two waves: GPT-5.6 Luna at xhigh |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **Find focuses its own input.** `transcript-find-bar.svelte` no longer costs a second tap before the
  keyboard rises; the focus is deferred a frame because a same-frame focus on a just-appeared element is
  ignored on mobile.
- **Every sheet closes on the back gesture.** The pushState/popstate and focus-containment discipline moved
  out of the one sheet that had it and into `shared/primitives/sheet/sheet.svelte`, so all five inherit it.
  Only the topmost sheet closes, and the bespoke copy was deleted from `sheet-plan-review.svelte` rather
  than left to push a second history entry.
- **A quick-prompts sheet fills the draft and never sends.** `sheet-quick-prompts.svelte` inserts through
  `insert-slash-command.ts`; every control carries an accessible name, and unreadable storage yields an
  empty sheet rather than an error or a guessed list.
- **Onboarding cannot dead-end.** `onboarding-wizard.svelte` over `shared/state/onboarding-gates.ts` skips a
  decision already made, or a step that would be a no-op on this device, rather than showing a screen with
  nothing to do, and every choice reads as changeable.
- **An interrupted device removal finishes itself.** `shared/state/device-cleanup-queue.ts` survives a
  restart and surfaces a Retry card in the `screen-home.svelte` device footer; an unconfirmed removal is
  never reported as done.
- **A person can diagnose their own connection.** `shared/transport/connection-log.ts` is a bounded,
  reload-durable ring buffer feeding `pages/settings/screen-settings.svelte`, whose probes stream in as they
  resolve, with a structured Copy diagnostics blob that carries no credential material; a first pair that
  stalls fails visibly at the twenty five second ceiling in `screen-enrollment.svelte`.
- **Settings answer to the words people use**, through the static local synonym index in
  `shared/format/settings-search.ts`, with no host call.
- **Coach-marks fire once and never interrupt.** In `shared/state/tour-engine.svelte.ts` a step whose target
  is absent advances instead of stalling, and no mark renders over an open overlay.
- **The notification toggle cannot lie.** `push-settings.svelte` re-reads the real OS permission on focus and
  foreground; on denial the toggle disables and offers Open Settings, and the blocked notice fires once
  rather than on every focus.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Six executor lanes in two waves, partitioned by FILE OWNERSHIP rather than by theme: three separate tasks
wanted `screen-home.svelte`, `push-settings.svelte` and `auth.ts`, so a thematic split would have put several
agents in the same files. The second wave waited on the first because onboarding consumes the connection log
the first wave built. Eighteen negative controls were then run by hand — each broke a source, confirmed the
owning suite went red, restored it, and confirmed green again.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **Back-dismiss belongs to the primitive, not to each sheet.** Leaving the bespoke copy in place alongside
  the shared one would have pushed two history entries per open, so it was deleted in the same change.
- **The reorder helper ships unwired on purpose.** There is no drag-to-reorder surface yet. Inventing one to
  justify the helper would have been scope the phase did not ask for, so it is tested scaffolding and is
  recorded as such rather than being quietly presented as a working feature.
- **The diagnostics per-host ping is inert.** The existing heartbeat export takes no host parameter, so a
  true per-host probe cannot be built without a host field that does not exist. It is capability-gated and
  renders unavailable rather than inventing a result that would read as a real check.
- **Open Settings is disabled when no opener capability exists.** A web client cannot open OS settings on its
  own; a button that silently did nothing would be worse than one that is visibly unavailable.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `npm run typecheck -w @pi-remote/web` — 1192 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — 101 files / 726 passed + 3 skipped, and 65 files / 691 passed, from the final state.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` — `PASS: all 35 tokens.md goldens matched
  across light/dark/system`.
- `npx eslint` — exit 0 on changed files apart from four errors that are all pre-existing: three are the
  repo-wide `.svelte.ts` parser gap, proven by linting the untouched `app-state.svelte.ts`, and
  `sheet-plan-review.svelte:70` reproduces from pristine `HEAD` content.
- Eighteen negative controls across the phase's mechanisms, each confirmed red on break and green on restore.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **Three constraint tests were vacuous and were rewritten.** The blocked-toast test read the DOM before
  Svelte had applied the update, so it reported the value from mount and passed however many times the toast
  actually re-fired. The quick-prompts storage test spied `Storage.prototype`, which `window.localStorage`
  does not route through here, so the throw never happened and the assertion passed through the
  empty-storage branch instead. The first-pair ceiling test advanced its fake timers by the very constant it
  was checking, so a ceiling raised to an hour would have passed while the message kept claiming twenty five
  seconds. All three now fail when their behaviour changes.
- **The reorder helper is wired to nothing.** It is tested and correct, but no surface uses it until a
  drag-to-reorder UI lands.
- **Per-host diagnostics cannot really ping a host.** The check renders unavailable rather than passing,
  because the heartbeat it would use takes no host argument. It needs a host-side probe to become real.
- **Coach-mark overlay suppression is enforced at render, not at start.** Removing the guard from the start
  path alone changes nothing observable, because the visibility check already refuses to render over an open
  overlay. Only the combined guarantee is under test.
<!-- /ANCHOR:limitations -->
