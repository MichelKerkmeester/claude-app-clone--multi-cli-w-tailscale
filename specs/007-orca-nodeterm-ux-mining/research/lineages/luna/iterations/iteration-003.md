# Iteration 3: Selection ordering, attention, and filtering

## Focus

Determine which parts of Orca’s worktree ordering can improve the home roster using only the current Pi `status`, `updatedAt`, and `messageCount`.

## Findings

### F-LUNA-003-A — Use an attention-first sort with a deterministic time fallback

**Orca file/pattern:** `mobile/src/worktree/workspace-list-ordering.ts:25-43,45-76,78-123` computes recent activity from the maximum of activity/output timestamps, gives new rows a five-minute grace, and orders attention as permission → working → done → active → inactive before recency/name fallback.

**Copy:** Add a client-only “Needs attention” or “Recent” sort. For the current DTO, rank `interrupted` first, `running` second, then `idle`/`unknown`, and use `updatedAt` plus stable id as the tie-breaker. Keep user-selected ordering separate from host session state.

**Constraint mapping:** This derives presentation order from already-authoritative status/timestamp fields and never claims that the client changed a session. Do not relabel `unknown` as completed or permission-required; preserve the conservative label when the host lacks a stronger state.

**Verdict:** `drop-in view affordance` for the existing enum and timestamp.

### F-LUNA-003-B — Make filter chips explicit and fail closed when the predicate needs absent metadata

**Orca file/pattern:** `mobile/src/worktree/workspace-list-sections.ts:40-88,90-116` separates archive/sleeping/default-branch/repo/search predicates before section construction; `workspace-view-settings.ts:8-24,42-74` defines stable group/sort/filter state.

**Copy:** Add local chips for All, Running, Interrupted, and Recent, with a search field over the opaque id. Preserve a separate empty state for “no match”; keep filter state in view-only storage. Do not expose repo/branch/PR chips until the host supplies those facts.

**Constraint mapping:** Status/id filters are safe because they only hide or order host rows. A missing field must yield “unsupported” rather than a guessed match; filters cannot turn a stale cache into evidence that a session disappeared.

**Verdict:** `drop-in view affordance` for status/id filters; `needs a new host field` for repo/branch/PR/agent grouping.

## Negative knowledge

- The exact Orca “permission” priority cannot be reproduced from `SessionCardDto.status`; `unknown` must not be promoted to permission.
- Host-synced `ui.get/ui.set` preferences are not required for a useful first version; device-local view settings do not alter session truth.

## Questions answered

- Existing status plus recency can materially improve selection without a new host field, but richer attention states require an explicit host contract.

## SCOPE VIOLATIONS

None. No client or Orca files were edited.

[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-ordering.ts:25-43,45-76,78-123]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:40-116]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-view-settings.ts:8-24,42-74]
