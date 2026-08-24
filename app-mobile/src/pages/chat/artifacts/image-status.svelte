<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: IMAGE STATUS
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. LIFECYCLE STATES
  // ───────────────────────────────────────────────────────────────────

  export const INBOUND_IMAGE_LIFECYCLE_STATES = [
    'processing',
    'deferred',
    'thumbnail-fetching',
    'thumbnail-verifying',
    'decoding',
    'inline-ready',
    'opening',
    'full-fetching',
    'viewer-ready',
    'details-open',
    'full-degraded',
    'stalled',
    'offline-loaded',
    'offline-unavailable',
    'capture-permission',
    'withheld',
    'denied',
    'expired',
    'missing',
    'revision-conflict',
    'corrupt',
    'rate-limited',
    'stale',
    'revoked',
    'unsupported',
    'privacy-covered',
    'closing',
    'aborted',
  ] as const;

  export type InboundImageLifecycleState = (typeof INBOUND_IMAGE_LIFECYCLE_STATES)[number];

  export type InboundImageStatusAction =
    | 'close'
    | 'close-details'
    | 'retry'
    | 'cancel'
    | 'host-setup'
    | 'reauthenticate'
    | 'resync'
    | 'report'
    | 'view-latest'
    | 'reveal';

  // ───────────────────────────────────────────────────────────────────
  // 2. STATUS DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  interface ImageStatusDefinition {
    readonly copy: string | null;
    readonly actions: readonly InboundImageStatusAction[];
    readonly ariaBusy?: boolean;
    readonly role?: 'status' | 'alert';
    readonly noPixels?: boolean;
    readonly noAspect?: boolean;
  }

  const STATUS_DEFINITIONS: Record<InboundImageLifecycleState, ImageStatusDefinition> = {
    processing: { copy: 'Preparing preview…', actions: [], ariaBusy: true },
    deferred: { copy: null, actions: [] },
    'thumbnail-fetching': {
      copy: null,
      actions: ['close-details'],
      ariaBusy: true,
    },
    'thumbnail-verifying': { copy: null, actions: [], ariaBusy: true },
    decoding: { copy: null, actions: [], ariaBusy: true },
    'inline-ready': { copy: null, actions: [] },
    opening: { copy: 'Opening preview…', actions: ['close'], ariaBusy: true },
    'full-fetching': { copy: 'Opening preview…', actions: ['close'], ariaBusy: true },
    'viewer-ready': { copy: null, actions: ['close'] },
    'details-open': { copy: null, actions: ['close-details', 'close'] },
    'full-degraded': { copy: 'Low-resolution preview', actions: ['retry', 'close'] },
    stalled: {
      copy: 'Still waiting for the Pi relay.',
      actions: ['retry', 'cancel'],
      role: 'status',
    },
    'offline-loaded': { copy: 'Offline copy', actions: ['close'] },
    'offline-unavailable': {
      copy: 'This preview isn’t available while the relay is unreachable.',
      actions: ['retry'],
    },
    'capture-permission': {
      copy: 'Screenshot not shared — capture access is off on the host.',
      actions: ['host-setup'],
      noAspect: true,
    },
    withheld: {
      copy: 'Preview withheld by relay policy.',
      actions: ['close', 'close-details'],
      noPixels: true,
      noAspect: true,
    },
    denied: {
      copy: 'Preview not permitted for this session.',
      actions: ['reauthenticate'],
      role: 'alert',
      noPixels: true,
    },
    expired: {
      copy: 'This preview has expired.',
      actions: ['close'],
      noPixels: true,
      noAspect: true,
    },
    missing: {
      copy: 'This revision is no longer available.',
      actions: ['resync'],
      noPixels: true,
    },
    'revision-conflict': {
      copy: 'This revision is no longer available.',
      actions: ['resync'],
      noPixels: true,
    },
    corrupt: {
      copy: 'This image couldn’t be verified.',
      actions: ['report', 'retry'],
      role: 'alert',
      noPixels: true,
    },
    'rate-limited': {
      copy: 'Preview temporarily unavailable.',
      actions: ['retry'],
    },
    stale: {
      copy: 'A newer preview is available.',
      actions: ['view-latest', 'close'],
      noPixels: true,
    },
    revoked: {
      copy: 'Preview revoked.',
      actions: ['close'],
      role: 'alert',
      noPixels: true,
      noAspect: true,
    },
    unsupported: {
      copy: 'This client can’t display this image block.',
      actions: [],
      noPixels: true,
    },
    'privacy-covered': {
      copy: null,
      actions: ['reveal'],
      noPixels: true,
    },
    closing: { copy: null, actions: [] },
    aborted: { copy: null, actions: [] },
  };

  const ACTION_LABELS: Record<InboundImageStatusAction, string> = {
    close: 'Close',
    'close-details': 'Close details',
    retry: 'Retry',
    cancel: 'Cancel',
    'host-setup': 'Host setup help',
    reauthenticate: 'Reauthenticate',
    resync: 'Resync transcript',
    report: 'Report',
    'view-latest': 'View latest',
    reveal: 'Reveal preview',
  };

  // ───────────────────────────────────────────────────────────────────
  // 3. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface ImageStatusProps {
    readonly state: InboundImageLifecycleState;
    readonly message?: string;
    readonly onAction?: (action: InboundImageStatusAction) => void;
    readonly disabledActions?: readonly InboundImageStatusAction[];
  }

  export function imageStatusDefinition(state: InboundImageLifecycleState): ImageStatusDefinition {
    return STATUS_DEFINITIONS[state];
  }
</script>

<script lang="ts">
  import './image-status.css';
  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { state, message, onAction, disabledActions = [] }: ImageStatusProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const definition = $derived(STATUS_DEFINITIONS[state]);
  const copy = $derived(message ?? definition.copy);
  const disabled = $derived(new Set(disabledActions));
  const shouldRender = $derived(!(copy === null && definition.actions.length === 0));
</script>

{#if shouldRender}
  <div
    class="inbound-image-status"
    data-image-status={state}
    role={definition.role ?? 'status'}
    aria-live={definition.role === 'alert' ? 'assertive' : 'polite'}
    aria-atomic="true"
    aria-busy={definition.ariaBusy || undefined}
  >
    {#if copy !== null}<span class="inbound-image-status-copy">{copy}</span>{/if}
    {#if definition.actions.length > 0}
      <div class="inbound-image-status-actions">
        {#each definition.actions as action (action)}
          <button type="button" class="inbound-image-status-action" disabled={disabled.has(action)} onclick={() => onAction?.(action)}>{ACTION_LABELS[action]}</button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<!-- @ds surface: inbound-image-status — the inbound-image lifecycle status line + action buttons.
     Decomposed into this co-located CSS file; native :hover/:focus-visible/:disabled preserved (the shipped button
     uses native pseudo-classes, not react-aria state attributes). Values unchanged. -->
