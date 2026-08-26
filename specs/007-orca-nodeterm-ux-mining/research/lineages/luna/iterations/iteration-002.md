# Iteration 2: Resume slot and parallel-session selection

## Focus

Separate Orca's last-workspace Resume affordance from its parallel worktree list, then map both to the Pi client's redacted session roster.

## Findings

### F-LUNA-002-A — Reserve a last-opened slot without making it actionable early

**Orca file/pattern:** `mobile/src/worktree/home-resume-card.ts:5-14,25-44,47-61,78-89` uses device `lastVisited` and cached host metadata to reserve a Resume card; `actionable` is independently gated on a connected host.

**Copy:** Add a stable “Continue last session” slot above the roster, using only the locally remembered session id and the host’s current card fields. Render the slot in its final position during cold start; allow navigation only when the connection is live.

**Constraint mapping:** The remembered id is navigation history, not invented session content. A cache may paint the slot but must not authorize a send or treat a missing cold snapshot as deletion. Re-check exact session identity against the live host before opening.

**Verdict:** `drop-in view affordance` for the reserved/inert slot; `needs a new host field` for a human title or preview.

### F-LUNA-002-B — Treat the host worktree/session list as the parallel-selection surface

**Orca file/pattern:** `mobile/src/worktree/workspace-list-types.ts:4-48` and `workspace-list-sections.ts:119-145` model rows with display name, repo, branch, preview, unread, status, pin, and agent summary; pinned rows form an overlay while remaining in canonical groups.

**Copy:** Use a single tap target per session card, then add a long-press/action-sheet affordance for Open and copy-id. If pinning is introduced, keep pinned cards visible in their original filtered/sorted group as well as in a Pinned section.

**Constraint mapping:** Open and copy-id are safe view actions over the existing opaque id. Preview, unread, pin state, and agent summary are host facts; a device-only pin set would silently become client-owned session truth and must not be used as the authoritative roster.

**Verdict:** `drop-in view affordance` for long-press chrome and the pin-overlay layout; `needs a new host field` for preview/unread/pin/agent state.

## Negative knowledge

- Orca’s New Workspace action creates an IDE worktree and is not a portable new Pi session command.
- A local pin preference without a host-backed pin field is not a safe substitute for host truth.

## Questions answered

- The home Resume slot and the parallel session roster are different affordances; combining them would make loading and deletion semantics ambiguous.

## SCOPE VIOLATIONS

None. Read-only inspection covered Orca source and current client files; all artifacts for this run stay under the Luna lineage directory.

[SOURCE: specs/context/orca-main/mobile/src/worktree/home-resume-card.ts:5-14,25-44,64-89]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts:4-48]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:119-145]
