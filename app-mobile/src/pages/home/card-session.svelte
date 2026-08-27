<script module lang="ts">
  // This module holds the shared Session Card types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SESSION CARD
  // ───────────────────────────────────────────────────────────────────

  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

  export interface SessionCardProps {
    readonly sessionId: string;
    readonly selectSession: (id: string) => SessionCardDto | undefined;
    readonly source: 'none' | 'cache' | 'relay';
    readonly unread: boolean;
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
  import SessionStateIcon from '$shared/chrome/session-state-icon.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    sessionId,
    selectSession,
    source,
    unread,
    launchingId,
    openDisabled,
    onOpen,
    selectLastSeen = () => undefined,
    seenAvailable = true,
  }: SessionCardProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Per-id selector: one session's flip invalidates this card, not a roster object.
  const session = $derived(selectSession(sessionId));
  const projection = $derived(session === undefined ? null : projectSessionCard(session));
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
    session !== undefined && session.status !== 'running' && unread,
  );
  const showInlineDetail = $derived(projection !== null && hasInlineEnrichment(projection));
  const activityLine = $derived.by(() => {
    if (projection === null) return null;
    if (projection.activity === null && projection.tool === null) return null;
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
      >
        {#if presentedStatus !== 'idle'}
          <SessionStateIcon status={presentedStatus} />
        {/if}
        {sessionStatusLabel(presentedStatus)}
      </span>
      {#if showSeenDot}
        <span
          class="session--seen"
          data-seen-dot="true"
          role="img"
          aria-label="Changed since you looked"
        ></span>
      {/if}
      {#if projection.attentionBadge !== null}
        <span class="session--attention" role="status" data-attention-badge={projection.attentionBadge}>
          {projection.attentionBadge === 'done'
            ? 'Needs you'
            : projection.attentionBadge === 'blocked'
              ? 'Blocked'
              : 'Waiting'}
        </span>
      {/if}
    </span>
    <strong>{projection.title}</strong>
    {#if showInlineDetail}
      <span class="session--detail" data-inline-detail="true">
        {#if activityLine !== null}
          <span class="session--activity">{activityLine}</span>
        {/if}
        {#if projection.lastMessagePreview !== null}
          <span class="session--preview">{projection.lastMessagePreview}</span>
        {/if}
        {#if projection.previewMessages !== null}
          {#each projection.previewMessages as preview, index (index)}
            <span class="session--preview">{preview}</span>
          {/each}
        {/if}
        {#if projection.prompt !== null}
          <span class="session--prompt">You: {projection.prompt}</span>
        {/if}
        {#if projection.agent !== null}
          <span class="session--agent">{projection.agent}</span>
        {/if}
        {#if projection.contextPercent !== null}
          <span
            class="session--context"
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

  /* Host attention, never shown for a running session. */
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
