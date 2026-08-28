<script module lang="ts">
  // This module holds the shared Session Card types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SESSION CARD
  // ───────────────────────────────────────────────────────────────────

  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
  import type {
    CardDensity,
    SignalKey,
    SignalVisibility,
  } from '$shared/format/roster-view-preference.js';

  export interface SessionCardProps {
    readonly sessionId: string;
    readonly selectSession: (id: string) => SessionCardDto | undefined;
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
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { sessionStatusLabel, relativeTimeAt } from '$shared/format/view-helpers.js';
  import {
    decideStalePresentation,
    hasInlineEnrichment,
    hueFromId,
    projectSessionCard,
  } from '$shared/format/card-projection.js';
  import { changedSinceLooked } from '$shared/format/seen-marker.js';
  import { reconnectVerdict } from '$shared/state/reconcile-seams.js';
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

  let showAbsolute = $state(false);

  function handleCardClick(event: MouseEvent): void {
    if (event.composedPath().some((node) => node instanceof HTMLTimeElement)) {
      showAbsolute = !showAbsolute;
      return;
    }
    onOpen(event, sessionId);
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
