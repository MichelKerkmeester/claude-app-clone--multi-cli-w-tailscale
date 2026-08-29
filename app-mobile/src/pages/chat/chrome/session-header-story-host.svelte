<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SESSION HEADER STORY HOST
  // ───────────────────────────────────────────────────────────────────
  // The live screen mounts the session header and the model-effort sheet as
  // siblings. Isolated stories need that same composition without opening a
  // children hole in the sheet.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import SessionHeader, { type SessionHeaderProps } from './session-header.svelte';
  import ModelEffortSheet from './sheet-model-effort.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { ...props }: SessionHeaderProps = $props();
</script>

<!-- Component content -->
<SessionHeader {...props} />
<ModelEffortSheet
  isOpen={props.sheetOpen}
  onOpenChange={() => undefined}
  initialSection="model"
  runtimeControls={props.runtimeControls}
/>
