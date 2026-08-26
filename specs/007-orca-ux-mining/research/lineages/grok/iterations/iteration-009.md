# Iteration 9: In-chat nav — jump-to-latest, load-earlier, chat/terminal view, lock settle

## Focus
Session→chat navigation inside native-chat: live-edge follow, jump-to-latest FAB, pagination of earlier messages, per-tab chat vs terminal override, input-lock settle timer.

## Actions Taken
- Read `MobileNativeChatView.tsx` scroll, FAB, load-earlier, lock settle, sendError live region.
- Read `use-mobile-session-view-mode.ts` (device default + per-tab override, fail-closed on unreadable store).

## Findings

### F-ITER009-LIVE Live-edge follow is `atBottom` gated; jump-to-latest is a FAB only when scrolled up
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:166]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:227:237]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:295:350]

`atBottom` = distanceFromBottom < 80. `onContentSizeChange` auto-scrolls only if still at bottom. FAB "Scroll to latest" when `!atBottom`. Per-message up-arrow is turn-nav; FAB is list-nav. Comment: scroll-to-top moved to per-message controls.

**UX to copy:** we already have jump-to-latest + unread-count. Portable split: **FAB = latest**, **per-turn arrow = this message**. Unread-count on the FAB is our extra; orca FAB has no unread badge.
**Verdict:** **drop-in view affordance**. Adding unread-count on FAB is our existing feature, not an orca copy.

### F-ITER009-PAGE Load-earlier fires near the top (`contentOffset.y < 60`) and as an explicit header button
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:57:59]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:232:235]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:316:325]

Host `hasMore` + `onLoadEarlier`. Tests in `mobile-native-chat-stream-frame.test.ts` guard against double-prepending pages.

**UX to copy:** pagination is host-authoritative (`hasMore` from transcript RPC). Auto-load on scroll-up plus a visible "Load earlier messages" control.
**Constraint map:** without a host page token, inventing earlier messages from a client cache of a previous visit would violate fail-closed if epochs differ.
**Verdict:** chrome → **drop-in**. Actual pages → **needs a new host field** if our transcript API is snapshot-only (we already virtualize a full snapshot — if the host always sends the whole redacted transcript, load-earlier is unnecessary).

### F-ITER009-VIEW Chat vs terminal is a **device** preference overlay, fail-closed if the override store is unreadable
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-session-view-mode.ts:47:49]
[SOURCE: specs/context/orca-main/mobile/src/session/session-view-opt-in-gate.test.ts:41]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-session-view-mode.ts:103]

Per-tab override pins chat/terminal regardless of later default. Unreadable store cannot be treated as empty.

**UX to copy:** we don't have a terminal pane. Portable: **per-session UI mode** (e.g. transcript vs artifacts) as device-local overlay is OK; fail-closed if prefs cannot be read (don't assume "no overrides").
**Verdict:** device-local view mode → **drop-in**. Copying terminal/chat split → **not portable** (we have no PTY).

### F-ITER009-LOCK 600ms settle on lock edges so a dead PTY cannot flash the composer enabled
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:36]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:262:273]

`INPUT_LOCK_SETTLE_MS = 600`. Both subscribe→end edges are settled.

**UX to copy:** debounce connection/lease flicker so send is not enabled for one frame on a dying socket.
**Verdict:** **drop-in view affordance** (fail-closed).

### F-ITER009-A11Y Send failure is the only error channel and is `accessibilityLiveRegion="assertive"`
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:419:427]

**UX to copy:** we already have a11y live regions. Portable: one assertive banner for send failure, cleared on any accepted write (controller comment).
**Verdict:** **drop-in view affordance**.

## Questions Answered
Partial q-session-chat-nav.

## Ruled Out
- Copying terminal/chat dual view as a home-screen pattern.
- Client-side load-earlier from a stale cache across epoch.

## Dead Ends
- Looking for unread-count on orca's jump FAB — it has none.

## Sources Consulted
- specs/context/orca-main/mobile/src/session/MobileNativeChatView.tsx:166
- specs/context/orca-main/mobile/src/session/use-mobile-session-view-mode.ts:47

## Assessment
- newInfoRatio: 0.74
- noveltyJustification: FAB vs per-turn arrow split, hasMore pagination, view-mode fail-closed, 600ms lock settle are new versus streaming iteration.
- confidence: high.

## Reflection
- What worked and why: Reading the FAB comment prevented treating jump-to-latest as scroll-to-turn.
- What did not work and why: Prompt-history still absent (ArrowUp in composer is Send).
- What I would do differently: Next, @file search RPC and AskUserQuestion wizard.

## Recommended Next Focus
`files.searchPaths` @-mention RPC (debounce, cache, legacy fallback) and AskUserQuestion index-based wizard vs our ask-question card.
