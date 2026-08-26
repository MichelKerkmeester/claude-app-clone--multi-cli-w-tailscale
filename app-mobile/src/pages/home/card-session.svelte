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
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { sessionStatusLabel, compactId, relativeTimeAt } from '$shared/format/view-helpers.js';
  import { decideStalePresentation, projectSessionCard } from '$shared/format/card-projection.js';
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
</script>

<!-- Component content -->
<!-- Session card -->
<!-- This surface: session--card — one roster row keyed on session id. -->
<!-- Do not edit — session open onPress → onSelect route — Not designer-editable. -->
{#if session !== undefined && projection !== null}
  <Button
    class="session--card"
    data-session-id={sessionId}
    data-unread={unread ? 'true' : undefined}
    data-reconnect={reconnectLook === 'stale-running' ? 'stale-running' : undefined}
    disabled={openDisabled}
    aria-busy={isLaunching ? 'true' : undefined}
    onclick={(event) => onOpen(event, sessionId)}
  >
    <span class={`session--state state--${presentedStatus}`}>
      <SessionStateIcon status={presentedStatus} />
      {sessionStatusLabel(presentedStatus)}
    </span>
    <strong>{compactId(session.id)}</strong>
    <span class="session--meta">
      {projection.messageCountLabel} <i aria-hidden="true"></i> {timeLabel}
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
     screen so existing token values do not move; this file owns only the launch spinner. -->
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

  /* Meta row for block count and recency; an absent clock stays "unknown time". */
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
  /* End of surface: session--card */
</style>
