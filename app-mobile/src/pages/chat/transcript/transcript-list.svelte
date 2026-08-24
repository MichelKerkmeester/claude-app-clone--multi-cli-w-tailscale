<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TRANSCRIPT LIST
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  import type { DisplayTranscriptBlock, TodoProjectionState } from '$shared/state/state.js';

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

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // Two minutes leaves room for normal long-running reasoning while surfacing a sleeping or wedged host.
  export const TRANSCRIPT_STALL_THRESHOLD_MS = 120_000;

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

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
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';
  import { get } from 'svelte/store';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import { EMPTY_TODO_PROJECTION_STATE } from '$shared/state/state.js';
  import { pruneTranscriptDisclosureState } from '$shared/state/transcript-disclosure.svelte.js';
  import { normalizeTranscriptBlocks } from '../rich-content/normalize-transcript-blocks.js';
  import { groupBlocksIntoTurns } from '$shared/state/turns.js';
  import { groupNormalizedTranscript, insertTodoProjectionItem } from './transcript-helpers.js';
  import TodoProjectionBlock from './todo-projection-block.svelte';
  import NormalizedActivityGroup from './normalized-activity-group.svelte';
  import NormalizedTranscriptBlockView from './normalized-transcript-block-view.svelte';
  import AssistantActions from './assistant-actions.svelte';

  import './transcript-list.css';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let scrollEl = $state<HTMLDivElement | null>(null);
  let previousCount = blocks.length;
  let announcement = $state('');
  let atLiveEdge = $state(true);
  let newAway = $state(0);
  let stallClock = $state(Date.now());

  // ───────────────────────────────────────────────────────────────────
  // 7. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // @ds guardrail: live-edge measurement + scroll handlers (followToBottom, onScroll) — Not designer-editable.
  function followToBottom(): void {
    const element = scrollEl;
    if (element !== null) element.scrollTop = element.scrollHeight;
    newAway = 0;
  }

  function onScroll(): void {
    const element = scrollEl;
    if (element === null) return;
    // The reader owns the live edge, so new blocks follow only when the viewport is near the bottom.
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
    atLiveEdge = nearBottom;
    if (nearBottom) newAway = 0;
  }

  // ───────────────────────────────────────────────────────────────────
  // 8. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // @ds guardrail: block normalization (normalizeTranscriptBlocks), turn grouping (groupNormalizedTranscript, groupBlocksIntoTurns) and todo-row insertion — Not designer-editable.
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
    // Mark the first block of each turn after the first so a boundary rule can space each turn.
    // The derivation never mutates or drops a block.
    const turns = groupBlocksIntoTurns(blocks);
    return new Set(turns.slice(1).map((turn) => turn.blocks[0]?.id));
  });
  const mostRecentBlockAt = $derived.by(() => {
    let latest = Number.NEGATIVE_INFINITY;
    for (const block of blocks) {
      const occurredAt = Date.parse(block.occurredAt);
      if (Number.isFinite(occurredAt)) latest = Math.max(latest, occurredAt);
    }
    return Number.isFinite(latest) ? latest : undefined;
  });
  const isStalled = $derived.by(
    () =>
      running &&
      mostRecentBlockAt !== undefined &&
      stallClock - mostRecentBlockAt >= TRANSCRIPT_STALL_THRESHOLD_MS,
  );

  // @ds guardrail: virtualization — Count/estimateSize/measureElement/overscan; rows are measured.
  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: renderItems.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => 180,
    overscan: 6,
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    if (!running || mostRecentBlockAt === undefined) return;
    stallClock = Date.now();
    const timer = setInterval(() => {
      stallClock = Date.now();
    }, 1_000);
    return () => clearInterval(timer);
  });

  $effect(() => {
    const disclosureBlockIds = new Set([
      ...blocks.map((block) => block.id),
      ...normalizedBlocks.map((block) => block.blockId),
    ]);
    // The full transcript owns block lifetime; virtual rows may disappear without losing it.
    pruneTranscriptDisclosureState(disclosureBlockIds);
  });

  // Reapply options because the store captures them at creation. Untracked `get()` prevents store emissions from setOptions from retriggering this effect.
  // Svelte's safe_not_equal treats object values as changed, so tracking `$virtualizer` here would loop.
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

  // @ds guardrail: live-edge auto-scroll effect + sr-only block-arrival announcements — Not designer-editable.
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
    <!-- @ds guardrail: sr-only polite live announcer — Not designer-editable. -->
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
            <!-- @ds guardrail: virtualized row — MeasureElement + translateY come from the virtualizer. -->
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
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style="transform: translateY({$virtualizer.getTotalSize()}px)"
          >
            <span class={isStalled ? 'streaming-glyph is-stalled' : 'streaming-glyph'} aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span class="streaming-label">{isStalled ? 'No new activity for a while' : 'Working…'}</span>
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
     Decomposed into this co-located CSS file; transcript-frame/scroll/virtual, virtual-row (+turn-start),
     streaming-marker/glyph/label, scroll-to-latest (+hover), scroll-badge, and inbound-image-stack
     are owned solely by this component so they move with it (scoped). .sr-only is a shared a11y
     util and .empty-state,.empty-transcript is a shared empty-state group, so both stay global in
     app.css. The body:has(.slash-panel) .scroll-to-latest override is body-rooted and couples to
     the slash-panel surface, so it is wrapped in :global. Values unchanged. -->
