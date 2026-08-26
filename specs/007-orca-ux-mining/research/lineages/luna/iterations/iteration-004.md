# Iteration 4: Compact agent state in selection rows

## Focus

Inspect Orca Electron’s shared state marker, dashboard row, inline worktree agent list, and unread-count rules for a compact parallel-session summary.

## Findings

### F-LUNA-004-A — Keep identity, state, and primary text as separate scan columns

**Orca file/pattern:** `src/renderer/src/components/AgentStateDot.tsx:13-52,64-118` gives working, waiting, blocked, interrupted, failed, done, and idle distinct accessible labels; `DashboardAgentRow.tsx:115-204` keeps the state marker, agent identity, prompt/task text, model, and timestamps independently scannable.

**Copy:** If the host later exposes agent summaries, render a compact state icon plus optional agent label and latest task line inside each session card. Keep the status label accessible and use a spinner only for confirmed live work; do not merge “who” and “what state” into one ambiguous badge.

**Constraint mapping:** Current Pi cards can only show the session state icon and opaque id. Any agent name/task preview must be host-authored and scope-bound to that session. When the host reports an unknown state, render an inert neutral marker rather than a guessed spinner.

**Verdict:** `drop-in view affordance` for separate columns and accessible labels; `needs a new host field` for agent identity/task text.

### F-LUNA-004-B — Use disclosure to keep parallel detail available without overwhelming the card

**Orca file/pattern:** `src/renderer/src/components/sidebar/worktree-card-compact-agents.tsx:17-45,71-151` renders a compact summary button, caps visible state groups/icons, and expands a nested list with `aria-expanded`; `WorktreeCardAgents.tsx` uses stop-propagation and reveal-scroll behavior for nested controls.

**Copy:** Let a session card remain one clear Open target, with a small disclosure for optional agent/run details. Nested buttons must stop card activation, and the expanded content should be mounted only after opening to keep the initial list light.

**Constraint mapping:** Disclosure is purely view behavior and can be added without host writes. The content itself remains fail-closed: no agent rows, no invented empty summary, and no stale details carried across session ids.

**Verdict:** `drop-in view affordance`.

## Negative knowledge

- The dashboard’s `waiting`/`permission` vocabulary cannot be projected from the current Pi status enum without a host field.
- A client-side spinner based on render timing is not equivalent to Orca’s confirmed working state.

## Questions answered

- Compact disclosure is portable as chrome; state-rich inline rows are not portable until the host supplies scoped agent status.

## SCOPE VIOLATIONS

None. Inspection was read-only and stayed outside the lineage write surface.

[SOURCE: specs/context/orca-main/src/renderer/src/components/AgentStateDot.tsx:13-52,64-118]
[SOURCE: specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx:115-204]
[SOURCE: specs/context/orca-main/src/renderer/src/components/sidebar/worktree-card-compact-agents.tsx:17-45,71-151]
