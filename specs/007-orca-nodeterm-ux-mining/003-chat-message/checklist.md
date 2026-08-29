---
title: "Phase 3 checklist — chat message/transcript interactions barrier"
description: "Barrier sign-off for the message-level chat affordances (recs 3.1-3.6, 6.6) and the 3.7 exclusions: fail-closed, scoped selection, inert-vs-routed links, token-identity 0-diff, a11y-parity, and test:web green. Implemented."
trigger_phrases:
  - "chat message verification checklist"
  - "chat message packet"
  - "verification checklist"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/003-chat-message"
    last_updated_at: "2026-08-26T22:10:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Shipped find bar, five-state load, copy receipts, and native tool folds"
    next_safe_action: "None — snapshot find stays local until a host search RPC lands"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. These affordances are
proven by a fail-closed review (no client-owned session truth; scoped selection; inert-vs-routed links), a
value oracle (token-identity), an a11y-parity check, and `test:web` — not by a line diff. The fail-closed
barrier is authoritative: it is the one that catches a control that would let the client edit session truth
or open an unauthorized file.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P0] The token-identity and `test:web` baselines are captured from the pre-change
  transcript surfaces. [rec: 3.1-3.6, 6.6]
  Evidence: sibling card-polish closed at svelte 72/577+3 skipped, logic 29/308; this phase ends at svelte
  75/591+3 skipped, logic 32/313; `token-identity.mjs verify` still matches 35/35 goldens.
- [x] **CHK-PRE-02** [P0] The reusable seams are confirmed present and correct (`use-copy-feedback.svelte.ts`,
  the artifact viewer context, the `sendSlashDraft` lane, the `sheet-model-effort.svelte` pattern, the
  transcript roots). [rec: 3.2-3.6, 6.6]
  Evidence: `use-copy-feedback.svelte.ts:75`; `screen-chat.svelte:363` `dispatchSlashDraft`;
  `transcript-selection.ts:13` scopes to the transcript root.
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] The per-turn scroll control (3.1) is distinct from the jump-to-latest FAB and does
  not mutate blocks or live-edge follow-state. [rec: 3.1]
  Evidence: `transcript-list.svelte:159` `scrollTurnToTop` only calls `scrollToIndex`; follow-state is
  untouched (`transcript-list.svelte:143` `followToBottom` remains the FAB path).
- [x] **CHK-CQ-02** [P0] The flat tool-run recast (3.4) keeps the grouping a pure projection — call↔result
  pairing and in-flight state derive from the existing grouping, not new session state. [rec: 3.4]
  Evidence: `tool-run-pairing.ts:50` `pairActivityRuns` is a pure function over normalized activity blocks.
- [x] **CHK-CQ-03** [P1] Copy paths (3.2, 3.3) reuse `use-copy-feedback.svelte.ts`; Copy is unavailable (not
  faked) when the clipboard API is absent; the tint confirm does not shift layout. [recs: 3.2, 3.3]
  Evidence: `use-copy-feedback.svelte.ts:116` `canCopy` getter; `assistant-actions.svelte:34` `is-copied` class.
- [x] **CHK-CQ-04** [P0] The find bar (ND-4.1) drives a flat line index decoupled from the virtualized DOM,
  lowercased once per snapshot; `next()` / `prev()` scroll the `@tanstack/svelte-virtual` list to an
  off-screen match and highlight it via `<mark>`, never relying on browser find. [rec: ND-4.1]
  Evidence: `transcript-find-index.ts:104` `buildTranscriptFindIndex`; wrap `transcript-find-index.ts:161`;
  `transcript-find-bar.svelte.test.ts:102` records `scrollToIndex` for an off-screen hit.
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P0] token-identity resolves 0-diff vs baseline for the new controls and the flat
  recast across the three themes. [recs: 3.1, 3.2, 3.3, 3.4]
  Evidence: `node scripts/token-identity.mjs verify app-mobile/src/app.css` — 35/35 goldens matched
  light/dark/system.
- [x] **CHK-TEST-02** [P0] `test:web` passes from the final state (verified by content — both suite summaries
  present — not by a piped tail exit code). [recs: 3.1-3.6, 6.6]
  Evidence: svelte Test Files 75 passed, Tests 591 passed | 3 skipped; logic Test Files 32 passed,
  Tests 313 passed.
- [x] **CHK-TEST-03** [P1] The component stories for the touched surfaces still mount and render. [recs: 3.1,
  3.2, 3.4]
  Evidence: `tool-fold.stories.ts:1`, `transcript-find-bar.stories.ts:1`, `transcript-load-panel.stories.ts:1`,
  `menu-transcript-action.stories.ts:1` use real fixtures.
- [x] **CHK-TEST-04** [P0] token-identity resolves 0-diff and `test:web` passes from the final state for the
  ND-4.x controls — find bar, quantified copy receipt, native `<details>` folding, and the 5-state load
  state. [recs: ND-4.1, ND-4.2, ND-4.6, ND-4.7]
  Evidence: `transcript-find-bar.svelte.test.ts:102`; `copy-receipt.svelte.test.ts:17`;
  `transcript-load-state.svelte.test.ts:79`; token-identity 35/35.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P0] Selection-copy (3.5) is disabled on empty selection and copies only when the
  selection is anchored inside `.transcript--frame`; a foreign selection is never copied as this session's.
  [rec: 3.5]
  Evidence: `transcript-selection.ts:17` empty → `inside: false`; `transcript-selection.ts:24` `root.contains`.
- [x] **CHK-FIX-02** [P0] Every rec 3.1-3.6 and 6.6 is implemented against its cited file(s) and the 3.7
  exclusions are recorded; every task traces to a rec. [recs: 3.1-3.7, 6.6]
  Evidence: `tasks.md` T2.1–T2.15 `[x]`; 3.7 recorded at `implementation-summary.md:58`.
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] Fail-closed: no client-owned session truth. REC 3.6 only dispatches existing host
  slash-commands via `sendSlashDraft`; no rename/pin/archive/edit writes local session metadata. [rec: 3.6]
  Evidence: `screen-chat.svelte:407` forwards `/${name}` only; `session-header.svelte:336` disables unknown names.
- [x] **CHK-SEC-02** [P0] REC 6.6: a file/link tap opens the artifact viewer only for a host-supplied stable
  reference; a markdown path / local URI / image URL is never read directly, and an unresolved link is inert
  "unavailable". [rec: 6.6]
  Evidence: `prose-link.ts:53`; `prose-link.test.ts:23` `file:` → unavailable; `prose-link.ts:71` requires a ref.
- [x] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is touched; changes stay under
  `app-mobile/src/pages/chat/`. [recs: 3.1-3.7, 6.6]
  Evidence: packet edits are `specs/007-orca-nodeterm-ux-mining/003-chat-message/*.md` plus `app-mobile/` chat
  sources; `specs/context/**` left untracked and unread.
- [x] **CHK-SEC-04** [P0] A `missing` / `unsupported` / `error` transcript (ND-4.7) never renders as an empty
  conversation, and a reload never blanks a rendered `ok` thread. [rec: ND-4.7]
  Evidence: `transcript-load-state.svelte.test.ts:79` missing; `:91` unsupported; `:103` error; hold
  `transcript-load-state.test.ts:75`.
- [x] **CHK-SEC-05** [P0] A prose file-path (ND-4.4) stays inert "unavailable" unless routed through the
  artifact viewer with a host-supplied reference; a URL opens external; a local path / URI is never resolved
  directly. [rec: ND-4.4]
  Evidence: `safe-markdown.svelte.test.ts:67` https `<a>` vs `./README.md` span; `:85` no `file:` href.
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh <packet> --strict` exit 0 through its realpath. [recs: 3.1-3.7, 6.6]
  Evidence: `bash $(realpath .opencode/skills/system-spec-kit/scripts/spec/validate.sh)
  specs/007-orca-nodeterm-ux-mining/003-chat-message --strict` exit 0, Errors: 0 Warnings: 0.
- [x] **CHK-DOC-02** [P1] No spec path or artifact id is introduced in any code comment (comment hygiene).
  [recs: 3.1-3.6, 6.6]
  Evidence: `run-source-gates.sh` comments guard PASS; `scan-comments.mjs` commentedOutCodeLines 0.
- [x] **CHK-DOC-03** [P2] The two ⚠️ edges (host-title rename RPC, a new authorized artifact reference) are
  recorded as fail-closed fallbacks with a pointer to `007-host-requests`. [recs: 3.6, 6.6]
  Evidence: `implementation-summary.md` KNOWN LIMITATIONS names both ⚠️ edges and `007-host-requests`.
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] a11y-parity is preserved on every new control (label, focus order, disclosure
  roles, dismissal, live regions); the action sheet reuses the established sheet a11y pattern. [recs: 3.1,
  3.2, 3.4, 3.5, 3.6]
  Evidence: `transcript-find-bar.svelte:53` `role="search"`; `menu-transcript-action.svelte:67` `hideOutside`;
  `menu-transcript-action.svelte:73` Escape.
- [x] **CHK-ORG-02** [P2] Each affordance is additive and independently revertible; no unrelated transcript
  surface is refactored. [recs: 3.1-3.6, 6.6]
  Evidence: new files live beside `transcript-list.svelte`; reducer in `shared/state/state.ts` untouched.
- [x] **CHK-ORG-03** [P1] a11y-parity is preserved on the find bar and the action menu (label, focus order,
  disclosure roles, dismissal, live regions); every ND-4.x task traces to a finding. [recs: ND-4.1, ND-4.8]
  Evidence: `transcript-find-bar.svelte:62` `aria-keyshortcuts`; `menu-transcript-action.svelte:112`
  Dismiss backdrop.
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

Implemented and verified. Recs 3.1-3.6 and 6.6 plus ND-4.1-4.8 hold fail-closed (no client-owned session
truth, scoped selection, inert-or-routed file-links, five-state load never empty). token-identity matched
35/35 goldens. `test:web` svelte 75/591+3 skipped and logic 32/313. The 3.7 set except in-conversation
search remains recorded as backlog.
<!-- /ANCHOR:summary -->
