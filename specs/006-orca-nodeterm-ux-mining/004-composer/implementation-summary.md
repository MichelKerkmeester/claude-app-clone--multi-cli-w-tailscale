---
title: "Phase 4 implementation summary — composer recommendation + dictation pipeline"
description: "Composer recommendation ledger (recs 4.1–4.8) and on-device dictation pipeline (ND-5.x). Orca recs shipped in prior pass; this pass delivers the net-new dictation overlay, setup sheet, permission gate, and pure seams."
trigger_phrases:
  - "composer implementation summary"
  - "composer packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/004-composer"
    last_updated_at: "2026-08-27T00:00:00.000Z"
    last_updated_by: "sk-code"
    recent_action: "Fixed dictation pipeline defects P0-P2: bind, leak, tests, a11y, permission"
    next_safe_action: "Phase complete; awaiting sign-off."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `006-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Complete |
| Requirements | REQ-001 … REQ-008 (T2.x shipped: all); ND-5.1–5.5, 5.7–5.9 shipped; ND-5.6 ⚠️ blocked |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

This phase delivers the full Angle 4 composer recommendation set (recs 4.1–4.8) plus the net-new on-device
dictation pipeline (ND-5.x). The orca recs (4.1, 4.3, 4.4, 4.5, 4.7, 4.8) were shipped in a prior pass;
this pass adds the remaining rec 4.6 (dictation) and the nodeterm dictation pipeline components.

### Rec 4.6 / ND-5.x — On-device Dictation Pipeline

**Engine:** browser-native Web Speech API (`window.SpeechRecognition` or `webkitSpeechRecognition`). No new
dependency, no bundled model. Host-hosted STT model states are rendered as fail-closed placeholders only.

**Pure seams (`shared/chrome/`):**
- `dictation-audio-level.ts` — RMS audio-level → equalizer-bar scaler (sqrt+gain curve, idle floor, ~20 Hz poll)
- `dictation-capture.ts` — Capture-mode state machine (toggle vs hold-to-talk, 400 ms accidental-tap cancel,
  STOP ≠ CANCEL)
- `dictation-permission.ts` — Permission gate (secure context, navigator.permissions, getUserMedia, actionable
  denial message, failed-start track teardown)

**Dictation overlay (`pages/chat/chrome/dictation-overlay.svelte`):**
- BATCH capture loop: record → STOP → transcribe whole take once (no streaming partial text)
- Live feedback: RMS audio-level equalizer + mm:ss elapsed clock
- Transcript written to draft via `setPrompt` — NEVER calls submit/sendPrompt
- STOP = transcribe+insert; CANCEL (Esc/×) = discard
- Generation guard: newer overlay instance never closed by older take
- Window blur cancels, session switch discards take
- Insert failure surfaced as "Could not insert"

**Dictation setup sheet (`pages/chat/chrome/sheet-dictation.svelte`):**
- Fail-closed: engine-status row, None/off row, language-hint select, placeholder model download states
- Per-locale language-hint select (auto-detect default, 12 languages), shown only when dictation ships
- Host-hosted model states are inert placeholders — no real download implemented

**Mic control (`pages/chat/chrome/composer-tools.svelte`):**
- Mic button in composer action row, always visible
- Tap-to-toggle (tap start, tap stop+insert) vs press-and-hold walkie-talkie (hold to record, release to
  stop+insert)
- Hold < 400 ms cancels quietly (accidental tap)
- Permission gate before first record: actionable denial + Settings deep-link, failed-start tears track down,
  secure context required
- When speech is unavailable, opens the setup sheet (not a toast)

**Integration in session-composer.svelte:**
- Dictation state (open, sheet open, mode, lang, availability, enabled)
- Handlers for tap, press, release, close, toggle, lang change
- Renders overlay and setup sheet
- DictationActive derived state passed to composer-tools

### Phase 3 barriers (T3.x)
- T3.1 (fail-closed): ⚠️ affordances inert; @-mentions blocked, paste-image gated, dictation never auto-sent
- T3.2 (token-identity + test:web): 0-diff, all green
- T3.3 (a11y-parity): preserved
- T3.4 (traceability): all tasks cite rec/ND ids
- T3.5 (dictation constraint): legal and fail-closed

### Exclusions (ND-5.9)
- Prompt-history, @-mentions, slash stay orca-owned (recs 4.4, 4.2, 4.3) — not re-proposed
- Composer maps Shift+Enter → newline vs Enter → send (unchanged)
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

1. **Pure seams:** extracted as tested pure functions under `shared/chrome/`
2. **Components:** built as Svelte 5 runes components under `pages/chat/chrome/`
3. **Integration:** wired into existing `session-composer.svelte` and `composer-tools.svelte`
4. **Tests:** pure logic tests + Svelte component tests proving constraint proofs
5. **Verification:** typecheck, test:web:logic, test:web:svelte, lint, source-gates all pass
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Engine choice: Web Speech API.** The on-device STT engine is the browser-native Web Speech API
(`window.SpeechRecognition || window.webkitSpeechRecognition`). No new dependency, no bundled model.
Host-hosted STT model states are rendered as fail-closed placeholders — never a dead mic.

**Batch capture, not streaming.** The overlay records the whole take, then on STOP transcribes it once.
No streaming partial text, so there is no partial/final reconcile. The only live feedback is the RMS
equalizer + mm:ss clock.

**Transcript via setPrompt, never submit.** The transcript is written to the composer draft via `setPrompt`
and routed through the same `canSendMessage` send-gate — identical trust to typing. The overlay has no
submit/sendPrompt concept.

**Fail-closed on unavailable.** When Web Speech is absent, the mic button still renders but opens the
setup sheet explaining the situation. Never a dead mic, never a dead toast.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `npm run typecheck` (web) | 0 errors |
| `npm run test:web:logic` | 38 files, 444 tests passed |
| `npm run test:web:svelte` | 76 files, 603 tests passed |
| `npx eslint` on changed files | 0 errors |
| Source gates (token-identity, etc.) | all PASSED |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- T2.14 (ND-5.6): ⚠️ Host STT audio→host RPC is BLOCKED on host STT (`007-host-requests`). Not built.
- T2.8: @-file mentions are BLOCKED — inert without host RPC.
- Dictation test suite has 1 flaky test under full-suite load (jsdom CPU contention); runs reliably with
  per-test 15s timeout.
<!-- /ANCHOR:limitations -->