<script lang="ts">
  // Svelte equivalent of the React CopyHarness in useCopyFeedback.test.tsx.
  // useCopyFeedback is a runes factory ($state) that must run inside a
  // component <script>, so this probe mounts it and projects the reactive
  // announcement and action label into the DOM for the test to read and
  // drive. The button's onclick calls feedback.copy(unit, source), matching
  // the React Button's onPress handler. The optional unit/source props
  // default to the exact values the React oracle hardcoded.
  import { useCopyFeedback } from '../../src/pages/chat/rich-content/useCopyFeedback.svelte.js';

  let {
    unit = 'code',
    source = 'exact \nsource\n',
  }: {
    unit?: string;
    source?: string;
  } = $props();

  const feedback = useCopyFeedback();
  const label = $derived(feedback.actionLabel(unit));
  const announcement = $derived(feedback.announcement);
</script>

{#if feedback.canCopy}
  <button type="button" onclick={() => feedback.copy(unit, source)}>{label}</button>
  <p role="status" aria-live="polite">{announcement}</p>
{:else}
  <p>Copy unavailable</p>
{/if}
