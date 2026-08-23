---
round: 1
seat: seat-003
executor: native-explore
lens: holistic
status: ok
timestamp: "2026-08-23T09:35:00Z"
simulated: false
---

# Seat 003 — Mobile UX

## Verdicts

| Claim | Verdict | Decisive evidence |
|---|---|---|
| H1 tool-to-verb activity copy | partial | `RichContentRouter.svelte:37-52` has a per-kind title map but passes raw `toolName` through; live cue is the static `"Working…"` at `TranscriptList.svelte:244-256` |
| H1 escalating / stalled cue | absent | zero hits for `heartbeat\|stall\|lastActivity\|elapsed\|watchdog` in `state.ts`, `relay.ts`, `useSyncSocket.svelte.ts`, `Chat.svelte` |
| H1 per-part delta throttling | does-not-transfer | `types.ts:398-404` `SyncDelta` carries whole `envelopes`, never character deltas; coalescing is server-side |
| H2 disclosure key-churn hazard | absent (diagnosis wrong) | activity group id is `activity-${first.blockId}` from the protocol block id (`transcript-helpers.ts:48`, `normalizeTranscriptBlocks.ts:621`); the key does not change at finalization |
| H2 disclosure lost on scroll | **absent — real bug, different cause** | `TranscriptList.svelte:127,145` `overscan: 6` windowing vs in-component `open = $state(false)` at `NormalizedActivityGroup.svelte:30` and `CollapsedEvidence.svelte:29`; no external disclosure store exists |
| H2 chunk-safe think-tag parsing | does-not-transfer | relay delivers `ThinkingBlock{summary}` (`types.ts:616-619`); no raw tag reaches the client |
| H3 96px autoscroll + jump affordance | satisfied | `TranscriptList.svelte:94` (96px), `:151-169`, `:260-283`, badge `:279-281`, 44px target `:310-327` |
| H3 composer action precedence | satisfied; premise corrected | `SessionComposer.svelte:702-730` strict if/else-if chain. No voice control exists by design (`:9-11`) |
| H4a keyboard-settle deferral | does-not-transfer | `useVisualViewportAnchor.svelte.ts:62-85` rAF-coalesces `visualViewport` and adds a `pageshow` listener for iOS PWA restore |
| H4b repairable vs impossible copy | partial | `runtime-issues.ts:14-22`: 5/7 name a repair; `foreground-required` and `host-unavailable` read terminal but are not; repairability is not a modelled field |
| H5 transcript asymmetry | satisfied | `app.css:2150-2151, 2180-2200`; `TranscriptList.svelte:411-415` |
| H5 single slash parser | satisfied, exceeds ask | `useSlashTrigger.ts:49-66` single pure predicate; `ComposerCommandAutocomplete.svelte:22-35` twelve-state union |

## Missed by the sweep

1. **HIGH (contested in Round 2)** — hard abort unavailable while a draft exists.
   `SessionComposer.svelte:250` `showStop = running && !hasText && !hasAttachments && !attachmentSubmission.busy`;
   `stopRun` has one call site, `:707`, gated by `{#if showStop}` at `:702`.
2. **MEDIUM-HIGH** — disclosure state destroyed by scrolling (see H2 row). Migration-legal to fix.
3. **MEDIUM** — a healthy socket plus a wedged host renders "Relay live" and a pulsing "Working…"
   forever; nothing in the transcript is a function of time.

## Cargo-cult call-out

Four items are native muscle memory that the relay architecture already abstracts away: the 300ms
post-keyboard-hide deferral, chunk-safe think-tag parsing, per-part delta throttling, and the
"send/stop/voice" triad. Each assumes a platform event or transport shape this app does not have.
