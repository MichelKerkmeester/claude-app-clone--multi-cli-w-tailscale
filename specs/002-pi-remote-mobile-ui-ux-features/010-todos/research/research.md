# F10-todos — Synthesis

## 1. Decision

Build a first-class `TodoPanel` as an inline parchment block in the Pi Remote transcript. It is rendered by the React 19 transcript renderer using React Aria Components and appears as a sibling block inside `ActivityGroup`, remaining visible when surrounding activity is collapsed. It is not a sheet, modal, drawer, or blocking overlay; the transcript remains readable and no scrim is introduced.

The panel is a read-only host projection. Each task row is informational, not a checkbox or button: the phone cannot complete, add, delete, reorder, cancel, or mutate tasks. View-only controls are limited to refreshing the read model and collapsing or expanding state sections. The state glyph, textual status, host order, progress count, and provenance all come from the projected plan.

The feature reuses the shipped loopback relay, typed RPC protocol, authenticated enrollment, redaction pipeline, synchronization layer, and content-free push boundary. The host or extension remains authoritative for task state and ordering. The phone receives a redacted snapshot or delta and stores only the allowlisted projection. No ticketed mutation lane is added, and plan-mode and `--full-access` enforcement remain unchanged.

## 2. Build spec

### 2.1 Protocol and host authority

The protocol addition is an inbound, host-to-phone todo projection over `packages/pi-rpc-protocol`.

The relay or host authority reads pi’s current todo list and normalizes it into a typed projection before sending it to the PWA.

The web client never reads terminal output to infer tasks.

The web client never derives `done`, `active`, or `blocked` from transcript text.

The host is responsible for task state, task ordering, grouping metadata, plan identity, and revision numbers.

Use a versioned projection contract named `TodoProjectionV1`.

The snapshot wire kind is `todo.snapshot.v1`.

The delta wire kind is `todo.delta.v1`.

The exact serializer and envelope must follow the existing typed RPC naming and validation conventions.

| Field | Type | Contract |
|---|---|---|
| `planId` | opaque string | Stable for the active host plan; must not expose a filesystem path or secret. |
| `source` | literal `"pi"` | Identifies the host-projected source for provenance rendering. |
| `revision` | existing protocol revision scalar | Monotonically increases for every accepted projection change. |
| `updatedAt` | timestamp or `null` | Host timestamp for the latest projection change. |
| `tasks` | `TodoTaskProjectionV1[]` | Complete ordered task set in a snapshot. |
| `task.id` | opaque string | Stable task identity used for keyed rendering and delta matching. |
| `task.title` | redacted display string | Required visible label after the existing redaction policy has run. |
| `task.state` | enum | Exactly `pending`, `active`, `done`, or `blocked`. |
| `task.group` | redacted string or `null` | Optional host-defined plan group; never a client-created category. |
| `task.order` | integer | Host-authoritative order within the plan. |
| `task.revision` | existing protocol revision scalar | Monotonically increases when that task changes. |
| `task.updatedAt` | timestamp or `null` | Optional host timestamp for the task’s latest change. |

`detail` is not rendered by v1 and is not required in `TodoTaskProjectionV1`.

If pi supplies task detail, the host redactor must discard it before serialization.

If a future protocol version carries detail, it must be an explicitly allowlisted, redacted field and must not become an implicit renderer capability.

A snapshot contains the complete current task set.

A delta contains `planId`, `baseRevision`, `revision`, `upsertedTasks`, `removedTaskIds`, and `updatedAt`.

An upsert replaces the task with the same `task.id` only when the incoming revision is newer.

A removed task disappears only because the host projection removed it.

A delta with a stale `revision` is ignored.

A delta whose `baseRevision` does not match the client’s current plan revision triggers a read-only snapshot refresh.

The client must not attempt to merge an unknown delta chain.

The client must not invent missing order values.

The host must publish a snapshot after subscription or reconnect.

The host must publish deltas over the already-shipped authenticated sync channel.

The PWA subscribes only while the authenticated Pi session is active.

A content-free push may wake the app or signal that synchronization is available.

Push payloads must not contain task titles, detail, state text, group names, order, or transcript content.

A push signal may be generic, such as “projection available,” without exposing plan content.

The existing authentication and enrollment boundary remains mandatory.

The existing redaction pipeline runs before relay serialization.

The relay validates the typed DTO but does not enrich titles, infer state, or reconstitute discarded detail.

The extension or host authority must not expose an alternate unredacted todo endpoint.

Capability negotiation advertises `todoProjection: 1`.

A new client connected to an older host receives no todo projection and continues to render its existing transcript.

An older client connected to a newer host must safely ignore the unknown todo wire kind.

No server-side assumption may depend on a client acknowledging or mutating a todo projection.

The phone has no outbound `todo.complete`, `todo.update`, `todo.reorder`, `todo.create`, `todo.delete`, `todo.cancel`, or equivalent RPC.

The `revision` field exists for read-model freshness and delta safety only.

The `revision` field does not create or imply a mutation authorization path.

### 2.2 Component breakdown

Implement the feature in `apps/pi-remote-web` as a stable transcript block backed by the existing sync store.

The intended render relationship is:

`TranscriptRenderer → ActivityGroup → TodoProjectionBlock → TodoPanel`

`TodoProjectionBlock` is a sibling of activity content, not a child hidden behind the activity disclosure.

When `ActivityGroup` is collapsed, `TodoProjectionBlock` remains visible.

When the current plan changes, the block is replaced by `planId`, not by message index.

When the same plan receives a new revision, the existing block and row keys remain stable.

Use the following named components:

- `TodoPanel`
- `TodoPanelHeader`
- `TodoProgressHairline`
- `TodoStateSection`
- `TodoTaskRow`
- `TodoStateGlyph`
- `TodoUpdatedLabel`
- `TodoAllDoneLine`
- `TodoLiveRegion`
- `TodoProjectionBlock`

Use the following named hooks or store selectors:

- `useTodoProjection`
- `useTodoSync`
- `useTodoViewState`
- `useTodoRevision`
- `useTodoAnnouncement`

`useTodoSync` subscribes to the existing authenticated sync source.

`useTodoProjection` exposes the latest validated snapshot for the active session and plan.

`useTodoRevision` exposes current revision and stale-state information.

`useTodoViewState` stores only local collapse state and refresh state.

`useTodoViewState` must not send view-state changes to the host.

`TodoPanel` receives a normalized read model and does not know about transport details.

`TodoPanelHeader` renders provenance, the `doneCount/totalCount` value, the refresh control, and the progress hairline.

The provenance heading should read `pi’s plan · todo` or the product’s approved equivalent using Source Serif 4.

The header must not imply that the phone owns the plan.

`TodoStateSection` uses React Aria Components `Disclosure` semantics for collapse and expansion.

Each section has a heading, count, disclosure control, and a list of rows.

`TodoTaskRow` is a static list item.

`TodoTaskRow` must not be a checkbox, switch, link, drag handle, or button.

`TodoStateGlyph` is decorative because the row also exposes textual state.

`TodoUpdatedLabel` is quiet secondary metadata for changed rows.

`TodoAllDoneLine` replaces the expanded task list after completion.

`TodoLiveRegion` is a visually hidden polite announcement region scoped to the panel.

The panel should use existing Tailwind 4 tokens and layout primitives.

It must not introduce a new color, accent, icon family, font, or card treatment.

The panel should occupy the transcript column width available to it.

The panel should be visually attached to the relevant agent activity without becoming a floating application surface.

The panel should not force transcript scrolling when a delta arrives.

If there is no active projection, no empty todo panel is rendered.

If the projection is unavailable after an explicit refresh, show a non-sensitive read-only unavailable state with a refresh action.

The unavailable state must not echo transport errors, task titles, file paths, or host details.

### 2.3 Task model, states, and grouping

The host state enum is closed and exact:

| Wire state | Display group | Meaning |
|---|---|---|
| `pending` | `To do` | Host says the task has not started. |
| `active` | `Doing` | Host says the task is currently in progress. |
| `done` | `Done` | Host says the task is complete. |
| `blocked` | `Blocked` | Host says progress cannot continue or the task requires resolution. |

The client must not infer `blocked` from a timeout or failed network request.

The client must not infer `done` from a terminal message.

The client must not convert `active` to `done` locally.

The client must not show a “complete” control.

The primary visible grouping is by state.

The display order is `To do`, `Doing`, `Done`, `Blocked`.

Only non-empty state groups are rendered.

Each state group heading includes its count.

The header count is `doneCount/totalCount`.

`totalCount` includes pending, active, done, and blocked tasks.

A blocked task is not counted as done.

An active task is not counted as done.

A task with a duplicate `id` is rejected from the projection and logged without its title.

The optional `group` field is a host-defined logical plan group.

When `group` is present, render it as a subheading inside the state section.

The client may not use `group` to reorder tasks.

The client may not merge groups with similar labels.

The client may not rename groups based on local heuristics.

Within each state section, preserve host `order`.

Within a host group, preserve host `order`.

If a task changes state, it moves to the corresponding state section because the projection changed.

That move is a keyed view update, not a client mutation or a user reorder.

Initial state sections are expanded when first displayed.

A user may collapse any state section.

Collapse state is local, ephemeral, and keyed by `planId` plus section state.

Collapse state is not sent to the host.

Collapse state must not be serialized into transcript task data.

A new plan starts with the default expansion state.

A returning plan may restore only its local view preference if the existing web persistence policy permits it.

If persistence is not already approved, keep collapse state in memory.

For long plans, the panel body may scroll within a bounded region.

Section headers remain sticky within that panel scroll region.

The sticky behavior must not obscure the transcript’s global navigation or safe-area inset.

### 2.4 Progress and live updates

The header displays a compact count such as `3/8`.

The numerator is the number of tasks whose host state is `done`.

The denominator is the total number of projected tasks.

The count remains visible in both light and dark themes.

Under the count, render a 2–3px horizontal progress hairline.

Use carbon ink for the track and clay for the completed portion.

Use the existing dark-theme token mapping so clay and ink remain AA-compliant on dark parchment.

Do not use a progress ring.

Do not use stars, badges, celebratory illustrations, or gamified completion treatment.

The hairline width is proportional to `doneCount / totalCount`.

For an empty plan, do not render a misleading zero-width progress bar.

A snapshot creates the initial panel once.

A delta updates only the affected row, its state-group counts, the header count, and the progress hairline.

Use stable React keys from `task.id`.

Do not key rows by array index.

Do not remount the whole transcript for a todo delta.

Do not remount the whole panel when one task changes.

A state change may move one keyed row between state groups.

A changed row receives a brief hairline pulse using the existing motion token.

The pulse is disabled under `prefers-reduced-motion: reduce`.

The pulse must not change the row’s layout dimensions.

The changed row may show a quiet label such as `updated 1 min ago`.

The timestamp must be rendered from host `updatedAt` when available.

If no host timestamp exists, use the local receipt time and mark it as local only in accessible text.

Do not display a timestamp for every unchanged row.

Do not announce a timestamp as the primary live-region message.

Announce one concise state change per sync batch.

A suitable announcement is “Build tests is now active.”

The announcement must use the already-redacted task title.

The panel must not auto-scroll on a background update.

The panel may remain anchored to its current viewport position during a state-group move.

When `doneCount === totalCount` and `totalCount > 0`, replace the task list with one quiet line: `All done · 8/8`.

The all-done state must not show a celebration screen.

The all-done line is still host-projected and read-only.

If a new pending or active task arrives after all-done, restore the grouped panel from the new snapshot.

If a blocked task appears after all-done, restore the grouped panel and announce the state change.

When a revision gap is detected, preserve the last valid projection while a read-only snapshot refresh is pending.

Show a non-sensitive stale indicator only if the existing product status pattern supports it.

Never present stale task data as current after a failed refresh.

An older host that does not support the projection leaves the existing transcript unchanged.

An older client must not fall back to a mutable checklist.

### 2.5 Touch, gestures, and keyboard

Every task row has a minimum interactive-area-equivalent block size of 44pt.

Although the row is not interactive, its content must remain comfortably tappable and readable.

Every collapse control has a minimum target of 44pt by 44pt.

The refresh control has a minimum target of 44pt by 44pt.

Do not use a row tap to toggle completion.

Do not use swipe actions.

Do not use drag-and-drop.

Do not use long press to mutate task state.

Do not use pinch or horizontal gestures for grouping.

The only task-list gesture is ordinary vertical scrolling.

Collapse controls use React Aria Components `Button` and disclosure semantics.

Keyboard activation uses Enter and Space through the standard button behavior.

The disclosure exposes `aria-expanded`.

The disclosure points to the correct section panel through `aria-controls`.

Only controls enter the keyboard tab order.

Static rows are not individually tabbable.

The focus ring must be visible in both themes.

Use the existing carbon-ink focus token or another already-approved AA focus token.

Do not rely on clay alone for focus indication.

The refresh control has an accessible name such as `Refresh pi todos`.

The state section control includes its state label and count.

When touch is the only input, all controls remain visible without hover.

When the viewport narrows, task titles wrap rather than disappear behind an ellipsis.

### 2.6 Visual, layout, and motion

The panel uses the frozen ink-on-parchment system.

Light theme uses bone `#f8f8f6` and carbon ink through existing design tokens.

Dark theme uses the existing dark parchment and ink mapping.

Clay `#d97757` is the only accent.

No green, blue, yellow, red, purple, or additional status color is introduced.

Hierarchy is typographic and spatial, not chromatic.

The panel has a 1px hairline-ink border.

Use the existing border-radius token if the design system defines one.

Do not introduce a new floating shadow treatment.

Use thin separators between task rows and state sections.

The panel header uses Source Serif 4.

The provenance label uses Source Serif 4.

Task titles use Inter.

Task status text, counts, timestamps, and controls use Inter.

The state glyph is typographic and color-free except for the active clay square.

Pending uses a hollow square with carbon-ink outline.

Active uses a solid clay square.

Done uses a carbon-ink check.

Blocked uses a carbon-ink dash or hatch treatment.

The blocked treatment must be distinguishable without color.

The glyph is paired with visible or screen-reader-readable status text.

The glyph must not be the only state signal.

The header order is provenance, count, refresh control, then progress hairline.

The panel should resemble a calm transcript annotation, not a separate project-management app.

The closest interaction direction is an agent-scoped goals panel over conversation content, as shown in [BoldVoice’s progress and goals panel](https://refero.design/screens/a42eb4ce-58c2-4676-86fe-39f437b74a4d).

The plan remains bound to the active Pi conversation or session, consistent with [BoldVoice’s conversation-scoped goal list](https://refero.design/screens/841f3ea3-8aee-487b-8d19-ee4c34682ea1).

The compact count and hairline follow the useful density of [Monday.com’s “Checklist 3/3” pattern](https://refero.design/screens/bfb3d70d-72b4-494a-953c-db36aa30d7f0).

The explicit running state is informed by [Meta AI’s in-progress workflow panel](https://refero.design/screens/af9c4797-d97a-4320-bc76-2cd3f0475a8b).

The panel should not copy muted graphite text from the reference captures if that text fails contrast.

Map all secondary text to the existing AA-validated ink token.

Use a brief row pulse for live changes.

Do not animate section height during a sync update.

Do not animate the all-done replacement under reduced motion.

Under reduced motion, use immediate state replacement with no pulse or height transition.

### 2.7 Accessibility and internationalization

Use a native list structure where practical: one list per state section and one list item per task.

Each task row has accessible text containing its redacted title and state.

A screen reader must hear `pending`, `active`, `done`, or `blocked` without relying on glyph or color.

Expose the state as visible text or an accessible status node.

Do not use `aria-label` to hide the visible task title from assistive technology.

The state glyph may use `aria-hidden="true"` because its meaning is repeated textually.

The group heading is associated with its section list.

The section count is included in the heading or its accessible description.

The panel has a meaningful accessible label such as `pi’s plan`.

The provenance text is exposed to assistive technology.

Use an `aria-live="polite"` region for state changes.

The live region should announce only changed tasks.

Coalesce multiple changes from one sync delta into one short announcement when practical.

Do not use an assertive live region for ordinary task progress.

Do not announce every unchanged row during initial render.

The refresh result should be announced as a status, not as raw transport output.

The panel must remain understandable when colors are removed.

The panel must remain understandable when motion is removed.

Secondary text and group headers must meet WCAG AA in light and dark themes.

Do not lower contrast by applying opacity to already-muted graphite text.

The muted-graphite treatment in the reference captures is a caution, not a token to copy.

Use `prefers-reduced-motion` to disable the update pulse.

Use CSS logical properties for margins, padding, borders, and alignment.

Support RTL without changing the semantic ordering of status and title.

Mirror only directional affordances such as disclosure chevrons when required.

Use localized state labels rather than translating the wire enum in the host.

Use localized group labels for `To do`, `Doing`, `Done`, and `Blocked`.

Use the platform locale for relative timestamps.

Expose an exact timestamp through the `<time>` element or accessible description.

Task titles wrap at large text sizes.

No task title may be clipped in a way that hides its state or identity.

The panel must survive dynamic type or browser text scaling without horizontal scrolling.

The progress count remains readable at increased text size.

The 44pt minimum target remains true after text scaling.

The panel respects iPhone safe-area padding through the existing transcript layout.

### 2.8 Pass/fail acceptance checks

1. Given an eight-task fixture with three `done` tasks, a screenshot shows one inline parchment panel with the header count `3/8` and a horizontal progress hairline.

2. With the surrounding `ActivityGroup` collapsed, the DOM and screenshot still show the `TodoProjectionBlock` and its header.

3. A projection containing all four states renders the exact display groups `To do`, `Doing`, `Done`, and `Blocked`, with a count on every non-empty group.

4. The accessibility tree exposes each task as a list item with its title and textual status, even when the state glyph is hidden.

5. The four state fixtures render hollow square, clay square, carbon-ink check, and dash or hatch treatments without introducing a second accent color.

6. Computed layout inspection confirms every task row, disclosure control, and refresh control meets the 44pt minimum target.

7. Clicking a state-section disclosure changes only local visibility; a network spy records no todo mutation RPC and the task order in the projection is unchanged.

8. Clicking refresh issues only the existing read-only snapshot or sync request and never sends a completion, reorder, add, delete, or cancel operation.

9. Applying a delta to one task preserves the DOM identity of unaffected rows and updates only the changed row, relevant counts, and progress hairline.

10. Applying a stale delta leaves the rendered task title, state, order, and revision unchanged.

11. Applying a delta with the wrong `baseRevision` preserves the last valid view and starts a read-only snapshot refresh.

12. A state-change fixture causes one polite live-region announcement containing the redacted title and new status.

13. With `prefers-reduced-motion: reduce`, a delta changes state without a pulse, height animation, or layout transition.

14. When all eight tasks become `done`, the screenshot shows only `All done · 8/8` and no celebratory screen or check controls.

15. When a new pending task arrives after all-done, the grouped panel returns and the header changes to `8/9` or the corresponding host count.

16. A redaction fixture containing sensitive task title and detail material shows only the approved redacted title in the DTO, UI, cache, transcript JSON, and user-visible announcement.

17. A content-free push fixture contains no task title, detail, state, group, order, or transcript content.

18. A host without `todoProjection: 1` and an older client both continue rendering the existing transcript without errors, mutable fallback controls, or fabricated todo rows.

19. Light- and dark-theme screenshots show AA-appropriate ink, clay, group headings, timestamps, focus rings, and status text without muted graphite contrast failure.

20. RTL and increased-text-size screenshots show wrapped titles, preserved status text, usable controls, no clipped content, and no unintended horizontal scrolling.

## 3. Consensus vs divergence

### Consensus

- The todo surface should be agent-scoped and conversation-scoped rather than a global task application, following the relationship shown in [BoldVoice’s agent-identity goal list](https://refero.design/screens/841f3ea3-8aee-487b-8d19-ee4c34682ea1).

- The surface should sit over or within conversation content without interrupting the conversation, as shown by [BoldVoice’s progress panel over AI chat](https://refero.design/screens/a42eb4ce-58c2-4676-86fe-39f437b74a4d).

- A compact `done/total` count with a thin horizontal indicator is more appropriate for a mobile transcript than a large dashboard treatment, supported by [Monday.com’s checklist count and bar](https://refero.design/screens/bfb3d70d-72b4-494a-953c-db36aa30d7f0).

- The active state needs explicit wording and visual treatment rather than being implied by a generic loading indicator, consistent with [Meta AI’s running workflow state](https://refero.design/screens/af9c4797-d97a-4320-bc76-2cd3f0475a8b).

- State grouping is a clearer mental model than a flat terminal list, aligned with [Asana’s collapsible status sections](https://refero.design/screens/e411ec40-ec2c-4b10-a15c-3e3c6e1d5e5c).

- Provenance should be named directly so the user understands that the list comes from pi, consistent with [Structured’s plan provenance heading](https://refero.design/screens/215c455c-33f4-47a0-b036-bca4693e62cc).

- Long plans need a scrollable list and section structure, informed by [Structured’s scrollable AI plan](https://refero.design/screens/c02ea4ca-f552-4c74-b7e6-51d2f7d55031).

- A quiet completion summary is preferable to gamification, consistent with [Todoist’s completion summary treatment](https://refero.design/screens/f8cc3bdf-7b16-453f-9538-b9fafe1cebd6).

- Live updates should be timestamped and appear in context, informed by [Gmail/Otto’s timestamped task update in a chat thread](https://refero.design/screens/0b7609ee-7526-4349-bc37-f5af6982f773).

- The state model must be readable without color because the Pi Remote design system is typographic and WCAG AA constrained.

- The phone must remain an observer of the host plan.

- Collapse, refresh, and scroll are view operations, not task operations.

### Resolved divergences

- A blocking sheet or modal was rejected in favor of an inline transcript panel.

- The inline direction preserves the conversation context shown in [BoldVoice’s over-chat goal panel](https://refero.design/screens/a42eb4ce-58c2-4676-86fe-39f437b74a4d).

- Checkbox rows were rejected for v1 even though [Asana’s status groups use checkbox rows](https://refero.design/screens/e411ec40-ec2c-4b10-a15c-3e3c6e1d5e5c).

- A checkbox would imply a mutation path that does not exist and must not be added.

- A progress ring was rejected despite the circular progress treatment in [BoldVoice’s goals screen](https://refero.design/screens/a42eb4ce-58c2-4676-86fe-39f437b74a4d).

- The chosen progress treatment is the compact count and hairline shown by [Monday.com](https://refero.design/screens/bfb3d70d-72b4-494a-953c-db36aa30d7f0).

- A flat activity feed was rejected as the primary representation because it obscures current state.

- The structured state sections retain the useful activity context suggested by [Meta AI’s stacked workflow steps](https://refero.design/screens/327d242c-d0b2-4e7a-a3f3-9fa49627f492).

- Client-side sorting by title, timestamp, or completion was rejected.

- Host `order` remains authoritative even when visual state buckets move a task.

- A separate category-first plan was rejected in favor of state-first grouping.

- The optional host `group` field remains available as a subheading inside each state bucket.

- Status filter chips are deferred even though [Asana shows filter-by-status pills](https://refero.design/screens/f650bb54-bb86-4e57-8b3e-be2d1876be9c).

- A filter could be a useful future view-only affordance, but it adds mobile complexity before task scale is known.

- A celebratory all-complete screen was rejected despite [BoldVoice’s all-complete confirmation state](https://refero.design/screens/95ad0eae-4cd3-4a82-9e55-4ec9cfea2b59).

- Pi Remote uses a single quiet `All done · N/N` line to preserve transcript calm.

- The ink-on-parchment mapping is an intentional product derivation, not a claim that the references use that visual system.

### Minority ideas worth retaining

- A compact status filter may be retained as a future view-only control if plans regularly exceed the panel’s practical scroll limit.

- A provenance line may later expose a non-sensitive plan timestamp or session label if the host contract supplies it.

- The timestamped update treatment from [Gmail/Otto](https://refero.design/screens/0b7609ee-7526-4349-bc37-f5af6982f773) is worth retaining for changed rows, but not for every row.

- The grouped, collapsible plan sections from [Structured](https://refero.design/screens/9787e75a-6ce9-4be6-bc9f-ab5ccd87f480) remain useful if pi later exposes plan phases.

- A compact “how much is done” line from [Todoist](https://refero.design/screens/f8cc3bdf-7b16-453f-9538-b9fafe1cebd6) can remain visible even when the user collapses every section.

- A non-sensitive stale indicator may be retained if offline or reconnect behavior becomes important.

## 4. Security & redaction

Todos are a read-only host projection.

The phone never mutates the todo list.

There is no check-to-complete path.

There is no reorder-that-mutates path.

There is no add, delete, edit, cancel, or abort path.

There is no new ticketed mutation lane.

There is no revision-checked todo mutation.

The existing one-use ticketed mutation-approval boundary remains unchanged and is not called by this feature.

| Boundary | Allowed | Prohibited |
|---|---|---|
| Pi host or extension | Read the current todo state and produce a redacted projection. | Sending raw task detail or bypassing the existing redaction policy. |
| Loopback relay | Validate, synchronize, and route the typed projection. | Inferring task state or exposing an unredacted alternate endpoint. |
| Typed RPC | Snapshot and delta read models with revision metadata. | Any phone-originated todo mutation RPC. |
| PWA store | Redacted title, state, group, order, id, revision, and timestamps. | Raw terminal output, sensitive detail, secrets, or unbounded task payloads. |
| Push | Content-free synchronization availability signal. | Task title, detail, state, group, order, or transcript content. |

Task titles pass through the same redaction pipeline used elsewhere in the product.

Task detail is discarded before it reaches the relay unless a future explicit allowlist says otherwise.

Redaction applies before DTO construction, not only at render time.

The relay must not log raw DTO payloads.

The web client must not log raw task objects.

Diagnostic logs may include an opaque plan identifier, counts, revisions, event kind, and failure category.

Diagnostic logs must not include titles, detail, group text, terminal commands, paths, credentials, or transcript excerpts.

The transcript JSON may contain only the allowlisted projection fields needed to render the feature.

The allowlisted task title is the already-redacted display string.

No raw task detail may appear in transcript JSON.

No raw task detail may appear in browser storage, service-worker storage, IndexedDB, or query caches.

If the existing sync cache persists projections, it may persist only the redacted allowlisted fields and revision metadata.

If the existing cache policy cannot guarantee that boundary, keep the todo projection in memory.

Content-free push remains content-free even when the todo list changes.

A push must not be used as a shortcut for sending a task title or status.

The phone cannot enable `--full-access`.

The phone cannot change plan mode.

Host and extension enforcement of plan mode remains authoritative.

Todo display remains available as a read-only projection regardless of whether the host is in plan mode, subject to the existing host policy.

A stale or malformed projection fails closed for rendering.

The client should preserve the last validated view during a refresh, but must not apply unvalidated fields.

Unknown task states are rejected rather than mapped to `pending`.

Unknown wire versions are ignored safely.

Revision gaps cause a read-only snapshot refresh.

The feature must be reviewed for accidental event-handler paths that call mutation RPCs.

A UI review should fail any row implemented as a checkbox, switch, drag target, or mutation button.

## 5. Open questions + risks

Research coverage gaps must remain explicit:

- No Mobbin captures surfaced across six queries, so no Mobbin URL is used.

- No direct Manus task-list capture surfaced.

- No direct Claude task-list capture surfaced.

- No explicit blocked-state precedent appeared in the supplied captures.

- No cancel or abort affordance appeared in the supplied captures.

- No live task-ticker capture appeared in the supplied captures.

- No ink-on-parchment task-list precedent appeared in the supplied captures.

The absence of these references is not evidence that the corresponding patterns are safe or desirable.

The maximum practical task count is unknown.

A plan with 8 tasks and a plan with 200 tasks may require different default collapse behavior.

Confirm the expected maximum task count before fixing the panel’s scroll height and virtualization strategy.

Confirm whether pi can expose stable task IDs across updates.

If pi only emits array positions, the host adapter must create stable identities without making position the long-term identity.

Confirm whether multiple tasks may be `active` simultaneously.

Confirm whether `blocked` means dependency blocked, approval blocked, failed, or waiting for operator input.

Confirm whether blocked tasks may also carry an explanatory reason.

Do not expose a blocked reason in v1 unless it passes the same title/detail redaction policy.

Confirm whether `group` is a stable plan phase, a terminal label, or an arbitrary host string.

Confirm whether group labels require localization or should be rendered as redacted host-provided text.

Confirm whether pi sends task timestamps or whether the client must use receipt time.

Receipt time is less authoritative and may be misleading after reconnect.

Confirm whether a plan has a stable `planId` across host restart.

If it does not, the client must treat the new plan as a new projection and discard prior view state.

Confirm whether removed tasks should disappear immediately or remain as a host-provided historical state.

V1 should remove tasks when the authoritative snapshot or delta removes them.

The blocked state needs product wording before broad release.

The UI can display `Blocked` in v1 without offering a resolution action.

Cancel and abort are intentionally out of scope because they would require a new mutation and authorization decision.

The all-done collapse behavior should be validated against long-running plans that receive a new task immediately after completion.

The no-auto-scroll rule should be tested while the user is reading an older transcript section.

High-frequency deltas may cause announcement spam or excessive row movement.

The sync layer should batch related deltas and the live region should announce at most one concise change per batch where practical.

Redaction may shorten several task titles to the same fallback string.

The UI needs a stable host-provided opaque ID so duplicate redacted labels remain distinguishable.

Offline behavior is not yet specified.

Decide whether a stale read-only projection is useful or whether the panel should hide after a defined freshness boundary.

Older relay and client compatibility must be tested before enabling the capability by default.

The feature must not depend on a new host mutation permission.

## 6. Sources

### Pi and Pi Remote

- Product context supplied in the request: Pi Remote is an installable iPhone PWA controlling pi on a Mac over a private Tailscale tailnet.

- Product surfaces supplied in the request: `packages/pi-rpc-protocol`, `apps/pi-remote-relay`, `apps/pi-remote-web`, and `extensions/pi-remote-approval`.

- Shipped foundation supplied in the request: loopback relay, typed RPC, authentication and enrollment, redaction, synchronization, one-use ticketed mutation approval, content-free push, plan-mode enforcement, and operator-only `--full-access`.

- Frozen design contract supplied in the request: ink-on-parchment, bone `#f8f8f6`, carbon ink, clay `#d97757` as the only accent, Inter, Source Serif 4, light and dark themes, and WCAG AA.

- No external Pi or Pi Remote URL was supplied, so no Pi or Pi Remote URL is invented here.

### Interaction and implementation

- The inline, agent-scoped panel direction is grounded in [BoldVoice’s progress and goals panel](https://refero.design/screens/a42eb4ce-58c2-4676-86fe-39f437b74a4d).

- Conversation-scoped provenance is grounded in [BoldVoice’s agent-bound goal list](https://refero.design/screens/841f3ea3-8aee-487b-8d19-ee4c34682ea1).

- Compact count and progress are grounded in [Monday.com’s checklist header](https://refero.design/screens/bfb3d70d-72b4-494a-953c-db36aa30d7f0).

- Explicit running state and calm workflow treatment are grounded in [Meta AI’s workflow captures](https://refero.design/screens/ce9d5fda-92f1-4753-bf40-194eea51ecfc) and [Meta AI’s active task capture](https://refero.design/screens/af9c4797-d97a-4320-bc76-2cd3f0475a8b).

- Scrollable and grouped plan structure are grounded in [Structured’s plan list](https://refero.design/screens/c02ea4ca-f552-4c74-b7e6-51d2f7d55031) and [Structured’s grouped plan sections](https://refero.design/screens/9787e75a-6ce9-4be6-bc9f-ab5ccd87f480).

- React Aria Components, the transcript renderer, and the typed RPC implementation direction come from the product stack supplied in the request.

### Accessibility, iPhone, and web platform

- WCAG AA, light and dark theme support, reduced motion, RTL, dynamic type, and 44pt touch targets are normative requirements supplied in the request.

- The muted-graphite contrast caution is derived from the supplied [Meta AI stacked activity capture](https://refero.design/screens/327d242c-d0b2-4e7a-a3f3-9fa49627f492).

- The implementation must use the existing Pi Remote design tokens rather than introducing external color or typography references.

- No additional accessibility, iPhone, or web-platform URL is used because the request restricts citations to the supplied reference URLs.

### Mobile interaction references

- [BoldVoice — progress and goals panel over AI chat](https://refero.design/screens/a42eb4ce-58c2-4676-86fe-39f437b74a4d)

- [BoldVoice — conversation-scoped goal list with agent identity](https://refero.design/screens/841f3ea3-8aee-487b-8d19-ee4c34682ea1)

- [BoldVoice — all-complete confirmation state](https://refero.design/screens/95ad0eae-4cd3-4a82-9e55-4ec9cfea2b59)

- [Monday.com — checklist count and horizontal progress bar](https://refero.design/screens/bfb3d70d-72b4-494a-953c-db36aa30d7f0)

- [Meta AI — dark workflow and progress panel](https://refero.design/screens/ce9d5fda-92f1-4753-bf40-194eea51ecfc)

- [Meta AI — explicit in-progress agent task](https://refero.design/screens/af9c4797-d97a-4320-bc76-2cd3f0475a8b)

- [Meta AI — stacked step and activity feed](https://refero.design/screens/327d242c-d0b2-4e7a-a3f3-9fa49627f492)

- [Structured — scrollable AI plan task list](https://refero.design/screens/c02ea4ca-f552-4c74-b7e6-51d2f7d55031)

- [Structured — grouped collapsible AI plan sections](https://refero.design/screens/9787e75a-6ce9-4be6-bc9f-ab5ccd87f480)

- [Structured — plan provenance heading](https://refero.design/screens/215c455c-33f4-47a0-b036-bca4693e62cc)

- [Asana — collapsible To do, Doing, and Done sections](https://refero.design/screens/e411ec40-ec2c-4b10-a15c-3e3c6e1d5e5c)

- [Asana — filter-by-status pills](https://refero.design/screens/f650bb54-bb86-4e57-8b3e-be2d1876be9c)

- [Todoist — quiet completion summary](https://refero.design/screens/f8cc3bdf-7b16-453f-9538-b9fafe1cebd6)

- [Gmail/Otto — timestamped task update in a chat thread](https://refero.design/screens/0b7609ee-7526-4349-bc37-f5af6982f773)
