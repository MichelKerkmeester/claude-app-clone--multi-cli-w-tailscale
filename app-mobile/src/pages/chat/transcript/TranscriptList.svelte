<script module lang="ts">
  import type { DisplayTranscriptBlock, TodoProjectionState } from '../../../shared/data/state.js';

  export interface TranscriptListProps {
    readonly sessionId?: string;
    readonly blocks: readonly DisplayTranscriptBlock[];
    readonly running: boolean;
    readonly canAnswer?: boolean;
    readonly askQuestionPrincipal?: string | undefined;
    readonly todoProjection?: TodoProjectionState;
    readonly onRefreshTodos?: () => void;
    readonly onClearTodoAnnouncement?: () => void;
  }

  function blockLabel(block: DisplayTranscriptBlock): string {
    const labels: Record<DisplayTranscriptBlock['kind'], string> = {
      text: 'Assistant response',
      text_artifact: 'Text artifact',
      thinking: 'Thinking summary',
      plan: 'Plan',
      tool_call: 'Tool call',
      tool_result: 'Tool result',
      file_diff: 'File diff',
      file_preview: 'File preview',
      attachment: 'Photo attachment',
      inbound_image: 'Image from pi',
      'ask-question': 'Question',
      usage: 'Usage',
      unknown: 'Unsupported',
    };
    return labels[block.kind];
  }
</script>

<script lang="ts">
  // ─── Imports ───────────────────────────────
  import { untrack } from 'svelte';
  import { get } from 'svelte/store';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import { EMPTY_TODO_PROJECTION_STATE } from '../../../shared/data/state.js';
  import { normalizeTranscriptBlocks } from '../rich-content/normalizeTranscriptBlocks.js';
  import { groupBlocksIntoTurns } from '../../../shared/data/turns.js';
  import { groupNormalizedTranscript, insertTodoProjectionItem } from './transcript-helpers.js';
  import TodoProjectionBlock from './TodoProjectionBlock.svelte';
  import NormalizedActivityGroup from './NormalizedActivityGroup.svelte';
  import NormalizedTranscriptBlockView from './NormalizedTranscriptBlockView.svelte';
  import AssistantActions from './AssistantActions.svelte';

  // ─── Props ───────────────────────────────
  let {
    sessionId,
    blocks,
    running,
    canAnswer = true,
    askQuestionPrincipal,
    todoProjection = EMPTY_TODO_PROJECTION_STATE,
    onRefreshTodos,
    onClearTodoAnnouncement,
  }: TranscriptListProps = $props();

  const artifactSessionId = $derived(sessionId ?? '');

  // ─── Local state ───────────────────────────────
  let scrollEl = $state<HTMLDivElement | null>(null);
  let previousCount = blocks.length;
  let announcement = $state('');
  let atLiveEdge = $state(true);
  let newAway = $state(0);

  // ─── Handlers ───────────────────────────────
  // @ds guardrail: live-edge measurement + scroll handlers (followToBottom, onScroll) — not designer-editable.
  function followToBottom(): void {
    const element = scrollEl;
    if (element !== null) element.scrollTop = element.scrollHeight;
    newAway = 0;
  }

  function onScroll(): void {
    const element = scrollEl;
    if (element === null) return;
    // The reader owns the live edge: only follow new blocks when already near the bottom.
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
    atLiveEdge = nearBottom;
    if (nearBottom) newAway = 0;
  }

  // ─── Derived state ───────────────────────────────
  // @ds guardrail: block normalization (normalizeTranscriptBlocks), turn grouping
  //   (groupNormalizedTranscript, groupBlocksIntoTurns) and todo-row insertion — not designer-editable.
  const normalizedBlocks = $derived.by(() =>
    normalizeTranscriptBlocks({
      sessionId: artifactSessionId || 'unknown-session',
      blocks,
      settled: !running,
    }),
  );
  const renderItems = $derived.by(() =>
    insertTodoProjectionItem(groupNormalizedTranscript(normalizedBlocks, blocks), blocks, todoProjection),
  );
  const turnStartIds = $derived.by(() => {
    // Mark the first block of every turn after the first so a boundary rule can space
    // consecutive turns; the derivation never mutates or drops a block.
    const turns = groupBlocksIntoTurns(blocks);
    return new Set(turns.slice(1).map((turn) => turn.blocks[0]?.id));
  });

  // @ds guardrail: virtualization — count/estimateSize/measureElement/overscan; rows are measured.
  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: renderItems.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => 180,
    overscan: 6,
  });

  // ─── Effects ───────────────────────────────
  // Options are captured at creation, so re-apply on change. Untracked + get() (not $virtualizer)
  // so the store emission setOptions triggers cannot re-run this effect — Svelte's safe_not_equal
  // treats object values as always changed, so a tracked $virtualizer read here would loop.
  $effect(() => {
    const count = renderItems.length;
    const el = scrollEl;
    untrack(() => {
      get(virtualizer).setOptions({
        count,
        getScrollElement: () => el,
        estimateSize: () => 180,
        overscan: 6,
      });
    });
  });

  // @ds guardrail: live-edge auto-scroll effect + sr-only block-arrival announcements — not designer-editable.
  $effect(() => {
    if (blocks.length > previousCount) {
      const addedBlocks = blocks.slice(previousCount);
      const newImageCount = addedBlocks.filter((block) => block.kind === 'inbound_image').length;
      const completed = blocks.at(-1);
      if (newImageCount > 0) {
        announcement = `${newImageCount} new image${newImageCount === 1 ? '' : 's'} from pi`;
      } else if (completed !== undefined) {
        announcement = `${blockLabel(completed)} block completed.`;
      }
      const element = scrollEl;
      if (atLiveEdge && element !== null) {
        element.scrollTop = element.scrollHeight;
      } else {
        newAway += addedBlocks.length;
      }
    }
    previousCount = blocks.length;
  });
</script>

<!-- @ds surface: transcript-list — the virtualized typed-transcript list and its live-edge
     controls (scroll-to-latest pill + badge, streaming marker, sr-only announcer). -->
<!-- @ds guardrail: virtualization, turn-grouping, block normalization, and streaming state
     below (hooks, effects, measurement, scroll and announce handlers) are not designer-editable. -->
{#if blocks.length === 0 && todoProjection.projection === null}
  <!-- @ds state: empty-transcript — shown when there are no blocks and no todo projection. -->
  <div class="empty-transcript">No transcript blocks are available yet.</div>
{:else}
  <!-- @ds slot: frame — labelled, focussable transcript region. -->
  <section class="transcript-frame" aria-label="Typed transcript" tabindex={-1}>
    <!-- @ds guardrail: sr-only polite live announcer — not designer-editable. -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
    <!-- @ds slot: scroll-region — the scrollable clip of the virtual list. -->
    <div class="transcript-scroll" bind:this={scrollEl} onscroll={onScroll}>
      <div
        class="transcript-virtual"
        style="height: {$virtualizer.getTotalSize() + (running ? 72 : 0)}px"
      >
        {#each $virtualizer.getVirtualItems() as virtualItem (renderItems[virtualItem.index]?.id ?? virtualItem.key)}
          {@const item = renderItems[virtualItem.index]}
          {#if item !== undefined}
            {@const leadId =
              item.kind === 'todo'
                ? undefined
                : item.kind === 'block' || item.kind === 'actions'
                  ? item.kind === 'block' ? item.block.sourceBlockId : item.sourceBlockId
                  : item.blocks[0]?.sourceBlockId}
            {@const isTurnStart = leadId !== undefined && turnStartIds.has(leadId)}
            <!-- @ds guardrail: virtualized row — measureElement + translateY come from the virtualizer. -->
            <div
              class={isTurnStart ? 'virtual-row turn-start' : 'virtual-row'}
              data-index={virtualItem.index}
              style="transform: translateY({virtualItem.start}px)"
              {@attach (node) => { $virtualizer.measureElement(node); }}
            >
              {#if item.kind === 'todo'}
                <TodoProjectionBlock
                  state={item.state}
                  {...(onRefreshTodos === undefined ? {} : { onRefresh: onRefreshTodos })}
                  {...(onClearTodoAnnouncement === undefined
                    ? {}
                    : { onAnnouncementConsumed: onClearTodoAnnouncement })}
                />
              {:else if item.kind === 'activity'}
                <NormalizedActivityGroup blocks={item.blocks} />
              {:else if item.kind === 'inbound-stack'}
                <div class="inbound-image-stack">
                  {#each item.blocks as block (block.blockId)}
                    <NormalizedTranscriptBlockView
                      {block}
                      sessionId={artifactSessionId}
                      {canAnswer}
                      {askQuestionPrincipal}
                    />
                  {/each}
                </div>
              {:else if item.kind === 'actions'}
                <AssistantActions text={item.text} />
              {:else}
                <NormalizedTranscriptBlockView
                  block={item.block}
                  sessionId={artifactSessionId}
                  {canAnswer}
                  {askQuestionPrincipal}
                />
              {/if}
            </div>
          {/if}
        {/each}
        <!-- @ds state: streaming — @ds slot: streaming-marker. -->
        {#if running}
          <div
            class="streaming-marker"
            style="transform: translateY({$virtualizer.getTotalSize()}px)"
          >
            <span class="streaming-glyph" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span class="streaming-label">Working…</span>
          </div>
        {/if}
      </div>
    </div>
    <!-- @ds state: not-live-edge — @ds slot: scroll-to-latest pill + count badge. -->
    {#if !atLiveEdge}
      <button
        type="button"
        class="scroll-to-latest"
        onclick={followToBottom}
        aria-label={newAway > 0
          ? `Jump to ${newAway} new message${newAway === 1 ? '' : 's'}`
          : 'Jump to latest'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {#if newAway > 0}
          <span class="scroll-badge">{newAway}</span>
        {/if}
      </button>
    {/if}
  </section>
{/if}

<!-- @ds surface: transcript-list — the virtualized typed-transcript list and its live-edge controls.
     Decomposed into this scoped block; transcript-frame/scroll/virtual, virtual-row (+turn-start),
     streaming-marker/glyph/label, scroll-to-latest (+hover), scroll-badge, and inbound-image-stack
     are owned solely by this component so they move with it (scoped). .sr-only is a shared a11y
     util and .empty-state,.empty-transcript is a shared empty-state group, so both stay global in
     app.css. The body:has(.slash-panel) .scroll-to-latest override is body-rooted and couples to
     the slash-panel surface, so it is wrapped in :global. Values unchanged. -->
<style>
  /* @ds slot: frame — transcript region wrapper (positioning only). */
  .transcript-frame {
    position: relative;
    margin-top: var(--space-6);
  }

  /* Timeline rail line removed (§6). */
  .transcript-frame::before {
    content: none;
  }

  /* Reader-controlled live edge: a pill to jump to the newest blocks when scrolled up. */
  /* @ds surface: transcript-list — the virtualized transcript list and its live-edge controls. */
  /* @ds slot: scroll-to-latest — pill, shown only away from the live edge. */
  /* @ds state: not-live-edge */
  .scroll-to-latest {
    position: absolute;
    bottom: var(--space-4);
    left: 50%;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    transform: translateX(-50%);
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface-raised);
    color: var(--ink-secondary);
    box-shadow: var(--shadow-raised);
    cursor: pointer;
  }

  .scroll-to-latest:hover {
    background: var(--surface-muted);
  }

  /* @ds slot: scroll-badge — new-message count pill. */
  .scroll-badge {
    position: absolute;
    top: -0.35rem;
    right: -0.35rem;
    display: grid;
    place-items: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding-inline: 0.3rem;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
  }

  /* @ds slot: scroll-region — the scrollable clip of the virtual list. */
  .transcript-scroll {
    height: min(70dvh, 54rem);
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-color: var(--line-strong) transparent;
  }

  /* @ds slot: virtual-list — reserves total height; rows are absolutely positioned below. */
  /* @ds guardrail: virtualization layout — measured rows; do not change row height math. */
  .transcript-virtual {
    position: relative;
    width: 100%;
  }

  /* @ds guardrail: virtual row + streaming marker share the measured absolute row slot. */
  .virtual-row,
  .streaming-marker {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding-bottom: var(--space-3);
  }

  /* Timeline rail removed — conversation hierarchy comes from turn boundaries,
     compact user bubbles, and borderless assistant prose. */
  .virtual-row::before {
    content: none;
  }

  /* @ds state: turn-start — hairline + breathing room before each new prompt. */
  .virtual-row.turn-start {
    margin-top: var(--space-6);
    padding-top: var(--space-6);
    border-top: 1px solid var(--line);
  }

  .inbound-image-stack {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-3);
  }

  /* Inline streaming marker: a small pulsing cue attached under the active answer. */
  /* @ds state: streaming · @ds slot: streaming-marker — the "Working…" live cue. */
  .streaming-marker {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding-block: var(--space-2);
    padding-inline: 0;
  }

  /* @ds slot: streaming-glyph — pulsing dots. */
  .streaming-glyph {
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    color: var(--accent);
  }

  .streaming-glyph i {
    width: 0.3rem;
    height: 0.3rem;
    border-radius: 50%;
    background: currentColor;
    animation: working-wave 1.1s ease-in-out infinite;
  }

  .streaming-glyph i:nth-child(2) {
    animation-delay: 120ms;
  }

  .streaming-glyph i:nth-child(3) {
    animation-delay: 240ms;
  }

  /* @ds slot: streaming-label */
  .streaming-label {
    color: var(--ink-muted);
    font-size: 0.85rem;
    font-weight: 550;
  }

  /* @ds guardrail: streaming reduced-motion — a11y invariant; do not remove. */
  @media (prefers-reduced-motion: reduce) {
    .streaming-glyph i {
      animation: none;
    }
  }

  /* The completion card is an overlay above the composer: while it is open it
     must never sit under the scroll-to-latest pill, and the pill stays out of
     the accessibility tree while hidden. */
  :global(body:has(.slash-panel) .scroll-to-latest) {
    visibility: hidden;
    pointer-events: none;
  }

  .scroll-badge {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
</style>
