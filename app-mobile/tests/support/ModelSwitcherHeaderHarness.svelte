<script module lang="ts">
  import type { RuntimeControls } from '../../src/shared/state/runtime.js';

  export interface ModelSwitcherHeaderHarnessProps {
    readonly controls: RuntimeControls;
  }
</script>

<script lang="ts">
  import { vi } from 'vitest';
  import SessionHeader from '../../src/pages/chat/chrome/session-header.svelte';
  import ModelEffortSheet from '../../src/pages/chat/chrome/sheet-model-effort.svelte';

  let { controls }: ModelSwitcherHeaderHarnessProps = $props();

  let open = $state(false);
  let modelTriggerRef = $state<HTMLButtonElement | null>(null);
</script>

<button type="button">Outside before</button>
<SessionHeader
  onBack={vi.fn()}
  onInbox={vi.fn()}
  onReview={vi.fn()}
  theme="light"
  onThemeChange={vi.fn()}
  runtimeControls={controls}
  sheetOpen={open}
  onOpenModelSheet={() => (open = true)}
  bind:modelTriggerRef
/>
<button type="button">Outside after</button>
<ModelEffortSheet
  isOpen={open}
  onOpenChange={(v: boolean) => (open = v)}
  initialSection="model"
  runtimeControls={controls}
  triggerRef={modelTriggerRef}
/>
