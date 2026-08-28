<script module lang="ts">
  // This module holds the dock's public prop shape and badge vocabulary.
  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
  import type { AttentionBadge } from '$shared/format/attention.js';

  export type RecentSessionBadge = AttentionBadge;

  export interface RecentSessionsDockProps {
    readonly sessionId: string;
    readonly resolveBadge?: (
      session: SessionCardDto,
      unreadIds: ReadonlySet<string>,
    ) => RecentSessionBadge | null;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Recent Sessions Dock
  // ───────────────────────────────────────────────────────────────────

  // The dock renders only host-listed cards. Local recency and pin data shape
  // navigation chrome but never create a session or claim one is available.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onDestroy, untrack } from 'svelte';

  import { projectSessionCard } from '$shared/format/card-projection.js';
  import { resolveAttentionBadge } from '$shared/format/attention.js';
  import { readFavoritePreference } from '$shared/format/favorite-preference.js';
  import { sessionStatusLabel } from '$shared/format/view-helpers.js';
  import Menu from '$shared/primitives/menu/menu.svelte';
  import MenuContent from '$shared/primitives/menu/menu-content.svelte';
  import MenuItem from '$shared/primitives/menu/menu-item.svelte';
  import MenuTrigger from '$shared/primitives/menu/menu-trigger.svelte';
  import { getAppActions, getAppState } from '$shared/state/app-state.svelte.js';
  import {
    readUnreadIds,
  } from '$shared/state/unread-overlay.js';
  import {
    normalizeRecencyStack,
    readRecencyStack,
    removeFromRecencyStack,
    removeOtherRecencyStack,
    visitRecencyStack,
    writeRecencyStack,
    type RecencyStack,
  } from '$shared/state/recency-stack.js';
  import { reconcileRecencyStack } from '$shared/state/reconcile-seams.js';
  import {
    measureScrollMetrics,
    shouldRevealNewChip,
    type ScrollMetrics,
  } from '$shared/state/scroll-metrics.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS AND CONTEXT
  // ───────────────────────────────────────────────────────────────────

  let { sessionId, resolveBadge }: RecentSessionsDockProps = $props();
  const app = getAppState();
  const actions = getAppActions();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let recencyStack = $state<RecencyStack>(readRecencyStack());
  let unreadIds = $state<ReadonlySet<string>>(readUnreadIds());
  const favoritePreference = readFavoritePreference();
  let favoriteIds = $state<ReadonlySet<string>>(favoritePreference.ids);
  let favoritePreferenceAvailable = $state(favoritePreference.available);
  let stripElement = $state<HTMLElement | null>(null);
  let scrollMetrics = $state<ScrollMetrics>({
    hasOverflow: false,
    atStart: true,
    atEnd: true,
    thumbRatio: 1,
    thumbOffset: 0,
  });
  let previousSessionId = $state<string | null>(null);
  let previousChipCount = $state<number | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED DISPLAY
  // ───────────────────────────────────────────────────────────────────

  const visibleSessions = $derived.by(() => {
    const liveItems = app?.sessions.items ?? [];
    const liveById = new Map(liveItems.map((session) => [session.id, session]));
    return reconcileRecencyStack(recencyStack, liveItems)
      .map((id) => liveById.get(id))
      .filter((session): session is SessionCardDto => session !== undefined);
  });

  function badgeFor(session: SessionCardDto): RecentSessionBadge | null {
    return resolveBadge?.(session, unreadIds) ?? resolveAttentionBadge(session, unreadIds);
  }

  function statusClass(status: SessionCardDto['status']): string {
    return status === 'idle'
      ? 'is-idle'
      : status === 'running'
        ? 'is-running'
        : status === 'interrupted'
          ? 'is-interrupted'
          : 'is-unknown';
  }

  function canRemoveThis(id: string): boolean {
    return recencyStack.includes(id);
  }

  function canRemoveOthers(id: string): boolean {
    return visibleSessions.some((session) => session.id !== id);
  }

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL ACTIONS
  // ───────────────────────────────────────────────────────────────────

  function replaceRecencyStack(next: RecencyStack): void {
    const normalized = normalizeRecencyStack(next);
    recencyStack = normalized;
    writeRecencyStack(normalized);
  }

  /** A pinned removal gets one confirmation regardless of which local remove action requested it. */
  function confirmPinnedRemoval(ids: readonly string[]): boolean {
    if (favoritePreferenceAvailable && !ids.some((id) => favoriteIds.has(id))) return true;
    return typeof window !== 'undefined' && window.confirm('Remove the pinned session from recent sessions?');
  }

  function removeThis(id: string): void {
    const next = removeFromRecencyStack(recencyStack, id);
    if (next.length === recencyStack.length) return;
    if (!confirmPinnedRemoval([id])) return;
    replaceRecencyStack(next);
  }

  function removeOthers(id: string): void {
    const next = removeOtherRecencyStack(recencyStack, id);
    if (next.length === recencyStack.length) return;
    const removed = recencyStack.filter((candidate) => candidate !== id);
    if (!confirmPinnedRemoval(removed)) return;
    replaceRecencyStack(next);
  }

  function openSession(id: string): void {
    if (!visibleSessions.some((session) => session.id === id)) return;
    actions?.navigate(id);
  }

  // ───────────────────────────────────────────────────────────────────
  // 6. SCROLL LIFECYCLE
  // ───────────────────────────────────────────────────────────────────

  function updateScrollMetrics(): void {
    const strip = stripElement;
    if (strip === null) return;
    scrollMetrics = measureScrollMetrics(strip);
  }

  function revealEnd(strip: HTMLElement): void {
    const reveal = () => {
      if (typeof strip.scrollTo === 'function') {
        strip.scrollTo({ left: strip.scrollWidth, behavior: 'smooth' });
      } else {
        strip.scrollLeft = strip.scrollWidth;
      }
      updateScrollMetrics();
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(reveal);
    } else {
      reveal();
    }
  }

  $effect(() => {
    const count = visibleSessions.length;
    const priorCount = previousChipCount;
    const strip = stripElement;
    const wasAtEnd = scrollMetrics.atEnd;
    if (priorCount === null) {
      untrack(() => {
        previousChipCount = count;
      });
      return;
    }
    untrack(() => {
      previousChipCount = count;
    });
    if (strip !== null && shouldRevealNewChip(priorCount, count, wasAtEnd)) {
      untrack(() => revealEnd(strip));
    }
  });

  // Reinstall metrics whenever the host roster creates the strip after an empty state.
  function observeStrip(node: HTMLElement): { destroy: () => void } {
    const onScroll = () => {
      scrollMetrics = measureScrollMetrics(node);
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll);
    observer?.observe(node);
    onScroll();
    return {
      destroy: () => {
        node.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        observer?.disconnect();
      },
    };
  }

  // Record the session that was left, including when the router keeps this component mounted.
  $effect(() => {
    const nextSessionId = sessionId;
    const priorSessionId = previousSessionId;
    if (nextSessionId === priorSessionId) return;
    untrack(() => {
      if (priorSessionId !== null && priorSessionId.length > 0) {
        recencyStack = visitRecencyStack(recencyStack, priorSessionId);
        writeRecencyStack(recencyStack);
      }
      previousSessionId = nextSessionId;
    });
  });

  onDestroy(() => {
    if (sessionId.length === 0) return;
    const next = visitRecencyStack(recencyStack, sessionId);
    writeRecencyStack(next);
  });
</script>

{#if visibleSessions.length > 0}
  <section class="recent-sessions" aria-label="Recent sessions">
    <!-- section: recent session switcher -->
    <div class="recent-sessions--heading">
      <p>Recent sessions</p>
      <span class="recent-sessions--count">{visibleSessions.length}</span>
    </div>

    <!-- section: horizontal session strip -->
    <div class="recent-sessions--strip-frame">
      {#if scrollMetrics.hasOverflow && !scrollMetrics.atStart}
        <span class="recent-sessions--fade is-start" aria-hidden="true"></span>
      {/if}
      <div
        class="recent-sessions--strip"
        role="group"
        bind:this={stripElement}
        use:observeStrip
        aria-label="Visited sessions"
        onscroll={updateScrollMetrics}
      >
        {#each visibleSessions as session (session.id)}
          {@const projection = projectSessionCard(session, unreadIds)}
          {@const badge = badgeFor(session)}
          <div class="recent-sessions--chip" class:is-selected={session.id === sessionId}>
            <button
              type="button"
              class="recent-sessions--open"
              aria-current={session.id === sessionId ? 'page' : undefined}
              aria-label={`${projection.title}, ${sessionStatusLabel(session.status)}`}
              onclick={() => openSession(session.id)}
            >
              <span
                class={`recent-sessions--dot ${statusClass(session.status)}`}
                aria-label={sessionStatusLabel(session.status)}
                role="img"
              ></span>
              <span class="recent-sessions--label">{projection.title}</span>
              {#if badge !== null}
                <span class="recent-sessions--badge" data-badge={badge.kind}>{badge.label}</span>
              {/if}
            </button>
            <Menu>
              <MenuTrigger
                class="recent-sessions--more"
                aria-label={`More actions for ${projection.title}`}
              >
                <span aria-hidden="true">⋯</span>
              </MenuTrigger>
              <MenuContent class="recent-sessions--menu" aria-label={`Actions for ${projection.title}`}>
                <MenuItem
                  disabled={!canRemoveOthers(session.id)}
                  onclick={() => removeOthers(session.id)}
                >Remove other sessions</MenuItem>
                <MenuItem
                  disabled={!canRemoveThis(session.id)}
                  onclick={() => removeThis(session.id)}
                >Remove this session</MenuItem>
              </MenuContent>
            </Menu>
          </div>
        {/each}
      </div>
      {#if scrollMetrics.hasOverflow && !scrollMetrics.atEnd}
        <span class="recent-sessions--fade is-end" aria-hidden="true"></span>
      {/if}
    </div>

    {#if scrollMetrics.hasOverflow}
      <div class="recent-sessions--scrollbar" aria-hidden="true">
        <span
          class="recent-sessions--thumb"
          style={`--recent-sessions-thumb-ratio: ${scrollMetrics.thumbRatio}; --recent-sessions-thumb-offset: ${scrollMetrics.thumbOffset};`}
        ></span>
      </div>
    {/if}
  </section>
{/if}

<style>
  /* ───────────────────────────────────────────────────────────────────
     1. DOCK FRAME
  ─────────────────────────────────────────────────────────────────── */
  /* Keeps the switcher quiet beside the transcript while preserving a clear label. */
  .recent-sessions {
    display: grid;
    gap: var(--space-2);
    min-inline-size: 0;
    padding: var(--space-2) var(--page-gutter);
    border-block: 1px solid var(--dock-line);
    background: var(--dock-surface);
    color: var(--dock-ink);
  }

  /* Keeps the dock heading factual and compact. */
  .recent-sessions--heading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: 1.5rem;
  }

  /* Keeps the heading copy from competing with the active session. */
  .recent-sessions--heading p {
    margin: 0;
    color: var(--dock-muted);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* Makes the count available without turning it into a state signal. */
  .recent-sessions--count {
    color: var(--dock-accent);
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
  }

  /* ───────────────────────────────────────────────────────────────────
     2. SESSION STRIP
  ─────────────────────────────────────────────────────────────────── */
  /* Gives each chip a bounded horizontal reading lane. */
  .recent-sessions--strip-frame {
    position: relative;
    min-inline-size: 0;
  }

  /* Keeps horizontal panning inside the dock rather than moving the page. */
  .recent-sessions--strip {
    display: flex;
    gap: var(--space-2);
    min-inline-size: 0;
    overflow-x: auto;
    padding-block: 0.15rem;
    overscroll-behavior-inline: contain;
    scrollbar-width: none;
  }

  /* Removes the native scrollbar while the custom thumb remains visible below. */
  .recent-sessions--strip::-webkit-scrollbar {
    display: none;
  }

  /* Groups the open control and its overflow menu as one chip. */
  .recent-sessions--chip {
    display: flex;
    flex: 0 0 auto;
    align-items: stretch;
    border: 1px solid var(--dock-line);
    border-radius: var(--radius-control);
    background: var(--dock-surface);
  }

  /* Makes the selected session clear through surface and text, not only the dot. */
  .recent-sessions--chip.is-selected {
    border-color: var(--dock-accent);
    background: var(--dock-surface-selected);
  }

  /* Keeps navigation chips touch-sized and legible at narrow widths. */
  .recent-sessions--open {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: 2.75rem;
    max-inline-size: 13rem;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-control) 0 0 var(--radius-control);
    background: transparent;
    color: var(--dock-ink);
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 650;
  }

  /* Keeps a long host title from expanding the strip without hiding the control. */
  .recent-sessions--label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Keeps the chip menu touch-sized and visually subordinate to navigation. */
  :global(.recent-sessions--more) {
    display: grid;
    min-block-size: 2.75rem;
    min-inline-size: 2.75rem;
    place-items: center;
    padding: 0;
    border: 0;
    border-inline-start: 1px solid var(--dock-line);
    border-radius: 0 var(--radius-control) var(--radius-control) 0;
    background: transparent;
    color: var(--dock-muted);
    cursor: pointer;
    font-size: 1.15rem;
    line-height: 1;
  }

  /* Keeps the menu trigger visibly interactive without relying on a sticky touch hover. */
  :global(.recent-sessions--more[data-hovered]) {
    background: var(--dock-surface-selected);
    color: var(--dock-ink);
  }

  /* Makes keyboard focus clear on both halves of a chip. */
  .recent-sessions--open:focus-visible,
  :global(.recent-sessions--more:focus-visible) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* ───────────────────────────────────────────────────────────────────
     3. STATUS AND BADGE
  ─────────────────────────────────────────────────────────────────── */
  /* Composites the status colour over the local surface so the ring does not halo in dark mode. */
  .recent-sessions--dot {
    display: inline-block;
    flex: 0 0 auto;
    inline-size: 0.65rem;
    block-size: 0.65rem;
    border-radius: 50%;
    background: var(--dock-status-unknown);
    box-shadow: 0 0 0 2px var(--dock-ring-unknown);
  }

  /* Gives an idle session a stable success cue. */
  .recent-sessions--dot.is-idle {
    background: var(--dock-status-idle);
    box-shadow: 0 0 0 2px var(--dock-ring-idle);
  }

  /* Gives active work a live accent cue. */
  .recent-sessions--dot.is-running {
    background: var(--dock-status-running);
    box-shadow: 0 0 0 2px var(--dock-ring-running);
  }

  /* Gives interrupted work a warning cue without claiming a host resolution. */
  .recent-sessions--dot.is-interrupted {
    background: var(--dock-status-interrupted);
    box-shadow: 0 0 0 2px var(--dock-ring-interrupted);
  }

  /* Uses the selected surface in the ring so an active chip stays cleanly separated. */
  .recent-sessions--chip.is-selected .recent-sessions--dot.is-idle {
    box-shadow: 0 0 0 2px var(--dock-selected-ring-idle);
  }

  /* Uses the selected surface in the running ring without changing host status. */
  .recent-sessions--chip.is-selected .recent-sessions--dot.is-running {
    box-shadow: 0 0 0 2px var(--dock-selected-ring-running);
  }

  /* Uses the selected surface in the interrupted ring without changing host status. */
  .recent-sessions--chip.is-selected .recent-sessions--dot.is-interrupted {
    box-shadow: 0 0 0 2px var(--dock-selected-ring-interrupted);
  }

  /* Uses the selected surface in the unknown ring rather than a dark halo. */
  .recent-sessions--chip.is-selected .recent-sessions--dot.is-unknown {
    box-shadow: 0 0 0 2px var(--dock-selected-ring-unknown);
  }

  /* Keeps the attention cue short enough for a narrow chip. */
  .recent-sessions--badge {
    flex: 0 0 auto;
    color: var(--dock-accent);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: lowercase;
  }

  /* ───────────────────────────────────────────────────────────────────
     4. OVERFLOW CUES
  ─────────────────────────────────────────────────────────────────── */
  /* Hides content only at an edge where measurable overflow needs a reading cue. */
  .recent-sessions--fade {
    position: absolute;
    z-index: 1;
    inset-block: 0;
    inline-size: 1.25rem;
    pointer-events: none;
  }

  /* Fades toward the leading edge when earlier chips remain off-screen. */
  .recent-sessions--fade.is-start {
    inset-inline-start: 0;
    background: linear-gradient(to right, var(--dock-surface), transparent);
  }

  /* Fades toward the trailing edge when later chips remain off-screen. */
  .recent-sessions--fade.is-end {
    inset-inline-end: 0;
    background: linear-gradient(to left, var(--dock-surface), transparent);
  }

  /* Makes the true overflow position visible without taking over the strip. */
  .recent-sessions--scrollbar {
    position: relative;
    block-size: 0.2rem;
    overflow: hidden;
    border-radius: 999px;
    background: var(--dock-line);
  }

  /* Scales and positions the slim thumb from measured content geometry. */
  .recent-sessions--thumb {
    position: absolute;
    inset-inline-start: calc(var(--recent-sessions-thumb-offset) * 100%);
    display: block;
    inline-size: calc(var(--recent-sessions-thumb-ratio) * 100%);
    block-size: 100%;
    border-radius: inherit;
    background: var(--dock-accent);
  }

  /* Keeps menu content readable while leaving positioning to Bits UI. */
  :global(.recent-sessions--menu) {
    z-index: 20;
    min-inline-size: 12rem;
    padding: var(--space-2);
    border: 1px solid var(--dock-line);
    border-radius: var(--radius-control);
    background: var(--dock-surface);
    box-shadow: var(--shadow-raised);
    color: var(--dock-ink);
  }

  /* Makes each menu action touch-sized and visually distinct on focus. */
  :global(.recent-sessions--menu [role='menuitem']) {
    min-block-size: 2.75rem;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    color: var(--dock-ink);
    cursor: pointer;
    font-size: 0.78rem;
  }

  /* Keeps disabled no-op actions visibly and semantically parked. */
  :global(.recent-sessions--menu [role='menuitem'][aria-disabled='true']) {
    color: var(--dock-muted);
    cursor: not-allowed;
    opacity: 0.65;
  }

  /* Keeps keyboard movement visible inside the portaled menu. */
  :global(.recent-sessions--menu [role='menuitem'][data-highlighted]) {
    background: var(--dock-surface-selected);
    color: var(--dock-ink);
  }

  /* Prevents motion from hiding a newly added chip for reduced-motion users. */
  @media (prefers-reduced-motion: reduce) {
    .recent-sessions--thumb,
    .recent-sessions--open,
    :global(.recent-sessions--more) {
      transition: none;
      scroll-behavior: auto;
    }
  }
</style>
