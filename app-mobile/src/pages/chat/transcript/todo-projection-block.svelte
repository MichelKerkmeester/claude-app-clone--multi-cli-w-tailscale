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

  import './todo-projection-block.css';

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
     Decomposed into this co-located CSS file; .todo-projection-block is owned solely by this component so it moves
     with it. Values unchanged. -->
