<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { TodoProjectionV1 } from '@pi-remote/pi-rpc-protocol';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface TodoPanelProps {
    readonly projection: TodoProjectionV1;
    readonly refreshing?: boolean;
    readonly needsRefresh?: boolean;
    readonly announcement?: string;
    readonly onRefresh?: () => void;
    /** Parent clears the announcement slot after render; reducer stays authoritative. */
    readonly onAnnouncementConsumed?: () => void;
    /** Optional locale used for the relative timestamp. Defaults to the platform. */
    readonly locale?: string | string[];
    /** Override the wall-clock used for the relative timestamp. */
    readonly now?: () => number;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function relativeTimestamp(
    value: string,
    locale?: string | string[],
    now: () => number = Date.now,
  ): string {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return 'recently';
    const elapsedMinutes = Math.round((parsed - now()) / 60_000);
    if (Math.abs(elapsedMinutes) < 60) {
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(elapsedMinutes, 'minute');
    }
    const elapsedHours = Math.round(elapsedMinutes / 60);
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(elapsedHours, 'hour');
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { buildTodoDisplayModel, TODO_STATE_LABELS } from '$shared/state/todo-model.js';
  import Button from '$shared/primitives/button/button.svelte';
  import Collapsible from '$shared/primitives/disclosure/collapsible.svelte';
  import { focused, focusVisible, hover, press } from '$shared/primitives/a11y/interactions.js';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    projection,
    refreshing = false,
    needsRefresh = false,
    announcement = '',
    onRefresh,
    onAnnouncementConsumed,
    locale,
    now,
  }: TodoPanelProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // Host-confirmed projection only; section disclosure is local UI (defaultExpanded).
  let openByState = $state({
    pending: true,
    active: true,
    done: true,
    blocked: true,
  });
  let lastPlanId = $state('');

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const model = $derived(buildTodoDisplayModel(projection));

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const planId = projection.planId;
    if (lastPlanId !== '' && lastPlanId !== planId) {
      openByState = { pending: true, active: true, done: true, blocked: true };
    }
    lastPlanId = planId;
  });

  // Remove the live region between announcements so SR does not replay stale text.
  let lastSeen = '';
  let primed = false;

  $effect(() => {
    const current = announcement;
    const consume = onAnnouncementConsumed;
    if (!primed) {
      primed = true;
      lastSeen = current;
      return;
    }
    if (current !== '' && current !== lastSeen) {
      lastSeen = current;
      consume?.();
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function destroyAction(act: ReturnType<typeof hover>): void {
    if (typeof act === 'object' && act !== null) act.destroy?.();
  }

  // Bits Collapsible.Trigger lacks forwarded class/aria and interaction data attrs.
  function attachSectionTrigger(label: string) {
    return (node: HTMLElement) => {
      const button = node.parentElement;
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.add('todo-section-trigger');
      button.setAttribute('aria-label', label);
      const hoverAct = hover(button);
      const pressAct = press(button);
      const focusVisibleAct = focusVisible(button);
      const focusedAct = focused(button);
      return () => {
        destroyAction(hoverAct);
        destroyAction(pressAct);
        destroyAction(focusVisibleAct);
        destroyAction(focusedAct);
        button.classList.remove('todo-section-trigger');
        button.removeAttribute('aria-label');
      };
    };
  }
</script>

<!-- @ds surface: todos — the read-only todo projection panel (pi's plan). Slot seams below. -->
<!-- @ds guardrail: READ-ONLY projection — The phone NEVER mutates pi's task list; grouping and per-task states come from buildTodoDisplayModel over the projection, and the React-aria Disclosure/Button wiring remains component-owned. Not designer-editable. -->
<section
  class="todo-panel"
  aria-label="pi's plan"
  data-todo-panel="true"
  data-todo-all-done={model.allDone ? 'true' : 'false'}
>
  <!-- @ds slot: header — sticky panel header; heading + progress-count + refresh control. -->
  <header class="todo-panel-header">
    <!-- @ds slot: heading — the provenance eyebrow + read-only label. -->
    <div class="todo-panel-heading">
      <p class="todo-provenance">pi's plan · todo</p>
      <!-- @ds slot: read-only-label — the "Read-only host projection" note. -->
      <p class="todo-read-only-label">Read-only host projection</p>
    </div>
    <!-- @ds slot: progress-count — the done/total counter. -->
    <span class="todo-progress-count" aria-label="{model.doneCount} of {model.totalCount} tasks done">
      {model.doneCount}/{model.totalCount}
    </span>
    <!-- @ds slot: refresh — the react-aria Button that refreshes the read-only projection. -->
    <!-- @ds guardrail: react-aria Button wiring (type, aria-label, disabled, onPress) — Not designer-editable. -->
    <Button
      type="button"
      class="todo-refresh"
      aria-label="Refresh pi todos"
      disabled={refreshing || onRefresh === undefined}
      onclick={() => {
        onRefresh?.();
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M19 8a7 7 0 1 0 1 5M19 4v4h-4" />
      </svg>
      <span class="todo-refresh-label">{refreshing ? 'Refreshing' : 'Refresh'}</span>
    </Button>
  </header>
  <!-- @ds slot: progress-hairline — the done/total progress bar. -->
  {#if model.progressPercent !== null}
    <div
      class="todo-progress-hairline"
      role="progressbar"
      aria-label="Todo progress"
      aria-valuemin={0}
      aria-valuemax={model.totalCount}
      aria-valuenow={model.doneCount}
    >
      <span data-todo-progress-fill="true" style="inline-size: {model.progressPercent}%"></span>
    </div>
  {/if}
  <!-- @ds slot: sync-note · @ds state: syncing — note shown while the read-only view refreshes. -->
  {#if needsRefresh}
    <p class="todo-sync-note" role="status">
      The last verified plan is shown while the read-only view refreshes.
    </p>
  {/if}
  <!-- @ds slot: body — the panel content area; all-done / empty / sectioned-rows states below. -->
  <div class="todo-panel-body">
    {#if model.allDone}
      <!-- @ds state: all-done — every task done; a quiet summary line replaces the rows. -->
      <p class="todo-all-done" role="status">
        All done · {model.doneCount}/{model.totalCount}
      </p>
    {:else if model.totalCount === 0}
      <!-- @ds state: empty — no tasks in pi's current plan. -->
      <p class="todo-empty-line">No tasks in pi's current plan.</p>
    {:else}
      {#each model.sections as section (`${projection.planId}-${section.state}`)}
        <!-- @ds slot: section — one state's task rows in a collapsible Disclosure; section state read from
             `data-todo-state` (pending · active/in-progress · done). -->
        <Collapsible
          class="todo-state-section"
          data-todo-state={section.state}
          bind:open={openByState[section.state]}
        >
          {#snippet trigger()}
            <!-- @ds slot: section-trigger — the section header; chevron + label + count. -->
            <span
              class="todo-section-chevron"
              aria-hidden="true"
              {@attach attachSectionTrigger(
                `${section.label}, ${section.count} ${section.count === 1 ? 'task' : 'tasks'}`,
              )}
            >
              ›
            </span>
            <span>{section.label}</span>
            <span class="todo-section-count">{section.count}</span>
          {/snippet}
          <div class="todo-section-panel">
            {#each section.groups as group, groupIndex (`${projection.planId}-${section.state}-${group.group ?? 'ungrouped'}-${groupIndex}`)}
              <div class="todo-group-run">
                {#if group.group !== null}
                  <h4 class="todo-group-heading">{group.group}</h4>
                {/if}
                <ul class="todo-task-list" aria-label="{section.label} tasks">
                  {#each group.tasks as task (task.id)}
                    <!-- @ds slot: row — one task; state read from `data-todo-task-state` (pending · active/in-progress · done). -->
                    <li
                      class="todo-task-row"
                      data-todo-task-id={task.id}
                      data-todo-task-state={task.state}
                      data-todo-task-revision={task.revision}
                    >
                      <!-- @ds slot: glyph — the per-state marker; variants via .todo-state-glyph-{state}. -->
                      <span class="todo-state-glyph todo-state-glyph-{task.state}" aria-hidden="true">
                        <svg viewBox="0 0 16 16" focusable="false">
                          {#if task.state === 'pending' || task.state === 'active'}
                            <rect x="3.5" y="3.5" width="9" height="9" rx="1.25" />
                          {:else if task.state === 'done'}
                            <path d="m3.5 8.25 2.7 2.7 6.3-6.3" />
                          {:else}
                            <path d="M3.5 8h9" />
                          {/if}
                        </svg>
                      </span>
                      <span class="todo-task-title" dir="auto">{task.title}</span>
                      <span class="todo-task-state">{TODO_STATE_LABELS[task.state]}</span>
                      {#if task.updatedAt !== null}
                        <time class="todo-task-updated-at" datetime={task.updatedAt} title={task.updatedAt}>
                          {relativeTimestamp(task.updatedAt)}
                        </time>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        </Collapsible>
      {/each}
    {/if}
  </div>
  <!-- @ds slot: provenance-updated — the relative "Updated …" timestamp. -->
  {#if projection.updatedAt !== null}
    <time class="todo-updated-label" datetime={projection.updatedAt} title={projection.updatedAt}>
      Updated {relativeTimestamp(projection.updatedAt, locale, now)}
    </time>
  {/if}
  <!-- @ds guardrail: literal sr-only polite live region — Never layout space, focus, or scroll. -->
  {#if announcement !== ''}
    <div class="todo-live-region sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  {/if}
</section>

<!-- @ds surface: todos — the read-only todo projection panel (pi's plan). Decomposed into this scoped block;
     refresh/section-trigger are child primitives (Button / Collapsible.Trigger) so their classes and
     react-aria/runtime data-attributes use :global so Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* The todo projection is a transcript annotation, not an editable task surface. */
  /* @ds surface: todos — the read-only todo projection panel (pi's plan). */
  /* @ds guardrail: READ-ONLY projection — The phone NEVER mutates pi's task list. Grouped sections and per-task states come from the projection only; edit styling, never the model. */
  .todo-panel {
    display: grid;
    min-inline-size: 0;
    max-inline-size: 100%;
    gap: var(--space-3);
    padding: var(--space-4);
    padding-block-end: max(var(--space-4), env(safe-area-inset-bottom));
    overflow-wrap: anywhere;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--ink);
    font-family: var(--font-sans);
    scroll-margin-block: var(--space-8);
  }

  /* @ds state: all-done — every task done; the panel is quiet (no progress hairline replaces rows). */
  .todo-panel[data-todo-all-done='true'] {
    /* The all-done rendering is quiet: no progress hairline replaces the row list. */
    gap: var(--space-2);
  }

  /* @ds slot: header — sticky panel header; heading + progress-count + refresh control. */
  .todo-panel-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-2);
    /* Section heading stays anchored inside the bounded panel; never underneath
       the safe-area or global navigation. */
    position: sticky;
    inset-block-start: 0;
    z-index: 1;
    padding-block-end: var(--space-1);
    background: var(--canvas);
  }

  /* @ds slot: heading — the provenance eyebrow + read-only label. */
  .todo-panel-heading {
    display: grid;
    min-inline-size: 0;
    gap: 0.15rem;
  }

  /* @ds slot: provenance · @ds slot: read-only-label · @ds slot: progress-count · @ds slot: sync-note · @ds slot: empty-line · @ds slot: all-done — shared margin reset. */
  .todo-provenance,
  .todo-read-only-label,
  .todo-progress-count,
  .todo-sync-note,
  .todo-empty-line,
  .todo-all-done {
    margin: 0;
  }

  /* @ds slot: provenance — the "pi's plan · todo" eyebrow. */
  .todo-provenance {
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 1.05rem;
    line-height: 1.25;
  }

  /* @ds slot: read-only-label · @ds slot: sync-note · @ds state: syncing · @ds slot: empty-line · @ds state: empty — quiet meta + status lines. */
  .todo-read-only-label,
  .todo-sync-note,
  .todo-empty-line,
  .todo-updated-label {
    color: var(--ink-muted);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  /* @ds slot: progress-count — the done/total counter. */
  .todo-progress-count {
    color: var(--ink);
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  /* @ds slot: refresh · @ds slot: section-trigger — the shared 44px interactive base. */
  :global(.todo-refresh),
  :global(.todo-section-trigger) {
    min-inline-size: 44px;
    min-block-size: 44px;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    cursor: pointer;
    touch-action: manipulation;
  }

  /* @ds slot: refresh — refreshes the read-only projection. */
  :global(.todo-refresh) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding-inline: var(--space-2);
    border-radius: var(--radius-control);
    color: var(--ink-secondary);
    font-size: 0.78rem;
  }

  :global(.todo-refresh svg) {
    inline-size: 1rem;
    block-size: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
  }

  /* @ds state: hover · pressed — refresh + section triggers. */
  :global(.todo-refresh[data-hovered]),
  :global(.todo-refresh[data-pressed]),
  :global(.todo-section-trigger[data-hovered]),
  :global(.todo-section-trigger[data-pressed]) {
    background: var(--canvas-subtle);
  }

  /* @ds guardrail: focus-visible — The shared AA focus ring across refresh + section triggers. */
  :global(.todo-refresh[data-focus-visible]),
  :global(.todo-section-trigger[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* @ds state: disabled — refresh fails back to a quiet, parked control. */
  :global(.todo-refresh[data-disabled]) {
    cursor: default;
    opacity: 0.65;
  }

  /* @ds slot: progress-hairline — the done/total progress bar (aria progressbar is guarded). */
  .todo-progress-hairline {
    block-size: 3px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--line-hairline);
  }

  .todo-progress-hairline > span {
    display: block;
    block-size: 100%;
    border-radius: inherit;
    background: var(--accent);
    transform-origin: inline-start;
  }

  /* @ds slot: body — the panel content area; all-done / empty / sectioned-rows states below. */
  .todo-panel-body {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-2);
  }

  /* @ds slot: rows — a collapsible state group; section state via data-todo-state (pending · in-progress · done). */
  :global(.todo-state-section) {
    min-inline-size: 0;
    border-block-start: 1px solid var(--line);
  }

  :global(.todo-state-section > h2),
  :global(.todo-state-section > h3) {
    margin: 0;
  }

  /* @ds slot: section-trigger — the section header; chevron + label + count. */
  :global(.todo-section-trigger) {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    inline-size: 100%;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) 0;
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    font-weight: 700;
    text-align: start;
  }

  /* @ds slot: section-chevron — the collapse/expand chevron. */
  .todo-section-chevron {
    color: var(--ink-muted);
    font-size: 1rem;
    transform: rotate(90deg);
  }

  /* @ds state: collapsed — closed section chevron. */
  :global(.todo-section-trigger[aria-expanded='false'] .todo-section-chevron) {
    transform: none;
  }

  /* @ds slot: section-count — the per-section task count. */
  .todo-section-count {
    min-inline-size: 1.5rem;
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
    text-align: end;
  }

  .todo-section-panel,
  .todo-group-run {
    min-inline-size: 0;
  }

  .todo-group-run + .todo-group-run {
    margin-block-start: var(--space-2);
  }

  /* @ds slot: group-heading — a named group label inside a section. */
  .todo-group-heading {
    margin: 0;
    padding: var(--space-1) 0 var(--space-1) 1.75rem;
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.035em;
  }

  /* @ds slot: rows — the task row list. */
  .todo-task-list {
    display: grid;
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* @ds slot: row — one task; state read from data-todo-task-state (pending · active/in-progress · done). */
  .todo-task-row {
    display: grid;
    grid-template-columns: 1.1rem minmax(0, 1fr) auto;
    min-inline-size: 0;
    min-block-size: 44px;
    align-items: center;
    gap: var(--space-2);
    padding-block: var(--space-2);
    border-block-start: 1px solid var(--line);
  }

  .todo-task-list > .todo-task-row:first-child {
    border-block-start: 0;
  }

  /* @ds slot: glyph — the per-state marker; variants via .todo-state-glyph-{state}. */
  .todo-state-glyph {
    display: inline-grid;
    inline-size: 1rem;
    block-size: 1rem;
    place-items: center;
    color: var(--ink);
  }

  .todo-state-glyph svg {
    inline-size: 100%;
    block-size: 100%;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.6;
  }

  /* @ds state: in-progress (active) — the running/highlighted task marker. */
  .todo-state-glyph-active svg {
    fill: var(--accent);
    stroke: var(--ink);
  }

  /* @ds state: done — the completed task marker. */
  .todo-state-glyph-done svg {
    stroke-width: 2;
  }

  /* @ds slot: title — the task title copy. */
  .todo-task-title {
    min-inline-size: 0;
    color: var(--ink);
    font-size: 0.86rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
    unicode-bidi: plaintext;
  }

  /* @ds slot: task-state — the localized state label. */
  .todo-task-state {
    color: var(--ink-muted);
    font-size: 0.72rem;
    line-height: 1.35;
    white-space: nowrap;
  }

  /* @ds slot: updated-at — the per-task relative timestamp. */
  .todo-task-updated-at {
    grid-column: 2 / -1;
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    text-align: end;
    white-space: nowrap;
  }

  /* @ds state: all-done — every task done; a quiet glowing summary line. */
  .todo-all-done {
    padding-block: var(--space-3);
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 1rem;
  }

  /* @ds slot: provenance-updated — the relative "Updated …" timestamp. */
  .todo-updated-label {
    justify-self: end;
  }

  /* @ds guardrail: sr-only polite live region — Must never take layout space, move focus, or scroll. */
  .todo-live-region {
    /* The live region is purely a screen-reader polite queue; it must never
       take layout space, never move focus, and never cause a scroll. */
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 24rem) {
    .todo-panel {
      gap: var(--space-2);
      padding: var(--space-3);
    }

    .todo-panel-header {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    :global(.todo-refresh) {
      grid-column: 1 / -1;
      inline-size: 100%;
    }

    .todo-task-row {
      grid-template-columns: 1.1rem minmax(0, 1fr);
    }

    .todo-task-state {
      grid-column: 2;
    }

    .todo-task-updated-at {
      grid-column: 2 / -1;
    }
  }

  /* Dynamic text scaling must keep the panel usable and never overflow
     horizontally. Inter + Source Serif 4 stay <= 1.4rem at +200% scaling. */
  @media (min-resolution: 1dppx) {
    .todo-panel {
      container-type: inline-size;
    }

    .todo-task-title {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  }

  :global([dir='rtl']) .todo-section-chevron {
    transform: rotate(-90deg);
  }

  :global([dir='rtl'] .todo-section-trigger[aria-expanded='false'] .todo-section-chevron) {
    transform: none;
  }

  :global([dir='rtl']) .todo-progress-hairline > span {
    transform-origin: inline-end;
  }

  /* Under reduced motion the row pulse is suppressed and no layout animation
     runs. Background updates must not auto-scroll the transcript or move
     focus; the live region uses absolute positioning so it never affects the
     scroll container. */
  @media (prefers-reduced-motion: reduce) {
    .todo-panel *,
    .todo-panel *::before,
    .todo-panel *::after {
      animation: none !important;
      transition: none !important;
      transform: none !important;
    }

    .todo-panel {
      scroll-behavior: auto;
    }

    .todo-progress-hairline > span {
      transition: none !important;
    }
  }
  /* @ds end surface: todos */
</style>
