<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: CARD INBOUND IMAGE
  // ───────────────────────────────────────────────────────────────────

  import type { InboundImageBlock } from '@pi-remote/pi-rpc-protocol';

  import {
    imageStatusDefinition,
    type InboundImageLifecycleState,
    type InboundImageStatusAction,
  } from './image-status.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface InboundImageCardProps {
    readonly block: InboundImageBlock;
    readonly sessionId: string;
    /** Used by the local fixture to hold a specific lifecycle state in place. */
    readonly state?: InboundImageLifecycleState;
    /** Real transcript cards begin ready blocks in the deferred state. */
    readonly deferReady?: boolean;
    readonly onAction?: (action: InboundImageStatusAction) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const PIXEL_STATES = new Set<InboundImageLifecycleState>([
    'inline-ready',
    'full-fetching',
    'stalled',
    'full-degraded',
    'offline-loaded',
  ]);

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function initialState(block: InboundImageBlock, deferReady: boolean): InboundImageLifecycleState {
    if (block.availability === 'processing') return 'processing';
    if (block.availability === 'expired') return 'expired';
    if (block.availability === 'revoked') return 'revoked';
    if (block.availability === 'withheld') {
      return block.reason === 'capture-permission' ? 'capture-permission' : 'withheld';
    }
    return deferReady ? 'deferred' : 'inline-ready';
  }

  function aspectRatioFor(block: InboundImageBlock): number {
    if (block.availability !== 'ready') return 1.6;
    const { width, height } = block.artifact.thumbnail;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1.6;
    return Math.min(4, Math.max(0.5, width / height));
  }

  function terminalLabel(state: InboundImageLifecycleState): string | null {
    switch (state) {
      case 'capture-permission':
        return 'Withheld';
      case 'withheld':
        return 'Withheld';
      case 'expired':
        return 'Expired';
      case 'revoked':
        return 'Revoked';
      case 'corrupt':
        return 'Corrupt';
      case 'denied':
        return 'Denied';
      case 'missing':
      case 'revision-conflict':
        return 'Unavailable';
      case 'unsupported':
        return 'Unsupported';
      case 'privacy-covered':
        return 'Privacy covered';
      default:
        return null;
    }
  }

  function cardAccessibleName(block: InboundImageBlock): string {
    return `Open ${block.displayName.toLowerCase()} preview, processed, revision ${block.revision}`;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import { getOptionalArtifactViewer } from './artifact-viewer-provider.svelte';
  import { hover, press, focusVisible } from '$shared/primitives/a11y/interactions.js';
  import ImagePlaceholder from './image-placeholder.svelte';
  import ImageStatus from './image-status.svelte';
  import VerifiedImage from './verified-image.svelte';

  import './card-inbound-image.css';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    block,
    sessionId,
    state: fixtureState,
    deferReady = false,
    onAction,
  }: InboundImageCardProps = $props();

  // @ds surface: inbound-image-card — the in-transcript inbound-image card and its lifecycle.
  // @ds guardrail: do-not-edit — The lifecycle state machine, press-cancel gesture guard, and viewer open handoff are behavioural; do not change them.
  const viewer = getOptionalArtifactViewer();

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // svelte-ignore state_referenced_locally
  let currentState = $state<InboundImageLifecycleState>(initialState(block, deferReady));
  let buttonRef = $state<HTMLButtonElement | null>(null);
  // svelte-ignore state_referenced_locally
  let identityRef = `${block.id}:${block.revision}:${deferReady ? 'deferred' : 'direct'}`;
  let pointerOrigin: { readonly x: number; readonly y: number } | null = null;
  let pressCancelled = false;

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const controlled = $derived(fixtureState !== undefined);
  const imageState = $derived(fixtureState ?? currentState);
  const definition = $derived(imageStatusDefinition(imageState));
  const aspectRatio = $derived(aspectRatioFor(block));
  const redactionsApplied = $derived(
    block.availability === 'ready' && block.redaction.status === 'applied',
  );
  const metadata = $derived([
    ...(imageState === 'processing' ? [] : ['Processed']),
    `Revision ${block.revision}`,
    ...(redactionsApplied ? ['Redactions applied'] : []),
    ...(terminalLabel(imageState) === null ? [] : [terminalLabel(imageState) as string]),
  ]);
  const canOpen = $derived(block.availability === 'ready' && imageState === 'inline-ready');
  const renderVerified = $derived(
    block.availability === 'ready' && !definition.noPixels && imageState !== 'processing',
  );

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const identity = `${block.id}:${block.revision}:${deferReady ? 'deferred' : 'direct'}`;
    if (identityRef === identity) return;
    identityRef = identity;
    currentState = initialState(block, deferReady);
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  const handleStateChange = (next: InboundImageLifecycleState): void => {
    if (!controlled) currentState = next;
  };
  const handleAction = (action: InboundImageStatusAction): void => {
    onAction?.(action);
  };
  const handlePointerDown = (event: PointerEvent): void => {
    pointerOrigin = { x: event.clientX, y: event.clientY };
    pressCancelled = false;
  };
  const handlePointerMove = (event: PointerEvent): void => {
    const origin = pointerOrigin;
    if (origin === null) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) {
      pressCancelled = true;
    }
  };
  const handlePress = (): void => {
    const cancelled = pressCancelled;
    pointerOrigin = null;
    pressCancelled = false;
    if (cancelled || !canOpen || block.availability !== 'ready') return;
    viewer?.openInboundImage(block as InboundImageReadyBlock, buttonRef, sessionId);
  };
</script>

{#snippet cardBody()}
  <div class="inbound-image-card-body">
    <div class="inbound-image-identity" dir="auto">
      <div class="inbound-image-title-wrap">
        <strong class="inbound-image-title">{block.displayName}</strong>
        <span class="inbound-image-metadata">{#each metadata as item}<span>{#if item.startsWith('Revision ')}<bdi dir="ltr">{item}</bdi>{:else}{item}{/if}</span>{/each}</span>
      </div>
    </div>
    {#if renderVerified}
      <VerifiedImage
        block={block as InboundImageReadyBlock}
        {sessionId}
        {aspectRatio}
        forceLoad={controlled && PIXEL_STATES.has(imageState)}
        {...(controlled ? { lifecycleState: imageState } : {})}
        onStateChange={handleStateChange}
      />
    {:else}
      <ImagePlaceholder
        aspectRatio={definition.noAspect ? null : aspectRatio}
        state={imageState}
        noAspect={definition.noAspect ?? false}
      />
    {/if}
    <ImageStatus state={imageState} onAction={handleAction} />
  </div>
{/snippet}

<article
  class="inbound-image-card"
  data-inbound-image-card="true"
  data-image-state={imageState}
  data-availability={block.availability}
  aria-busy={definition.ariaBusy || undefined}
  dir="auto"
>
  {#if canOpen}
    <button
      bind:this={buttonRef}
      type="button"
      class="inbound-image-card-button"
      aria-label={cardAccessibleName(block)}
      aria-haspopup="dialog"
      use:hover
      use:press
      use:focusVisible
      onclick={handlePress}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointercancel={() => {
        pressCancelled = true;
        pointerOrigin = null;
      }}
    >
      {@render cardBody()}
    </button>
  {:else}
    {@render cardBody()}
  {/if}
</article>

<!-- @ds surface: inbound-image-card — the in-transcript inbound-image card, its open button, identity
     header, and the lifecycle-state re-inking of the well/placeholder. Decomposed into this co-located CSS file. The
     react-aria [data-hovered]/[data-pressed]/[data-focus-visible] states are preserved via the wired
     use:hover/use:press/use:focusVisible actions and scoped as :global([data-*]). The card owns the
     [data-image-state] state; the well and placeholder-pattern it re-inks are rendered by child
     components (VerifiedImage / ImagePlaceholder), so those descendants are matched with :global(...).
     The @keyframes moves with the card so Svelte renames both together. The base .inbound-image-well /
     .inbound-image-placeholder-pattern rules are shared by two children and stay global. Values unchanged. -->
