# Implementation Summary — Shared in-memory catalog and deterministic command engine

## Final state

Complete and verified. The web client now has one session-scoped in-memory command catalog and a pure, testable interaction engine (ranking, trigger parsing, insertion, revision binding), with the existing `+` browser migrated onto it — no visual change, no execution path opened. Implemented by DeepSeek v4 Flash Max (via the Devin CLI, dangerous mode); orchestrated and verified by Claude.

## What shipped (web-only)

- **`commands.ts`:** session-scoped in-memory catalog lifecycle (scoped to host epoch + session), shared in-flight request, `AbortController` cancellation, monotonic request IDs, commit-only-on-match, and unavailable/forbidden/incompatible/stale error classes. In-memory only — no localStorage/IndexedDB/Cache/service-worker/URL/telemetry persistence (grep-confirmed).
- **`rankHostCommands.ts` (new):** pure normalization + exact ranking tiers + host-order tie-breaks + disabled handling + active-name retention + matching-grapheme ranges; never autocorrects.
- **`useSlashTrigger.ts` (new):** pure leading-slash trigger predicate from draft/caret/selection/focus/Escape-latch/IME — no transport/filter side effects.
- **`insertSlashCommand.ts` (new):** canonical `/${name} ` replacement, synchronous controlled-draft update, caret/focus restoration, binding creation, and a "Not sent" announcement; token edit clears the binding, argument edit retains it.
- **`CommandPalette.tsx` / `SessionComposer.tsx` / `App.tsx`:** `+` browser moved onto the shared catalog + ranking + insertion path with its visual surface unchanged; session/connection/epoch context threaded through.
- **`relay.ts`:** guarded lifecycle calls.

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, 167 passed (167) — backend unchanged.
- `npm run test:web` → exit 0, **249 passed (249)** (+73 new: ranking, trigger, insertion, catalog lifecycle races, CommandPalette parity).
- Review (Claude): no persistence in the engine (grep-confirmed); relay/protocol untouched; no ticket/mutation/Pi RPC in filtering/selection.

## Frozen contracts

- Design unchanged (`+` browser visuals preserved).
- Security preserved: phase-1 relay-filtered catalog is the sole source; no fallback catalog; in-memory-only scoped snapshot; aborts/session/epoch/out-of-order fail closed; no new mutation path.

## Deferred

- True-390px CDP captures ride the feature-003 visual checkpoint (after the inline autocomplete UI phase); this phase changes no visible surface.
