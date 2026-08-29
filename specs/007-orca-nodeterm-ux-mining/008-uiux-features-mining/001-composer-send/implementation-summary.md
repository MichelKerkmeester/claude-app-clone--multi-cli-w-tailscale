---
title: "Phase 1 implementation summary — composer and send ledger (COMPLETE)"
description: "Client implementation of the seven composer/send findings: the textarea stays editable through transient locks, drafts and attachments park per session, an ambiguous send is held against the echoed turn before the draft returns, send delivery is modelled as accepted/rejected/unknown, a deferred error paints only in the session that raised it, repeated socket auth rejections budget to three before re-pairing, and the reusable-prompt intake ships inert behind an absent host catalog."
trigger_phrases:
  - "composer send implementation summary"
  - "composer send phase"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/001-composer-send"
    last_updated_at: "2026-08-28T05:00:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Shipped all seven findings across three commits; adversarial review fixed."
    next_safe_action: "Operator picks phase 002; the CI-5 picker surface waits on its host field."
    blockers:
      - "CI-5 renders nothing until the host exposes a reusable-prompt catalog (filed as REQ-008 in 007-host-requests)."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 1 implementation summary — composer and send ledger

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Findings** | CI-1, CI-2, CI-4, CI-5, RS-1, RS-2, RS-3 (7) |
| **Commits** | `bf796c4`, `5420112`, `75f27a5` |
| **Executor** | GLM 5.3 Flash at top thinking via cli-pi (Cline, then OpenRouter after the daily cap) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **The composer stays editable through every transient lock.** The textarea no longer disables when the
  connection drops or a snapshot syncs, so a reconnect blip mid-sentence cannot kill the field or dismiss the
  mobile keyboard. Only sending pauses, gated on the lock the parent screen already computes.
- **Drafts and attachments park per session.** Leaving a chat stores the raw draft and staged attachments
  under the session that owns them; returning restores them. A storage failure degrades to an empty draft
  rather than surfacing an error, and attachments are no longer wiped on a session change.
- **An ambiguous send is held, not assumed failed.** A refusal below 5xx restores promptly, but an
  unresolved outcome watches the transcript for the echoed turn for twenty seconds. A landed turn ends the
  watch with the draft still cleared; only a deadline with no echo hands the exact raw draft back.
- **Delivery is modelled honestly.** `submitPrompt` throws a tagged accepted / rejected / delivery-unknown
  outcome that survives a catch-and-rethrow, so callers can tell a refusal from a message that may have landed.
- **A send error belongs to its session.** The error carries the session that raised it, paints only while
  that session is live, and falls back to a toast when the composer banner has unmounted.
- **Socket auth rejections are budgeted.** Two rejections stay on reconnecting; the third flips to re-pairing.
- **The reusable-prompt intake ships inert.** It parses and session-scopes a host catalog, badges names offered
  by more than one source, and inserts a chosen entry as an editable draft that is never auto-sent. With no
  host field it renders nothing and invents no rows.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Three executor dispatches, each verified and committed separately: CI-4 + RS-1 (`bf796c4`), CI-1 + CI-2
(`5420112`), then RS-2 + RS-3 + CI-5 (`75f27a5`). Every dispatch was gated on typecheck, eslint over the
changed files, and both `test:web` suites confirmed by content, then handed to a fresh adversarial reviewer
that had not seen the executor's reasoning. Every executor-written constraint test was negative-controlled:
the source was broken, the test watched to go red, and the source restored.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The busy affordance moved off `:disabled`.** With the field deliberately editable, a not-allowed cursor
  and a hidden caret would have contradicted the fix; the busy state is a tinted surface with the text held at
  full contrast. A whole-element opacity fade was rejected — measured, it put the draft at 3.29:1, below AA.
- **An ending watch parks rather than restores.** Restoring inline would drop recovered text into whichever
  chat the person is looking at now, so an unresolved send surrenders its draft to its own session's park.
- **The rejection latch clears on a live stream, not on re-authentication.** Every reconnect completes a full
  challenge before its socket opens, so clearing on that reset the count before a rejection could accumulate —
  the latch could never trip and a revoked device would have retried forever.
- **A session switch no longer carries the draft across.** One pre-existing test asserted the opposite; that
  behaviour was the bleed this phase removes, so the test now asserts a clean incoming session and restore on
  re-entry.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `npm run typecheck -w @pi-remote/web` — 1169 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — 79 files / 640 passed + 3 skipped, and 47 files / 585 passed, from the final state.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css app-mobile/src/pages/chat/chrome/session-composer.svelte`
  — `verify PASS: all 35 tokens.md goldens matched across light/dark/system`.
- `npx eslint` — exit 0 on every changed file. Remaining errors in the stories file, `+layout.svelte`, the
  sync-close test, and the `.svelte.ts` parse failures were each proven pre-existing by linting a pristine
  `HEAD` copy.
- Adversarial review found a real defect in all three dispatches; each was fixed and covered by a regression
  that fails when the fix is reverted.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **CI-5 has no rendered surface.** What shipped is the data and guard layer: parsing, session scoping,
  duplicate-source badging, and insert-as-draft. No picker UI is wired into the composer, and none can be
  until the host exposes the catalog. Filed as REQ-008 in `../../007-host-requests/`.
- **A stale error can resurface on return.** An error scoped to session A is correctly hidden while the person
  is elsewhere, but re-entering A re-shows the already-seen banner without a new failure. Noted by review as a
  P2; not addressed here.
- **The deferred toast holds one slot.** Two abandoned sessions failing while the person is on a third means
  the first toast is replaced rather than queued. Documented as intentional in the module.
- **The lost-ack negative control ran after the fix, not before.** The executor wrote feature and tests
  together, so no pre-fix tree existed to run against; the symptom was reproduced by injection instead.
<!-- /ANCHOR:limitations -->
