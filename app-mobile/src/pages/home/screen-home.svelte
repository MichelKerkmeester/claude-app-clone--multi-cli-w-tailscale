<script module lang="ts">
  // This module holds the shared Screen Home types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { SessionListState, ConnectionPhase } from '$shared/state/state.js';
  import type { ReadOnlyCache } from '$shared/transport/cache.js';
  import type { DeviceIdentity } from '$shared/transport/auth.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface HomeProps {
    readonly sessions: SessionListState;
    readonly connection: ConnectionPhase;
    readonly cache: ReadOnlyCache | null;
    readonly device: DeviceIdentity | null;
    readonly hosts?: readonly string[];
    readonly onSelect: (sessionId: string) => void;
    readonly onRevoke: () => void;
    readonly onLogout: () => void;
    readonly onRefresh?: () => Promise<void>;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount, untrack } from 'svelte';
  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
  import { compactId, readSessionIdFromLocation } from '$shared/format/view-helpers.js';
  import {
    readRosterGrouping,
    writeRosterGrouping,
    type RosterGrouping,
  } from '$shared/format/roster-view-preference.js';
  import {
    applyUnreadTransitions,
    markSeen,
    readUnreadIds,
    unreadSetsEqual,
    writeUnreadIds,
  } from '$shared/state/unread-overlay.js';
  import {
    readFavoritePreference,
    toggleFavoriteId,
    writeFavoriteIds,
  } from '$shared/state/favorite-preference.js';
  import { fireHaptic } from '$shared/chrome/haptics.js';
  import Button from '$shared/primitives/button/button.svelte';
  import Freshness from './freshness.svelte';
  import EmptyState from './empty-state.svelte';
  import PushSettings from './push-settings.svelte';
  import CardSession from './card-session.svelte';
  import {
    dedupSessions,
    deriveListState,
    hostAttentionPresent,
    organize,
    sortByRecency,
    STATUS_SECTION_LABELS,
    TIME_SECTION_LABELS,
    type StatusFilter,
  } from './session-list-seams.js';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    sessions,
    connection,
    cache,
    device,
    hosts = [],
    onSelect,
    onRevoke,
    onLogout,
    onRefresh,
  }: HomeProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const PULL_THRESHOLD_PX = 56;
  const LAUNCH_TIMEOUT_MS = 8_000;

  let grouping = $state<RosterGrouping>(readRosterGrouping());
  let unreadIds = $state<Set<string>>(readUnreadIds());
  let previousStatuses = $state(new Map<string, SessionCardDto['status']>());
  let launchingId = $state<string | null>(null);
  let refreshing = $state(false);
  let refreshFailed = $state(false);
  let pullDistance = $state(0);
  let pulling = $state(false);
  let pullStartY = 0;
  let edgeBumped = false;
  let launchTimer: ReturnType<typeof setTimeout> | null = null;
  let statusFilter = $state<StatusFilter | null>(null);
  let searchQuery = $state('');
  let favoritePref = $state(readFavoritePreference());
  let selectedHost = $state('');

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Do not edit — staleness derivation — Not designer-editable.
  const isStale = $derived(
    sessions.source === 'cache' || connection !== 'live' || refreshFailed,
  );
  const listView = $derived(deriveListState(sessions, connection));
  const resumeSession = $derived(
    cache === null || cache.sessions.length === 0
      ? null
      : (sortByRecency(cache.sessions)[0] ?? null),
  );
  const resumeLive = $derived(
    resumeSession === null
      ? null
      : (listView.items.find((item) => item.id === resumeSession.id) ?? resumeSession),
  );
  const rosterItems = $derived(
    dedupSessions({
      cacheItems: cache?.sessions ?? [],
      liveItems: listView.items,
    }).filter((item) => item.id !== resumeLive?.id),
  );
  const groupingUnread = $derived(
    hostAttentionPresent(rosterItems) || hostAttentionPresent(resumeLive === null ? [] : [resumeLive])
      ? unreadIds
      : new Set<string>(),
  );
  const organized = $derived(
    organize(
      rosterItems,
      {
        filter: statusFilter,
        query: searchQuery,
        favorites: favoritePref.ids,
        now: Date.now(),
      },
      groupingUnread,
    ),
  );
  const statusSections = $derived(organized.statusSections);
  const timeSections = $derived(organized.timeSections);
  const catalogEmpty = $derived(resumeLive === null && listView.items.length === 0);
  const noMatchEmpty = $derived(
    !catalogEmpty && organized.items.length === 0 && searchQuery.trim().length > 0,
  );
  const listOpenDisabled = $derived(launchingId !== null);
  const resumeOpenDisabled = $derived(launchingId !== null || connection !== 'live');
  const hostChoices = $derived(
    hosts.length > 0 ? hosts : device === null ? [] : [device.hostFingerprint],
  );
  const showHostPicker = $derived(hostChoices.length > 1);
  const newSessionLive = $derived(connection === 'live');

  // ───────────────────────────────────────────────────────────────────
  // 7. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function selectSession(id: string): SessionCardDto | undefined {
    if (resumeLive !== null && resumeLive.id === id) return resumeLive;
    return rosterItems.find((item) => item.id === id);
  }

  async function refreshRoster(): Promise<void> {
    if (refreshing) return;
    refreshing = true;
    try {
      if (onRefresh === undefined) {
        throw new Error('Roster refresh is unavailable.');
      }
      await onRefresh();
      refreshFailed = false;
      fireHaptic('success');
    } catch {
      refreshFailed = true;
      fireHaptic('error');
    } finally {
      refreshing = false;
    }
  }

  function handleOpen(event: MouseEvent, sessionId: string): void {
    event.stopPropagation();
    if (launchingId !== null) return;
    launchingId = sessionId;
    unreadIds = markSeen(unreadIds, sessionId);
    writeUnreadIds(unreadIds);
    fireHaptic('selection');
    onSelect(sessionId);
    if (launchTimer !== null) clearTimeout(launchTimer);
    launchTimer = setTimeout(() => {
      launchingId = null;
      launchTimer = null;
    }, LAUNCH_TIMEOUT_MS);
  }

  function setGrouping(next: RosterGrouping): void {
    grouping = next;
    writeRosterGrouping(next);
  }

  function setStatusFilter(next: StatusFilter): void {
    statusFilter = statusFilter === next ? null : next;
  }

  function toggleFavorite(sessionId: string): void {
    if (!favoritePref.available) return;
    const ids = toggleFavoriteId(favoritePref.ids, sessionId);
    favoritePref = { available: true, ids };
    writeFavoriteIds(ids);
  }

  function handleNewSession(): void {
    if (!newSessionLive) return;
  }

  function onRosterTouchStart(event: TouchEvent): void {
    if (refreshing) return;
    const touch = event.touches[0];
    if (touch === undefined) return;
    pullStartY = touch.clientY;
    pulling = true;
    edgeBumped = false;
    pullDistance = 0;
  }

  function onRosterTouchMove(event: TouchEvent): void {
    if (!pulling) return;
    const touch = event.touches[0];
    if (touch === undefined) return;
    pullDistance = Math.max(0, touch.clientY - pullStartY);
    if (pullDistance >= PULL_THRESHOLD_PX && !edgeBumped) {
      edgeBumped = true;
      fireHaptic('edge-bump');
    }
  }

  function onRosterTouchEnd(): void {
    if (!pulling) return;
    const shouldRefresh = pullDistance >= PULL_THRESHOLD_PX;
    pulling = false;
    pullDistance = 0;
    if (shouldRefresh) void refreshRoster();
  }

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Overlay unread bits from status transitions; writes stay untracked so the
  // overlay cannot re-trigger this effect.
  $effect(() => {
    const items = sessions.items;
    const foregroundId = readSessionIdFromLocation();
    untrack(() => {
      const next = applyUnreadTransitions(previousStatuses, items, foregroundId, unreadIds);
      if (!unreadSetsEqual(unreadIds, next.unread)) {
        unreadIds = next.unread;
        writeUnreadIds(next.unread);
      }
      previousStatuses = next.statuses;
    });
  });

  onMount(() => {
    return () => {
      if (launchTimer !== null) clearTimeout(launchTimer);
    };
  });
</script>

<!-- Component content -->
<!-- Home view -->
<!-- This surface: home-view — hero, session roster, device footer, push settings. States: loading · empty · error · stale. -->
<!-- Do not edit — staleness derivation + select/revoke/logout handlers — Not designer-editable. -->
<main class="home-view">
  <section class="hero">
    <div class="hero-copy--block">
      <p class="surface--eyebrow">Private relay</p>
      <h1>Your agents, within reach</h1>
      <p class="hero-copy">
        Follow redacted Pi activity from this device. Actions stay read-only until an exact
        approval is requested.
      </p>
    </div>
    <div class="relay-orbit" aria-hidden="true">
      <span class="orbit--core">π</span>
      <span class="orbit-node orbit-node--one"></span>
      <span class="orbit-node orbit-node--two"></span>
      <span class="orbit-node orbit-node--three"></span>
    </div>
  </section>

  <section
    class="session--section"
    aria-labelledby="session-heading"
    aria-busy={refreshing ? 'true' : undefined}
    ontouchstart={onRosterTouchStart}
    ontouchmove={onRosterTouchMove}
    ontouchend={onRosterTouchEnd}
  >
    <div class="section-heading">
      <div>
        <h2 id="session-heading">Recent sessions</h2>
        <p>Opaque identifiers only. No prompts, paths, or host context.</p>
      </div>
        <div class="roster--toolbar">
        <div class="roster--grouping" role="group" aria-label="Roster grouping">
          <Button
            class="roster--grouping-option"
            aria-pressed={grouping === 'recency'}
            onclick={() => setGrouping('recency')}
          >
            Recency
          </Button>
          <Button
            class="roster--grouping-option"
            aria-pressed={grouping === 'status'}
            onclick={() => setGrouping('status')}
          >
            Status
          </Button>
        </div>
        <Button
          class="roster--new-session"
          data-new-session="true"
          disabled={!newSessionLive}
          aria-describedby="new-session-unavailable"
          onclick={handleNewSession}
        >
          New session
        </Button>
        <Button class="roster--refresh" aria-label="Refresh sessions" onclick={() => void refreshRoster()}>
          Refresh
        </Button>
        <Freshness stale={isStale} at={sessions.updatedAt ?? cache?.savedAt ?? null} />
      </div>
    </div>
    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {listView.kind === 'loading'
        ? 'Reading the relay'
        : listView.kind === 'error-retry'
          ? 'Catalog unavailable'
          : listView.kind === 'host-too-old'
            ? 'Host too old'
            : `${rosterItems.length} sessions`}
    </div>
    <p id="new-session-unavailable" class="roster--unavailable">
      New session stays unavailable until the host can create one.
    </p>
    {#if showHostPicker}
      <label class="roster--host-picker">
        <span>Host</span>
        <select
          value={selectedHost === '' ? (hostChoices[0] ?? '') : selectedHost}
          aria-label="Host for a new session"
          onchange={(event) => {
            selectedHost = event.currentTarget.value;
          }}
        >
          {#each hostChoices as host (host)}
            <option value={host}>{compactId(host)}</option>
          {/each}
        </select>
      </label>
    {/if}
    <div class="roster--filters">
      <div class="roster--chips" role="group" aria-label="Status filter">
        <Button
          class="roster--chip"
          aria-pressed={statusFilter === 'running'}
          onclick={() => setStatusFilter('running')}
        >
          Active
        </Button>
        <Button
          class="roster--chip"
          aria-pressed={statusFilter === 'idle'}
          onclick={() => setStatusFilter('idle')}
        >
          Idle
        </Button>
        <Button
          class="roster--chip"
          aria-pressed={statusFilter === 'interrupted'}
          onclick={() => setStatusFilter('interrupted')}
        >
          Interrupted
        </Button>
      </div>
      <label class="roster--search">
        <span class="sr-only">Search session ids on this device</span>
        <input
          type="search"
          bind:value={searchQuery}
          placeholder="Search session id"
          aria-label="Search session ids on this device"
          inputmode="search"
          autocomplete="off"
        />
      </label>
    </div>
    {#if !favoritePref.available}
      <p class="roster--favorites-unavailable" role="status">Favorites unavailable</p>
    {/if}
    {#if catalogEmpty}
      <EmptyState
        loading={listView.kind === 'loading'}
        error={listView.kind === 'error-retry' ? listView.error : null}
        hostTooOld={listView.kind === 'host-too-old'}
      />
    {:else}
      {#if resumeLive !== null}
        <div class="resume--slot" data-resume-slot="true">
          <p class="resume--label">Resume</p>
          <CardSession
            sessionId={resumeLive.id}
            {selectSession}
            source={sessions.source}
            unread={groupingUnread.has(resumeLive.id)}
            {launchingId}
            openDisabled={resumeOpenDisabled}
            onOpen={handleOpen}
          />
        </div>
      {/if}
      {#if noMatchEmpty}
        <EmptyState
          loading={false}
          error={null}
          noMatch={true}
        />
      {:else if grouping === 'status'}
        {#each statusSections as section (section.bucket)}
          <section
            class="status--section"
            data-status-section={section.bucket}
            aria-labelledby={`status-heading-${section.bucket}`}
          >
            <h3 class="status--heading" id={`status-heading-${section.bucket}`}>
              {STATUS_SECTION_LABELS[section.bucket]}
              <span data-section-count={section.bucket}>{section.count}</span>
            </h3>
            <div class="session--grid" role="list">
              {#each section.items as item (item.id)}
                <div role="listitem" class="roster--row">
                  <CardSession
                    sessionId={item.id}
                    {selectSession}
                    source={sessions.source}
                    unread={groupingUnread.has(item.id)}
                    {launchingId}
                    openDisabled={listOpenDisabled}
                    onOpen={handleOpen}
                  />
                  <Button
                    class="roster--favorite"
                    data-favorite-id={item.id}
                    aria-pressed={favoritePref.ids.has(item.id)}
                    aria-label="Pin session"
                    disabled={!favoritePref.available}
                    onclick={() => toggleFavorite(item.id)}
                  >
                    Pin
                  </Button>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      {:else}
        {#each timeSections as section (section.bucket)}
          <section
            class="time--section"
            data-time-section={section.bucket}
            aria-labelledby={`time-heading-${section.bucket}`}
          >
            <h3 class="time--heading" id={`time-heading-${section.bucket}`}>
              {TIME_SECTION_LABELS[section.bucket]}
              <span data-time-count={section.bucket}>{section.count}</span>
            </h3>
            <div class="session--grid" role="list">
              {#each section.items as item (item.id)}
                <div role="listitem" class="roster--row">
                  <CardSession
                    sessionId={item.id}
                    {selectSession}
                    source={sessions.source}
                    unread={groupingUnread.has(item.id)}
                    {launchingId}
                    openDisabled={listOpenDisabled}
                    onOpen={handleOpen}
                  />
                  <Button
                    class="roster--favorite"
                    data-favorite-id={item.id}
                    aria-pressed={favoritePref.ids.has(item.id)}
                    aria-label="Pin session"
                    disabled={!favoritePref.available}
                    onclick={() => toggleFavorite(item.id)}
                  >
                    Pin
                  </Button>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      {/if}
    {/if}
  </section>
  <div class="device-footer">
    <span>
      {device === null ? 'Device key active' : `Host ${compactId(device.hostFingerprint)}`}
    </span>
    <div>
      <!-- Do not edit — device logout / revoke onPress handlers — Not designer-editable. -->
      <Button onclick={onLogout}>Log out</Button>
      <Button onclick={onRevoke}>Revoke this device</Button>
    </div>
  </div>
  <PushSettings />
</main>

<!-- Home view -->
<!-- This surface: home-view — hero, session roster, device footer, push settings. Decomposed into this scoped block;
     hero / hero-copy--block / hero-copy / relay-orbit(+::before/::after) / orbit--core / orbit-node(+one/two/three)
     / session--section / section-heading(solo) / session--grid / device-footer(+>div) are owned solely by this
     component so they move with it. Inner card chrome (.session--state / .session--meta(+i) / .open-arrow,
     including the hovered/focus-visible reveal) lives on the session card so one row's styles move with that
     card. .session--card and .device-footer button (Button primitive prop-class + data-hovered/data-focus-visible)
     are reproduced as :global(...) top-level selectors so Svelte scoping cannot drop them; the
     .session--card > strong descendant keeps the primitive ancestor :global and Home's own element scoped.
     .home-view (routed-frame group with session/review/inbox),
     .surface--eyebrow (shared kicker), the .hero h1 base group (shared with review/inbox/enrollment h1),
     .section-heading / .section-heading h2 / .section-heading p groups (shared with session--title /
     session--toolbar / push--settings), the .state--running / .state--idle / .state--interrupted color rules and
     the .state--running .state--icon / .agent--running .state--icon pulsing group (shared with the agent-row
     surface, already left global by SessionStateIcon.svelte), and the shared prefers-contrast /
     forced-colors / reduced-motion .session--card groups stay GLOBAL in app.css (unchanged). The
     @media .section-heading .freshness variant lives in Freshness.svelte. The orbit is static (no
     @keyframes). Values unchanged. -->
<style>
  /* This surface: home-view — hero, session roster, device footer, push settings. */
  /* This state: loading · empty · error · stale — via shared empty--state, inline-alert and freshness surfaces. */
  .hero {
    position: relative;
    display: grid;
    min-height: min(31rem, calc(100dvh - 6rem));
    align-items: center;
    gap: var(--space-12);
    padding-block: clamp(2rem, 8vw, 5.5rem);
    overflow: hidden;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .hero-copy--block {
    position: relative;
    z-index: 1;
    max-width: 43rem;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .hero-copy {
    max-width: 39rem;
    margin: var(--space-6) 0 0;
    color: var(--ink-secondary);
    font-size: clamp(1rem, 2vw, 1.15rem);
    line-height: 1.65;
    text-wrap: pretty;
  }

  /* This slot: orbit — decorative relay graphic. */
  .relay-orbit {
    position: absolute;
    right: -5rem;
    width: clamp(17rem, 34vw, 29rem);
    aspect-ratio: 1;
    border: 1px solid color-mix(in oklch, var(--accent) 25%, var(--line));
    border-radius: 50%;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .relay-orbit::before,
  .relay-orbit::after {
    position: absolute;
    border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--line));
    border-radius: 50%;
    content: '';
  }

  /* Keep this rule aligned with its surrounding surface. */
  .relay-orbit::before {
    inset: 18%;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .relay-orbit::after {
    inset: 36%;
    background: var(--accent-soft);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .orbit--core {
    position: absolute;
    z-index: 1;
    inset: 41%;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    font-size: clamp(1.4rem, 4vw, 2.5rem);
    font-weight: 700;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .orbit-node {
    position: absolute;
    z-index: 2;
    width: 0.7rem;
    height: 0.7rem;
    border: 3px solid var(--canvas);
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .orbit-node--one {
    top: 8%;
    left: 38%;
  }
  /* Keep this rule aligned with its surrounding surface. */
  .orbit-node--two {
    right: 8%;
    bottom: 31%;
  }
  /* Keep this rule aligned with its surrounding surface. */
  .orbit-node--three {
    bottom: 17%;
    left: 14%;
  }

  /* This slot: sessions — recent-sessions section. */
  .session--section {
    padding-top: var(--space-8);
    border-top: 1px solid var(--line-strong);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .section-heading {
    align-items: end;
    margin-bottom: var(--space-6);
  }

  /* This slot: session--grid — the session card roster. */
  .session--grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: var(--space-3);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session--card) {
    position: relative;
    display: grid;
    min-height: 11rem;
    align-content: space-between;
    gap: var(--space-4);
    padding: var(--space-6);
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    text-align: start;
    cursor: pointer;
    transition:
      border-color var(--duration-fast) ease,
      background-color var(--duration-fast) ease,
      transform var(--duration-fast) var(--ease-out);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session--card::after) {
    position: absolute;
    top: 0;
    /* Logical inline span via inset-inline (locale-neutral). */
    inset-inline: 0;
    height: 2px;
    background: var(--accent);
    content: '';
    opacity: 0;
    transition: opacity var(--duration-fast) ease;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session--card[data-hovered]) {
    border-color: var(--line-strong);
    background: var(--surface-raised);
    transform: translateY(-2px);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session--card[data-hovered]::after) {
    opacity: 1;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session--card > strong) {
    align-self: end;
    padding-top: var(--space-4);
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: -0.02em;
  }

  /* This slot: device — device-key footer (logout · revoke). */
  .device-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-top: var(--space-12);
    padding-block: var(--space-4);
    border-top: 1px solid var(--line);
    color: var(--ink-muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .device-footer > div {
    display: flex;
    gap: var(--space-2);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.device-footer button) {
    min-height: 2.75rem;
    padding-inline: var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--danger);
    font-family: var(--font-sans);
    font-size: 0.72rem;
    font-weight: 650;
    white-space: nowrap;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.device-footer button[data-hovered]) {
    background: var(--danger-soft);
  }

  @media (max-width: 52rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .relay-orbit {
      right: -10rem;
      opacity: 0.7;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .hero-copy--block {
      max-width: 75%;
    }
  }

  @media (max-width: 39rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .hero {
      min-height: 26rem;
      align-items: end;
      padding-bottom: var(--space-12);
    }

    /* Keep this rule aligned with its surrounding surface. */
    .hero-copy--block {
      max-width: 100%;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .hero h1 {
      max-width: 11ch;
      font-size: clamp(2.75rem, 14vw, 4rem);
    }

    /* Keep this rule aligned with its surrounding surface. */
    .relay-orbit {
      top: -3rem;
      right: -8rem;
      width: 18rem;
      opacity: 0.45;
    }

    /* Keep this rule aligned with its surrounding surface. */
    :global(.session--card) {
      min-height: 9.5rem;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .device-footer > div {
      flex-wrap: wrap;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    /* Keep this rule aligned with its surrounding surface. */
    :global(.session--card[data-hovered]) {
      transform: none;
    }
  }

  /* ───────────────────────────────────────────────────────────────────
     2. ROSTER GROUPING AND REFRESH
  ─────────────────────────────────────────────────────────────────── */
  /* Groups recency/status and refresh beside the freshness readout. */
  .roster--toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: end;
    gap: var(--space-3);
  }

  /* Device-local grouping; the host never receives this choice. */
  .roster--grouping {
    display: flex;
    padding: 0.2rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--grouping-option) {
    min-height: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--grouping-option[aria-pressed='true']) {
    background: var(--ink);
    color: var(--ink-inverse);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--refresh) {
    min-height: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* ───────────────────────────────────────────────────────────────────
     3. STATUS SECTIONS AND RESUME SLOT
  ─────────────────────────────────────────────────────────────────── */
  /* Always-present section so empty buckets do not jump the list. */
  .status--section {
    margin-bottom: var(--space-6);
  }

  /* Header count uses the same membership function as the rows. */
  .status--heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 0 var(--space-3);
    color: var(--ink-muted);
    font-size: 0.78rem;
    font-weight: 680;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* Reserved last-opened highlight; inert until the connection is live. */
  .resume--slot {
    margin-bottom: var(--space-6);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .resume--label {
    margin: 0 0 var(--space-3);
    color: var(--accent-ink);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* ───────────────────────────────────────────────────────────────────
     4. FILTER, SEARCH, FAVORITE, AND NEW-SESSION CHROME
  ─────────────────────────────────────────────────────────────────── */
  /* Inert create control; stays disabled until the connection is live. */
  :global(.roster--new-session) {
    min-height: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--new-session[data-disabled='true']) {
    cursor: not-allowed;
    opacity: 0.55;
  }

  /* Explains why create cannot run on this client. */
  .roster--unavailable {
    margin: 0 0 var(--space-4);
    color: var(--ink-muted);
    font-size: 0.72rem;
  }

  /* Host picker is chrome only; it never creates a session. */
  .roster--host-picker {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 650;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .roster--host-picker select {
    min-height: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font-size: 0.72rem;
  }

  /* Status chips compose with buckets over the existing status field. */
  .roster--filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .roster--chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--chip) {
    min-height: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--chip[aria-pressed='true']) {
    background: var(--ink);
    color: var(--ink-inverse);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--chip[data-hovered]) {
    border-color: var(--line-strong);
  }

  /* Labelled search; matches opaque ids on this device only. */
  .roster--search {
    display: flex;
    flex: 1 1 12rem;
    min-inline-size: 12rem;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .roster--search input {
    width: 100%;
    min-height: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font-size: 0.85rem;
  }

  /* Unreadable pin store is an explicit unavailable state. */
  .roster--favorites-unavailable {
    margin: 0 0 var(--space-4);
    color: var(--ink-muted);
    font-size: 0.72rem;
  }

  /* Pin sits on the row, not inside the open control. */
  .roster--row {
    position: relative;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--favorite) {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    z-index: 1;
    min-height: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink-secondary);
    font-size: 0.68rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--favorite[aria-pressed='true']) {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--favorite[data-hovered]) {
    border-color: var(--line-strong);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.roster--favorite[data-disabled='true']) {
    cursor: not-allowed;
    opacity: 0.55;
  }

  /* Time buckets omit empty sections; counts match membership. */
  .time--section {
    margin-bottom: var(--space-6);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .time--heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 0 var(--space-3);
    color: var(--ink-muted);
    font-size: 0.78rem;
    font-weight: 680;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  /* End of surface: home-view */
</style>
