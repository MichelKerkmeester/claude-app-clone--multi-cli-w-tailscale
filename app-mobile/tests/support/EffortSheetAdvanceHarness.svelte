<script module lang="ts">
  // Test harness for effort-sheet-a11y.svelte.test.ts — holds the runtime as
  // internal $state that tests mutate via an exposed `advance()` method. This
  // avoids @testing-library's createProps Proxy, which replaces the entire
  // props object on rerender and causes ModelEffortSheet's open-effect to
  // re-run (resetting the announcement). With internal $state, only the
  // `runtime` derivation changes — the open-effect (which depends on `isOpen`,
  // `initialSection`, `runtimeControls`) does not re-run, so the announcement
  // effect can observe the pending→settled transition and announce exactly once.
  import type { RuntimeControls, RuntimeUiState } from '../../src/shared/data/runtime.js';

  export interface EffortSheetAdvanceHarnessProps {
    readonly initialRuntime: RuntimeUiState;
    readonly initialSection?: 'model' | 'effort';
    readonly isOpen?: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly triggerRef?: HTMLButtonElement | null;
    readonly refresh?: ReturnType<typeof vi.fn> | undefined;
    readonly setModel?: ReturnType<typeof vi.fn> | undefined;
    readonly setThinkingLevel?: ReturnType<typeof vi.fn> | undefined;
    readonly setMode?: ReturnType<typeof vi.fn> | undefined;
    /** Optional callback fired with the harness api on mount so tests can drive advance(). */
    readonly onApi?: (api: EffortSheetAdvanceHarnessApi) => void;
  }

  export interface EffortSheetAdvanceHarnessApi {
    readonly advance: (next: RuntimeUiState) => void;
    readonly controls: RuntimeControls;
  }
</script>

<script lang="ts">
  import { vi } from 'vitest';
  import ModelEffortSheet from '../../src/pages/chat/chrome/ModelEffortSheet.svelte';

  let {
    initialRuntime,
    initialSection = 'effort',
    isOpen = true,
    onOpenChange,
    triggerRef = null,
    refresh,
    setModel,
    setThinkingLevel,
    setMode,
    onApi,
  }: EffortSheetAdvanceHarnessProps = $props();

  // Internal reactive runtime — tests call `advance()` to transition it.
  let runtimeState = $state<RuntimeUiState>(initialRuntime);

  const refreshFn = refresh ?? vi.fn().mockResolvedValue(undefined);
  const setModelFn = setModel ?? vi.fn().mockResolvedValue(null);
  const setThinkingLevelFn = setThinkingLevel ?? vi.fn().mockResolvedValue(null);
  const setModeFn = setMode ?? vi.fn().mockResolvedValue(null);

  // Stable controls: `runtime` is a getter over $state, so ModelEffortSheet's
  // $derived(runtimeControls.runtime) tracks `runtimeState` and recomputes on
  // advance. The controls reference and mock fns are stable for the component's
  // lifetime, so the open-effect (which depends on isOpen, initialSection,
  // runtimeControls) does NOT re-run on a runtime-only advance.
  const controls: RuntimeControls = {
    get runtime() {
      return runtimeState;
    },
    refresh: refreshFn,
    setModel: setModelFn,
    setThinkingLevel: setThinkingLevelFn,
    setMode: setModeFn,
  };

  function advance(next: RuntimeUiState): void {
    runtimeState = next;
  }

  // Expose advance + controls to the test via bind:this.
  export const api: EffortSheetAdvanceHarnessApi = { advance, controls };

  // Fire the optional onApi callback during initialization so tests can
  // capture the api reference without reaching into the component instance.
  onApi?.(api);
</script>

<ModelEffortSheet
  {isOpen}
  {onOpenChange}
  {initialSection}
  runtimeControls={controls}
  {triggerRef}
/>
