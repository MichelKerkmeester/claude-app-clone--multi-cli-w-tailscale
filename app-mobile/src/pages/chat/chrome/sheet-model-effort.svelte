<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { applyingEffortMessage, effortStrings } from '$shared/catalog/effort.js';
  import {
    runtimePhaseIsRepairable,
    type RuntimeControls,
    type RuntimePhase,
    type RuntimeUiState,
  } from '$shared/state/runtime.js';
  import { runtimeIssueMessage } from '$shared/state/runtime-issues.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  export const SEARCH_THRESHOLD = 8;
  export const SWIPE_DISMISS_RATIO = 0.3;
  export const SWIPE_DISMISS_VELOCITY = 1_200;
  export const EMPTY_LEVELS: readonly string[] = [];

  // ───────────────────────────────────────────────────────────────────
  // 3. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export type EffortSheetSection = 'model' | 'effort';

  export interface ModelEffortSheetProps {
    readonly isOpen: boolean;
    readonly onOpenChange: (open: boolean) => void;
    /** Section shown when the sheet opens; the header opens "model", RuntimeStrip "effort". */
    readonly initialSection: EffortSheetSection;
    readonly runtimeControls: RuntimeControls;
    /** The trigger that opened the sheet; focus returns here on close. */
    triggerRef?: HTMLButtonElement | null;
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  export const RECONCILE_PHASES: ReadonlySet<RuntimePhase> = new Set([
    'ready-empty',
    'unsupported',
    'offline',
    'foreground-required',
    'rate-limited',
    'host-unavailable',
    'delivery-unknown',
    'inconsistent-state',
  ]);

  // ───────────────────────────────────────────────────────────────────
  // 5. HELPERS
  // ───────────────────────────────────────────────────────────────────

  export function effortSectionStatus(
    runtime: RuntimeUiState,
    levels: readonly string[],
  ): string | null {
    switch (runtime.phase) {
      case 'checking':
        return effortStrings.checking;
      case 'streaming':
        return effortStrings.streaming;
      case 'ready-off-only':
        return effortStrings.offOnly;
      case 'ready-empty':
        return effortStrings.empty;
      case 'pending':
        return runtime.pending?.type === 'set_thinking_level'
          ? applyingEffortMessage(runtime.pending.level, levels)
          : null;
      case 'stale':
        return effortStrings.stale;
      case 'unsupported':
        return runtimeIssueMessage('unsupported');
      case 'offline':
        return runtimeIssueMessage('offline');
      case 'foreground-required':
        return runtimeIssueMessage('foreground-required');
      case 'rate-limited':
        return runtimeIssueMessage('rate-limited');
      case 'host-unavailable':
        return runtimeIssueMessage('host-unavailable');
      case 'delivery-unknown':
        return runtimeIssueMessage('delivery-unknown');
      case 'inconsistent-state':
        return runtimeIssueMessage('invalid-response');
      default:
        return null;
    }
  }

  export function modelDomId(value: string): string {
    return encodeURIComponent(value).replace(/%/gu, '_');
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 6. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { AvailableModelDto, RuntimeControlResponse } from '@pi-remote/pi-rpc-protocol';
  import { untrack } from 'svelte';
  import { effortConfirmedMessage } from '$shared/catalog/effort.js';
  import {
    displayModelText as displayModel,
    filterAndRankModels,
    isModelAvailable,
    matchesModel,
    modelAvailabilityMessage,
    modelCapabilities,
    modelKey,
    organizeModelCatalog as organizeCatalog,
  } from '$shared/catalog/model-catalog.js';
  import {
    modelCountMessage,
    modelRowName,
    modelStatusAnnouncement,
    modelSwitcherStrings as strings,
    modelSwitchedMessage,
    noModelMatchMessage,
    runtimeOutcomeMessage,
  } from '$shared/catalog/model-switcher-strings.js';
  import { focusVisible, focused, hover, press } from '$shared/primitives/a11y/interactions.js';
  import Button from '$shared/primitives/button/button.svelte';
  import Sheet from '$shared/primitives/sheet/sheet.svelte';
  import SheetClose from '$shared/primitives/sheet/sheet-close.svelte';
  import SheetContent from '$shared/primitives/sheet/sheet-content.svelte';
  import SheetTitle from '$shared/primitives/sheet/sheet-title.svelte';
  import EffortRadioGroup from './radio-effort.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 7. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    isOpen,
    onOpenChange,
    initialSection,
    runtimeControls,
    triggerRef = null,
  }: ModelEffortSheetProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 8. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let sheetOpen = $state(false);
  let section = $state<EffortSheetSection>('model');
  let query = $state('');
  let draftKey = $state<string | null>(null);
  let isCommitting = $state(false);
  let terminalBlocked = $state(false);
  let mutationMessage = $state('');
  let announcement = $state('');
  let dragOffset = $state(0);
  let isDragging = $state(false);
  let isSnapping = $state(false);
  let searchEl = $state<HTMLInputElement | null>(null);
  let dialogEl = $state<HTMLElement | null>(null);
  let modalEl = $state<HTMLElement | null>(null);
  let activeSearchIndex = $state<number | null>(null);
  const MODEL_LISTBOX_ID = 'model-sheet-listbox';

  let dragRef: {
    readonly pointerId: number;
    readonly startY: number;
    readonly startedAt: number;
  } | null = null;
  let snapTimerRef: number | null = null;
  // Guards effort status announcements to one polite region per transition.
  let prevEffortPending: string | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 9. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const runtime = $derived(runtimeControls.runtime);

  // Bits Dialog writes locally; mirror host open after every change.
  const hostOpen = $derived(isOpen);
  const deferredQuery = $derived(query);

  const current = $derived(runtime.state?.model ?? null);
  const currentKey = $derived(current === null ? null : modelKey(current));
  const confirmedEffort = $derived(runtime.state?.thinkingLevel ?? null);
  const showSearch = $derived(runtime.models.length >= SEARCH_THRESHOLD);
  const visibleModels = $derived(filterAndRankModels(runtime.models, deferredQuery));
  const groupingCurrent = $derived(
    current !== null && (deferredQuery.length === 0 || matchesModel(current, deferredQuery))
      ? current
      : null,
  );
  const catalog = $derived(
    organizeCatalog(visibleModels, groupingCurrent, deferredQuery.length > 0),
  );
  const searchOptions = $derived.by(() =>
    showSearch && !isCommitting
      ? catalog.groups.flatMap((group) => group.models.filter(isModelAvailable))
      : [],
  );
  const activeSearchOptionKey = $derived.by(() => {
    if (activeSearchIndex === null) return null;
    const option = searchOptions[activeSearchIndex];
    return option === undefined ? null : modelKey(option);
  });
  const draft = $derived(
    draftKey === null
      ? null
      : (runtime.models.find((model) => modelKey(model) === draftKey) ?? null),
  );
  const streamingBlocked = $derived(
    runtime.state?.streaming === true && !runtime.canSetModelWhileStreaming,
  );
  const canCommit = $derived(
    draft !== null &&
      draftKey !== currentKey &&
      isModelAvailable(draft) &&
      runtime.status === 'ready' &&
      runtime.catalogPhase === 'ready' &&
      !runtime.deliveryUnknown &&
      !streamingBlocked &&
      !terminalBlocked &&
      !isCommitting,
  );

  const anyPending = $derived(runtime.phase === 'pending' && runtime.pending !== null);
  const isEffortPending = $derived(anyPending && runtime.pending?.type === 'set_thinking_level');
  const pendingEffortLevel = $derived(
    isEffortPending && runtime.pending?.type === 'set_thinking_level'
      ? runtime.pending.level
      : null,
  );
  const effortGroupDisabled = $derived(
    (runtime.status !== 'ready' && !anyPending) ||
      runtime.phase === 'ready-off-only' ||
      runtime.phase === 'ready-empty' ||
      runtime.phase === 'inconsistent-state',
  );
  const levels = $derived(runtime.state?.availableThinkingLevels ?? EMPTY_LEVELS);
  const effortStatus = $derived(effortSectionStatus(runtime, levels));
  const showReconcile = $derived(
    RECONCILE_PHASES.has(runtime.phase ?? 'checking') &&
      runtimePhaseIsRepairable(runtime.phase ?? 'checking'),
  );

  // ───────────────────────────────────────────────────────────────────
  // 10. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    sheetOpen = hostOpen;
  });

  $effect(() => {
    if (!isOpen) return;
    section = initialSection;
    query = '';
    draftKey = null;
    terminalBlocked = false;
    mutationMessage = '';
    announcement = '';
    activeSearchIndex = null;
    prevEffortPending = null;
    dragOffset = 0;
    isDragging = false;
    isSnapping = false;
    void runtimeControls.refresh('open');
  });

  $effect(() => {
    return () => {
      if (snapTimerRef !== null) window.clearTimeout(snapTimerRef);
    };
  });

  $effect(() => {
    if (
      runtime.status === 'ready' &&
      runtime.catalogPhase === 'ready' &&
      runtime.lastOutcome === null
    ) {
      terminalBlocked = false;
    }
  });

  $effect(() => {
    if (!isOpen || !showSearch) return;
    announcement = modelCountMessage(visibleModels.length, runtime.models.length);
  });

  $effect(() => {
    const searchIsVisible = isOpen && section === 'model' && showSearch;
    const optionCount = searchOptions.length;
    untrack(() => {
      if (!searchIsVisible || optionCount === 0) {
        activeSearchIndex = null;
      } else if (activeSearchIndex !== null && activeSearchIndex >= optionCount) {
        activeSearchIndex = optionCount - 1;
      }
    });
  });

  // Scroll active search option into view without stealing focus from the input.
  $effect(() => {
    const activeKey = activeSearchOptionKey;
    if (!isOpen || section !== 'model' || !showSearch || activeKey === null) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(activeKey)?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (!isOpen || section !== 'model' || runtime.catalogPhase !== 'ready') return;
    const focusSearch = showSearch;
    const focusTimer = window.setTimeout(() => {
      if (focusSearch) {
        searchEl?.focus({ preventScroll: true });
        return;
      }
      dialogEl
        ?.querySelector<HTMLElement>('.model-sheet-row[aria-current="true"]:not([data-disabled])')
        ?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(focusTimer);
  });

  $effect(() => {
    if (!isOpen || section !== 'effort') return;
    const focusTimer = window.setTimeout(() => {
      const confirmedRow = dialogEl?.querySelector<HTMLElement>(
        '.effort-radio-row[data-selected="true"]:not([data-disabled])',
      );
      const fallbackRow =
        confirmedRow === null
          ? (dialogEl?.querySelector<HTMLElement>('.effort-radio-row:not([data-disabled])') ?? null)
          : null;
      // The row label is not focusable; the native radio input inside it is.
      const target =
        (confirmedRow ?? fallbackRow)?.querySelector<HTMLElement>('input[type="radio"]') ??
        (confirmedRow ?? fallbackRow);
      target?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(focusTimer);
  });

  $effect(() => {
    if (!isOpen) return;
    const nowPending = isEffortPending ? pendingEffortLevel : null;
    const prevPending = prevEffortPending;
    prevEffortPending = nowPending;
    if (nowPending !== null && nowPending !== prevPending) {
      announcement = applyingEffortMessage(nowPending, levels);
      return;
    }
    if (prevPending === null || nowPending !== null) return;
    switch (runtime.phase) {
      case 'accepted':
      case 'ready-adjustable':
      case 'ready-off-only':
      case 'ready-empty':
        announcement = effortConfirmedMessage(runtime.state?.thinkingLevel ?? prevPending, levels);
        break;
      case 'stale':
        announcement = effortStrings.stale;
        break;
      default: {
        const message = effortSectionStatus(runtime, levels);
        if (message !== null) announcement = message;
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // 11. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  const restoreTriggerFocus = () => {
    window.setTimeout(() => triggerRef?.focus({ preventScroll: true }), 0);
  };

  const close = () => {
    if (isCommitting) return;
    dragRef = null;
    dragOffset = 0;
    isDragging = false;
    onOpenChange(false);
    restoreTriggerFocus();
  };

  function onSheetOpenChange(next: boolean): void {
    if (!next) {
      if (isCommitting) {
        sheetOpen = hostOpen;
        return;
      }
      dragRef = null;
      dragOffset = 0;
      isDragging = false;
      onOpenChange(false);
      restoreTriggerFocus();
    } else {
      onOpenChange(true);
    }
    sheetOpen = hostOpen;
  }

  // @ds guardrail: do-not-edit — Bits Dialog default auto-focus is prevented so the catalog row / effort radio receives focus, never the close control.
  function onOpenAutoFocus(event: Event): void {
    event.preventDefault();
  }

  function onCloseAutoFocus(event: Event): void {
    event.preventDefault();
    restoreTriggerFocus();
  }

  function onInteractOutside(event: PointerEvent): void {
    if (isCommitting) event.preventDefault();
  }

  function onOverlayClick(event: MouseEvent): void {
    if (isCommitting) return;
    if (event.target === event.currentTarget) close();
  }

  // @ds slot: drag-handle — grabber + swipe surface.
  // @ds guardrail: do-not-edit — Swipe-dismiss gesture wiring pairs with the react-aria modal drag choreography.
  const beginSwipe = (event: PointerEvent) => {
    if (isCommitting || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest('button, input, [role="button"]') !== null
    )
      return;
    dragRef = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startedAt: performance.now(),
    };
    isSnapping = false;
    isDragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };
  const moveSwipe = (event: PointerEvent) => {
    const drag = dragRef;
    if (drag === null || drag.pointerId !== event.pointerId || isCommitting) return;
    event.preventDefault();
    dragOffset = Math.max(0, event.clientY - drag.startY);
  };
  const endSwipe = (event: PointerEvent, canDismiss: boolean) => {
    const drag = dragRef;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    const travel = Math.max(0, event.clientY - drag.startY);
    const elapsed = Math.max(1, performance.now() - drag.startedAt);
    const velocity = (travel / elapsed) * 1_000;
    const sheetHeight = modalEl?.getBoundingClientRect().height ?? 0;
    dragRef = null;
    isDragging = false;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    if (
      canDismiss &&
      !isCommitting &&
      ((sheetHeight > 0 && travel > sheetHeight * SWIPE_DISMISS_RATIO) ||
        velocity >= SWIPE_DISMISS_VELOCITY)
    ) {
      close();
      return;
    }
    dragOffset = 0;
    isSnapping = true;
    if (snapTimerRef !== null) window.clearTimeout(snapTimerRef);
    snapTimerRef = window.setTimeout(() => (isSnapping = false), 220);
  };

  // @ds guardrail: do-not-edit — Sheet keyboard wiring (Escape and '/' shortcuts).
  const handleSheetKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && section === 'model' && query.length > 0 && !isCommitting) {
      event.preventDefault();
      event.stopPropagation();
      query = '';
      activeSearchIndex = null;
      searchEl?.focus();
    } else if (event.key === 'Escape' && !isCommitting) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (
      event.key === '/' &&
      section === 'model' &&
      showSearch &&
      event.target !== searchEl
    ) {
      event.preventDefault();
      searchEl?.focus();
    }
  };

  // @ds guardrail: do-not-edit — The model commit path stages a draft; commit is the single request to the host (setModel), guarded by canCommit.
  const commit = async () => {
    if (!canCommit || draft === null) return;
    isCommitting = true;
    mutationMessage = strings.applying;
    announcement = strings.applying;
    const response = await runtimeControls.setModel(draft.provider, draft.id);
    isCommitting = false;
    if (response === null) {
      mutationMessage = strings.hostChanged;
      announcement = modelStatusAnnouncement(strings.hostChanged);
      draftKey = null;
      return;
    }
    handleOutcome(response, draft);
  };

  // @ds guardrail: do-not-edit — Outcome reconciliation maps accepted, stale, policy_blocked, and delivery-unknown to the host's authoritative answer.
  const handleOutcome = (response: RuntimeControlResponse, target: AvailableModelDto) => {
    switch (response.outcome.status) {
      case 'accepted':
        announcement = modelSwitchedMessage(displayModel(target.label));
        onOpenChange(false);
        restoreTriggerFocus();
        break;
      case 'stale':
        terminalBlocked = true;
        draftKey = null;
        mutationMessage = runtimeOutcomeMessage(response.outcome);
        announcement = modelStatusAnnouncement(runtimeOutcomeMessage(response.outcome));
        break;
      case 'policy_blocked':
        terminalBlocked = true;
        mutationMessage = runtimeOutcomeMessage(response.outcome);
        announcement = modelStatusAnnouncement(runtimeOutcomeMessage(response.outcome));
        break;
      case 'delivery-unknown':
        terminalBlocked = true;
        mutationMessage = runtimeOutcomeMessage(response.outcome);
        announcement = modelStatusAnnouncement(runtimeOutcomeMessage(response.outcome));
        break;
      default:
        terminalBlocked = true;
        mutationMessage = runtimeOutcomeMessage(response.outcome);
        announcement = modelStatusAnnouncement(runtimeOutcomeMessage(response.outcome));
    }
  };

  // @ds guardrail: do-not-edit — Effort mutation gating uses anyPending and groupDisabled; requestEffort is the single one-at-a-time request path (setThinkingLevel).
  const requestEffort = (level: string) => {
    const state = runtime.state;
    if (state === null || state.thinkingLevel === level) return;
    if (anyPending || effortGroupDisabled) return;
    void runtimeControls.setThinkingLevel(level);
  };

  const stageModel = (model: AvailableModelDto) => {
    if (isCommitting || !isModelAvailable(model)) return;
    const key = modelKey(model);
    draftKey = key === currentKey ? null : key;
    mutationMessage = '';
  };

  function onSearchKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    if (
      key !== 'ArrowDown' &&
      key !== 'ArrowUp' &&
      key !== 'Home' &&
      key !== 'End' &&
      key !== 'Enter'
    )
      return;
    if (searchOptions.length === 0) return;
    if (key === 'Enter') {
      if (activeSearchOptionKey === null) return;
      event.preventDefault();
      document.getElementById(activeSearchOptionKey)?.click();
      searchEl?.focus({ preventScroll: true });
      return;
    }
    event.preventDefault();
    const index = activeSearchIndex;
    let next = 0;
    if (key === 'ArrowDown') next = index === null ? 0 : Math.min(index + 1, searchOptions.length - 1);
    else if (key === 'ArrowUp') next = index === null ? searchOptions.length - 1 : Math.max(index - 1, 0);
    else if (key === 'Home') next = 0;
    else next = searchOptions.length - 1;
    activeSearchIndex = next;
  }

  function onListKeyDown(event: KeyboardEvent): void {
    if (showSearch) return;
    const key = event.key;
    if (
      key !== 'ArrowDown' &&
      key !== 'ArrowUp' &&
      key !== 'Home' &&
      key !== 'End' &&
      key !== 'Enter' &&
      key !== ' '
    )
      return;
    const list = event.currentTarget as HTMLElement;
    const rows = [
      ...list.querySelectorAll<HTMLElement>('.model-sheet-row:not([data-disabled])'),
    ];
    if (rows.length === 0) return;
    const active = document.activeElement;
    const index = rows.findIndex((row) => row === active || row.contains(active));
    if (key === 'Enter' || key === ' ') {
      if (index >= 0) {
        event.preventDefault();
        rows[index]?.click();
      }
      return;
    }
    event.preventDefault();
    let next = 0;
    if (key === 'ArrowDown') next = index < 0 ? 0 : Math.min(index + 1, rows.length - 1);
    else if (key === 'ArrowUp') next = index < 0 ? rows.length - 1 : Math.max(index - 1, 0);
    else if (key === 'Home') next = 0;
    else next = rows.length - 1;
    rows[next]?.focus({ preventScroll: true });
  }

  // ───────────────────────────────────────────────────────────────────
  // 12. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function attachRowInteractions(node: Element): () => void {
    const el = node as HTMLElement;
    const hoverAction = hover(el);
    const focusedAction = focused(el);
    const focusVisibleAction = focusVisible(el);
    return () => {
      if (hoverAction) hoverAction.destroy?.();
      if (focusedAction) focusedAction.destroy?.();
      if (focusVisibleAction) focusVisibleAction.destroy?.();
    };
  }

  function attachCloseInteractions(node: Element): () => void {
    const el = node as HTMLElement;
    const hoverAction = hover(el);
    const focusedAction = focused(el);
    const focusVisibleAction = focusVisible(el);
    const pressAction = press(el);
    return () => {
      if (hoverAction) hoverAction.destroy?.();
      if (focusedAction) focusedAction.destroy?.();
      if (focusVisibleAction) focusVisibleAction.destroy?.();
      if (pressAction) pressAction.destroy?.();
    };
  }

  function attachDialog(node: Element): () => void {
    const el = node as HTMLElement;
    dialogEl = el;
    return () => {
      if (dialogEl === el) dialogEl = null;
    };
  }

  function attachModal(node: Element): () => void {
    const el = node as HTMLElement;
    modalEl = el;
    return () => {
      if (modalEl === el) modalEl = null;
    };
  }
</script>

<!-- @ds surface: model-effort-sheet — host-backed modal overlay. -->
<!-- @ds guardrail: do-not-edit — React-aria Modal/ModalOverlay wiring (open, dismiss, isKeyboardDismissDisabled) and the polite live announcer. -->
<span
  class="sr-only"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  data-live-announcer="true"
>
  {announcement}
</span>
<Sheet bind:open={sheetOpen} onOpenChange={onSheetOpenChange}>
  <!-- @ds slot: overlay — fixed scrim + placement.
       Bits Overlay/Content are siblings, so the overlay class lives on Content and the
       modal/dialog nest inside — the original overlay → modal → dialog box tree. -->
  <SheetContent
    class="model-sheet--overlay"
    id="model-effort-dialog"
    aria-labelledby="model-effort-title"
    trapFocus={true}
    interactOutsideBehavior={isCommitting ? 'ignore' : 'close'}
    escapeKeydownBehavior="ignore"
    onOpenAutoFocus={onOpenAutoFocus}
    onCloseAutoFocus={onCloseAutoFocus}
    onInteractOutside={onInteractOutside}
    onclick={onOverlayClick}
  >
    <!-- @ds slot: panel — the Modal raised surface. -->
    <div
      class={`model-sheet--modal${isDragging ? ' is-dragging' : ''}${isSnapping ? ' is-snapping' : ''}`}
      style="--model-sheet-drag-offset: {dragOffset}px; max-width: 100vw; overflow-x: hidden"
      {@attach attachModal}
    >
      <div class="model-sheet--dialog" {@attach attachDialog}>
        <div class="model-sheet--content" onkeydowncapture={handleSheetKeyDown}>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- @ds slot: drag-handle — grabber + swipe region. @ds guardrail: do-not-edit — Pointer swipe handlers. -->
          <div
            class="model-sheet--drag-region"
            data-testid="model-sheet--drag-region"
            onpointerdown={beginSwipe}
            onpointermove={moveSwipe}
            onpointerup={(event) => endSwipe(event, true)}
            onpointercancel={(event) => endSwipe(event, false)}
          >
            <div class="model-sheet--handle" aria-hidden="true"></div>
            <!-- @ds slot: header -->
            <header class="model-sheet--header">
              <SheetTitle id="model-effort-title" class="model-sheet--title">
                {section === 'model' ? strings.title : effortStrings.thinkingEffort}
              </SheetTitle>
              <SheetClose
                class="model-sheet--close"
                aria-label={effortStrings.closeSheet}
                disabled={isCommitting}
                data-disabled={isCommitting ? 'true' : undefined}
                style="min-block-size: 44px"
                {@attach attachCloseInteractions}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </SheetClose>
            </header>
          </div>

          {#if section === 'model'}
            {#if streamingBlocked}
              <p class="model-sheet--policy">{strings.streamingBlocked}</p>
            {/if}

            {#if runtime.catalogPhase === 'opening' && runtime.models.length === 0}
              <div class="model-sheet--skeletons" aria-label={strings.loading} aria-busy="true">
                {#each [0, 1, 2, 3] as index (index)}
                  <div class="model-sheet--skeleton"></div>
                {/each}
              </div>
            {:else if showSearch}
              <!-- @ds slot: search — shown at the search threshold.
                   @ds guardrail: do-not-edit — Autocomplete/SearchField wiring. -->
              <div class="model-sheet-search">
                <label for="model-sheet-search-input">{strings.searchLabel}</label>
                <div class="model-sheet-search--control">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <circle
                      cx="11"
                      cy="11"
                      r="6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    />
                    <path
                      d="m16 16 4 4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                  <input
                    id="model-sheet-search-input"
                    bind:this={searchEl}
                    bind:value={query}
                    aria-autocomplete="list"
                    aria-controls={MODEL_LISTBOX_ID}
                    aria-activedescendant={activeSearchOptionKey ?? undefined}
                    autocapitalize="none"
                    autocorrect="off"
                    spellcheck="false"
                    enterkeyhint="search"
                    placeholder={strings.searchPlaceholder}
                    oninput={(event) => {
                      const inputType = (event as unknown as InputEvent).inputType;
                      if (
                        inputType === 'insertText' ||
                        inputType === 'insertCompositionText' ||
                        inputType === 'insertFromComposition'
                      ) {
                        activeSearchIndex = searchOptions.length > 0 ? 0 : null;
                      } else if (
                        inputType &&
                        (inputType.includes('insert') ||
                          inputType.includes('delete') ||
                          inputType.includes('history'))
                      ) {
                        activeSearchIndex = null;
                      }
                    }}
                    onkeydown={onSearchKeyDown}
                  />
                  <Button
                    class="model-sheet-search--clear"
                    aria-label={strings.clearSearch}
                    style="min-block-size: 44px"
                    onclick={() => {
                      query = '';
                      activeSearchIndex = null;
                    }}
                  >
                    {strings.clearSearchVisible}
                  </Button>
                </div>
              </div>
              {@render modelList()}
            {:else}
              {@render modelList()}
            {/if}

            {@render catalogStatus()}
            <p class={`model-sheet--mutation${runtime.deliveryUnknown ? ' is-barrier' : ''}`}>
              {mutationMessage ||
                (runtime.catalogPhase === 'refreshing' ? strings.refreshing : '')}
            </p>
            <div class="model-sheet-nav">
              <Button
                class="model-sheet-nav--button"
                onclick={() => (section = 'effort')}
                style="min-block-size: 44px"
              >
                {effortStrings.thinkingEffort}
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </Button>
            </div>
            <!-- @ds slot: footer -->
            <footer class="model-sheet--footer">
              <Button
                class="model-sheet--cancel"
                onclick={close}
                disabled={isCommitting}
                style="min-block-size: 48px"
              >
                {strings.cancel}
              </Button>
              <Button
                class="model-sheet--switch"
                onclick={() => void commit()}
                disabled={!canCommit}
                style="min-block-size: 48px"
              >
                {isCommitting ? strings.applying : strings.switchModel}
              </Button>
            </footer>
          {:else}
            <!-- @ds slot: effort-group — the effort section of the sheet (effort-open). -->
            <!-- @ds state: group aria-busy / pending-effort — while a request is in flight. -->
            <!-- @ds guardrail: do-not-edit — Effort radio group wiring. -->
            <section class="effort-sheet--section" aria-label={effortStrings.thinkingEffort}>
              {#if effortStatus !== null}
                <p id="effort-sheet--status" class="effort-sheet--status">
                  {effortStatus}
                </p>
              {/if}
              {#if showReconcile}
                <div class="effort-sheet-reconcile">
                  <Button
                    class="effort-sheet-reconcile--button"
                    onclick={() => void runtimeControls.refresh('manual')}
                    style="min-block-size: 44px"
                  >
                    {effortStrings.reconcile}
                  </Button>
                </div>
              {/if}
              {#if levels.length > 0}
                <div class="effort-radio--scroll">
                  <EffortRadioGroup
                    {levels}
                    confirmed={confirmedEffort}
                    pendingLevel={pendingEffortLevel}
                    isPending={anyPending}
                    isDisabled={effortGroupDisabled}
                    labelledBy="model-effort-title"
                    {...(effortStatus === null ? {} : { describedBy: 'effort-sheet--status' })}
                    onSelect={requestEffort}
                  />
                </div>
              {/if}
              <div class="effort-sheet-nav">
                <Button
                  class="effort-sheet-nav--button"
                  onclick={() => (section = 'model')}
                  style="min-block-size: 44px"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M15 5l-7 7 7 7"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  {effortStrings.changeModel}
                </Button>
              </div>
            </section>
          {/if}
        </div>
      </div>
    </div>
  </SheetContent>
</Sheet>

{#snippet modelList()}
  {@const rows = catalog.groups.reduce((count, group) => count + group.models.length, 0)}
  {#if runtime.models.length === 0}
    <p class="model-sheet--empty">{strings.noModels}</p>
  {:else if rows === 0 && catalog.retiredCurrent === null}
    <p class="model-sheet--empty">{noModelMatchMessage(displayModel(deferredQuery))}</p>
  {:else}
    <!-- @ds slot: model-list — catalog rows on the model-open section. -->
    <div
      role="listbox"
      id={MODEL_LISTBOX_ID}
      aria-label={strings.availableModels}
      class="model-sheet--list"
      style="overflow-x: hidden; overscroll-behavior-y: contain"
      tabindex={showSearch ? -1 : 0}
      onkeydown={onListKeyDown}
    >
      {#if catalog.retiredCurrent !== null}
        <div class="react-aria-ListBoxSection" role="group" id="current-model-section">
          <div class="react-aria-Header">{strings.currentSection}</div>
          {@render modelRow(catalog.retiredCurrent, true)}
        </div>
      {/if}
      {#each catalog.groups as group (group.provider)}
        <div
          class="react-aria-ListBoxSection"
          role="group"
          id={`provider-${modelDomId(group.provider)}`}
        >
          <div class="react-aria-Header">{group.providerLabel}</div>
          {#each group.models as model (modelKey(model))}
            {@render modelRow(model, false)}
          {/each}
        </div>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet modelRow(model: AvailableModelDto, isRetired: boolean)}
  {@const key = modelKey(model)}
  {@const isCurrent = key === currentKey}
  {@const isDraft = key === draftKey}
  {@const reason = isRetired ? strings.retired : modelAvailabilityMessage(model)}
  {@const capabilities = modelCapabilities(model)}
  {@const descriptionId = `model-description-${modelDomId(key)}`}
  {@const isApplying = isCommitting && isDraft}
  {@const rowDisabled = isCommitting || isRetired || !isModelAvailable(model)}
  {@const accessibleName = modelRowName({
    label: displayModel(model.label),
    provider: displayModel(model.provider),
    id: displayModel(model.id),
    capabilities,
    availability: reason ?? strings.available,
    isCurrent,
    isSelected: isDraft,
    isApplying,
  })}
  <!-- @ds slot: model-list row. -->
   <!-- @ds guardrail: do-not-edit — React-aria ListBoxItem wiring: aria-current, aria-busy, aria-describedby, roving focus, onAction/onKeyDown. -->
  <div
    role="option"
    id={key}
    aria-label={accessibleName}
    class="model-sheet-row"
    style="min-block-size: 64px"
    tabindex={showSearch ? -1 : isCurrent && !rowDisabled ? 0 : -1}
    aria-selected={isDraft}
    data-focused={showSearch && activeSearchOptionKey === key ? true : undefined}
    aria-current={isCurrent ? 'true' : undefined}
    aria-busy={isApplying ? 'true' : undefined}
    aria-disabled={rowDisabled ? 'true' : undefined}
    aria-describedby={descriptionId}
    data-selected={isDraft ? true : undefined}
    data-disabled={rowDisabled ? true : undefined}
    onclick={() => {
      if (!rowDisabled) stageModel(model);
    }}
    onkeydown={(event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !isCommitting && !rowDisabled) {
        event.preventDefault();
        stageModel(model);
      }
    }}
    {@attach attachRowInteractions}
  >
    <span class="model-sheet-row--main">
      <span class="model-sheet-row--label">{displayModel(model.label)}</span>
      <span class="model-sheet-row--id" dir="ltr" translate="no">
        {displayModel(model.id)}
      </span>
    </span>
    <span class="model-sheet-row--states">
      {#if isCurrent}
        <span class="model-state--current">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="m3 8 3 3 7-7"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {strings.current}
        </span>
      {/if}
      {#if isDraft}
        <span class="model-state--selected">{strings.selected}</span>
      {/if}
    </span>
    <span id={descriptionId} class="model-sheet-row--description">
      <span>{displayModel(model.provider)}</span>
      {#each capabilities as capability (capability)}
        <span>{capability}</span>
      {/each}
      <span class={reason === null ? 'sr-only' : 'model-state--unavailable'}>
        {reason ?? strings.available}
      </span>
      {#if isApplying}
        <span>{strings.applying}</span>
      {/if}
    </span>
  </div>
{/snippet}

{#snippet catalogStatus()}
  {#if runtime.catalogPhase === 'offline'}
    <p class="model-sheet--catalog-state">{strings.offline}</p>
  {:else if runtime.catalogPhase === 'unreachable'}
    <div class="model-sheet--catalog-state">
      {strings.unreachable}
      <Button onclick={() => void runtimeControls.refresh('manual')} style="min-block-size: 44px">
        {strings.retryRefresh}
      </Button>
    </div>
  {:else if runtime.catalogPhase === 'access_denied'}
    <div class="model-sheet--catalog-state">
      {strings.accessExpired}
      <Button onclick={() => void runtimeControls.refresh('manual')} style="min-block-size: 44px">
        {strings.reconnect}
      </Button>
    </div>
  {/if}
{/snippet}

<!-- @ds surface: model-effort-sheet — the model picker + effort sheet overlay. Decomposed into this scoped block;
     model-effort-sheet owned rules and this sheet's owned members of mixed pairs move with it.
     Shared overlay/modal chrome (.react-aria-Popover, system-wide prefers-reduced-motion grouping
     .model-sheet--modal with plan-review--modal / session--card) stays global. Effort radio-group
     rules stay with EffortRadioGroup.svelte. Child-primitive classes and react-aria/runtime
     data-attributes use :global so Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* @ds surface: model-effort-sheet — the model picker + effort sheet overlay. */
  /* @ds surface: overlay — model-effort-sheet is an INSTANCE of the shared overlay
     primitive (backdrop → raised panel → grabber → header/body/footer).
     Physical unification of the per-surface overlay chrome is a documented follow-up. */
  /* @ds slot: backdrop — the ModalOverlay scrim + placement. */
  /* The model catalog is host-authored; the sheet can only request a host-authorized change. */
  :global(.model-sheet--overlay) {
    /* @ds edit: tokens — component tokens. Each is a thin alias to a semantic role,
       so this surface retints by editing the role it points at (primitive → semantic
       → component). Edit them here instead of on :root. */
    --model-sheet-raised: var(--surface);
    --model-sheet-ink: var(--ink);
    --model-sheet-muted: var(--ink-muted);
    --model-sheet-accent: var(--accent-ink);
    --model-sheet-ui-accent: var(--accent-strong);
    --model-sheet-selection: var(--accent-soft);
    position: fixed;
    z-index: 100;
    inset: 0;
    display: flex;
    max-inline-size: 100vw;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    background: color-mix(in srgb, #24221f 56%, transparent);
    animation: model-sheet-backdrop-in 180ms ease-out;
  }

  /* @ds state: exiting — backdrop fade-out while the overlay unmounts. */
   /* @ds guardrail: do-not-edit — The data-exiting / drag / snap choreography is driven by the modal exit and swipe-dismiss handlers; dismissal semantics never change here. */
  :global(.model-sheet--overlay[data-exiting]) {
    animation: model-sheet-backdrop-out 220ms ease-in;
  }

  /* @ds edit: tokens — theme remap, dark. The same component tokens resolve to their
     dark semantic roles here. The ui-accent points at --accent-ink, not --accent-strong,
     because --accent-strong carries no dark override and would not match the dark
     UI accent. */
  :global(:root[data-theme='dark'] .model-sheet--overlay) {
    --model-sheet-raised: var(--surface);
    --model-sheet-ink: var(--ink);
    --model-sheet-muted: var(--ink-muted);
    --model-sheet-accent: var(--accent-ink);
    --model-sheet-ui-accent: var(--accent-ink);
    --model-sheet-selection: var(--accent-soft);
  }

  @media (prefers-color-scheme: dark) {
    /* @ds edit: tokens — theme remap, system-dark. Dark semantic roles again, driven
       by the OS-dark signal; ui-accent resolves to --accent-ink for the same reason
       as the explicit dark block. */
    :global(:root[data-theme='system'] .model-sheet--overlay) {
      --model-sheet-raised: var(--surface);
      --model-sheet-ink: var(--ink);
      --model-sheet-muted: var(--ink-muted);
      --model-sheet-accent: var(--accent-ink);
      --model-sheet-ui-accent: var(--accent-ink);
      --model-sheet-selection: var(--accent-soft);
    }
  }

  /* @ds end surface: model-effort-sheet */

  /* @ds edit: layout — sheet stacking, sizing, and the live drag-offset pull. */
  /* @ds slot: panel — the Modal raised surface; the --model-sheet-drag-offset var
     stays the layout input for swipe-dismiss. */
  /* @ds state: opening · open — entry rise/settle, then rest; exiting, dragging and
     snapping are separate state rules below. */
  .model-sheet--modal {
    inline-size: min(92vw, 24rem);
    max-inline-size: 100vw;
    max-block-size: calc(var(--visual-viewport-height, 100dvh) * 0.75);
    overflow: hidden;
    border-radius: 24px 24px 0 0;
    background: var(--model-sheet-raised);
    color: var(--model-sheet-ink);
    transform: translateY(var(--model-sheet-drag-offset, 0));
    animation: model-sheet-in 280ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* @ds state: dragging — free drag while a swipe is in flight. */
  .model-sheet--modal.is-dragging {
    animation: none;
    transition: none;
  }

  /* @ds state: snapping — settle back to rest after a swipe. */
  .model-sheet--modal.is-snapping {
    transition: transform 220ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  /* @ds state: exiting — panel slides down + fades while the overlay unmounts. */
  :global(.model-sheet--overlay[data-exiting]) .model-sheet--modal {
    animation: model-sheet-out 220ms ease-in;
  }

  /* @ds edit: layout — sheet body column with symmetric block-end and intentionally
     asymmetric inline safe-area insets (left/right preserved). */
  .model-sheet--dialog {
    display: flex;
    min-inline-size: 0;
    max-block-size: inherit;
    flex-direction: column;
    overflow: hidden;
    outline: none;
    padding-block-end: max(16px, env(safe-area-inset-bottom));
    padding-inline: env(safe-area-inset-left) env(safe-area-inset-right);
    font-family: var(--font-sans);
  }

  .model-sheet--content {
    display: contents;
  }

  /* @ds slot: drag-handle — grabber + swipe surface. */
  .model-sheet--drag-region {
    flex: 0 0 auto;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .model-sheet--drag-region:active {
    cursor: grabbing;
  }

  .model-sheet--handle {
    inline-size: 36px;
    block-size: 4px;
    flex: 0 0 auto;
    margin-block: 0.6rem 0.25rem;
    margin-inline: auto;
    border-radius: 999px;
    background: var(--model-sheet-muted);
    opacity: 0.65;
  }

  /* @ds slot: header */
  .model-sheet--header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: 0.25rem 0.75rem;
    padding-inline: var(--space-4);
  }

  :global(.model-sheet--title) {
    margin: 0;
    color: var(--model-sheet-ink);
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 400;
    line-height: 1.2;
  }

  :global(.model-sheet--close) {
    display: grid;
    inline-size: 44px;
    block-size: 44px;
    flex: 0 0 auto;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--model-sheet-ink);
    cursor: pointer;
  }

  :global(.model-sheet--close[data-hovered]),
  :global(.model-sheet--cancel[data-hovered]) {
    background: var(--model-sheet-selection);
  }

  /* @ds slot: status-lines — policy, catalog state, mutation, and empty copy. */
  /* @ds state: model-open — the model picker panel. */
  .model-sheet--policy,
  .model-sheet--catalog-state,
  .model-sheet--mutation,
  .model-sheet--empty {
    margin: 0;
    color: var(--model-sheet-muted);
    font-size: 0.875rem;
    line-height: 1.45;
  }

  .model-sheet--policy,
  .model-sheet--catalog-state,
  .model-sheet--mutation {
    padding-block: 0.5rem;
    padding-inline: var(--space-4);
  }

  /* @ds state: terminal-blocked — streaming or delivery barrier seam. */
  .model-sheet--policy,
  .model-sheet--mutation.is-barrier {
    border-block: 1px solid var(--model-sheet-ui-accent);
    background: var(--model-sheet-selection);
    color: var(--model-sheet-accent);
  }

  .model-sheet--catalog-state :global(button) {
    min-block-size: 44px;
    border: 0;
    background: transparent;
    color: var(--model-sheet-accent);
    font-weight: 650;
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  /* @ds slot: search — rendered only when the catalog reaches the search threshold. */
  /* @ds state: search-shown — the ≥8-model finder seam. */
  .model-sheet-search {
    display: grid;
    gap: 0.35rem;
    padding-block-end: var(--space-2);
    padding-inline: var(--space-4);
    color: var(--model-sheet-muted);
    font-size: 0.75rem;
    font-weight: 620;
  }

  .model-sheet-search--control {
    display: flex;
    min-inline-size: 0;
    min-block-size: 44px;
    align-items: center;
    gap: var(--space-2);
    padding-inline-start: var(--space-3);
    border: 1px solid var(--model-sheet-muted);
    border-radius: 12px;
    background: var(--model-sheet-raised);
    color: var(--model-sheet-muted);
  }

  .model-sheet-search input {
    min-inline-size: 0;
    min-block-size: 42px;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--model-sheet-ink);
    font-size: 1rem;
  }

  .model-sheet-search--control:focus-within {
    outline: 2px solid var(--model-sheet-ui-accent);
    outline-offset: 2px;
  }

  :global(.model-sheet-search--clear) {
    min-inline-size: 44px;
    min-block-size: 44px;
    align-self: stretch;
    padding-inline: var(--space-3);
    border: 0;
    background: transparent;
    color: var(--model-sheet-accent);
    font-weight: 620;
  }

  /* @ds slot: model-list — catalog rows, on the model-open section. */
  .model-sheet--list {
    display: grid;
    min-inline-size: 0;
    flex: 1 1 auto;
    gap: var(--space-2);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    padding-block: 0 var(--space-2);
    padding-inline: var(--space-3);
    outline: none;
  }

  .model-sheet--list .react-aria-ListBoxSection {
    display: grid;
    min-inline-size: 0;
    gap: 2px;
  }

  .model-sheet--list .react-aria-Header {
    padding-block: 0.5rem 0.25rem;
    padding-inline: var(--space-2);
    color: var(--model-sheet-muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.045em;
    text-transform: uppercase;
  }

  .model-sheet-row {
    display: grid;
    min-inline-size: 0;
    min-block-size: 64px;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.25rem var(--space-2);
    align-content: center;
    padding-block: 0.65rem;
    padding-inline: var(--space-3);
    border: 2px solid transparent;
    border-radius: 14px;
    color: var(--model-sheet-ink);
    cursor: pointer;
    outline: none;
  }

  :global(.model-sheet-row[data-hovered]),
  :global(.model-sheet-row[data-focused]) {
    background: var(--model-sheet-selection);
  }

  .model-sheet-row[data-selected] {
    border-color: var(--model-sheet-ui-accent);
    background: var(--model-sheet-selection);
  }

  :global(.model-sheet-row[data-focus-visible]),
  :global(.model-sheet--close[data-focus-visible]),
  :global(.model-sheet--cancel[data-focus-visible]),
  :global(.model-sheet--switch[data-focus-visible]),
  :global(.model-sheet-search--clear[data-focus-visible]),
  :global(.model-sheet-nav--button[data-focus-visible]),
  :global(.effort-sheet-nav--button[data-focus-visible]),
  :global(.effort-sheet-reconcile--button[data-focus-visible]),
  .model-sheet--catalog-state :global(button[data-focus-visible]) {
    outline-color: var(--model-sheet-ui-accent);
    outline-style: solid;
    outline-width: 2px;
    outline-offset: 2px;
  }

  /* @ds state: read-only / disabled — model row not actionable. */
  .model-sheet-row[data-disabled] {
    cursor: default;
    opacity: 0.72;
  }

  .model-sheet-row--main,
  .model-sheet-row--states,
  .model-sheet-row--description {
    display: flex;
    min-inline-size: 0;
    align-items: center;
  }

  .model-sheet-row--main {
    flex-wrap: wrap;
    gap: 0.2rem var(--space-2);
  }

  .model-sheet-row--label {
    overflow-wrap: anywhere;
    font-size: 0.98rem;
    font-weight: 650;
  }

  .model-sheet-row--id {
    overflow: hidden;
    max-inline-size: 100%;
    color: var(--model-sheet-muted);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    unicode-bidi: isolate;
  }

  .model-sheet-row--states {
    justify-content: flex-end;
    gap: 0.35rem;
    color: var(--model-sheet-accent);
    font-size: 0.75rem;
    font-weight: 700;
  }

  .model-state--current,
  .model-state--selected {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
  }

  .model-sheet-row--description {
    grid-column: 1 / -1;
    flex-wrap: wrap;
    gap: 0.2rem 0.55rem;
    color: var(--model-sheet-muted);
    font-size: 0.72rem;
    line-height: 1.35;
  }

  .model-state--unavailable {
    color: var(--model-sheet-accent);
    font-weight: 650;
  }

  .model-sheet--empty {
    min-block-size: 9rem;
    padding: var(--space-6) var(--space-4);
    text-align: center;
  }

  .model-sheet--skeletons {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .model-sheet--skeleton {
    min-block-size: 64px;
    border-radius: 14px;
    background: var(--model-sheet-selection);
    animation: model-sheet-pulse 1.2s ease-in-out infinite alternate;
  }

  .model-sheet--mutation {
    min-block-size: 2.5rem;
  }

  /* @ds slot: footer */
  .model-sheet--footer {
    display: grid;
    flex: 0 0 auto;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
    gap: var(--space-2);
    padding-block-start: var(--space-2);
    padding-inline: var(--space-4);
    border-block-start: 1px solid color-mix(in srgb, var(--model-sheet-muted) 35%, transparent);
  }

  :global(.model-sheet--cancel),
  :global(.model-sheet--switch) {
    min-inline-size: 0;
    min-block-size: 48px;
    border-radius: 12px;
    font-weight: 680;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  :global(.model-sheet--cancel) {
    border: 1px solid var(--model-sheet-muted);
    background: transparent;
    color: var(--model-sheet-ink);
  }

  :global(.model-sheet--switch) {
    border: 1px solid var(--model-sheet-ui-accent);
    background: var(--model-sheet-ink);
    color: var(--model-sheet-raised);
  }

  /* @ds state: committing / disabled — model & effort actions locked while a request
     is in flight or change authority is blocked. */
  :global(.model-sheet--switch[data-disabled]),
  :global(.model-sheet--cancel[data-disabled]),
  :global(.model-sheet--close[data-disabled]) {
    cursor: default;
    opacity: 0.5;
  }

  @keyframes model-sheet-in {
    from {
      transform: translateY(36px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes model-sheet-backdrop-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes model-sheet-backdrop-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes model-sheet-out {
    from {
      transform: translateY(var(--model-sheet-drag-offset, 0));
      opacity: 1;
    }
    to {
      transform: translateY(36px);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.model-sheet--overlay),
    :global(.model-sheet--overlay[data-exiting]),
    :global(.model-sheet--overlay[data-exiting]) .model-sheet--modal,
    .model-sheet--skeleton {
      animation: none;
    }

    :global(.model-sheet--overlay[data-exiting]) .model-sheet--modal,
    :global(.model-sheet--overlay) :global(button):active:not(:disabled),
    :global(.model-sheet--overlay) :global(button[data-pressed]):not([data-disabled]) {
      transform: none;
      transition: none;
    }
  }

  @keyframes model-sheet-pulse {
    from {
      opacity: 0.55;
    }
    to {
      opacity: 1;
    }
  }

  /* ── Effort section: one full-width radio row per host-advertised level ── */
  /* @ds state: effort-open — the sheet draws its effort section. */
  .effort-sheet--section {
    display: flex;
    min-inline-size: 0;
    min-block-size: 0;
    flex: 1 1 auto;
    flex-direction: column;
  }

  /* @ds state: pending-effort — the status line reporting the in-flight effort request. */
  .effort-sheet--status {
    flex: 0 0 auto;
    margin: 0;
    padding-block: 0.5rem;
    padding-inline: var(--space-4);
    color: var(--model-sheet-muted);
    font-size: 0.875rem;
    line-height: 1.45;
  }

  .effort-sheet-reconcile {
    flex: 0 0 auto;
    padding-inline: var(--space-4);
  }

  :global(.effort-sheet-reconcile--button) {
    min-block-size: 44px;
    border: 0;
    background: transparent;
    color: var(--model-sheet-accent);
    font-weight: 650;
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  .effort-radio--scroll {
    min-inline-size: 0;
    min-block-size: 0;
    flex: 1 1 auto;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    padding-block: 0 var(--space-2);
    padding-inline: var(--space-3);
  }

  /* Muted copy on the soft selection wash drops below 4.5:1 in the bone
     theme, so selected/focused/hovered rows promote descriptions and IDs
     to the ink token; the accent states column already passes there. */
  :global(.model-sheet-row[data-hovered]) .model-sheet-row--id,
  :global(.model-sheet-row[data-hovered]) .model-sheet-row--description,
  :global(.model-sheet-row[data-focused]) .model-sheet-row--id,
  :global(.model-sheet-row[data-focused]) .model-sheet-row--description,
  :global(.model-sheet-row[data-selected]) .model-sheet-row--id,
  :global(.model-sheet-row[data-selected]) .model-sheet-row--description {
    color: var(--model-sheet-ink);
  }

  /* Section navigation between the model picker and the effort radio group. */
  .model-sheet-nav,
  .effort-sheet-nav {
    display: flex;
    min-inline-size: 0;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    padding-block: var(--space-1) var(--space-2);
  }

  .effort-sheet-nav {
    justify-content: flex-start;
    padding-inline: var(--space-4);
  }

  :global(.model-sheet-nav--button),
  :global(.effort-sheet-nav--button) {
    display: inline-flex;
    min-block-size: 44px;
    align-items: center;
    gap: 0.3rem;
    padding-inline: 0.5rem;
    border: 0;
    background: transparent;
    color: var(--model-sheet-accent);
    font-size: 0.85rem;
    font-weight: 650;
    cursor: pointer;
  }

  :global(.model-sheet-nav--button[data-hovered]),
  :global(.effort-sheet-nav--button[data-hovered]) {
    color: var(--model-sheet-ink);
  }

  /* Section nav arrows are physical drawings; mirror them under an RTL
     document so "back" keeps pointing at the section that precedes it. */
  :global([dir='rtl'] .model-sheet-nav--button svg),
  :global([dir='rtl'] .effort-sheet-nav--button svg) {
    transform: scaleX(-1);
  }

  @media (max-width: 360px) {
    .model-sheet--header,
    .model-sheet-search,
    .model-sheet--policy,
    .model-sheet--catalog-state,
    .model-sheet--mutation,
    .model-sheet--footer,
    .effort-sheet--status,
    .effort-sheet-reconcile,
    .effort-sheet-nav {
      padding-inline: var(--space-3);
    }
  }
</style>
