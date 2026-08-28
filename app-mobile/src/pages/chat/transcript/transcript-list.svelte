<script module lang="ts">
  // This module holds the shared Transcript List types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TRANSCRIPT LIST
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  import type { DisplayTranscriptBlock, TodoProjectionState } from '$shared/state/state.js';
  import {
    formatStreamingElapsedLabel,
    hasStreamingTokens,
  } from '$shared/state/streaming-derivations.js';

  export interface TranscriptListProps {
    readonly sessionId?: string;
    readonly blocks: readonly DisplayTranscriptBlock[];
    readonly running: boolean;
    readonly canAnswer?: boolean;
    readonly askQuestionPrincipal?: string | undefined;
    readonly todoProjection?: TodoProjectionState;
    readonly onRefreshTodos?: () => void;
    readonly onClearTodoAnnouncement?: () => void;
    readonly onElapsedLabelChange?: (label: string | null) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // Two minutes leaves room for normal long-running reasoning while surfacing a sleeping or wedged host.
  export const TRANSCRIPT_STALL_THRESHOLD_MS = 120_000;

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep block label focused on its single responsibility.
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
  import { hover, press, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import { pinchScale } from '$shared/primitives/pinch-scale.js';
  import { normalizeTranscriptBlocks } from '../rich-content/normalize-transcript-blocks.js';
  import { groupBlocksIntoTurns } from '$shared/state/turns.js';
  import { groupNormalizedTranscript, insertTodoProjectionItem } from './transcript-helpers.js';
  import TodoProjectionBlock from './todo-projection-block.svelte';
  import NormalizedActivityGroup from './normalized-activity-group.svelte';
  import NormalizedTranscriptBlockView from './normalized-transcript-block-view.svelte';
  import AssistantActions from './assistant-actions.svelte';
  import TranscriptFindBar from './transcript-find-bar.svelte';
  import MenuTranscriptAction from './menu-transcript-action.svelte';
  import {
    buildTranscriptFindIndex,
    createFindCursor,
    currentFindMatch,
    matchFindQuery,
    nextFindMatch,
    prevFindMatch,
    type FindCursor,
  } from './transcript-find-index.js';
  import { setTranscriptFindContext } from './transcript-find-context.svelte.js';
  import { readTranscriptSelection } from './transcript-selection.js';
  import {
    decideHoldToSelectCoach,
    markHoldToSelectCoachShown,
    readHoldToSelectCoachShown,
    useCopyFeedback,
  } from '../rich-content/use-copy-feedback.svelte.js';

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
    onElapsedLabelChange,
  }: TranscriptListProps = $props();

  const tokensPresent = $derived(hasStreamingTokens(blocks, running));
  const artifactSessionId = $derived(sessionId ?? '');

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let scrollEl = $state<HTMLDivElement | null>(null);
  let frameEl = $state<HTMLElement | null>(null);
  let previousCount = blocks.length;
  let announcement = $state('');
  let atLiveEdge = $state(true);
  let newAway = $state(0);
  let stallClock = $state(Date.now());
  let findOpen = $state(false);
  let findQuery = $state('');
  let findMatchIndex = $state(0);
  const findContext = $state({ term: '', open: false });
  setTranscriptFindContext(findContext);
  const copyFeedback = useCopyFeedback();
  let menuOpen = $state(false);
  let menuX = $state(0);
  let menuY = $state(0);
  let menuTargetText = $state('');
  let menuTargetCode = $state('');
  let coachHint = $state('');
  let longPressTimer = $state<number | null>(null);
  let dragCopied = false;
  let dragSelected = false;

  // ───────────────────────────────────────────────────────────────────
  // 7. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Do not edit — live-edge measurement + scroll handlers (followToBottom, onScroll) — Not designer-editable.
  function followToBottom(): void {
    const element = scrollEl;
    if (element !== null) element.scrollTop = element.scrollHeight;
    newAway = 0;
  }

  // Keep on scroll focused on its single responsibility.
  function onScroll(): void {
    const element = scrollEl;
    if (element === null) return;
    // Follow new blocks only when the viewport is near the bottom.
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
    atLiveEdge = nearBottom;
    if (nearBottom) newAway = 0;
  }

  function scrollTurnToTop(index: number): void {
    const api = untrack(() => get(virtualizer));
    if (typeof api.scrollToIndex === 'function') {
      api.scrollToIndex(index, { align: 'start' });
    }
  }

  function scrollFindMatch(cursor: FindCursor): void {
    const match = currentFindMatch(cursor);
    if (match === null) return;
    const snippet = findIndex.snippets[match.snippetIndex];
    if (snippet === undefined) return;
    const api = untrack(() => get(virtualizer));
    if (typeof api.scrollToIndex === 'function') {
      api.scrollToIndex(snippet.rowIndex, { align: 'start' });
    }
  }

  function openFind(): void {
    findOpen = true;
    findContext.open = true;
  }

  function closeFind(): void {
    findOpen = false;
    findQuery = '';
    findMatchIndex = 0;
    findContext.open = false;
    findContext.term = '';
  }

  function onFindQueryChange(value: string): void {
    findQuery = value;
  }

  function goFindNext(): void {
    const next = nextFindMatch(findCursor);
    findMatchIndex = next.matchIndex;
    scrollFindMatch(next);
  }

  function goFindPrev(): void {
    const prev = prevFindMatch(findCursor);
    findMatchIndex = prev.matchIndex;
    scrollFindMatch(prev);
  }

  function messageTextFromItem(index: number): { text: string; code: string } {
    const item = renderItems[index];
    if (item === undefined) return { text: '', code: '' };
    if (item.kind === 'actions') return { text: item.text, code: '' };
    if (item.kind === 'block' && item.block.kind === 'prose') {
      return { text: item.block.canonicalSource, code: '' };
    }
    if (item.kind === 'block' && item.block.kind === 'code') {
      return { text: '', code: item.block.canonicalSource };
    }
    if (item.kind === 'block' && item.block.kind === 'fallback' && item.block.sourceBlock.kind === 'text') {
      return { text: item.block.sourceBlock.text, code: '' };
    }
    return { text: '', code: '' };
  }

  function openActionMenu(clientX: number, clientY: number, target: EventTarget | null): void {
    const row = target instanceof Element ? target.closest('[data-index]') : null;
    const index = row === null ? -1 : Number(row.getAttribute('data-index'));
    const extracted = Number.isFinite(index) ? messageTextFromItem(index) : { text: '', code: '' };
    menuTargetText = extracted.text;
    menuTargetCode = extracted.code;
    menuX = clientX;
    menuY = clientY;
    menuOpen = true;
  }

  function onFrameContextMenu(event: MouseEvent): void {
    event.preventDefault();
    openActionMenu(event.clientX, event.clientY, event.target);
  }

  let pressX = 0;
  let pressY = 0;

  function clearLongPress(): void {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function onFramePointerDown(event: PointerEvent): void {
    dragCopied = false;
    dragSelected = false;
    clearLongPress();
    if (event.target instanceof Element && event.target.closest('button, input, a, summary, textarea')) {
      return;
    }
    pressX = event.clientX;
    pressY = event.clientY;
    const target = event.target;
    longPressTimer = window.setTimeout(() => {
      openActionMenu(pressX, pressY, target);
    }, 500);
  }

  function onFramePointerMove(event: PointerEvent): void {
    if (longPressTimer === null) return;
    if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 10) {
      clearLongPress();
    }
  }

  function onFramePointerUp(event: PointerEvent): void {
    clearLongPress();
    const selected = readTranscriptSelection(frameEl);
    dragSelected = selected.inside && selected.text.length > 0;
    const moved = Math.hypot(event.clientX - pressX, event.clientY - pressY) > 8;
    if (!moved) return;
    const hint = decideHoldToSelectCoach({
      copied: dragCopied,
      selected: dragSelected,
      alreadyShown: readHoldToSelectCoachShown(),
    });
    if (hint !== null) {
      coachHint = hint;
      markHoldToSelectCoachShown();
    }
  }

  function onMenuSelect(id: string): void {
    if (id === 'copy-selection') {
      const selected = readTranscriptSelection(frameEl);
      if (!selected.inside || selected.text.length === 0) return;
      dragCopied = true;
      copyFeedback.copy('selection', selected.text);
    } else if (id === 'copy-message') {
      if (menuTargetText.length === 0) return;
      dragCopied = true;
      copyFeedback.copy('message', menuTargetText);
    } else if (id === 'copy-code') {
      if (menuTargetCode.length === 0) return;
      dragCopied = true;
      copyFeedback.copy('code', menuTargetCode);
    }
    menuOpen = false;
  }

  // ───────────────────────────────────────────────────────────────────
  // 8. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Do not edit — block normalization (normalizeTranscriptBlocks), turn grouping (groupNormalizedTranscript, groupBlocksIntoTurns) and todo-row insertion — Not designer-editable.
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
  const findIndex = $derived(buildTranscriptFindIndex(blocks, renderItems));
  const findMatches = $derived(matchFindQuery(findIndex, findQuery));
  const findCursor = $derived.by((): FindCursor => ({
    matches: findMatches,
    matchCount: findMatches.length,
    matchIndex: findMatchIndex,
  }));
  const findSnippet = $derived.by(() => {
    const match = currentFindMatch(findCursor);
    if (match === null) return null;
    return findIndex.snippets[match.snippetIndex] ?? null;
  });
  const actionRows = $derived.by(() => {
    const selected = readTranscriptSelection(frameEl);
    const selectionDisabled = !selected.inside || selected.text.length === 0;
    return [
      {
        id: 'copy-selection',
        label: 'Copy selection',
        disabled: selectionDisabled,
        hint: selected.text.length === 0 ? 'Nothing selected' : 'Selection is outside this transcript',
      },
      {
        id: 'copy-message',
        label: 'Copy message',
        disabled: menuTargetText.length === 0,
        hint: 'No message text here',
      },
      {
        id: 'copy-code',
        label: 'Copy code',
        disabled: menuTargetCode.length === 0,
        hint: 'No code in this row',
      },
    ];
  });
  const turnStartIds = $derived.by(() => {
    // First block of each turn after the first — spacing boundary only; never mutates blocks.
    const turns = groupBlocksIntoTurns(blocks);
    return new Set(turns.slice(1).map((turn) => turn.blocks[0]?.id));
  });
  const turnLeadIds = $derived.by(() => {
    const turns = groupBlocksIntoTurns(blocks);
    return new Set(turns.map((turn) => turn.blocks[0]?.id));
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
  const elapsedLabel = $derived.by(() =>
    running && mostRecentBlockAt !== undefined
      ? formatStreamingElapsedLabel(stallClock, mostRecentBlockAt)
      : null,
  );

  // Do not edit — virtualization — Count/estimateSize/measureElement/overscan; rows are measured.
  const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: renderItems.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => 180,
    overscan: 6,
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep the document-level status region aligned with the same clock as the marker.
  $effect(() => {
    const label = elapsedLabel;
    const onChange = onElapsedLabelChange;
    untrack(() => onChange?.(label));
  });

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (!running || mostRecentBlockAt === undefined) return;
    stallClock = Date.now();
    const timer = setInterval(() => {
      stallClock = Date.now();
    }, 1_000);
    return () => clearInterval(timer);
  });

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    const disclosureBlockIds = new Set([
      ...blocks.map((block) => block.id),
      ...normalizedBlocks.map((block) => block.blockId),
    ]);
    // Virtual rows are ephemeral; the full transcript owns block lifetime.
    pruneTranscriptDisclosureState(disclosureBlockIds);
  });

  // Virtualizer store captures options at creation; untrack get() and `$virtualizer` to avoid loops.
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

  // Reset the cursor on a new query; scroll uses the virtualizer, not browser find.
  $effect(() => {
    const matches = findMatches;
    const query = findQuery;
    const open = findOpen;
    untrack(() => {
      const cursor = createFindCursor(matches);
      findMatchIndex = cursor.matchIndex;
      findContext.open = open;
      findContext.term = open ? query : '';
      if (open && cursor.matchCount > 0) {
        scrollFindMatch(cursor);
      }
    });
  });

  // Do not edit — live-edge auto-scroll effect + sr-only block-arrival announcements — Not designer-editable.
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

<!-- Component content -->
<!-- Transcript list -->
<!-- This surface: transcript-list — the virtualized typed-transcript list and its live-edge
     controls (scroll--to-latest pill + badge, streaming marker, sr-only announcer). -->
<!-- Do not edit — virtualization, turn-grouping, block normalization, and streaming state
     below (hooks, effects, measurement, scroll and announce handlers) are not designer-editable. -->
{#if blocks.length === 0 && todoProjection.projection === null}
  <!-- This state: empty--transcript — shown when there are no blocks and no todo projection. -->
  <div class="empty--transcript">No transcript blocks are available yet.</div>
{:else}
  <!-- This slot: frame — labelled, focussable transcript region. -->
  <section
    class="transcript--frame"
    bind:this={frameEl}
    aria-label="Typed transcript"
    tabindex={-1}
    oncontextmenu={onFrameContextMenu}
    onpointerdown={onFramePointerDown}
    onpointermove={onFramePointerMove}
    onpointerup={onFramePointerUp}
    onpointercancel={clearLongPress}
  >
    <!-- Do not edit — sr-only polite live announcer — Not designer-editable. -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
    {#if copyFeedback.announcement.length > 0}
      <div class="sr-only" role="status" aria-live="polite">{copyFeedback.announcement}</div>
    {/if}
    {#if coachHint.length > 0}
      <p class="transcript--coach" role="status" aria-live="polite">{coachHint}</p>
    {/if}
    <button
      type="button"
      class="transcript--find-toggle"
      use:hover
      use:press
      use:focusVisible
      aria-expanded={findOpen}
      aria-controls={findOpen ? 'transcript-find-input' : undefined}
      onclick={() => (findOpen ? closeFind() : openFind())}
    >
      Find
    </button>
    {#if findOpen}
      <TranscriptFindBar
        query={findQuery}
        cursor={findCursor}
        snippet={findSnippet}
        onQueryChange={onFindQueryChange}
        onNext={goFindNext}
        onPrev={goFindPrev}
        onClose={closeFind}
      />
    {/if}
    <!-- This slot: scroll-region — the scrollable clip of the virtual list. -->
    <div class="transcript--scroll" bind:this={scrollEl} onscroll={onScroll} use:pinchScale>
      <div
        class="transcript--virtual"
        style="height: {$virtualizer.getTotalSize() + (running && !tokensPresent ? 72 : 0)}px"
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
            {@const isTurnLead = leadId !== undefined && turnLeadIds.has(leadId)}
            <!-- Do not edit — virtualized row — MeasureElement + translateY come from the virtualizer. -->
            <div
              class={isTurnStart ? 'virtual-row turn--start' : 'virtual-row'}
              data-index={virtualItem.index}
              style="transform: translateY({virtualItem.start}px)"
              {@attach (node) => { $virtualizer.measureElement(node); }}
            >
              {#if isTurnLead}
                <button
                  type="button"
                  class="turn--scroll"
                  use:hover
                  use:press
                  use:focusVisible
                  aria-label="Scroll this message to top"
                  onclick={() => scrollTurnToTop(virtualItem.index)}
                >
                  ↑
                </button>
              {/if}
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
                <div class="inbound-image--stack">
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
        <!-- This state: streaming — This slot: streaming--marker. -->
        <!-- The animated dots show only while running with no token block;
             once an assistant text block exists for the running turn, that
             partial text IS the streaming indicator. -->
        {#if running && !tokensPresent}
          <div
            class="streaming--marker"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style="transform: translateY({$virtualizer.getTotalSize()}px)"
          >
            <span class={isStalled ? 'streaming--icon is-stalled' : 'streaming--icon'} aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span class="streaming--label">{isStalled ? 'No new activity for a while' : 'Working…'}</span>
          </div>
        {/if}
      </div>
    </div>
    <!-- This state: not-live-edge — This slot: scroll--to-latest pill + count badge. -->
    {#if !atLiveEdge}
      <button
        type="button"
        class="scroll--to-latest"
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
          <span class="scroll--badge">{newAway}</span>
        {/if}
      </button>
    {/if}
    <MenuTranscriptAction
      open={menuOpen}
      x={menuX}
      y={menuY}
      rows={actionRows}
      onSelect={onMenuSelect}
      onClose={() => {
        menuOpen = false;
      }}
    />
  </section>
{/if}

<!-- Transcript list -->
<!-- This surface: transcript-list — the virtualized typed-transcript list and its live-edge controls.
     Decomposed into this scoped block; transcript--frame/scroll/virtual, virtual-row (+turn--start),
     streaming--marker/glyph/label, scroll--to-latest (+hover), scroll--badge, and inbound-image--stack
     are owned solely by this component so they move with it (scoped). .sr-only is a shared a11y
     util and .empty--state,.empty--transcript is a shared empty--state group, so both stay global in
     app.css. The body:has(.slash--panel) .scroll--to-latest override is body-rooted and couples to
     the slash--panel surface, so it is wrapped in :global. Values unchanged. -->
<style>
  /* This surface: empty--state — empty/unavailable list state. */
  /* This state: empty--transcript — the TranscriptList "no blocks yet" message. */
  .empty--transcript {
    padding: clamp(3rem, 8vw, 6rem) var(--space-4);
    border: 1px dashed var(--line-strong);
    border-radius: var(--radius-lg);
    color: var(--ink-muted);
    text-align: center;
  }

  /* This slot: frame — transcript region wrapper (positioning only). */
  .transcript--frame {
    position: relative;
    margin-top: var(--space-6);
  }

  /* The rail stays absent; turn boundaries provide conversation hierarchy. */
  .transcript--frame::before {
    content: none;
  }

  .transcript--find-toggle,
  .turn--scroll {
    min-inline-size: 44px;
    min-block-size: 44px;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink-secondary);
    font-size: 0.8rem;
    font-weight: 550;
    cursor: pointer;
  }

  .transcript--find-toggle:global([data-hovered]),
  .turn--scroll:global([data-hovered]) {
    background: var(--surface-muted);
  }

  .transcript--find-toggle:global([data-focus-visible]),
  .turn--scroll:global([data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .transcript--find-toggle {
    margin-bottom: var(--space-2);
  }

  .transcript--coach {
    margin: 0 0 var(--space-2);
    color: var(--ink-muted);
    font-size: 0.8rem;
  }

  /* Reader-controlled live edge: a pill to jump to the newest blocks when scrolled up. */
  /* This surface: transcript-list — the virtualized transcript list and its live-edge controls. */
  /* This slot: scroll--to-latest — pill, shown only away from the live edge. */
  /* This state: not-live-edge */
  .scroll--to-latest {
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

  /* Keep this rule aligned with its surrounding surface. */
  .scroll--to-latest:hover {
    background: var(--surface-muted);
  }

  /* Editable seam: surface — glass treatment for the floating control, composing the same
     color-mix + blur(12px) idiom the header bars already use. Guarded on @supports because
     without a real backdrop blur a translucent button would sit over unblurred transcript
     text, hurting the legibility of both. */
  @supports (backdrop-filter: blur(12px)) {
    /* Keep this rule aligned with its surrounding surface. */
    .scroll--to-latest {
      background: color-mix(in oklch, var(--surface-raised) 88%, transparent);
      backdrop-filter: blur(12px);
    }

    /* Keep this rule aligned with its surrounding surface. */
    .scroll--to-latest:hover {
      background: color-mix(in oklch, var(--surface-muted) 88%, transparent);
    }
  }

  /* Editable seam: contrast — the high-contrast reader gives up the glass: translucency lowers the
     chevron's effective contrast against whatever scrolls behind it, so the control returns to
     an opaque surface and carries the stronger border the app's other raised surfaces use. */
  /* Do not edit — The opaque high-contrast fallback is an accessibility guarantee; translucent surfaces must not survive prefers-contrast: more. */
  @media (prefers-contrast: more) {
    /* Keep this rule aligned with its surrounding surface. */
    .scroll--to-latest,
    .scroll--to-latest:hover {
      border-color: var(--line-strong);
      background: var(--surface-raised);
      backdrop-filter: none;
    }
  }

  /* This slot: scroll--badge — new-message count pill. */
  .scroll--badge {
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
    color: var(--on-accent-text);
    font-size: 0.7rem;
    font-weight: 700;
  }

  /* This slot: scroll-region — the scrollable clip of the virtual list. */
  .transcript--scroll {
    height: min(70dvh, 54rem);
    overflow: auto;
    overscroll-behavior: contain;
    /* Vertical panning remains native while the action observes a second touch pointer. */
    touch-action: pan-y;
    scrollbar-color: var(--line-strong) transparent;
  }

  /* This slot: virtual-list — reserves total height; rows are absolutely positioned below. */
  /* Do not edit — virtualization layout — Measured rows; do not change row height math. */
  .transcript--virtual {
    position: relative;
    width: 100%;
    /* Visual scaling leaves the virtualizer's measured row geometry unchanged during a gesture. */
    transform: scale(var(--transcript-text-scale, 1));
    transform-origin: top left;
  }

  /* Do not edit — virtual row + streaming marker share the measured absolute row slot. */
  .virtual-row,
  .streaming--marker {
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

  /* This state: turn--start — hairline + breathing room before each new prompt. */
  .virtual-row.turn--start {
    margin-top: var(--space-6);
    padding-top: var(--space-6);
    border-top: 1px solid var(--line);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .inbound-image--stack {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-3);
  }

  /* Inline streaming marker: a small pulsing cue attached under the active answer. */
  /* This state: streaming · This slot: streaming--marker — the "Working…" live cue. */
  .streaming--marker {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding-block: var(--space-2);
    padding-inline: 0;
  }

  /* This slot: streaming--icon — pulsing dots. */
  .streaming--icon {
    display: inline-flex;
    align-items: center;
    gap: 0.22rem;
    color: var(--accent);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .streaming--icon i {
    width: 0.3rem;
    height: 0.3rem;
    border-radius: 50%;
    background: currentColor;
    animation: working-wave 1.1s ease-in-out infinite;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .streaming--icon i:nth-child(2) {
    animation-delay: 120ms;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .streaming--icon i:nth-child(3) {
    animation-delay: 240ms;
  }

  /* This state: stalled — static dots avoid suggesting active progress after a long silence. */
  .streaming--icon.is-stalled i {
    animation: none;
  }

  /* This slot: streaming--label */
  .streaming--label {
    color: var(--ink-muted);
    font-size: 0.85rem;
    font-weight: 550;
  }

  /* Do not edit — streaming reduced-motion — A11y invariant; do not remove. */
  @media (prefers-reduced-motion: reduce) {
    /* Keep this rule aligned with its surrounding surface. */
    .streaming--icon i {
      animation: none;
    }
  }

  /* The completion card is an overlay above the composer: while it is open it
     must never sit under the scroll--to-latest pill, and the pill stays out of
     the accessibility tree while hidden. */
  :global(body:has(.slash--panel) .scroll--to-latest) {
    visibility: hidden;
    pointer-events: none;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .scroll--badge {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
</style>
