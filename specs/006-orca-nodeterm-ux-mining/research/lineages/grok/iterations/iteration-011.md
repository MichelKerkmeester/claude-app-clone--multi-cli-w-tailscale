# Iteration 11: Permission overlay — heuristic TUI vs structured approval

## Focus
How orca mobile turns agent permission asks into tappable Allow/Deny, versus our host-ticketed Review / ask-question surfaces.

## Actions Taken
- Read `mobile-native-chat-permission.ts` (paused-state gate, heuristic patterns, `parseApprovalFromStatus`).
- Read `MobileNativeChatPermission.tsx` (primary = first option).
- Note view stack: Ask > permission > heuristic question.

## Findings

### F-ITER011-HEURISTIC Permission cards are often parsed from last-assistant TUI text, not a structured ticket
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-permission.ts:1:15]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-permission.ts:67:80]

Comment: there is **no structured permission event on mobile**. Detection fires only when agent state is `blocked`/`waiting` AND the text looks like an approval ask. Options' `send` is the **literal TUI string** (`"y"`, `"1"`, Escape).

**UX to copy:** tappable Allow/Deny instead of typing into the composer; first option is the filled primary.
**Constraint map:** inventing Allow/Deny from prose on our client would violate fail-closed (false positives send text the host never asked for). We already have host-ticketed Review.
**Verdict:** heuristic TUI scrape → **not portable**. Primary-vs-secondary button chrome over a **host ticket** → **drop-in view affordance**.

### F-ITER011-STATUS Structured `{ approval: { tool, summary } }` on `interactivePrompt` is the reliable host signal
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-permission.ts:19:57]

`parseApprovalFromStatus` JSON-parses the live envelope. Defaults: Allow sends `"1"`, Deny sends Escape. Heuristic numbered options still take precedence when the prompt text has them.

**UX to copy:** if the host emits a typed approval envelope, render a card from **that** object, not from nearby transcript prose.
**Constraint map:** we should request a typed approval DTO (we have Review tickets). Mapping orca's `"1"`/`Escape` into Pi is **not portable** (TUI keystrokes).
**Verdict:** typed approval envelope → **needs a new host field** only if Review does not already cover it. Keystroke sends → **not portable**.

### F-ITER011-PAUSE Never answer a working agent
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-permission.ts:67:69]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatPermission.tsx:19:29]

`PAUSED_STATES = blocked|waiting`. Submit is single-flight; rejected respond re-enables.

**UX to copy:** hide/disable permission chrome unless host status is waiting-on-human. Single-flight submit.
**Verdict:** **drop-in view affordance** over existing Review tickets.

## Questions Answered
Partial q-session-chat-nav (blocking prompt stack) and chat-gap "approvals".

## Ruled Out
- Client-side regex over the last assistant bubble as our source of truth for approvals.

## Dead Ends
- Looking for a dedicated mobile permission RPC — orca mobile comments that it does not exist.

## Sources Consulted
- specs/context/orca-main/mobile/src/session/mobile-native-chat-permission.ts:1
- specs/context/orca-main/mobile/src/session/MobileNativeChatPermission.tsx:7

## Assessment
- newInfoRatio: 0.76
- noveltyJustification: First pass on permission heuristic vs envelope; distinct from AskUserQuestion wizard.
- confidence: high.

## Reflection
- What worked and why: The file-header comment is the load-bearing negative finding.
- What did not work and why: Expected a structured mobile permission event like desktop.
- What I would do differently: Next, Electron prompt-history vs mobile absence.

## Recommended Next Focus
Electron native-chat composer prompt-history (ArrowUp/Down) versus mobile composer (ArrowUp is Send).
