# Iteration 17: Freshness, refresh, and home loading states

## Focus

Compare Orca's pull-to-refresh and session-history loading behavior with the SvelteKit home surface, while preserving the client's read-only cache and stale-state contract.

## Findings

### F-LUNA-017-A — Make refresh a bounded roster request with stable placeholders

**Orca file/pattern:** `mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:107-175` uses a refresh control around the history list, renders loading/empty/error branches, and keeps list keys tied to session identity. `mobile/src/agent-history/agent-history-sections.ts:12-58` separates dated sections before rendering.

**Copy:** Add a home pull-to-refresh or explicit refresh affordance that requests a fresh roster, preserves the current card order while the request is pending, and exposes loading, empty, error, and no-match states without collapsing the layout. Stable session keys should preserve focus and avoid a visual jump when the host returns the same roster.

**Constraint mapping:** Refresh is a host read, not a client mutation. Commit only a response bound to the current relay/device scope and host epoch; if it fails, keep the last read-only snapshot marked stale. Do not report “refreshed” from a timer or local array update, and do not make a stale card actionable until exact session validation succeeds.

**Verdict:** `drop-in view affordance` for the refresh lifecycle, stable placeholders, and sectioning; the existing transport/cache and command scope provide the authority fence.

### F-LUNA-017-B — Surface freshness as a confidence boundary, not decoration

**Orca file/pattern:** `mobile/src/agent-history/agent-history-session-card.ts:23-67` keeps card metadata compact and derives a visible time label from the record; `mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:36-86` separates loading/error/empty presentation from the row. The current client makes the boundary explicit in `app-mobile/src/pages/home/screen-home.svelte:56-58,82-110`, where cache or a non-live connection yields `isStale`, and `app-mobile/src/shared/transport/cache.ts:28-62,113-185,191-226` validates a bounded read-only snapshot.

**Copy:** Keep the freshness banner adjacent to the session heading, add a compact “updating” state during refresh, and show skeleton cards only before the first snapshot. When cached data is present, retain useful cards but clearly label them stale; when the snapshot is invalid or absent, show an empty/error state instead of guessing.

**Constraint mapping:** A card may be selected for a read attempt only as a hint. The chat page must revalidate id and epoch before loading transcript or issuing a command. Cached message counts, relative times, and any future title/preview are informational and must not authorize send, Stop, answer, attachment, or file operations.

**Verdict:** `drop-in view affordance` for stale/loading/error presentation; any new freshness reason or host-published revision is `needs a new host field` if the current `SessionListState` cannot expose it.

## Negative knowledge

- Pull-to-refresh cannot turn a cache into live authority.
- Skeleton rows must not masquerade as sessions or receive focus/press handlers.
- Client-derived relative time and message counts do not establish current host progress.

## Questions answered

- Refresh and placeholder states are portable if they remain read-only and scope-fenced.
- Current client freshness is already the correct trust boundary; Orca supplies interaction polish, not authority.

## SCOPE VIOLATIONS

None.

## Assessment

- newInfoRatio: 0.62
- Novelty: maps Orca's history-list refresh and placeholder behavior directly onto the client's existing read-only freshness boundary.
- Status: complete

## Next Focus

Rich message content, file links, artifacts, and readability.

[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:36-40,64-86,107-175]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-sections.ts:12-58]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:23-67]
[SOURCE: app-mobile/src/pages/home/screen-home.svelte:56-58,82-110]
[SOURCE: app-mobile/src/shared/transport/cache.ts:28-62,113-185,191-226]
