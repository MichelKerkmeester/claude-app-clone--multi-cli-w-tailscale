# Deep-Research Iteration 001

## Focus
Angle 1 (HEADLINE): nodeterm's Trello-style board of live sessions — locate the session-board component/logic (lanes/columns, grouping, ordering, live-status glyphs, board-vs-list rendering) and map its display logic onto our home session list over existing DTO fields `{id, status, messageCount, updatedAt, epoch}`; flag layouts needing new host fields.

## Actions Taken
1. Read config, state JSONL, and strategy (state-first; confirmed iteration 1/10, focus Angle 1, research target `specs/context/nodeterm-main` read-only).
2. Enumerated `src/renderer/session/`, `src/shared/agents/`, `src/core/agents/`, `src/core/presence/` — **surface-map correction**: `src/renderer/session/` is PTY/relay session logic (session.ts, localSession.ts, relay-tab.ts), `src/core/agents/` is hook/messaging infra, NOT the board. The board actually lives in `src/renderer/components/kanban/` (KanbanView, KanbanColumn, SessionCard, CardMetaBar, CardModal, ColumnPill, KanbanSourceFilter, LabelChips/LabelPicker, GitHubIssueCard), `src/renderer/lib/kanban.ts` (pure board transforms), `src/renderer/lib/boardLogDiff.ts`, `src/renderer/state/viewMode.ts` (board-vs-list), `src/renderer/state/cardPanel.ts`, `src/renderer/state/projects.ts` (project.kanban wiring), `src/shared/types.ts` (kanban types).
3. Read `src/renderer/lib/kanban.ts` (442 lines) — the pure board-transform core.
4. Read `src/renderer/state/viewMode.ts` (89 lines) — board-vs-list switching.
5. Did NOT touch any researched file (read-only target honored); no scope violations.

## Findings
**F-1 [SOURCE: specs/context/nodeterm-main/src/renderer/lib/kanban.ts:6-8,14-23]** — The board is a *manual-assignment layer over session nodes*, not a status derivation: `ProjectKanban = {columns:[{id,title,color}], assignments:[{nodeId,columnId}], meta, labels, github}`; cards ARE the project's session nodes; unassigned/dangling sessions sit in a virtual **Ungrouped** column. Mapping: our home session list is the same "cards over DTOs" relation — a status-grouped home view is a derived view over existing DTO fields (a), and nodeterm's *user-editable column assignment* would be the only part needing a new host field (candidate request, likely declined: derived grouping is host-authoritative). Portability: ⚠️ model portable as derived view; ❌ user column assignment as-is.

**F-2 [SOURCE: kanban.ts:12-13,71-73]** — **Lazy default + non-destructive unassign**: default board (To Do / In Progress / Done) is NOT written to disk until the first user edit; deleting a column returns its sessions to Ungrouped and never destroys sessions (no confirm dialog, no last-column rule because the virtual Ungrouped column always remains). Mapping: derived groupings/filters on home must never persist until user mutation, and removing a bucket must never lose sessions. Portability: ✅ drop-in principle for status-filter chips / bucket removal.

**F-3 [SOURCE: kanban.ts:153-166]** — `pruneAssignments` drops assignments of dead node ids and returns the SAME object when nothing changed so callers cheaply skip a no-op persist. Mapping: reconcile derived grouping against live DTO ids on refresh; no-op short-circuit avoids store churn (reinforces planned pull-to-refresh/reconcile). Portability: ✅ drop-in.

**F-4 [SOURCE: kanban.ts:105-112,207-208]** — Tolerant reference resolution: `resolveColumnRef` resolves agent-supplied column refs by exact id then case-insensitive title ("In Progress"); assignees are matched by NAME (the presence identity's stable part; color is display-only and may drift per machine). Mapping: any future host status/column updates should match by stable identity, never display fields. Portability: ✅ drop-in identity-matching rule.

**F-5 [SOURCE: kanban.ts:361-371,396-418]** — Label filtering uses **OR semantics** (Trello default: card must carry at least one selected label); legacy free-text node tags migrate idempotently into board labels (reuse by case-insensitive name, auto-rotate color). Mapping: multi-select filter chips over DTO fields with OR semantics; idempotent migration for any future tag/field additions. Portability: ✅ drop-in.

**F-6 [SOURCE: src/renderer/state/viewMode.ts:3-8,56-58]** — View mode (canvas vs kanban) is **per-project, personal, layered**: explicit per-project override, else `defaultView` fallback; persisted in localStorage, deliberately NEVER in the git-shared project file. Mapping: a list-vs-board toggle on home is client-local preference state (b — pure interaction, fail-closed: host never needs to know); the explicit-override→default layering is the pattern for a "Default view" setting. Portability: ✅ drop-in.

**F-7 [SOURCE: viewMode.ts:42-53,70-82]** — **One-shot requested-card deep link**: "go to node" requests (notch Go, notification click, ⌘K, sessions sidebar) funnel through `requestCard(nodeId)`; the board consumes and clears it; leaving the view drops unconsumed requests. `toggle()` flips the RESOLVED view and stores it explicitly so it overrides the default. Mapping: tap-card → open-transcript navigation should be a consumed-once request contract so deep links never fire stale. Portability: ✅ drop-in.

**F-8 [SOURCE: viewMode.ts:15-25,60-64]** — **Fail-closed preference parsing**: `parseViewMap` keeps only valid `'canvas'|'kanban'` entries, try/catch → empty map, localStorage guard for non-browser contexts; save failures never fail the UI. Mapping: client-local preference store must fail closed (drop unknown values) — matches our fail-closed, host-authoritative constraint. Portability: ✅ drop-in.

**F-9 [SOURCE: kanban.ts:33-41,253-268]** — Deterministic bucket-id derivation: GitHub status labels slugified from column titles (NFKC → lowercase → non-alnum → `-`, 50-char cap, dedupe suffix) and a closed 10-color Notion-style label palette. Mapping: derived bucket ids from DTO status strings should be deterministic + deduped for stable keys. Portability: ✅ drop-in.

**OBS-1 [SOURCE: find_file_by_name + grep over specs/context/nodeterm-main/src]** — Surface-map correction (see Actions): the board lives in `components/kanban/` + `lib/kanban.ts` + `state/viewMode.ts`, not `renderer/session/`. Strategy's priority-dir pointers for Angle 1 should be updated by the reducer.

## Questions Answered
- **KQ-1 (partial)**: Board logic located and core-mapped — columns/assignments model with virtual Ungrouped (F-1), lazy-default/non-destructive semantics (F-2), board-vs-list switching with explicit-override→default layering (F-6), one-shot deep-link consumption (F-7), OR-semantics filters (F-5), deterministic bucket ids (F-9). **Unresolved sub-parts**: live-status glyphs on cards, in-column ordering, and the KanbanView/KanbanColumn/SessionCard render layer (next iteration). **Host-field verdict so far**: NO new host fields needed for a derived status-grouped home list; only user-editable column assignment would require one (not recommended — derived grouping preserves host authority).

## Questions Remaining
- KQ-1 (remainder): card rendering/glyphs (KanbanView.tsx, KanbanColumn.tsx, SessionCard.tsx), in-column ordering (boardLogDiff.ts, projects.kanban.ts).
- KQ-2: live presence/status derivation (src/core/presence/hub.ts) — untouched this iteration.
- KQ-3: session-card content model (SessionCard.tsx, CardMetaBar.tsx, CardModal.tsx).
- KQ-4, KQ-5: chat patterns, dictation/handoff — untouched this iteration.

## Next Focus
Complete Angle 1's render layer: read `KanbanView.tsx` + `KanbanColumn.tsx` + `SessionCard.tsx` (+ `lib/boardLogDiff.ts` for in-column ordering) to finish KQ-1's card-content/glyph mapping; then pivot to Angle 2 (KQ-2, `src/core/presence/hub.ts`) for live-status derivation — the two angles jointly decide whether any new host signal is needed.

## SCOPE VIOLATIONS
None. All researched files (specs/context/nodeterm-main/**) read-only; only iteration artifacts written.
