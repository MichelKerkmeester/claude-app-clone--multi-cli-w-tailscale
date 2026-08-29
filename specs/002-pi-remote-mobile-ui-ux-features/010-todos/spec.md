---
title: "F10 — Todos"
description: "F10 — Todos"
trigger_phrases:
  - "f10 — todos"
  - "todos spec requirements"
  - "todos packet"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/002-pi-remote-mobile-ui-ux-features/010-todos"
    last_updated_at: "2026-08-16T12:00:00Z"
    last_updated_by: "gpt-5.6-luna"
    recent_action: "Synthesized research and authored feature spec plus implementation phases"
    next_safe_action: "Build sub-phase 002 projection and redaction"
    blockers: []
    key_files:
      - "spec.md"
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# F10 — Todos

One-line summary: Render the host’s redacted Pi todo plan as a read-only, live-updating inline projection in the transcript.

## Decision

Build a first-class `TodoPanel` as an inline parchment block in the Pi Remote transcript. It is rendered by the React 19 transcript renderer with React Aria Components and remains visible alongside the relevant activity even when surrounding activity is collapsed. It is not a sheet, modal, drawer, blocking overlay, or global task application.

The panel is a read-only host projection. Rows are informational static list items, never checkboxes or mutation controls. The phone cannot complete, add, delete, reorder, edit, cancel, or otherwise mutate tasks. Refresh, collapse, expand, scroll, and reconnect are view or synchronization operations only.

The host or extension remains authoritative for task state, ordering, grouping, plan identity, redaction, and revisions. The relay validates and synchronizes a redacted `TodoProjectionV1` snapshot or delta over the existing authenticated channel. No ticketed todo mutation lane is added, and existing plan-mode and operator-only `--full-access` enforcement remains unchanged.

## Problem and goal

The existing transcript has a legacy `PlanBlock` representation with a boolean `done` field. It cannot represent the complete host state model of `pending`, `active`, `done`, and `blocked`, and transcript text or event ordering must not become a source of truth for current task state.

Users need a calm, conversation-scoped view of the active Pi plan that shows provenance, state grouping, host order, progress, and live changes without implying that the phone owns or edits the plan.

The goal is to expose a validated, redacted, host-authoritative todo read model and render it as a stable inline transcript panel with explicit non-mutation guarantees.

## Current state

- `packages/pi-rpc-protocol/src/types.ts` defines versioned envelopes, sync messages, transcript blocks, runtime state, and existing command unions, but has no `TodoProjectionV1` contract or todo capability.
- `packages/pi-rpc-protocol/src/guards.ts` validates envelopes, sync messages, transcript blocks, runtime state, and commands, but has no todo snapshot or delta guards.
- `apps/pi-remote-relay/src/store/transcript-projector.ts` projects Pi events into transcript blocks, including the legacy `plan` block. That projection is not sufficient for the authoritative todo model.
- `apps/pi-remote-relay/src/store/redaction.ts` is the canonical redaction boundary used before persistence or broadcast.
- `apps/pi-remote-relay/src/store/relay-store.ts` persists redacted envelopes and creates replay plans.
- `apps/pi-remote-relay/src/replay/sync.ts` provides authenticated snapshot and live delta delivery with a replay barrier.
- `apps/pi-remote-relay/src/index.ts` publishes Pi events and transcript projections through `SyncHub`.
- `apps/pi-remote-relay/src/http/server.ts` exposes the authenticated read-only API and one-subscription sync WebSocket.
- `apps/pi-remote-relay/src/push/push-service.ts` delivers content-free push hints for existing attention events.
- `apps/pi-remote-web/src/App.tsx` renders transcript turns and groups routine evidence under an `Activity` disclosure.
- `apps/pi-remote-web/src/state.ts` stores and reduces transcript snapshots and deltas, while ignoring unknown display blocks safely.
- `apps/pi-remote-web/src/relay.ts` opens the authenticated read-only sync socket and validates sync messages.
- `apps/pi-remote-web/src/style.css` already contains the Inter, Source Serif 4, light/dark, safe-area, focus, and contrast tokens required by the frozen design system.
- The existing mutation policy, approval boundary, plan-mode enforcement, and `--full-access` host posture remain outside this feature.

## Desired end state

The host reads the current Pi todo state from an authoritative source and normalizes it into a redacted projection with stable opaque task IDs, closed state values, host order, optional host groups, plan identity, and revision metadata.

The relay publishes:

- `todo.snapshot.v1` for a complete ordered projection.
- `todo.delta.v1` for host-authored upserts and removals.

Both are carried through the existing authenticated envelope and sync infrastructure. The relay validates but does not infer state, sort tasks, enrich titles, or restore discarded detail.

The web client stores the latest validated projection separately from legacy transcript blocks. `TodoProjectionBlock` is rendered in the transcript as a sibling of routine activity content, outside the activity disclosure panel, so collapsing `ActivityGroup` never hides the todo panel.

The panel provides:

- Provenance such as `pi’s plan · todo`.
- A `doneCount/totalCount` count.
- State sections ordered `To do`, `Doing`, `Done`, `Blocked`.
- Optional host-defined group subheadings.
- Host-authoritative ordering within each state section.
- A 2–3px clay progress hairline.
- Static task rows with textual state labels and color-free state glyphs.
- Local collapse state and a read-only refresh control.
- Quiet live updates, accessible announcements, and a calm `All done · N/N` completion line.

No panel is rendered when no active projection exists. Malformed or unsupported projection data fails closed.

## Authority and protocol contract

The protocol addition is an inbound, host-to-phone projection over the existing authenticated sync channel. The phone receives the model; it does not author or mutate it.

The versioned contract is the `TodoProjectionV1` family:

| Projection | Envelope kind | Required payload |
|---|---|---|
| Snapshot | `todo.snapshot.v1` | `planId`, `source`, `revision`, `updatedAt`, complete `tasks` |
| Delta | `todo.delta.v1` | `planId`, `baseRevision`, `revision`, `upsertedTasks`, `removedTaskIds`, `updatedAt` |

A snapshot task contains:

| Field | Contract |
|---|---|
| `planId` | Opaque stable identifier for the active host plan; must not expose a filesystem path or secret. |
| `source` | Literal `"pi"`. |
| `revision` | Positive host projection revision used only for read-model freshness and delta safety. |
| `updatedAt` | Host timestamp for the latest projection change, or `null`. |
| `task.id` | Stable opaque task identity used for keyed rendering and delta matching. |
| `task.title` | Required redacted display string. |
| `task.state` | Exactly `pending`, `active`, `done`, or `blocked`. |
| `task.group` | Optional redacted host-defined group string, or `null`. |
| `task.order` | Host-authoritative integer order. |
| `task.revision` | Host task revision, increasing when that task changes. |
| `task.updatedAt` | Optional host timestamp for that task’s latest change, or `null`. |

`detail` is not a v1 field. If the host source provides detail, it is discarded before DTO construction. A future protocol version may add detail only through an explicit allowlist and the existing redaction boundary.

A delta contains the complete identity and revision context needed for safe read-model application:

- `planId`
- `baseRevision`
- `revision`
- `upsertedTasks`
- `removedTaskIds`
- `updatedAt`

An upsert replaces a task only when the incoming task revision is newer. A removed task disappears only because the host projection removed it. A stale delta is ignored. A delta whose `baseRevision` does not equal the client’s current plan revision preserves the last valid view and triggers a read-only snapshot refresh. The client never invents a missing revision, order, state, group, or task identity.

The host publishes a snapshot after subscription and reconnect. The PWA subscribes only while the authenticated Pi session is active. The existing replay and live synchronization path remains responsible for delivery ordering and envelope sequence safety.

The authenticated session capability response advertises `todoProjection: 1`. A new client connected to an older host treats the missing capability as unsupported and leaves the existing transcript unchanged. An older client connected to a newer host safely ignores the unknown todo envelope kinds.

The phone must not send any todo command. In particular, the feature adds no `todo.complete`, `todo.update`, `todo.reorder`, `todo.create`, `todo.delete`, `todo.cancel`, edit, abort, approval, ticket, HTTP mutation route, or equivalent RPC. The revision field never creates or implies mutation authorization.

The client must not infer task state from transcript text, terminal output, Pi events, network failures, timeouts, or local user actions.

## In scope

- A typed `TodoProjectionV1` snapshot and delta contract.
- Runtime guards for snapshot, delta, task state, revisions, IDs, timestamps, order, and capability data.
- Host-side normalization from the authoritative Pi todo source.
- Redaction of task titles and group labels before DTO construction.
- Complete removal of task detail from the v1 projection.
- Publishing snapshots and deltas through the existing `Envelope`, `RelayStore`, `SyncHub`, and authenticated WebSocket.
- Capability negotiation for `todoProjection: 1`.
- Content-free synchronization wake signals, if the existing push path is extended.
- A stable `TodoProjectionBlock` and `TodoPanel` in the transcript renderer.
- State grouping, host ordering, optional group subheadings, progress count, and progress hairline.
- Static task rows with textual state and decorative state glyphs.
- Local section collapse state and a read-only refresh control.
- Revision-safe delta application, stale preservation, and read-only snapshot refresh.
- Polite live-region announcements using already-redacted titles.
- Light and dark ink-on-parchment styling, WCAG AA contrast, reduced motion, RTL, dynamic text sizing, safe-area behavior, and true 390px viewport testing.
- Automated protocol, relay, security, web component, accessibility, visual, and device-level verification.

## Out of scope: v1 non-goals

- Completing, editing, adding, deleting, cancelling, aborting, reordering, or otherwise mutating a task.
- Checkboxes, switches, drag handles, swipe actions, long-press actions, or row-level mutation buttons.
- A new ticketed mutation lane or a new approval path.
- Phone-controlled plan mode or phone-controlled `--full-access`.
- Client-side task-state inference from transcript or terminal content.
- Client-side sorting by title, timestamp, completion, or group label.
- A global task manager, cross-session task list, or independent project-management surface.
- Task detail, blocked reasons, terminal commands, file paths, secrets, or raw host payloads.
- Progress rings, badges, stars, celebratory illustrations, gamification, or additional status colors.
- Status filter chips in v1.
- A category-first grouping model.
- Automatic transcript scrolling when a projection changes.
- Persistence of todo data in browser storage unless the existing cache policy proves that only the redacted allowlist can be stored.
- A new offline freshness policy beyond preserving the last validated projection while a read-only refresh is pending.
- Changes to the existing plan-mode enforcement or operator-only full-access boundary.

## User-facing behavior

### Panel, rows, and state glyphs

`TodoProjectionBlock` is rendered inline in the transcript column and visually attached to the relevant agent activity. It is not a modal, sheet, drawer, overlay, or scrim.

The panel header order is:

1. Provenance label, such as `pi’s plan · todo`.
2. Compact progress count, such as `3/8`.
3. Read-only refresh control.
4. Progress hairline.

Task rows are static list items. A row is not a checkbox, switch, link, button, drag target, or disclosure control. The row displays the redacted title, localized textual state, optional changed-row metadata, and a decorative glyph.

The state glyphs are:

- `pending`: hollow square with carbon-ink outline.
- `active`: solid clay square.
- `done`: carbon-ink check.
- `blocked`: carbon-ink dash or hatch treatment.

Glyph meaning is always repeated by visible or assistive-technology-readable text. Glyphs are decorative where the same state is exposed textually.

A changed row may display a quiet label such as `updated 1 min ago`. Host `updatedAt` is authoritative. If no host timestamp exists, receipt time may be shown only when clearly identified as local time.

When all projected tasks are done and the total is greater than zero, the task list is replaced by one quiet line: `All done · N/N`. No celebration screen or control appears.

### Grouping and progress

Tasks are grouped by host state in this display order:

1. `To do` for `pending`.
2. `Doing` for `active`.
3. `Done` for `done`.
4. `Blocked` for `blocked`.

Empty state groups are omitted. Every rendered group includes its localized heading and count.

The optional host `group` field is rendered as a subheading inside its state section. The client does not rename, merge, filter, or reorder host groups.

Within each state section, and within each host group, tasks preserve host `order`. A state change moves a keyed row to the corresponding display section because the host projection changed; it is not a user reorder.

The header count is `doneCount/totalCount`. `totalCount` includes pending, active, done, and blocked tasks. Blocked and active tasks are not counted as done.

The progress hairline uses carbon ink for the track and clay for the completed portion. An empty plan does not render a misleading progress bar.

Long plans may scroll inside a bounded panel region. Section headers may remain sticky inside that region but must not obscure global navigation, transcript content, or safe-area insets.

Collapse state is local, ephemeral, and keyed by `planId` plus state section. It is never sent to the host and never included in projection data. A new plan starts with default expansion. Persistence is allowed only if the existing web policy can guarantee that no sensitive projection content is persisted.

### Live updates and provenance

A snapshot creates or replaces the panel for its `planId`. A new plan replaces the prior plan; a new revision for the same plan updates the existing keyed panel.

A delta updates only affected rows, state-group counts, the header count, and the progress hairline. Stable React keys come from `task.id`, never from array indexes. A single task change must not remount the transcript or the whole panel.

The panel remains anchored to the user’s current viewport during background updates. It does not auto-scroll when a task changes or moves between state sections.

A changed row may receive a brief hairline pulse using an existing motion token. The pulse is disabled under `prefers-reduced-motion: reduce` and never changes row dimensions.

One concise state change is announced per synchronization batch when practical. A suitable announcement is `Build tests is now active.` The title must be the redacted display title. Timestamps are not the primary live-region message.

A wrong `baseRevision`, revision gap, malformed delta, or unknown task state preserves the last valid projection while a read-only snapshot refresh is pending. No unvalidated data is rendered as current.

The provenance label must make clear that the list comes from Pi’s host plan and is not owned by the phone.

### Input, touch, and keyboard behavior

Every task row has a minimum block height equivalent to 44pt. This is a readability and touch-spacing requirement even though the row is not interactive.

Every disclosure control and refresh control has a minimum 44pt by 44pt target.

The only task-list gesture is ordinary vertical scrolling. No row tap, swipe, drag-and-drop, pinch, or long press changes task state.

State sections use React Aria Components `Disclosure` semantics. Disclosure controls use standard `Button` behavior and support Enter and Space.

Disclosure controls expose `aria-expanded` and point to the correct panel with `aria-controls`.

Only actual controls enter the keyboard tab order. Static task rows are not individually tabbable.

Focus rings remain visible in both themes and do not rely on clay alone.

The refresh control has an accessible name such as `Refresh pi todos`. Refresh re-subscribes to the existing read-only sync path or requests a read-only snapshot; it never sends a todo mutation.

When touch is the only input, controls remain visible without hover. Task titles wrap rather than disappear behind ellipses.

### Complete UI state model

| State | Rendering behavior |
|---|---|
| Unsupported or no active projection | Render no todo panel and leave the transcript unchanged. |
| Subscribing with no prior valid projection | Render no empty checklist or fabricated rows while waiting for the first snapshot. |
| Valid snapshot | Render the grouped panel using the host revision and ordering. |
| Live valid projection | Render the grouped panel and apply accepted deltas incrementally. |
| All done | Render `All done · N/N` in place of the expanded task list. |
| Stale while refreshing | Preserve the last valid projection; show only an existing non-sensitive stale indicator if the product already supports one. |
| Explicit refresh unavailable | Show a generic read-only unavailable state with a refresh control; do not expose transport errors, titles, paths, or host details. |
| Malformed or unknown projection | Reject it; preserve the last valid view or remain unavailable. |
| New task after all done | Restore grouped sections from the new authoritative projection and recompute progress. |
| Plan identity changed | Replace the prior plan and reset default local section expansion. |

### Visual, layout, and motion requirements

The panel uses the frozen ink-on-parchment system:

- Light parchment: bone `#f8f8f6`.
- Carbon ink for primary and secondary text, borders, glyphs, and focus.
- Clay `#d97757` as the only accent.
- Inter for task titles, state labels, counts, timestamps, and controls.
- Source Serif 4 for the panel header and provenance.
- Existing dark-theme parchment and ink token mappings.
- WCAG AA contrast in both themes.

No green, blue, yellow, red, purple, or additional status color is introduced for this feature. Existing application status colors outside the panel are not repurposed for todo states.

The panel uses a 1px hairline-ink border, existing radius tokens, thin separators, and no new floating shadow treatment. It should read as a calm transcript annotation rather than a project-management application.

The panel occupies the available transcript column width. It respects the existing page gutter, safe-area padding, and bounded transcript layout.

Do not animate section height during synchronization. Use only a brief row pulse for accepted changes. Under reduced motion, use immediate state replacement with no pulse or height transition.

### Accessibility and internationalization

Use one semantic list per state section and one list item per task where practical.

Each task exposes its redacted title and textual state to assistive technology. The state must be understandable without color or glyph interpretation.

The panel has a meaningful accessible label such as `pi’s plan`. Provenance is exposed to assistive technology.

Use React Aria Components for disclosure and button semantics. Use `aria-live="polite"` for concise state-change announcements. Do not use an assertive live region for ordinary progress.

Do not hide a visible task title from assistive technology with `aria-label`. The decorative glyph may use `aria-hidden="true"` because its meaning is repeated textually.

Localize `To do`, `Doing`, `Done`, and `Blocked`. Wire enum values remain unchanged. Use the platform locale for relative timestamps and expose an exact timestamp through `<time>` or an accessible description.

Use CSS logical properties for spacing, borders, alignment, and layout. Support RTL without changing semantic state ordering; mirror only directional affordances such as disclosure chevrons.

Task titles wrap at large text sizes. Increased browser text size or dynamic type must not clip task identity or state, create unintended horizontal scrolling, or reduce controls below 44pt.

The panel remains understandable with colors removed and motion removed. Secondary text, group headings, controls, focus rings, and timestamps meet WCAG AA in light and dark themes.

## Acceptance criteria

| # | Pass condition | Objective proof method |
|---:|---|---|
| 1 | An eight-task snapshot with three `done` tasks renders one inline panel with `3/8` and a horizontal progress hairline. | Render the fixed fixture and assert the DOM text, computed progress width, and light-theme screenshot. |
| 2 | The panel remains visible when the surrounding activity disclosure is collapsed. | Collapse `ActivityGroup`; assert `TodoProjectionBlock` remains in the DOM and in the screenshot. |
| 3 | A projection containing all four states renders `To do`, `Doing`, `Done`, and `Blocked` with counts on each non-empty group. | Render the four-state fixture and assert headings, counts, and state-to-group mapping. |
| 4 | Each task is exposed as a list item with its redacted title and textual state. | Inspect the Testing Library accessibility tree; assert list-item names include title and state. |
| 5 | The four glyphs are visually distinguishable without color alone. | Capture glyph fixtures in grayscale and assert hollow square, clay square, check, and dash/hatch treatments. |
| 6 | No todo row is interactive. | Assert task rows have no checkbox, switch, link, button, drag attributes, or row click handler. |
| 7 | Every task row, disclosure control, and refresh control meets the minimum target or block size. | Use computed layout inspection at 390px and increased text size; assert each measured dimension is at least 44pt-equivalent. |
| 8 | Disclosure changes only local visibility. | Click a disclosure, assert only its section visibility changes, and inspect the network/WebSocket spy for zero todo mutation messages. |
| 9 | Refresh uses only the existing read-only synchronization path. | Click refresh and assert the client re-subscribes or requests a snapshot without sending completion, reorder, add, delete, cancel, edit, abort, approval, or ticketed todo messages. |
| 10 | The protocol accepts valid snapshot and delta DTOs with the exact closed state set. | Add protocol fixtures and run `packages/pi-rpc-protocol/tests/guards.test.ts`; valid fixtures pass and unknown states fail. |
| 11 | Invalid IDs, revisions, timestamps, duplicate task IDs, missing order, and unknown wire versions fail closed. | Run negative protocol fixtures and assert rejection without fallback to `pending` or another fabricated value. |
| 12 | A valid delta updates only the affected row, group counts, header count, and hairline. | Apply a one-task delta and compare DOM identities and mutation counts for unaffected rows. |
| 13 | Unaffected row DOM identity remains stable across a delta. | Store node references before and after the delta and assert unchanged references remain identical. |
| 14 | A stale delta leaves title, state, order, and revision unchanged. | Apply a delta with an old revision and assert the rendered projection and revision are byte-for-byte unchanged. |
| 15 | A wrong `baseRevision` preserves the last valid view and starts a read-only snapshot refresh. | Apply a mismatched-base delta and assert the stale view remains visible, refresh state is set, and no mutation request is emitted. |
| 16 | Host order is preserved within every state section and group. | Render deliberately nonalphabetical host order and assert displayed order matches the supplied `order` values. |
| 17 | The client never infers task state from transcript content. | Supply conflicting transcript text and projection state; assert the projection state wins and no text parser is invoked. |
| 18 | A state change produces one concise polite announcement containing the redacted title and new status. | Apply one delta and inspect the live region; assert one announcement and no raw detail or timestamp-first message. |
| 19 | Reduced motion removes update pulse and height transitions. | Emulate `prefers-reduced-motion: reduce`, apply a delta, and assert no transition or animation is active. |
| 20 | All eight tasks done renders only `All done · 8/8` with no controls that imply completion. | Apply the final delta and assert the task list is replaced, no celebration UI exists, and no checkbox or completion button exists. |
| 21 | A new task after all-done restores grouped rendering and recomputes progress. | Apply a new pending task and assert grouped sections return with the corresponding denominator. |
| 22 | Sensitive task title and detail material is redacted everywhere. | Run a fixture through host projection, relay envelope, stored JSON, web state, rendered DOM, cache path, and live-region assertion; only the approved redacted title remains. |
| 23 | Task detail never reaches the v1 DTO or relay logs. | Serialize snapshot and delta fixtures, inspect stored envelope JSON and diagnostic captures, and assert no `detail` field or raw detail string exists. |
| 24 | Push payloads are content-free. | Serialize the todo-change wake fixture and assert it contains no title, detail, state, group, order, plan content, or transcript content. |
| 25 | A host without `todoProjection: 1` leaves the existing transcript unchanged. | Run an old-host capability fixture and assert no todo panel, mutable fallback, or fabricated rows appear. |
| 26 | An older client safely ignores todo envelope kinds. | Feed `todo.snapshot.v1` and `todo.delta.v1` envelopes through the legacy display reducer and assert existing transcript rendering remains unchanged. |
| 27 | Light and dark themes meet the frozen visual contract. | Capture both themes and inspect computed colors, fonts, contrast ratios, focus rings, and absence of non-clay todo accents. |
| 28 | RTL and increased text size preserve readable layout. | Capture RTL and enlarged-text fixtures at 390px; assert wrapped titles, visible states, usable controls, and no unintended horizontal scrolling. |
| 29 | The panel does not auto-scroll during a background update. | Scroll the transcript to an older position, apply a delta, and assert scroll position remains within the allowed stability tolerance. |
| 30 | The phone cannot enable plan mode or `--full-access` through this feature. | Inspect outgoing commands and routes during all todo interactions; assert no plan-mode, full-access, approval, or mutation operation is introduced. |

## Security and redaction requirements

Todos are a read-only host projection. The phone never mutates the list. There is no check-to-complete path, reorder path, add path, delete path, edit path, cancel path, abort path, revision-checked todo mutation, or new ticketed mutation lane.

| Boundary | Allowed | Prohibited |
|---|---|---|
| Pi host or extension | Read current todo state and produce a redacted projection. | Sending raw detail, bypassing plan-mode enforcement, or exposing an unredacted alternate endpoint. |
| Host projection adapter | Allowlist stable ID, redacted title, closed state, redacted group, order, revision, and timestamps. | Inferring state from transcript text, using array position as an unstable long-term identity, or retaining detail. |
| Loopback relay | Validate, persist, replay, and route typed projection envelopes. | Enriching titles, inferring state, logging raw DTOs, or exposing a second mutable endpoint. |
| Typed RPC | Snapshot and delta read models with revision metadata. | Phone-originated todo mutation RPCs or approval tickets for todo changes. |
| PWA store | Redacted allowlisted projection fields and revision metadata. | Raw terminal output, secrets, paths, detail, transcript excerpts, or unbounded task payloads. |
| Push | Generic synchronization availability signal. | Task title, detail, state text, group, order, plan identity, or transcript content. |

Task titles pass through the same redaction policy used elsewhere in the product before DTO construction. The relay’s canonical `redactEnvelope` boundary remains mandatory before persistence and broadcast.

Task detail is discarded before it reaches the relay. If a future version carries detail, it requires an explicit allowlist and redaction review; v1 does not carry it.

The relay must not log raw projection payloads. Diagnostic logs may include an opaque plan identifier, counts, revisions, event kind, and failure category, but never titles, detail, groups, paths, commands, credentials, or transcript excerpts.

The web client must not log raw task objects. Browser storage, service-worker storage, IndexedDB, query caches, transcript JSON, and persisted read models may contain only the redacted allowlisted fields if the existing cache policy guarantees that boundary. Otherwise the projection remains in memory.

Content-free push remains content-free when the todo list changes. Push may wake the app or indicate that synchronization is available, but the app must fetch the projection through the authenticated read-only channel.

The phone cannot change plan mode and cannot enable `--full-access`. Host and extension enforcement remains authoritative. No todo control may call the existing ticketed approval path.

Unknown task states, malformed DTOs, unknown projection versions, duplicate identities, invalid revisions, and revision gaps fail closed. The client may preserve the last validated view during refresh but never applies unvalidated fields.

The extension boundary in `extensions/pi-remote-plan/src/index.ts` remains responsible for plan-mode enforcement and is not weakened by this feature.

## Dependencies and affected areas

Files listed below are existing integration points unless marked as a new implementation file.

| Area | Files | Required impact |
|---|---|---|
| Protocol types | `packages/pi-rpc-protocol/src/types.ts` | Add `TodoProjectionV1`, delta/task types, closed state values, and the `todoProjection: 1` capability shape. |
| Protocol guards | `packages/pi-rpc-protocol/src/guards.ts` | Validate snapshot, delta, task, revision, order, timestamp, capability, and exact-key constraints. |
| Protocol exports | `packages/pi-rpc-protocol/src/index.ts` | Export the new DTOs and guards. |
| Protocol tests | `packages/pi-rpc-protocol/tests/guards.test.ts` | Add valid, malformed, stale-shape, duplicate, unknown-state, and capability fixtures. |
| Host authority | `apps/pi-remote-relay/src/store/todo-projector.ts` (new) | Normalize the authoritative Pi todo source, assign stable opaque identities, allowlist fields, redact titles/groups, discard detail, and create snapshots/deltas. |
| Relay wiring | `apps/pi-remote-relay/src/index.ts` | Publish host snapshots and deltas through `SyncHub`; publish nothing when no authoritative projection exists. |
| Redaction | `apps/pi-remote-relay/src/store/redaction.ts` | Preserve the canonical pre-persistence and pre-broadcast redaction boundary for projection envelopes. |
| Envelope persistence | `apps/pi-remote-relay/src/store/relay-store.ts` | Persist and replay projection envelopes without adding raw task data or an unredacted read path. |
| Live sync | `apps/pi-remote-relay/src/replay/sync.ts` | Reuse the authenticated snapshot, replay barrier, and live delta path. |
| Capability response | `apps/pi-remote-relay/src/http/server.ts` | Advertise `todoProjection: 1` from the authenticated session response without adding a mutation endpoint. |
| Host RPC input | `apps/pi-remote-relay/src/rpc/supervisor.ts` | Provide the authority adapter with the existing host event/source boundary without deriving todos from transcript text. |
| Push boundary | `apps/pi-remote-relay/src/push/push-service.ts` | Preserve content-free push behavior for any generic projection-available wake signal. |
| Relay tests | `apps/pi-remote-relay/tests/redaction.test.ts`, `apps/pi-remote-relay/tests/sync.test.ts`, `apps/pi-remote-relay/tests/security/negative-controls.test.ts`, `apps/pi-remote-relay/tests/push.test.ts`, `apps/pi-remote-relay/tests/todo-projection.test.ts` (new) | Prove redaction, revision safety, compatibility, content-free push, and absence of mutation paths. |
| Web transport | `apps/pi-remote-web/src/relay.ts` | Pass validated todo envelopes to the todo store and implement read-only snapshot refresh by re-subscription. |
| Web state | `apps/pi-remote-web/src/state.ts`, `apps/pi-remote-web/src/todo-state.ts` (new) | Keep todo projection state separate from legacy transcript blocks and apply snapshot/delta revision rules. |
| Web model | `apps/pi-remote-web/src/todo-model.ts` (new) | Normalize display groups, host order, counts, progress, all-done state, and local view state. |
| Web components | `apps/pi-remote-web/src/TodoPanel.tsx` (new) | Implement `TodoPanel`, `TodoPanelHeader`, `TodoProgressHairline`, `TodoStateSection`, `TodoTaskRow`, `TodoStateGlyph`, `TodoUpdatedLabel`, `TodoAllDoneLine`, `TodoLiveRegion`, and `TodoProjectionBlock`. |
| Transcript integration | `apps/pi-remote-web/src/App.tsx`, `apps/pi-remote-web/src/turns.ts` | Render the projection beside activity content while keeping it visible when `ActivityGroup` is collapsed. |
| Web cache | `apps/pi-remote-web/src/cache.ts` | Do not persist projection data unless the redacted allowlist is guaranteed; otherwise keep the projection in memory. |
| Web styling | `apps/pi-remote-web/src/style.css` | Apply existing Inter, Source Serif 4, parchment, ink, clay, focus, motion, safe-area, logical-property, and dark-theme tokens. |
| Web tests | `apps/pi-remote-web/tests/App.test.tsx`, `apps/pi-remote-web/tests/contrast.test.tsx`, `apps/pi-remote-web/tests/TodoPanel.test.tsx` (new), `apps/pi-remote-web/tests/todo-state.test.ts` (new) | Prove rendering, grouping, no-mutation behavior, accessibility, deltas, themes, reduced motion, RTL, and responsive layout. |
| PWA boundary | `apps/pi-remote-web/public/service-worker.js` | Verify that projection data is not cached or exposed through service-worker storage. |
