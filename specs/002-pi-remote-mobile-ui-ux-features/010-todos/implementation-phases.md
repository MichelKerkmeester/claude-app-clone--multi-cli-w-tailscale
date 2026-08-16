# F10 — Implementation phases

## Phase 1 — Todo projection protocol, host authority, and redaction

### Objective

Deliver the non-visual, read-only projection contract first: host-authoritative snapshots and deltas, typed validation, capability negotiation, redaction, authenticated replay, and explicit proof that no phone-originated todo mutation path exists.

### Scope

- Add the `TodoProjectionV1` snapshot and delta DTO family.
- Add `todo.snapshot.v1` and `todo.delta.v1` envelope kinds.
- Add the `todoProjection: 1` capability.
- Normalize the authoritative Pi todo source without reading transcript text.
- Redact titles and groups before DTO construction and discard detail.
- Reuse `RelayStore`, `SyncHub`, authenticated subscription, and content-free push.
- Do not build the panel UI in this phase.
- Do not add any todo command, HTTP mutation route, ticket, approval, or phone-originated RPC.

### Concrete tasks

- Update `packages/pi-rpc-protocol/src/types.ts` with `TodoTaskProjectionV1`, snapshot `TodoProjectionV1`, delta `TodoProjectionDeltaV1`, the closed state enum, and the capability shape containing `todoProjection: 1`.
- Update `packages/pi-rpc-protocol/src/guards.ts` with exact-key and value guards for task IDs, plan IDs, state, order, timestamps, task revisions, snapshot revisions, delta `baseRevision`, and removed IDs. Reject unknown states, duplicate identities, invalid order values, and malformed timestamps.
- Update `packages/pi-rpc-protocol/src/index.ts` to export the new types and guards.
- Extend `packages/pi-rpc-protocol/tests/guards.test.ts` with valid snapshots, valid deltas, stale-shape fixtures, unknown-state fixtures, duplicate-ID fixtures, malformed revision fixtures, and capability negotiation fixtures.
- Add `apps/pi-remote-relay/src/store/todo-projector.ts` as the host projection adapter. It must:
  - Read only from the authoritative host todo source.
  - Require or create stable opaque task identities without using array position as the long-term identity.
  - Preserve host order and state.
  - Allowlist title, state, group, order, identity, revision, and timestamps.
  - Apply the existing redaction policy to titles and groups.
  - Discard task detail before DTO construction.
  - Reject duplicate IDs and unknown states.
  - Produce a complete snapshot after subscription or reconnect.
  - Produce deltas with `baseRevision` and `revision` for accepted projection changes.
- Update `apps/pi-remote-relay/src/index.ts` to wire the host adapter into the existing event/source lifecycle and publish `todo.snapshot.v1` or `todo.delta.v1` through `SyncHub`. If no authoritative todo source is available, publish no projection rather than inferring one from transcript content.
- Update `apps/pi-remote-relay/src/store/redaction.ts` and `apps/pi-remote-relay/src/store/relay-store.ts` so projection envelopes are redacted before persistence, replay, logging, or broadcast. The relay must validate and route the DTO but must not enrich or reconstruct discarded fields.
- Reuse `apps/pi-remote-relay/src/replay/sync.ts` for authenticated snapshot, replay barrier, reconnect, and live delivery. Do not create a second synchronization channel.
- Update `apps/pi-remote-relay/src/http/server.ts` and the corresponding protocol response so the authenticated session advertises `todoProjection: 1`. Do not add a todo HTTP endpoint or alter the read-only subscription rule.
- Review `apps/pi-remote-relay/src/rpc/supervisor.ts` integration to ensure the authority source is host-controlled and never derived from transcript text.
- Preserve `apps/pi-remote-relay/src/push/push-service.ts` as a content-free boundary. If a generic projection-available wake signal is added, serialize only synchronization availability metadata.
- Add `apps/pi-remote-relay/tests/todo-projection.test.ts` for snapshot creation, delta creation, plan identity, stable IDs, state closure, host order, stale revisions, base-revision mismatch, removal, and no transcript inference.
- Extend `apps/pi-remote-relay/tests/redaction.test.ts`, `apps/pi-remote-relay/tests/sync.test.ts`, `apps/pi-remote-relay/tests/security/negative-controls.test.ts`, and `apps/pi-remote-relay/tests/push.test.ts` for redaction, replay, malformed data, content-free push, and no-mutation guarantees.
- Do not modify `apps/pi-remote-relay/src/store/transcript-projector.ts` to infer todo state from existing `PlanBlock` data. The dedicated projection must remain separate from the legacy transcript projection.

### Verification gate

Run `npm run typecheck` and `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests`.

The gate passes only when both commands exit 0, all projection and security fixtures pass, and no task-created mutation command or route is present.

### Acceptance

- A valid host snapshot and delta pass protocol guards.
- Unknown states, duplicate IDs, invalid revisions, invalid order values, missing required fields, and malformed timestamps fail closed.
- `todo.snapshot.v1` and `todo.delta.v1` are accepted as envelope kinds without changing legacy transcript behavior.
- A snapshot is published after a new subscription or reconnect.
- A mismatched delta base revision does not cause the relay to invent or merge a chain.
- Task detail is absent from the DTO, persisted envelope, replay payload, diagnostic log, and push payload.
- Titles and group labels are redacted before relay persistence and broadcast.
- The capability response exposes `todoProjection: 1`; a missing capability is treated as unsupported.
- No `todo.*` mutation command, HTTP route, ticket, approval, or phone-originated RPC is introduced.
- Existing plan-mode and `--full-access` authority boundaries remain unchanged.

## Phase 2 — Inline todo panel, grouping, state glyphs, and progress

### Objective

Render the validated snapshot as a calm inline transcript panel with host ordering, state grouping, static rows, progress, local disclosure controls, and the frozen ink-on-parchment visual system.

### Scope

- Add the normalized web read model and initial snapshot state.
- Add the inline `TodoPanel` component family.
- Integrate `TodoProjectionBlock` with `TranscriptList` and `ActivityGroup`.
- Render all four states, optional host groups, progress count, and hairline.
- Implement local collapse and read-only refresh affordances.
- Reuse the existing transcript renderer and design tokens.
- Keep live delta behavior limited to the state boundaries established in Phase 1; full live update hardening belongs to Phase 3.

### Concrete tasks

- Add `apps/pi-remote-web/src/todo-model.ts` with pure functions for:
  - State-to-display-group mapping.
  - Host-order preservation.
  - Optional group subheadings without client reordering.
  - `doneCount/totalCount` calculation.
  - Empty-plan handling.
  - All-done replacement.
  - Read-only unavailable and stale display states.
- Add `apps/pi-remote-web/src/todo-state.ts` for validated snapshot state, active `planId`, current projection revision, local section collapse state, refresh state, and unsupported-host handling.
- Update `apps/pi-remote-web/src/relay.ts` to pass `todo.snapshot.v1` envelopes through the authenticated sync flow without treating them as transcript blocks or sending a todo command.
- Add `apps/pi-remote-web/src/TodoPanel.tsx` with:
  - `TodoPanel`.
  - `TodoPanelHeader`.
  - `TodoProgressHairline`.
  - `TodoStateSection`.
  - `TodoTaskRow`.
  - `TodoStateGlyph`.
  - `TodoUpdatedLabel`.
  - `TodoAllDoneLine`.
  - `TodoLiveRegion`.
  - `TodoProjectionBlock`.
- Make `TodoTaskRow` a static list item with no checkbox, switch, link, button, drag handle, or mutation handler.
- Use React Aria Components `Disclosure`, `DisclosurePanel`, and `Button` for section collapse and refresh.
- Update `apps/pi-remote-web/src/App.tsx` so `TodoProjectionBlock` is mounted beside routine activity content and remains outside the disclosure panel that hides routine evidence. Keep the panel bound to `planId`, not message index.
- Update `apps/pi-remote-web/src/state.ts` only as needed to route todo envelopes into the separate todo state without changing existing transcript normalization or legacy `PlanBlock` rendering.
- Update `apps/pi-remote-web/src/style.css` using existing tokens:
  - Bone `#f8f8f6`, carbon ink, and clay `#d97757`.
  - Inter for task content and controls.
  - Source Serif 4 for provenance and panel heading.
  - Existing light/dark parchment and ink mappings.
  - Existing focus, radius, separator, safe-area, and motion tokens.
- Use the existing `apps/pi-remote-web/src/turns.ts` and transcript layout primitives rather than creating a separate task screen or global navigation surface.
- Add `apps/pi-remote-web/tests/TodoPanel.test.tsx` for static rows, group headings, counts, glyphs, all-done rendering, collapse behavior, refresh labeling, and absence of mutation controls.
- Add `apps/pi-remote-web/tests/todo-state.test.ts` for snapshot normalization, plan identity, host ordering, counts, all-done replacement, and unsupported-host behavior.
- Extend `apps/pi-remote-web/tests/App.test.tsx` for collapsed `ActivityGroup` visibility and transcript integration.
- Extend `apps/pi-remote-web/tests/contrast.test.tsx` for panel borders, secondary text, glyphs, focus rings, and light/dark contrast.

### Verification gate

Run `npm run typecheck`, `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests`, and `npm run test:web`.

Then run a true 390px CDP pass in both light and dark themes covering the inline panel, collapsed activity, wrapped titles, 44pt controls, safe-area padding, and progress rendering.

### Acceptance

- The eight-task, three-done fixture renders `3/8` and a clay progress hairline.
- All four state groups render with correct localized headings and counts.
- Host order is preserved; no title, timestamp, or completion sorting occurs.
- Optional host groups render as subheadings without changing task order.
- The panel remains visible when surrounding activity is collapsed.
- Rows are static and contain no checkbox or mutation affordance.
- Section disclosure and refresh controls expose correct accessible names and 44pt targets.
- The all-done fixture renders only `All done · N/N` for the task body.
- Light and dark screenshots use only the frozen accent and existing typography tokens.
- No new card, modal, floating shadow, icon family, or status color is introduced.
- The true 390px CDP pass shows no clipped titles, horizontal overflow, or unsafe control placement.

## Phase 3 — Live delta updates, accessibility, visual, and iPhone/PWA release hardening

### Objective

Complete revision-safe live updates and release hardening across accessibility, motion, internationalization, visual contrast, cache boundaries, push behavior, and real iPhone/PWA-sized layouts.

### Scope

- Apply snapshots and deltas with plan and task revision safety.
- Preserve valid data during refresh and recover from gaps through read-only snapshots.
- Update only affected rows and derived counts.
- Add polite announcements, reduced-motion behavior, RTL, dynamic text sizing, safe-area checks, and no-auto-scroll guarantees.
- Verify content-free push and old-client compatibility.
- Prove browser and PWA storage cannot retain raw todo material.
- Complete true 390px light/dark CDP and release build checks.

### Concrete tasks

- Extend `apps/pi-remote-web/src/todo-state.ts` to:
  - Ignore stale deltas.
  - Require matching `baseRevision`.
  - Preserve the last valid projection during refresh.
  - Request a read-only snapshot after a revision gap or base mismatch.
  - Remove only host-removed task IDs.
  - Apply an upsert only when its task revision is newer.
  - Replace the projection when `planId` changes.
- Update `apps/pi-remote-web/src/relay.ts` to implement read-only snapshot refresh by re-subscribing through the existing authenticated sync socket without introducing a todo command or HTTP mutation route.
- Update `apps/pi-remote-web/src/state.ts` to keep transcript cursor state and todo projection revision state independent while preserving existing transcript rendering.
- Complete `useTodoProjection`, `useTodoSync`, `useTodoViewState`, `useTodoRevision`, and `useTodoAnnouncement` behavior in the web state/component implementation.
- Update `apps/pi-remote-web/src/TodoPanel.tsx` with:
  - Stable task keys from opaque task IDs.
  - A scoped `aria-live="polite"` region.
  - One concise announcement per sync batch where practical.
  - Host timestamp rendering through `<time>` or accessible descriptions.
  - No row auto-focus or auto-scroll on background changes.
  - Quiet all-done replacement and restoration when new tasks arrive.
- Update `apps/pi-remote-web/src/style.css` for:
  - `prefers-reduced-motion`.
  - RTL logical properties.
  - Dynamic text size and wrapped titles.
  - Safe-area padding.
  - Sticky section headers inside bounded panel scrolling.
  - AA-safe light/dark focus, secondary text, group headings, and timestamps.
  - No layout animation during synchronization.
- Update `apps/pi-remote-web/src/cache.ts` and inspect `apps/pi-remote-web/public/service-worker.js` to prove that raw task titles, detail, groups, paths, secrets, and transcript content cannot enter browser or service-worker persistence. Keep projections in memory if the existing cache boundary cannot guarantee the allowlist.
- Extend `apps/pi-remote-relay/src/push/push-service.ts` and its tests only if a generic projection-available wake signal is required. Assert that push remains content-free.
- Extend `apps/pi-remote-relay/src/index.ts` and compatibility tests to verify that older clients ignore todo envelope kinds and newer clients treat absent capability as unsupported.
- Add live-update coverage in `apps/pi-remote-web/tests/todo-state.test.ts` and `apps/pi-remote-web/tests/TodoPanel.test.tsx` for stale deltas, base-revision mismatch, row identity, live-region coalescing, reduced motion, all-done restoration, RTL, increased text size, and no-auto-scroll behavior.
- Extend `apps/pi-remote-web/tests/App.test.tsx` and `apps/pi-remote-web/tests/contrast.test.tsx` for collapsed activity, focus visibility, theme contrast, and dynamic layout.
- Re-run relay security coverage in `apps/pi-remote-relay/tests/security/negative-controls.test.ts`, `apps/pi-remote-relay/tests/redaction.test.ts`, and `apps/pi-remote-relay/tests/push.test.ts`.
- Verify that `extensions/pi-remote-plan/src/index.ts` remains the authority for plan-mode enforcement and that the phone cannot enable `--full-access`.

### Verification gate

Run the complete final gate:

- `npm run typecheck`
- `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests`
- `npm run test:web`
- `npm run build`
- True 390px CDP smoke tests in light and dark themes, including a delta while scrolled, collapsed activity, focus navigation, safe-area padding, RTL, increased text size, and reduced motion.

All commands must exit 0. The CDP run must use an actual 390px-wide viewport rather than a desktop window scaled visually.

### Acceptance

- A valid delta preserves unaffected DOM nodes and changes only the affected row and derived counts.
- A stale delta is ignored without changing rendered task content or revision.
- A wrong base revision preserves the last valid view and starts a read-only snapshot refresh.
- A malformed projection never reaches rendered state.
- A state change produces one concise polite announcement with the redacted title and localized status.
- Reduced motion disables pulse and layout transitions.
- The panel does not auto-scroll when a background delta arrives.
- All-done rendering and restoration after a new pending, active, or blocked task are correct.
- Screen-reader output exposes provenance, title, state, group count, disclosure state, refresh name, and exact timestamps.
- RTL, browser text scaling, and dynamic type preserve status visibility, wrapped titles, 44pt controls, and no horizontal overflow.
- Light and dark themes meet WCAG AA with clay as the only todo accent.
- Content-free push, redaction, browser cache, service-worker, transcript JSON, and diagnostic-log checks pass.
- Older clients and older hosts continue to render the existing transcript without mutable fallback controls.
- The final typecheck, protocol/relay tests, web tests, build, and true 390px CDP light/dark checks all pass.
