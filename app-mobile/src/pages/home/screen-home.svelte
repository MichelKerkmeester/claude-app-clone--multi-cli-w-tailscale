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
    readonly usage?: AccountUsagePayload | null;
    readonly onSelect: (sessionId: string) => void;
    readonly onRevoke: () => void | Promise<void>;
    readonly onLogout: () => void | Promise<void>;
    readonly onRefresh?: () => Promise<void>;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount, untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
  import { compactId, readSessionIdFromLocation } from '$shared/format/view-helpers.js';
  import {
    readCardDensity,
    readRosterGrouping,
    readCardSignalVisibility,
    writeCardDensity,
    writeRosterGrouping,
    writeCardSignalVisibility,
    type CardDensity,
    type RosterGrouping,
    type SignalKey,
    type SignalVisibility,
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
  import {
    completeDeviceCleanup,
    rehydrateDeviceCleanupQueue,
    subscribeDeviceCleanupQueue,
    type DeviceCleanupAction,
  } from '$shared/state/device-cleanup-queue.js';
  import { getSettingsRow } from '$shared/format/settings-search.js';
  import {
    markLastSeen,
    readLastSeenMap,
    writeLastSeenMap,
    type SeenStore,
  } from '$shared/format/seen-marker.js';
  import { shouldRenderCard } from '$shared/format/card-projection.js';
  import {
    barColor,
    barFillPercent,
    DEFAULT_USAGE_DISPLAY_MODE,
    hasUsageCapability,
    percentText,
    projectUsageWindow,
    selectGatingWindow,
    type AccountUsagePayload,
    type UsageReading,
  } from '$shared/format/usage-format.js';
  import { fireHaptic } from '$shared/chrome/haptics.js';
  import { rosterReadBypassesCache, runRosterRefresh } from '$shared/state/foreground-polling.js';
  import Button from '$shared/primitives/button/button.svelte';
  import Freshness from './freshness.svelte';
  import EmptyState from './empty-state.svelte';
  import PushSettings from './push-settings.svelte';
  import UsageSheet from './usage-sheet.svelte';
  import CardSession from './card-session.svelte';
  import {
    activeProjectLabel,
    buildProjectSections,
    dedupSessions,
    deriveListState,
    forceExpandSections,
    hostAttentionPresent,
    organize,
    projectGroupingAvailable,
    searchMatchKind,
    sortByRecency,
    STATUS_SECTION_LABELS,
    TIME_SECTION_LABELS,
    type ProjectListSection,
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
    usage = null,
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
  let density = $state<CardDensity>(readCardDensity());
  let signalVisibility = $state<SignalVisibility>(readCardSignalVisibility());
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
  let collapsedSections = new SvelteSet<string>();
  let collapsedProjectSections = new SvelteSet<string>();
  let expandedProjectSections = new SvelteSet<string>();
  let favoritePref = $state(readFavoritePreference());
  let selectedHost = $state('');
  let seenStore = $state<SeenStore>(readLastSeenMap());
  let retryingCleanup = $state<DeviceCleanupAction | null>(null);
  let cleanupRetryError = $state<{
    readonly action: DeviceCleanupAction;
    readonly message: string;
  } | null>(null);
  let cleanupQueue = $state(rehydrateDeviceCleanupQueue());
  let usageSheetOpen = $state(false);

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
  const smartItems = $derived(organized.smartItems);
  const projectDisplayItems = $derived(
    grouping === 'status'
      ? statusSections.flatMap((section) => section.items)
      : grouping === 'smart'
        ? smartItems
        : timeSections.flatMap((section) => section.items),
  );
  const projectActiveLabel = $derived(
    projectGroupingAvailable(rosterItems) ? activeProjectLabel(rosterItems) : null,
  );
  const projectSections = $derived(
    projectGroupingAvailable(organized.items)
      ? buildProjectSections(projectDisplayItems, projectActiveLabel)
      : null,
  );
  const filteringActive = $derived(statusFilter !== null || searchQuery.trim().length > 0);
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
  const cleanupRows = $derived(
    cleanupQueue.pending.map((action) => ({
      action,
      row: getSettingsRow(action === 'revoke' ? 'revoke-device' : 'logout'),
    })),
  );
  const usageCardWindow = $derived(
    hasUsageCapability(usage) ? selectGatingWindow(usage.windows) : null,
  );
  const usageCardView = $derived(
    usage === null || usageCardWindow === null
      ? null
      : projectUsageWindow(usageCardWindow, Date.now()),
  );

  // ───────────────────────────────────────────────────────────────────
  // 7. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function selectSession(id: string): SessionCardDto | undefined {
    if (resumeLive !== null && resumeLive.id === id) return resumeLive;
    return rosterItems.find((item) => item.id === id);
  }

  function selectLastSeen(id: string): string | undefined {
    return seenStore.lastSeenById.get(id);
  }

  function cardUnread(item: SessionCardDto): boolean {
    return item.status !== 'running' && groupingUnread.has(item.id);
  }

  async function refreshRoster(): Promise<void> {
    if (refreshing) return;
    refreshing = true;
    try {
      if (onRefresh === undefined) {
        throw new Error('Roster refresh is unavailable.');
      }
      await runRosterRefresh({
        bypassCache: rosterReadBypassesCache('pull'),
        fetchLive: () => onRefresh(),
        serveCached: () => {
          throw new Error('Pull-to-refresh cannot use the saved roster.');
        },
      });
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
    const opened = selectSession(sessionId);
    if (opened !== undefined && seenStore.available) {
      const next = markLastSeen(seenStore.lastSeenById, sessionId, opened.updatedAt);
      seenStore = { available: true, lastSeenById: next };
      writeLastSeenMap(next);
    }
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

  function setDensity(next: CardDensity): void {
    density = next;
    writeCardDensity(next);
  }

  function toggleSignal(signal: SignalKey): void {
    const next = { ...signalVisibility, [signal]: !signalVisibility[signal] };
    signalVisibility = next;
    writeCardSignalVisibility(next);
  }

  function sectionIsOpen(key: string): boolean {
    const section = forceExpandSections(
      [{ key, collapsible: true, open: !collapsedSections.has(key) }],
      filteringActive,
    )[0];
    return section?.open ?? true;
  }

  function handleSectionToggle(event: Event, key: string): void {
    const section = event.currentTarget;
    if (!(section instanceof HTMLDetailsElement)) return;
    if (filteringActive) {
      section.open = true;
      return;
    }
    const next = new SvelteSet(collapsedSections);
    if (section.open) next.delete(key);
    else next.add(key);
    collapsedSections = next;
  }

  function projectSectionIsOpen(section: ProjectListSection): boolean {
    const defaultOpen = section.active;
    const open = collapsedProjectSections.has(section.key)
      ? false
      : expandedProjectSections.has(section.key) || defaultOpen;
    return forceExpandSections(
      [{ key: section.key, collapsible: true, open }],
      filteringActive,
    )[0]?.open ?? open;
  }

  function handleProjectSectionToggle(event: Event, key: string): void {
    const section = event.currentTarget;
    if (!(section instanceof HTMLDetailsElement)) return;
    if (filteringActive) {
      section.open = true;
      return;
    }
    const nextCollapsed = new SvelteSet(collapsedProjectSections);
    const nextExpanded = new SvelteSet(expandedProjectSections);
    if (section.open) {
      nextExpanded.delete(key);
      nextCollapsed.add(key);
    } else {
      nextCollapsed.delete(key);
      nextExpanded.add(key);
    }
    collapsedProjectSections = nextCollapsed;
    expandedProjectSections = nextExpanded;
  }

  function previewMatch(item: SessionCardDto): boolean {
    return searchQuery.trim().length > 0 && searchMatchKind(item, searchQuery) === 'preview';
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

  function cleanupHandler(action: DeviceCleanupAction): () => void | Promise<void> {
    return action === 'revoke' ? onRevoke : onLogout;
  }

  function retryCleanup(action: DeviceCleanupAction): void {
    if (retryingCleanup !== null) return;
    cleanupRetryError = null;
    retryingCleanup = action;
    try {
      const result = cleanupHandler(action)();
      if (result === undefined) {
        retryingCleanup = null;
        return;
      }
      void result.then(
        () => {
          completeDeviceCleanup(action);
          retryingCleanup = null;
        },
        (cause: unknown) => {
          cleanupRetryError = {
            action,
            message: cause instanceof Error ? cause.message : 'The cleanup retry did not finish.',
          };
          retryingCleanup = null;
        },
      );
    } catch (cause: unknown) {
      cleanupRetryError = {
        action,
        message: cause instanceof Error ? cause.message : 'The cleanup retry did not finish.',
      };
      retryingCleanup = null;
    }
  }

  function handleNewSession(): void {
    if (!newSessionLive) return;
  }

  function openUsageSheet(): void {
    if (!hasUsageCapability(usage)) return;
    usageSheetOpen = true;
  }

  function usageCardMeterStyle(reading: UsageReading): string {
    const color = barColor(100 - reading.usedPercent);
    return color === null
      ? ''
      : `--usage-fill: ${barFillPercent(reading.usedPercent, DEFAULT_USAGE_DISPLAY_MODE)}%; --usage-color: ${color};`;
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
    const unsubscribeCleanupQueue = subscribeDeviceCleanupQueue((next) => {
      cleanupQueue = next;
    });
    return () => {
      unsubscribeCleanupQueue();
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

  {#if usageCardWindow !== null && usageCardView !== null}
    <section class="usage--slot" aria-labelledby="usage-card-heading">
      <Button
        class="usage--card"
        aria-haspopup="dialog"
        aria-label="Open account usage details"
        onclick={openUsageSheet}
      >
        <span class="usage--card-copy">
          <span class="surface--eyebrow">Account usage</span>
          <strong id="usage-card-heading" data-usage-card-headline="true">{usageCardWindow.label}</strong>
        </span>
        {#if usageCardView.state === 'loading'}
          <span class="usage--card-status" role="status">Loading usage</span>
        {:else if usageCardView.state === 'unavailable'}
          <span class="usage--card-status" role="status">Usage unavailable</span>
        {:else if usageCardView.reading !== null}
          <span class="usage--card-summary">
            <span
              class="usage--card-meter"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={usageCardView.reading.usedPercent}
              aria-label={`${usageCardWindow.label} ${percentText(usageCardView.reading.usedPercent, DEFAULT_USAGE_DISPLAY_MODE)}`}
              style={usageCardMeterStyle(usageCardView.reading)}
            >
              <span class="usage--card-meter-fill"></span>
            </span>
            <span class="usage--card-value">
              {percentText(usageCardView.reading.usedPercent, DEFAULT_USAGE_DISPLAY_MODE)}
              {#if usageCardView.stale}<span class="usage--card-stale">Stale</span>{/if}
            </span>
          </span>
        {/if}
      </Button>
    </section>
    <UsageSheet usage={usage} open={usageSheetOpen} onClose={() => (usageSheetOpen = false)} />
  {/if}

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
          <Button
            class="roster--grouping-option"
            aria-pressed={grouping === 'smart'}
            onclick={() => setGrouping('smart')}
          >
            Smart
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
      {#if resumeLive !== null && shouldRenderCard(resumeLive)}
        <div class="resume--slot" data-resume-slot="true">
          <p class="resume--label">Resume</p>
          <CardSession
            sessionId={resumeLive.id}
            {selectSession}
            source={sessions.source}
            unread={cardUnread(resumeLive)}
            {launchingId}
            openDisabled={resumeOpenDisabled}
            onOpen={handleOpen}
            {selectLastSeen}
            seenAvailable={seenStore.available}
            {unreadIds}
            {density}
            {signalVisibility}
            onDensityChange={setDensity}
            onSignalToggle={toggleSignal}
          />
        </div>
      {/if}
      {#if noMatchEmpty}
        <EmptyState
          loading={false}
          error={null}
          noMatch={true}
        />
      {:else if projectSections !== null}
        {#each projectSections as section (section.key)}
          <details
            class="project--section"
            data-project-section={section.label}
            data-project-active={section.active ? 'true' : 'false'}
            aria-labelledby={`project-heading-${section.label}`}
            open={projectSectionIsOpen(section)}
            ontoggle={(event) => handleProjectSectionToggle(event, section.key)}
          >
            <summary class="project--heading">
              <h3 id={`project-heading-${section.label}`}>
                {section.label}
                <span data-project-count={section.label}>{section.count}</span>
              </h3>
            </summary>
            <div class="session--grid" role="list">
              {#each section.items as item (item.id)}
                {#if shouldRenderCard(item)}
                  <div role="listitem" class="roster--row">
                    <CardSession
                      sessionId={item.id}
                      {selectSession}
                      source={sessions.source}
                      unread={cardUnread(item)}
                      {launchingId}
                      openDisabled={listOpenDisabled}
                      onOpen={handleOpen}
                      {selectLastSeen}
                      seenAvailable={seenStore.available}
                      {unreadIds}
                      {density}
                      {signalVisibility}
                      onDensityChange={setDensity}
                      onSignalToggle={toggleSignal}
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
                    {#if previewMatch(item)}
                      <span class="roster--match-label" data-search-match="preview">Matched in preview</span>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </details>
        {/each}
      {:else if grouping === 'status'}
        {#each statusSections as section (section.bucket)}
          <details
            class="status--section"
            data-status-section={section.bucket}
            aria-labelledby={`status-heading-${section.bucket}`}
            open={sectionIsOpen(`status:${section.bucket}`)}
            ontoggle={(event) => handleSectionToggle(event, `status:${section.bucket}`)}
          >
            <summary class="status--heading">
              <h3 id={`status-heading-${section.bucket}`}>
                {STATUS_SECTION_LABELS[section.bucket]}
                <span data-section-count={section.bucket}>{section.count}</span>
              </h3>
            </summary>
            <div class="session--grid" role="list">
              {#each section.items as item (item.id)}
                {#if shouldRenderCard(item)}
                  <div role="listitem" class="roster--row">
                    <CardSession
                      sessionId={item.id}
                      {selectSession}
                      source={sessions.source}
                      unread={cardUnread(item)}
                      {launchingId}
                      openDisabled={listOpenDisabled}
                      onOpen={handleOpen}
                      {selectLastSeen}
                      seenAvailable={seenStore.available}
                      {unreadIds}
                      {density}
                      {signalVisibility}
                      onDensityChange={setDensity}
                      onSignalToggle={toggleSignal}
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
                    {#if previewMatch(item)}
                      <span class="roster--match-label" data-search-match="preview">Matched in preview</span>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </details>
        {/each}
      {:else if grouping === 'smart'}
        <details
          class="smart--section"
          data-smart-section="true"
          aria-labelledby="smart-heading"
          open={sectionIsOpen('smart')}
          ontoggle={(event) => handleSectionToggle(event, 'smart')}
        >
          <summary class="smart--heading">
            <h3 id="smart-heading">
              Smart
              <span data-smart-count="true">{smartItems.length}</span>
            </h3>
          </summary>
          <div class="session--grid" role="list">
            {#each smartItems as item (item.id)}
              {#if shouldRenderCard(item)}
                <div role="listitem" class="roster--row">
                  <CardSession
                    sessionId={item.id}
                    {selectSession}
                    source={sessions.source}
                    unread={cardUnread(item)}
                    {launchingId}
                    openDisabled={listOpenDisabled}
                    onOpen={handleOpen}
                    {selectLastSeen}
                    seenAvailable={seenStore.available}
                    {unreadIds}
                    {density}
                    {signalVisibility}
                    onDensityChange={setDensity}
                    onSignalToggle={toggleSignal}
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
                  {#if previewMatch(item)}
                    <span class="roster--match-label" data-search-match="preview">Matched in preview</span>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </details>
      {:else}
        {#each timeSections as section (section.bucket)}
          <details
            class="time--section"
            data-time-section={section.bucket}
            aria-labelledby={`time-heading-${section.bucket}`}
            open={sectionIsOpen(`time:${section.bucket}`)}
            ontoggle={(event) => handleSectionToggle(event, `time:${section.bucket}`)}
          >
            <summary class="time--heading">
              <h3 id={`time-heading-${section.bucket}`}>
                {TIME_SECTION_LABELS[section.bucket]}
                <span data-time-count={section.bucket}>{section.count}</span>
              </h3>
            </summary>
            <div class="session--grid" role="list">
              {#each section.items as item (item.id)}
                {#if shouldRenderCard(item)}
                  <div role="listitem" class="roster--row">
                    <CardSession
                      sessionId={item.id}
                      {selectSession}
                      source={sessions.source}
                      unread={cardUnread(item)}
                      {launchingId}
                      openDisabled={listOpenDisabled}
                      onOpen={handleOpen}
                      {selectLastSeen}
                      seenAvailable={seenStore.available}
                      {unreadIds}
                      {density}
                      {signalVisibility}
                      onDensityChange={setDensity}
                      onSignalToggle={toggleSignal}
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
                    {#if previewMatch(item)}
                      <span class="roster--match-label" data-search-match="preview">Matched in preview</span>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </details>
        {/each}
      {/if}
    {/if}
  </section>
  <div class="device-footer">
    <span>
      {device === null ? 'Device key active' : `Host ${compactId(device.hostFingerprint)}`}
    </span>
    <div class="device-footer--controls">
      {#if cleanupQueue.available}
        {#each cleanupRows as cleanup (cleanup.action)}
          <article class="device-cleanup--card" role="alert" data-cleanup-action={cleanup.action}>
            <strong>{cleanup.row.title} unfinished</strong>
            <span class="device-cleanup--detail">
              {cleanup.action === 'revoke'
                ? 'Device removal is unfinished.'
                : 'Sign-out is unfinished.'}
            </span>
            <small>{cleanup.row.description}</small>
            <Button
              class="device-cleanup--retry"
              disabled={retryingCleanup !== null}
              onclick={() => retryCleanup(cleanup.action)}
            >
              Retry
            </Button>
            {#if cleanupRetryError?.action === cleanup.action}
              <span class="device-cleanup--error" role="status">{cleanupRetryError.message}</span>
            {/if}
          </article>
        {/each}
      {/if}
      <div class="device-footer--actions">
        <!-- Do not edit — device logout / revoke onPress handlers — Not designer-editable. -->
        <Button onclick={onLogout}>Log out</Button>
        <Button onclick={onRevoke}>Revoke this device</Button>
      </div>
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
    color: var(--on-accent);
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

  /* Keeps unfinished device actions visible beside the normal controls. */
  .device-footer--controls {
    align-items: center;
    flex-wrap: wrap;
    justify-content: end;
  }

  /* Keeps normal device actions grouped separately from recovery cards. */
  .device-footer--actions {
    display: flex;
    gap: var(--space-2);
  }

  /* Makes an unconfirmed action explicit instead of presenting it as complete. */
  .device-cleanup--card {
    display: grid;
    gap: var(--space-1);
    min-width: min(100%, 15rem);
    padding: var(--space-3);
    border: 1px solid var(--danger);
    border-radius: var(--radius-sm);
    background: var(--danger-soft);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 0.72rem;
  }

  /* Keeps the unfinished action copy readable inside the recovery card. */
  .device-cleanup--detail,
  .device-cleanup--card small {
    color: var(--ink-secondary);
    line-height: 1.4;
  }

  /* Keeps retry touch-sized and visually distinct from the destructive action. */
  :global(.device-cleanup--retry) {
    min-height: 2.75rem;
    justify-self: start;
    padding-inline: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* Reports a failed retry without replacing the durable pending action. */
  .device-cleanup--error {
    color: var(--danger);
    line-height: 1.4;
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
  .status--section,
  .smart--section,
  .project--section {
    margin-bottom: var(--space-6);
  }

  /* Disclosure headers keep section counts available without hiding active hits. */
  .status--heading,
  .time--heading,
  .smart--heading,
  .project--heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 0 var(--space-3);
    color: var(--ink-muted);
    font-size: 0.78rem;
    font-weight: 680;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    list-style: none;
  }

  /* Keep the native disclosure marker from competing with the section label. */
  .status--heading::-webkit-details-marker,
  .time--heading::-webkit-details-marker,
  .smart--heading::-webkit-details-marker,
  .project--heading::-webkit-details-marker {
    display: none;
  }

  /* Preserve heading semantics inside the disclosure trigger. */
  .status--heading h3,
  .time--heading h3,
  .smart--heading h3,
  .project--heading h3 {
    display: flex;
    width: 100%;
    align-items: baseline;
    justify-content: space-between;
    margin: 0;
    color: inherit;
    font: inherit;
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

  /* Explain a preview-only hit without changing the card's host content. */
  .roster--match-label {
    display: block;
    margin-top: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.68rem;
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

  /* ───────────────────────────────────────────────────────────────────
     5. ACCOUNT USAGE SLOT
  ─────────────────────────────────────────────────────────────────── */
  /* Reserves space for usage only when the host has supplied its gating marker. */
  .usage--slot {
    margin-block: var(--space-8);
  }

  /* Makes the host-gated usage summary a clear detail-sheet trigger. */
  :global(.usage--card) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(9rem, 14rem);
    align-items: center;
    gap: var(--space-5);
    width: 100%;
    min-block-size: 6rem;
    padding: var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--ink);
    text-align: start;
    cursor: pointer;
  }

  /* Shows keyboard focus on the summary trigger without relying on its fill color. */
  :global(.usage--card[data-focus-visible]) {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }

  /* Keeps the usage label and host-selected window together. */
  .usage--card-copy {
    display: grid;
    gap: var(--space-2);
  }

  /* Gives the host-selected headline enough emphasis to scan quickly. */
  .usage--card-copy strong {
    font-size: clamp(1.1rem, 3vw, 1.45rem);
  }

  /* Keeps a status word visible when the host has no usable figure. */
  .usage--card-status {
    color: var(--ink-muted);
    font-size: 0.8rem;
    text-align: end;
  }

  /* Keeps the summary number and its meter together on the card. */
  .usage--card-summary {
    display: grid;
    gap: var(--space-2);
  }

  /* Keeps the card meter visible without exposing a zero for unknown data. */
  .usage--card-meter {
    position: relative;
    height: 0.65rem;
    overflow: hidden;
    border-radius: 999px;
    background: var(--line);
  }

  /* Fills the card meter with the accepted host quantity. */
  .usage--card-meter-fill {
    display: block;
    width: var(--usage-fill);
    height: 100%;
    border-radius: inherit;
    background: var(--usage-color);
  }

  /* Aligns the card value and stale marker for a quick scan. */
  .usage--card-value {
    display: flex;
    align-items: baseline;
    justify-content: end;
    gap: var(--space-2);
    font-size: 0.8rem;
    font-weight: 700;
  }

  /* Makes stale data explicit beside the preserved value. */
  .usage--card-stale {
    color: var(--ink-muted);
    font-size: 0.68rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  @media (max-width: 39rem) {
    /* Stacks the usage summary when a phone cannot fit two readable columns. */
    :global(.usage--card) {
      grid-template-columns: 1fr;
    }

    /* Keeps the status and value aligned with the stacked summary. */
    .usage--card-status,
    .usage--card-value {
      text-align: start;
      justify-content: start;
    }
  }
  /* End of surface: home-view */
</style>
