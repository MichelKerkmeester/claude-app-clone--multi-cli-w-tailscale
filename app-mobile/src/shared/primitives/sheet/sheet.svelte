<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SHEET ROOT TYPES
  // ───────────────────────────────────────────────────────────────────

  let nextSheetId = 0;
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SHEET ROOT
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { Dialog } from 'bits-ui';
  import {
    claimSheetEvent,
    isFocusInsideTopmostSheet,
    isTopmostSheetLayer,
    registerSheetLayer,
    setSheetContext,
    type SheetLayer,
  } from '../a11y/aria-hide-outside.svelte.js';
  import type { Snippet } from 'svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  interface Props extends Omit<Dialog.RootProps, 'open' | 'child' | 'children'> {
    open?: boolean;
    children: Snippet;
  }

  let {
    open = $bindable(false),
    children,
    onOpenChange: onRootOpenChange,
    ...rest
  }: Props = $props();

  setSheetContext(() => open);

  // ───────────────────────────────────────────────────────────────────
  // 3. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep root open changes flowing to the host that owns sheet truth.
  function handleOpenChange(next: boolean): void {
    onRootOpenChange?.(next);
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep browser Back and focus inside the active sheet without consuming nested sheets together.
  $effect(() => {
    if (!open || typeof window === 'undefined') return;

    const layer: SheetLayer = { isOpen: () => open };
    const releaseLayer = registerSheetLayer(layer);
    const previousState = window.history.state;
    const marker = `sheet-${++nextSheetId}`;
    window.history.pushState(
      { ...(previousState ?? {}), __piRemoteSheet: marker },
      '',
      window.location.href,
    );

    const requestClose = (event: Event): void => {
      if (!isTopmostSheetLayer(layer) || !claimSheetEvent(event)) return;
      if (onRootOpenChange === undefined) open = false;
      else onRootOpenChange(false);
    };
    const onPopState = (event: PopStateEvent): void => requestClose(event);
    const onFocusIn = (event: FocusEvent): void => {
      if (!isFocusInsideTopmostSheet(event.target)) requestClose(event);
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      releaseLayer();
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('focusin', onFocusIn, true);
      if (window.history.state?.__piRemoteSheet === marker) {
        window.history.replaceState(previousState, '', window.location.href);
      }
    };
  });
</script>

<!-- Component content -->
<Dialog.Root bind:open onOpenChange={handleOpenChange} {...rest}>{@render children()}</Dialog.Root>
