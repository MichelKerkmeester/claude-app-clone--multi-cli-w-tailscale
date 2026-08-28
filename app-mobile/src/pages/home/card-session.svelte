<script module lang="ts">
  // This module holds the shared Session Card types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SESSION CARD
  // ───────────────────────────────────────────────────────────────────

  import type {
    CardDensity,
    SignalKey,
    SignalVisibility,
  } from '$shared/format/roster-view-preference.js';
  import type {
    LiveActivityCandidate,
    LiveActivityEvent,
  } from '$shared/format/live-activity-arbitration.js';
  import type { SessionCardInput } from './session-list-seams.js';

  export interface LiveActivityCardInput {
    readonly candidates: readonly LiveActivityCandidate[];
    readonly event?: LiveActivityEvent;
  }

  export const COUNTDOWN_MINUTE_MS = 60_000;

  export function nextMinuteBoundaryDelay(now: number): number {
    const remainder = ((now % COUNTDOWN_MINUTE_MS) + COUNTDOWN_MINUTE_MS) % COUNTDOWN_MINUTE_MS;
    return remainder === 0 ? COUNTDOWN_MINUTE_MS : COUNTDOWN_MINUTE_MS - remainder;
  }

  export function formatCountdown(expiresAt: number, now: number): string {
    const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1_000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  export interface SessionCardProps {
    readonly sessionId: string;
    readonly selectSession: (id: string) => SessionCardInput | undefined;
    readonly source: 'none' | 'cache' | 'relay';
    readonly unread: boolean;
    readonly unreadIds?: ReadonlySet<string>;
    readonly density?: CardDensity;
    readonly signalVisibility?: SignalVisibility;
    readonly onDensityChange?: (density: CardDensity) => void;
    readonly onSignalToggle?: (signal: SignalKey) => void;
    readonly launchingId: string | null;
    readonly openDisabled: boolean;
    readonly onOpen: (event: MouseEvent, sessionId: string) => void;
    readonly selectLastSeen?: (id: string) => string | undefined;
    readonly seenAvailable?: boolean;
    readonly liveActivity?: LiveActivityCardInput;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';
  import type { LiveActivityContentInput } from '$shared/format/live-activity-content.js';
  import {
    arbitrateLiveActivity,
    selectLiveActivity,
    type LiveActivitySelection,
  } from '$shared/format/live-activity-arbitration.js';
  import { resolveLiveActivityContent } from '$shared/format/live-activity-content.js';
  import { resolveLiveActivityStaleness } from '$shared/state/live-activity-staleness.js';
  import { createLatchedDismiss } from '$shared/state/latched-dismiss.js';
  import { sessionStatusLabel, relativeTimeAt } from '$shared/format/view-helpers.js';
  import {
    decideStalePresentation,
    hasInlineEnrichment,
    hueFromId,
    projectSessionCard,
  } from '$shared/format/card-projection.js';
  import { changedSinceLooked } from '$shared/format/seen-marker.js';
  import { reconnectVerdict } from '$shared/state/reconcile-seams.js';
  import { readCacheExpiresAt, readHostCount } from './session-list-seams.js';
  import Button from '$shared/primitives/button/button.svelte';
  import SessionStateIcon, { toolGlyphFor } from '$shared/chrome/session-state-icon.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    sessionId,
    selectSession,
    source,
    unread,
    unreadIds,
    density = 'detailed',
    signalVisibility = {
      activity: true,
      preview: true,
      prompt: true,
      agent: true,
      context: true,
    },
    onDensityChange = () => undefined,
    onSignalToggle = () => undefined,
    launchingId,
    openDisabled,
    onOpen,
    selectLastSeen = () => undefined,
    seenAvailable = true,
    liveActivity,
  }: SessionCardProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. DISPLAY CONTROLS
  // ───────────────────────────────────────────────────────────────────

  const EMPTY_UNREAD_IDS: ReadonlySet<string> = new Set();
  const SIGNAL_KEYS: readonly SignalKey[] = ['activity', 'preview', 'prompt', 'agent', 'context'];
  const SIGNAL_LABELS: Record<SignalKey, string> = {
    activity: 'Activity',
    preview: 'Preview',
    prompt: 'Prompt',
    agent: 'Agent',
    context: 'Context',
  };
  const COMPACT_SIGNAL_KEYS: readonly SignalKey[] = ['activity', 'preview'];
  const localUnreadIds = $derived(
    unreadIds ?? (unread ? new Set([sessionId]) : EMPTY_UNREAD_IDS),
  );

  function handleControlKeydown(event: KeyboardEvent, activate: () => void): void {
    event.stopPropagation();
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activate();
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Per-id selector: one session's flip invalidates this card, not a roster object.
  const session = $derived(selectSession(sessionId));
  const projection = $derived(
    session === undefined ? null : projectSessionCard(session, localUnreadIds),
  );
  const staleLook = $derived(
    session === undefined
      ? 'fresh'
      : decideStalePresentation(session.status, session.updatedAt, Date.now()),
  );
  const reconnectLook = $derived(
    session === undefined ? 'undecided' : reconnectVerdict(session, source),
  );
  const presentedStatus = $derived(
    session === undefined
      ? 'unknown'
      : staleLook === 'stale-unknown'
        ? 'unknown'
        : session.status,
  );
  const isLaunching = $derived(launchingId === sessionId);
  const timeLabel = $derived(
    session === undefined ? 'unknown time' : relativeTimeAt(session.updatedAt, Date.now()),
  );
  const hue = $derived(session === undefined ? 0 : hueFromId(session.id));
  const lastSeenUpdatedAt = $derived(selectLastSeen(sessionId));
  const showSeenDot = $derived(
    session === undefined
      ? false
      : changedSinceLooked(session.updatedAt, lastSeenUpdatedAt, seenAvailable),
  );
  const showUnread = $derived(
    session !== undefined && session.status !== 'running' && localUnreadIds.has(session.id),
  );
  const showInlineDetail = $derived(projection !== null && hasInlineEnrichment(projection));
  const showActivity = $derived(
    signalVisibility.activity &&
      (density === 'detailed' || COMPACT_SIGNAL_KEYS.includes('activity')),
  );
  const showPreview = $derived(
    signalVisibility.preview &&
      (density === 'detailed' || COMPACT_SIGNAL_KEYS.includes('preview')),
  );
  const showPrompt = $derived(
    signalVisibility.prompt &&
      (density === 'detailed' || COMPACT_SIGNAL_KEYS.includes('prompt')),
  );
  const showAgent = $derived(
    signalVisibility.agent &&
      (density === 'detailed' || COMPACT_SIGNAL_KEYS.includes('agent')),
  );
  const showContext = $derived(
    signalVisibility.context &&
      (density === 'detailed' || COMPACT_SIGNAL_KEYS.includes('context')),
  );
  let cacheClock = $state(Date.now());
  const cacheExpiresAt = $derived(session === undefined ? null : readCacheExpiresAt(session));
  const cacheCountdown = $derived(
    cacheExpiresAt === null ? null : formatCountdown(cacheExpiresAt, cacheClock),
  );
  const tokenCount = $derived(session === undefined ? null : readHostCount(session, 'tokenCount'));
  const toolCallCount = $derived(
    session === undefined ? null : readHostCount(session, 'toolCallCount'),
  );
  const toolGlyph = $derived.by(() => {
    if (session === undefined || session.status !== 'running' || projection === null || projection.tool === null) return null;
    return toolGlyphFor(projection.tool);
  });
  const activityLine = $derived.by(() => {
    if (projection === null || toolGlyph !== null) return null;
    if (projection.activity === null && projection.tool === null) return null;
    const unknownWorkingTool =
      session?.status === 'running' && projection.tool !== null && toolGlyphFor(projection.tool) === null;
    if (unknownWorkingTool) return projection.activity ?? projection.tool;
    if (projection.activity !== null && projection.tool !== null) {
      return `${projection.activity} (${projection.tool})`;
    }
    return projection.activity ?? projection.tool;
  });

  let liveActivitySelection = $state<LiveActivitySelection | null>(null);
  let liveActivityDismissVersion = $state(0);
  let liveActivityClock = $state(Date.now());
  const liveActivityDismiss = createLatchedDismiss<string>();

  $effect(() => {
    const capability = liveActivity;
    if (capability === undefined) {
      untrack(() => {
        liveActivitySelection = null;
      });
      return;
    }

    const candidates = capability.candidates;
    const event = capability.event;
    const unreadIdsForActivity = localUnreadIds;
    const current = untrack(() => liveActivitySelection);
    const next = untrack(() => {
      if (current === null) return selectLiveActivity(candidates, unreadIdsForActivity);
      if (event === undefined) return current;
      return arbitrateLiveActivity({
        current,
        event,
        localUnreadIds: unreadIdsForActivity,
        sessions: candidates,
      });
    });
    untrack(() => {
      liveActivitySelection = next;
    });
  });

  const liveActivityForCard = $derived(
    session !== undefined &&
      liveActivitySelection !== null &&
      liveActivitySelection.session.id === session.id
      ? liveActivitySelection
      : null,
  );
  const liveActivityContentInput = $derived.by((): LiveActivityContentInput | null => {
    const selected = liveActivityForCard;
    if (selected === null) return null;
    const selectedProjection = projectSessionCard(selected.session, localUnreadIds);
    return {
      ...(selectedProjection.prompt === null ? {} : { prompt: selectedProjection.prompt }),
      ...(selectedProjection.activity === null ? {} : { activity: selectedProjection.activity }),
      state: sessionStatusLabel(selected.session.status),
    };
  });
  const liveActivityLine = $derived(
    liveActivityContentInput === null
      ? undefined
      : resolveLiveActivityContent(liveActivityContentInput),
  );
  const liveActivityStateKey = $derived.by(() => {
    const selected = liveActivityForCard;
    if (selected === null || liveActivityLine === undefined) return null;
    return JSON.stringify({
      id: selected.session.id,
      status: selected.session.status,
      updatedAt: selected.session.updatedAt,
      badge: selected.badge?.kind ?? null,
      content: liveActivityLine,
    });
  });
  const liveActivityVisible = $derived.by(() => {
    void liveActivityDismissVersion;
    const stateKey = liveActivityStateKey;
    return stateKey !== null && liveActivityDismiss.isVisible(stateKey);
  });
  const liveActivityStaleness = $derived.by(() => {
    const selected = liveActivityForCard;
    if (selected === null) return { isStale: false, delayMs: 0 };
    return resolveLiveActivityStaleness({
      updatedAt: selected.session.updatedAt,
      now: liveActivityClock,
    });
  });
  const liveActivityStale = $derived(liveActivityStaleness.isStale);

  $effect(() => {
    const selected = liveActivityForCard;
    const staleness = liveActivityStaleness;
    if (selected === null || staleness.isStale || staleness.delayMs <= 0) return;

    const timer = setTimeout(() => {
      untrack(() => {
        liveActivityClock = Date.now();
      });
    }, staleness.delayMs);
    return () => clearTimeout(timer);
  });

  // The minute boundary is enough precision for an expiry chip and avoids a
  // render loop for every card once per second.
  $effect(() => {
    const expiresAt = cacheExpiresAt;
    if (expiresAt === null || expiresAt <= Date.now()) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = (): void => {
      untrack(() => {
        cacheClock = Date.now();
      });
      if (expiresAt > Date.now()) {
        timer = setTimeout(tick, nextMinuteBoundaryDelay(Date.now()));
      }
    };
    timer = setTimeout(tick, nextMinuteBoundaryDelay(Date.now()));
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  });

  let showAbsolute = $state(false);

  function handleCardClick(event: MouseEvent): void {
    if (event.composedPath().some((node) => node instanceof HTMLTimeElement)) {
      showAbsolute = !showAbsolute;
      return;
    }
    onOpen(event, sessionId);
  }

  function handleLiveActivityDismiss(event: MouseEvent | KeyboardEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const stateKey = liveActivityStateKey;
    if (stateKey === null) return;
    liveActivityDismiss.dismiss(stateKey);
    liveActivityDismissVersion += 1;
  }
</script>

<!-- Component content -->
<!-- Session card -->
<!-- This surface: session--card — one roster row keyed on session id. -->
<!-- Do not edit — session open onPress → onSelect route — Not designer-editable. -->
{#if session !== undefined && projection !== null}
  <Button
    class="session--card"
    data-session-id={sessionId}
    data-host-status={session.status}
    data-stale={staleLook === 'stale-unknown' ? 'stale-unknown' : undefined}
    data-hue={String(hue)}
    data-unread={showUnread ? 'true' : undefined}
    data-reconnect={reconnectLook === 'stale-running' ? 'stale-running' : undefined}
    data-live-activity={liveActivityForCard !== null ? 'true' : undefined}
    data-live-stale={liveActivityStale ? 'true' : undefined}
    disabled={openDisabled}
    aria-busy={isLaunching ? 'true' : undefined}
    onclick={handleCardClick}
  >
    <span
      class="session--hue"
      style={`--session-hue: ${hue}`}
      aria-hidden="true"
    ></span>
    <span class="session--channels">
      <span
        class={`session--state state--${presentedStatus}`}
        data-live-badge="true"
        data-attention-badge={
          presentedStatus === 'running' && projection.attentionBadge?.kind === 'working'
            ? 'working'
            : undefined
        }
      >
        {#if presentedStatus !== 'idle'}
          <SessionStateIcon status={presentedStatus} />
        {/if}
        {presentedStatus === 'running' && projection.attentionBadge?.kind === 'working'
          ? projection.attentionBadge.label
          : sessionStatusLabel(presentedStatus)}
      </span>
      {#if showSeenDot}
        <span
          class="session--seen"
          data-seen-dot="true"
          role="img"
          aria-label="Changed since you looked"
        ></span>
      {/if}
      {#if projection.attentionBadge !== null && projection.attentionBadge.kind !== 'working'}
        <span
          class="session--attention"
          role="status"
          data-attention-badge={projection.attentionBadge.kind}
        >{projection.attentionBadge.label}</span>
      {/if}
    </span>
    <strong>{projection.title}</strong>
    {#if liveActivityForCard !== null && liveActivityLine !== undefined && liveActivityVisible}
      <span
        class="session--live-activity"
        data-live-activity="true"
        data-live-activity-session-id={liveActivityForCard.session.id}
        data-live-stale={liveActivityStale ? 'true' : undefined}
      >
        <span class="session--live-content" data-live-activity-content="true">{liveActivityLine}</span>
        {#if liveActivityForCard.badge !== null}
          <span
            class="session--live-badge"
            data-live-activity-badge={liveActivityForCard.badge.kind}
          >{liveActivityForCard.badge.label}</span>
        {/if}
        <span
          class="session--live-dismiss"
          data-live-dismiss="true"
          role="button"
          tabindex="0"
          aria-label="Dismiss live activity"
          onclick={handleLiveActivityDismiss}
          onkeydown={(event) => handleControlKeydown(event, () => handleLiveActivityDismiss(event))}
        >Dismiss</span>
      </span>
    {/if}
    {#if showInlineDetail}
      <span class="session--detail-controls" data-detail-controls="true">
        <span class="session--density-controls" role="group" aria-label="Card density">
          <span
            class="session--density-control"
            data-density-control="compact"
            role="radio"
            aria-checked={density === 'compact'}
            tabindex="0"
            onclick={(event) => {
              event.stopPropagation();
              onDensityChange('compact');
            }}
            onkeydown={(event) => handleControlKeydown(event, () => onDensityChange('compact'))}
          >Compact</span>
          <span
            class="session--density-control"
            data-density-control="detailed"
            role="radio"
            aria-checked={density === 'detailed'}
            tabindex="0"
            onclick={(event) => {
              event.stopPropagation();
              onDensityChange('detailed');
            }}
            onkeydown={(event) => handleControlKeydown(event, () => onDensityChange('detailed'))}
          >Detailed</span>
        </span>
        <span class="session--signal-controls" role="group" aria-label="Signal visibility">
          {#each SIGNAL_KEYS as signal (signal)}
            <span
              class="session--signal-control"
              data-signal-control={signal}
              role="checkbox"
              aria-checked={signalVisibility[signal]}
              tabindex="0"
              onclick={(event) => {
                event.stopPropagation();
                onSignalToggle(signal);
              }}
              onkeydown={(event) => handleControlKeydown(event, () => onSignalToggle(signal))}
            >{SIGNAL_LABELS[signal]}</span>
          {/each}
        </span>
      </span>
      <span class="session--detail" data-inline-detail="true" data-inline-density={density}>
        {#if showActivity && activityLine !== null}
          <span class="session--activity" data-inline-signal="activity">{activityLine}</span>
        {:else if showActivity && toolGlyph !== null}
          <span
            class="session--tool"
            data-inline-signal="activity"
            data-tool-glyph={toolGlyph}
            role="img"
            aria-label={`Tool: ${projection.tool}`}
          >{toolGlyph}</span>
        {/if}
        {#if showPreview && projection.lastMessagePreview !== null}
          <span class="session--preview" data-inline-signal="preview">{projection.lastMessagePreview}</span>
        {/if}
        {#if showPreview && projection.previewMessages !== null}
          {#each projection.previewMessages as preview, index (index)}
            <span class="session--preview" data-inline-signal="preview">{preview}</span>
          {/each}
        {/if}
        {#if showPrompt && projection.prompt !== null}
          <span class="session--prompt" data-inline-signal="prompt">You: {projection.prompt}</span>
        {/if}
        {#if showAgent && projection.agent !== null}
          <span class="session--agent" data-inline-signal="agent">{projection.agent}</span>
        {/if}
        {#if showContext && projection.contextPercent !== null}
          <span
            class="session--context"
            data-inline-signal="context"
            role="meter"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={projection.contextPercent}
            aria-label="Context window"
            data-context-percent={String(projection.contextPercent)}
          >
            {#if projection.model !== null}
              <span class="session--model">{projection.model}</span>
            {/if}
            <span
              class="session--context-bar"
              style={`--session-context: ${projection.contextPercent}%`}
            ></span>
            {projection.contextPercent}%
          </span>
        {/if}
      </span>
    {/if}
    <span class="session--meta">
      {projection.messageCountLabel} <i aria-hidden="true"></i>
      <time datetime={session.updatedAt}>
        {showAbsolute ? projection.absoluteOnTap : timeLabel}
      </time>
      {#if cacheCountdown !== null}
        <span
          class="session--metric session--cache"
          data-cache-countdown="true"
          role="status"
          aria-label={`Cache expires in ${cacheCountdown}`}
        >{cacheCountdown}</span>
      {/if}
      {#if tokenCount !== null}
        <span class="session--metric" data-token-count="true">{tokenCount} tokens</span>
      {/if}
      {#if toolCallCount !== null}
        <span class="session--metric" data-tool-call-count="true">
          {toolCallCount} tool call{toolCallCount === 1 ? '' : 's'}
        </span>
      {/if}
    </span>
    <span class="open-arrow" aria-hidden="true">
      {#if isLaunching}
        <span class="open-spinner" aria-hidden="true"></span>
        Opening
      {:else}
        Open
      {/if}
    </span>
  </Button>
{/if}

<!-- Session card -->
<!-- This surface: session--card — one roster row. Card chrome stays on the home
     screen so existing token values do not move; this file owns the launch spinner
     plus the hue, seen, stale, and inline-detail chrome. -->
<style>
  /* ───────────────────────────────────────────────────────────────────
     1. CARD CHROME
  ─────────────────────────────────────────────────────────────────── */
  /* Status label sits with the glyph; values match the home roster card. */
  .session--state {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 680;
  }

  /* Meta row for message count and recency; an absent clock stays "unknown time". */
  .session--meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.73rem;
    font-weight: 550;
  }

  /* Optional host metrics sit beside the elapsed clock without changing it. */
  .session--metric {
    white-space: nowrap;
  }

  /* The cache chip makes a host-provided expiry visible without implying cache ownership. */
  .session--cache {
    color: var(--accent-ink);
    font-weight: 700;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .session--meta i {
    width: 0.2rem;
    height: 0.2rem;
    border-radius: 50%;
    background: var(--line-strong);
  }

  /* This slot: open-arrow — session--card affordance. */
  .open-arrow {
    position: absolute;
    right: var(--space-4);
    bottom: var(--space-4);
    color: var(--accent-ink);
    font-size: 0.7rem;
    font-weight: 700;
    opacity: 0;
    transition: opacity var(--duration-fast) ease;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.session--card[data-hovered]) .open-arrow,
  :global(.session--card[data-focus-visible]) .open-arrow {
    opacity: 1;
  }

  @media (hover: none) {
    /* Keep this rule aligned with its surrounding surface. */
    .open-arrow {
      opacity: 1;
    }
  }

  /* ───────────────────────────────────────────────────────────────────
     2. LAUNCH SPINNER
  ─────────────────────────────────────────────────────────────────── */
  /* Marks the in-flight Open without blocking the host navigation route. */
  .open-spinner {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    margin-right: 0.35rem;
    border: 2px solid color-mix(in oklch, var(--accent) 35%, var(--line));
    border-top-color: var(--accent);
    border-radius: 50%;
    vertical-align: -0.1rem;
    animation: session-card-spin 0.7s linear infinite;
  }

  @keyframes session-card-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    /* Keep this rule aligned with its surrounding surface. */
    .open-spinner {
      animation: none;
    }
  }

  /* ───────────────────────────────────────────────────────────────────
     3. COLOR MARK, CHANNELS, AND SEEN DOT
  ─────────────────────────────────────────────────────────────────── */
  /* Scanning color from the id hash; the mark never reprints the id. */
  .session--hue {
    position: absolute;
    top: var(--space-4);
    left: 0;
    width: 0.28rem;
    height: 1.35rem;
    border-radius: 0 0.2rem 0.2rem 0;
    background: hsl(var(--session-hue) 62% 46%);
  }

  /* Live-state badge and read-state glyph stay on separate channels. */
  .session--channels {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  /* Changed-since-looked mark; the label carries the meaning, not color alone. */
  .session--seen {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 1px var(--canvas);
  }

  /* Host attention and local unread state share one badge vocabulary. */
  .session--attention {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* ───────────────────────────────────────────────────────────────────
     4. INLINE DETAIL AND STALE LOOK
  ─────────────────────────────────────────────────────────────────── */
  /* Device-local controls keep card density and signal choices out of the host contract. */
  .session--detail-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 650;
  }

  /* Density and signal groups keep their labels together when the card narrows. */
  .session--density-controls,
  .session--signal-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  /* Each local preference has a touch-sized target and an explicit selected state. */
  .session--density-control,
  .session--signal-control {
    min-block-size: 2.75rem;
    padding: 0.7rem 0.55rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    cursor: pointer;
    line-height: 1.2;
  }

  /* Selected local preferences remain legible without relying on color alone. */
  .session--density-control[aria-checked='true'],
  .session--signal-control[aria-checked='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  /* Known tools use a compact mark while retaining an accessible host name. */
  .session--tool {
    display: inline-grid;
    width: 1.4rem;
    height: 1.4rem;
    place-items: center;
    border: 1px solid currentColor;
    border-radius: 50%;
    font-size: 0.85rem;
    line-height: 1;
  }

  /* The glanceable line stays close to the title without changing card navigation. */
  .session--live-activity {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-secondary);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.4;
  }

  /* Content remains readable when a host line contains a long token or path. */
  .session--live-content {
    overflow-wrap: anywhere;
  }

  /* The shared badge keeps arbitration demand visible beside the content line. */
  .session--live-badge {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Dismissal stays a keyboard and touch-sized local control inside the card. */
  .session--live-dismiss {
    min-block-size: 2.75rem;
    padding: 0.7rem 0.55rem;
    color: var(--accent-ink);
    cursor: pointer;
    font-size: 0.68rem;
    font-weight: 700;
    text-decoration: underline;
  }

  /* Keyboard users need a visible focus indication for the local dismiss action. */
  .session--live-dismiss:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* Enriched host lines stay in-flow so a tap still means Open. */
  .session--detail {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    color: var(--ink-secondary);
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.4;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .session--activity,
  .session--preview,
  .session--prompt,
  .session--agent,
  .session--model {
    overflow-wrap: anywhere;
  }

  /* Fill meter for a host-published context percent; absent means render nothing. */
  .session--context {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-inline-size: 2.75rem;
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 650;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .session--context-bar {
    display: inline-block;
    width: 3.2rem;
    height: 0.28rem;
    overflow: hidden;
    border-radius: 999px;
    background: var(--line);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .session--context-bar::after {
    display: block;
    width: var(--session-context);
    height: 100%;
    background: var(--accent);
    content: '';
  }

  /* A quiet live activity recedes without changing the host-owned session status. */
  :global(.session--card[data-live-stale='true']) {
    opacity: 0.64;
  }

  /* A lost running agent stays visibly unresolved without rewriting status. */
  :global(.session--card[data-stale='stale-unknown']) {
    opacity: 0.64;
  }

  /* A stale-running reconnect card keeps the working state but dimmed, mirroring
     the stale-unknown treatment so both unresolved states look similar. */
  :global(.session--card[data-reconnect='stale-running']) {
    opacity: 0.64;
  }

  @media (forced-colors: active) {
    /* Keep this rule aligned with its surrounding surface. */
    .session--hue,
    .session--seen,
    .session--context-bar::after {
      background: CanvasText;
    }
  }
  /* End of surface: session--card */
</style>
