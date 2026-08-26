# Iteration 1: Mobile Agent Session History card model and peek

## Focus

Orca mobile Agent Session History: card fields, scoped grouping, expand-to-peek preview, recency, and resume affordances. Map each to the current home `SessionCardDto` and the host-authoritative/fail-closed constraint.

## Actions Taken

- Read `specs/007-orca-ux-mining/research-angles.md` first, then the current home route and session DTO usage.
- Read orca `mobile/src/agent-history/agent-history-session-card.ts`, `agent-history-sections.ts`, and `MobileAgentSessionHistoryList.tsx`.
- Read the shared filter/display model in `src/shared/ai-vault-types.ts`, `ai-vault-session-filters.ts`, and `ai-vault-session-display.ts`.

## Findings

### F1. The card is a host-scanned projection, not client-authored metadata

[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:7-16,36-53]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:83-120]

`buildMobileAgentHistoryCard` projects `id`, agent identity/label, `title`, latest preview turn, message count, relative time, and current-worktree membership from an `AiVaultSession`. The source session also contains cwd, branch, model, total tokens, queued messages, subagent count, and a resume command.

Copy the scan order of `title → last substantive message → agent → count → time`, with `Untitled session` as a safe fallback. Our `messageCount` and `updatedAt` are already usable. Title, preview, agent/model, and cwd are absent from the current `SessionCardDto`; deriving them from the opaque id or a local transcript would invent client-owned truth.

**Constraint mapping:** view-only values already present remain local; richer card content must be host-projected and rejected when missing or stale.

**Portability:** `messageCount`/`updatedAt` presentation — **drop-in view affordance**. Human title, preview, agent, model, cwd — **needs a new host field**.

### F2. Filtering and grouping are deterministic views over host fields

[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-sections.ts:27-58]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:72-144,245-276]

Orca applies query, agent allow-list, scope narrowing, updated-time sorting, and empty-session policy before grouping. Folder groups normalize paths and display the last two segments. Scoped tabs fall back to the unscoped list while scope paths are still loading so the UI does not flash empty.

Copy recency sorting, explicit group headers with counts, and “keep the current snapshot visible while the scope request loads.” A client-only `status` filter and `updatedAt` sort are safe today. Folder/repo/agent grouping needs host data; `messageCount === 0` is not enough to hide empties because orca preserves queued/subagent recoverable sessions.

**Constraint mapping:** never filter on fields the host did not send; an unknown scope must widen safely until a live host snapshot arrives.

**Portability:** recency sort, status chips, loading fallback — **drop-in view affordance**. Folder/agent grouping and recoverable-empty logic — **needs a new host field**.

### F3. Tap-to-expand is a useful home peek, but the preview body must be authoritative

[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:12-15,36-40,107-125,165-174]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-display.ts:20-35]

The list keeps one `expandedId`; tapping a card expands up to five recent role/text turns, while the scanner already bounds preview text. The row does not navigate when it is being expanded, and a separate Resume button stops propagation.

Copy an expand-in-place preview before opening a session, with a small bounded number of turns and a distinct Open/Resume control. Our current whole-card tap navigates directly. The accordion chrome is pure interaction state, but preview text cannot be synthesized from an unrelated cached transcript because that would create a second source of session truth.

**Constraint mapping:** missing preview means keep the peek affordance disabled/absent, never display a fabricated excerpt.

**Portability:** expand/collapse interaction — **drop-in view affordance**. Preview turns — **needs a new host field**.

### F4. Resume is a single-flight nested action

[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:55-67]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:139-163]

Orca disables every Resume button while one session launch is in flight, shows a spinner on only the selected row, stops row propagation, and exposes an accessible “Resume agent session” label. The command string used to resume an orca CLI session is host-specific.

Copy single-flight state, row-local loading, and a nested action that does not toggle/open the preview. Route the actual navigation through the existing host-authoritative session selection.

**Constraint mapping:** in-flight UI state is not session metadata; the host remains the authority for whether the session can open.

**Portability:** single-flight nested Open/Resume — **drop-in view affordance**. Orca `resumeCommand` — **not portable**.

### F5. Pull-to-refresh is a host snapshot request

[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:64-75]

`RefreshControl` calls the parent refresh handler and renders its own refreshing state. It does not mutate session rows locally.

Copy pull-to-refresh on the home list and make it call the existing host list fetch. Preserve the last known snapshot with the existing stale banner when refresh fails.

**Constraint mapping:** refresh is safe only as a request for a new host snapshot; failed or stale snapshots remain visibly non-authoritative.

**Portability:** **drop-in view affordance**.

### F6. Search needs an authoritative searchable projection

[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:177-242]

Orca’s query parser supports free text and `repo:`/`path:` operators; the searchable haystack includes title, session id, agent, branch, model, cwd, file path, and bounded preview text. Queries over 2 KiB return no matches.

Copy bounded query input, debounced filtering, and explicit empty results. Searching our compact id alone is low value, and searching title/preview/project fields that were never sent would be misleading.

**Constraint mapping:** only search fields in the current host DTO; refuse or disable semantic filters when the host has not supplied the field.

**Portability:** query chrome and bounded input guard — **drop-in view affordance**. Useful title/project/preview search — **needs a new host field**.

## Questions Answered

- Partial Q1: mobile history is a grouped, recency-sorted, previewable session list.
- Partial Q2: the minimum useful card model is title, preview, agent, message count, and time; richer identity is host data.

## Questions Remaining

- Live parallel-agent attention rows in Electron.
- Chat message-level interactions, composer, streaming, and session transition navigation.

## Ruled-Out Directions

- Treating `resumeCommand` as a client-generated Pi action: it is an orca host command, not a portable session identifier.
- Inventing titles or previews from compact ids/local cache: duplicates opaque UX and violates authoritative projection.

## Next Focus

Orca mobile home/worktree selection: pin overlays, search/group/sort, attention order, unread, and inert Resume behavior.

## Assessment

- newInfoRatio: 0.92
- Novelty: first direct pass over the mobile history card, shared query core, and bounded peek behavior for this lineage.
- Status: complete

## SCOPE VIOLATIONS

None. Authored-spec synchronization remains deferred by the lineage boundary.
