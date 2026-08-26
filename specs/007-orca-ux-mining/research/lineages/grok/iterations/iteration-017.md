# Iteration 17: Haptics taxonomy; swipe / long-press / multi-select absence

## Focus
Portable haptic helpers and whether orca history/home cards expose swipe actions, multi-select, or long-press menus (our home gaps).

## Actions Taken
- Read `mobile/src/platform/haptics.ts` (Android vs iOS).
- Grep agent-history / worktree list for swipeable, longPress, multiSelect.

## Findings

### F-ITER017-HAPTIC Five named helpers; Android avoids VIBRATE permission
[SOURCE: specs/context/orca-main/mobile/src/platform/haptics.ts:3:45]

| Helper | iOS | Android |
|---|---|---|
| `triggerMediumImpact` | Medium impact | `Long_Press` |
| `triggerSelection` | selection | `Gesture_Start` |
| `triggerSuccess` | Success notification | `Confirm` |
| `triggerError` | Error notification | `Reject` |
| `triggerEdgeBump` | Light impact | `Clock_Tick` |

Failures are swallowed (`.catch(() => {})`). Used on resume fail/success (iter 8).

**UX to copy:** map selection → picker ticks, success → send/open, error → fail-closed send/open, edge → overscroll. Do not require a vibrate permission story on Android web; our PWA may have weaker haptics (`navigator.vibrate` is optional).
**Constraint map:** haptics are pure interaction. Fail-closed means haptic-on-error when the **host** rejected, not when the client guesses.
**Verdict:** **drop-in view affordance**. Strength/API differences on Safari PWA are expected.

### F-ITER017-SWIPE History cards have no swipe actions, multi-select, or long-press menu
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:1:2]
[SOURCE: grep mobile/src/agent-history swipe|longPress|multiSelect: no matches]

Cards: tap = peek/expand; nested Resume. `SectionList` + `RefreshControl`. No `Swipeable`, no selection mode.

**UX implication:** orca is **not** the source for swipe-to-pin/archive or bulk select. Adding those on our home would be a product invention. Pin/archive still need host fields (iter 2, 14).
**Verdict:** swipe/multi-select/long-press menus → **not an orca port** (and pin/archive without host fields → **not portable**). PTR + nested primary action → **drop-in**.

### F-ITER017-PTR Pull-to-refresh is the only list gesture besides tap
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:2]

Already recorded in iter 1. Combined with haptics: PTR success does not appear to fire `triggerSuccess` on history (resume does).

**UX to copy:** PTR refetch; don't over-haptic on every refresh.
**Verdict:** **drop-in**.

## Questions Answered
Home gaps: swipe, multi-select, long-press, haptics.

## Ruled Out
- Copying iOS Mail-style swipe on session cards from orca (absent).
- Treating `navigator.vibrate` as a required port of expo-haptics.

## Dead Ends
- Worktree list swipe search — home rows also tap-to-open + pin control, not swipe.

## Sources Consulted
- specs/context/orca-main/mobile/src/platform/haptics.ts:3
- specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:1

## Assessment
- newInfoRatio: 0.55
- noveltyJustification: Full haptic table + confirmed absence of swipe/multi-select; PTR haptic is not wired.
- confidence: high.

## Reflection
- What worked and why: Negative grep is the finding for three home gaps.
- What did not work and why: Expected pin to be a swipe action; it is an explicit control on worktree rows (iter 2).
- What I would do differently: Next, freeze the host-field request bundle against the "opaque identifiers only" product rule.

## Recommended Next Focus
Frozen host-field request bundle: minimum vs optional vs product-rule blocked (paths on home).
