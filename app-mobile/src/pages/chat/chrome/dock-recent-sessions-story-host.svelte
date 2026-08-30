<script module lang="ts">
  // This module holds the shared Recent Sessions Dock Story Host types.
  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
  import type { RecentSessionsDockProps } from './dock-recent-sessions.svelte';

  // The dock's own props stay required; the fixture inputs are optional so this
  // host is still assignable wherever the dock is, which keeps the story's
  // `component` pointed at the real dock rather than at its host.
  export interface DockRecentSessionsStoryHostProps extends RecentSessionsDockProps {
    readonly roster?: readonly SessionCardDto[] | undefined;
    readonly rosterAt?: string | undefined;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: RECENT SESSIONS DOCK STORY HOST
  // ───────────────────────────────────────────────────────────────────
  // The dock reads the app store and the action set out of Svelte context. In
  // the app the root layout establishes both during its own initialisation,
  // which is the only point `setContext` is legal.
  //
  // A story cannot do that from its `render` function: `render` is called by the
  // preview rather than during a component's init, so `setContext` there throws
  // `lifecycle_outside_component` as soon as the preview's render path changes.
  // It did exactly that when the docs layer was added, and the failure surfaced
  // as an error panel filling the frame rather than as a thrown error. This host
  // does the layout's job at the only time Svelte permits it.

  import DockRecentSessions from './dock-recent-sessions.svelte';
  import {
    createAppState,
    setAppActions,
    setAppState,
  } from '$shared/state/app-state.svelte.js';
  import { writeRecencyStack } from '$shared/state/recency-stack.js';

  let {
    sessionId,
    resolveBadge,
    roster = [],
    rosterAt = '2026-08-18T09:50:00.000Z',
  }: DockRecentSessionsStoryHostProps = $props();

  const noop = (): void => {};

  // Init-time, exactly as the root layout does it. Read once on purpose: a story
  // seeds a fixture, it does not re-seed the store as props change.
  const seed = roster;
  const seedAt = rosterAt;
  const app = setAppState(createAppState());
  app.dispatchSessions({ type: 'loaded', items: seed, at: seedAt });
  setAppActions({
    navigate: noop,
    openReview: noop,
    openInbox: noop,
    onRevoke: noop,
    onLogout: noop,
  });
  writeRecencyStack(seed.map((session) => session.id));
</script>

<!-- Component content -->
<!-- Forwarded by spread rather than as a bare attribute: the prop is optional
     under exactOptionalPropertyTypes, so passing it explicitly as undefined is
     a type error where omitting it is not. -->
<DockRecentSessions
  {...(resolveBadge === undefined ? { sessionId } : { sessionId, resolveBadge })}
/>
