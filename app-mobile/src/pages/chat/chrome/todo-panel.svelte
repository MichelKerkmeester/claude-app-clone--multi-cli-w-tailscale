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
    /**
     * Called after the panel has rendered an announcement so the parent can
     * Clear the announcement slot on the next render pass. The reducer keeps
     * The source-of-truth; the panel owns only the visual lifecycle.
     */
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

  import './todo-panel.css';

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

  // The live region speaks only the redacted title and the localized state. The
  // Region is removed from the DOM between announcements so screen readers do
  // Not re-announce stale text and the polite queue is never backlogged.
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

  // Collapsible.Trigger is the slot=trigger button; the wrapper does not forward
  // Trigger class/aria, and Bits does not emit data-hovered/pressed/focus-visible.
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

<!-- @ds surface: todos — the read-only todo projection panel (pi's plan). Decomposed into this co-located CSS file;
     refresh/section-trigger are child primitives (Button / Collapsible.Trigger) so their classes and
     react-aria/runtime data-attributes use :global so Svelte scoping cannot drop them. Values unchanged. -->
