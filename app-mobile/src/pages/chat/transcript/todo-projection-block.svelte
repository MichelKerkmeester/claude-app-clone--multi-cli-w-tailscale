<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: TODO PROJECTION BLOCK
  // ───────────────────────────────────────────────────────────────────

  import type { TodoProjectionState } from '$shared/state/state.js';

  export interface TodoProjectionBlockProps {
    readonly state: TodoProjectionState;
    readonly onRefresh?: () => void;
    readonly onAnnouncementConsumed?: () => void;
    readonly locale?: string | string[];
    readonly now?: () => number;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import TodoPanel from '../chrome/todo-panel.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    state,
    onRefresh,
    onAnnouncementConsumed,
    locale,
    now,
  }: TodoProjectionBlockProps = $props();
</script>

<!-- @ds slot: projection-block — mount wrapper for the read-only todo projection inside a transcript. -->
{#if state.availability === 'available' && state.projection !== null}
  <article class="todo-projection-block" data-todo-projection-block="true">
    {#key state.projection.planId}
      <TodoPanel
        projection={state.projection}
        refreshing={state.refreshing}
        needsRefresh={state.needsRefresh}
        announcement={state.announcement}
        {...(onRefresh === undefined ? {} : { onRefresh })}
        {...(onAnnouncementConsumed === undefined ? {} : { onAnnouncementConsumed })}
        {...(locale === undefined ? {} : { locale })}
        {...(now === undefined ? {} : { now })}
      />
    {/key}
  </article>
{/if}

<!-- @ds slot: projection-block — mount wrapper for the read-only todo projection inside a transcript.
     Decomposed into this scoped block; .todo-projection-block is owned solely by this component so it moves
     with it. Values unchanged. -->
<style>
  /* Read-only transcript annotation — not an editable task surface. */
  /* @ds surface: todos — the read-only todo projection panel (pi's plan). */
  /* @ds guardrail: READ-ONLY projection — the phone NEVER mutates pi's task list. The grouped
     sections and per-task states come from the projection only; edit styling, never the model. */
  .todo-projection-block {
    min-inline-size: 0;
    overflow: visible;
  }
</style>
