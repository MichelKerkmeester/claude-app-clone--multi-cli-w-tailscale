<script module lang="ts">
  import type { InboundImageBlock } from '@pi-remote/pi-rpc-protocol';

  import {
    imageStatusDefinition,
    type InboundImageLifecycleState,
    type InboundImageStatusAction,
  } from './ImageStatus.svelte';

  export interface InboundImageCardProps {
    readonly block: InboundImageBlock;
    readonly sessionId: string;
    /** Used by the local fixture to hold a specific lifecycle state in place. */
    readonly state?: InboundImageLifecycleState;
    /** Real transcript cards begin ready blocks in the deferred state. */
    readonly deferReady?: boolean;
    readonly onAction?: (action: InboundImageStatusAction) => void;
  }

  const PIXEL_STATES = new Set<InboundImageLifecycleState>([
    'inline-ready',
    'full-fetching',
    'stalled',
    'full-degraded',
    'offline-loaded',
  ]);

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
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import { getOptionalArtifactViewer } from './ArtifactViewerProvider.svelte';
  import { hover, press, focusVisible } from '$shared/primitives/interactions.js';
  import ImagePlaceholder from './ImagePlaceholder.svelte';
  import ImageStatus from './ImageStatus.svelte';
  import VerifiedImage from './VerifiedImage.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    block,
    sessionId,
    state: fixtureState,
    deferReady = false,
    onAction,
  }: InboundImageCardProps = $props();

  // @ds surface: inbound-image-card — the in-transcript inbound-image card and its lifecycle.
  // @ds guardrail: do-not-edit — the lifecycle state machine, press-cancel gesture guard, and the
  // viewer open handoff are behavioural; do not change them.
  const viewer = getOptionalArtifactViewer();
  const controlled = $derived(fixtureState !== undefined);

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // svelte-ignore state_referenced_locally
  let currentState = $state<InboundImageLifecycleState>(initialState(block, deferReady));
  let buttonRef = $state<HTMLButtonElement | null>(null);
  // svelte-ignore state_referenced_locally
  let identityRef = `${block.id}:${block.revision}:${deferReady ? 'deferred' : 'direct'}`;
  let pointerOrigin: { readonly x: number; readonly y: number } | null = null;
  let pressCancelled = false;

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    const identity = `${block.id}:${block.revision}:${deferReady ? 'deferred' : 'direct'}`;
    if (identityRef === identity) return;
    identityRef = identity;
    currentState = initialState(block, deferReady);
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

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
  // 6. HANDLERS
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
     header, and the lifecycle-state re-inking of the well/placeholder. Decomposed into this scoped block. The
     react-aria [data-hovered]/[data-pressed]/[data-focus-visible] states are preserved via the wired
     use:hover/use:press/use:focusVisible actions and scoped as :global([data-*]). The card owns the
     [data-image-state] state; the well and placeholder-pattern it re-inks are rendered by child
     components (VerifiedImage / ImagePlaceholder), so those descendants are matched with :global(...).
     The @keyframes moves with the card so Svelte renames both together. The base .inbound-image-well /
     .inbound-image-placeholder-pattern rules are shared by two children and stay global. Values unchanged. -->
<style>
  /* @ds surface: inbound-image-card — the inbound-image card frame; fades in on mount. */
  .inbound-image-card {
    min-inline-size: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
    color: var(--ink);
    animation: inbound-image-card-in 120ms var(--ease-out) both;
  }

  /* @ds slot: open-button — the full-card open affordance; pan-y keeps vertical scroll, and the
     drag/callout suppression keeps the image un-liftable. */
  .inbound-image-card-button {
    display: block;
    inline-size: 100%;
    min-block-size: 44px;
    padding: 0;
    border: 0;
    border-radius: inherit;
    background: transparent;
    color: inherit;
    text-align: start;
    cursor: pointer;
    touch-action: pan-y;
    -webkit-touch-callout: none;
    -webkit-user-drag: none;
    user-select: none;
    transition:
      background-color 100ms var(--ease-out),
      border-color 100ms var(--ease-out),
      transform 100ms var(--ease-out);
  }

  /* @ds state: hover — react-aria data-hovered accent tint (via use:hover). */
  .inbound-image-card-button:global([data-hovered]) {
    background: var(--accent-soft);
  }

  /* @ds state: pressed — react-aria data-pressed; subtle press-scale (via use:press). */
  .inbound-image-card-button:global([data-pressed]) {
    transform: scale(0.985);
  }

  /* @ds guardrail: focus-visible — inset canonical focus ring (via use:focusVisible). */
  .inbound-image-card-button:global([data-focus-visible]) {
    outline: 3px solid var(--focus);
    outline-offset: -3px;
  }

  /* @ds slot: body — the padded card interior. */
  .inbound-image-card-body {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  /* @ds slot: identity — the title + metadata header row. */
  .inbound-image-identity {
    display: flex;
    min-block-size: 44px;
    min-inline-size: 0;
    align-items: center;
  }

  /* @ds slot: title-wrap — the stacked title + metadata column. */
  .inbound-image-title-wrap {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-1);
  }

  /* @ds slot: title — the inbound image display name. */
  .inbound-image-title {
    overflow-wrap: anywhere;
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    font-weight: 650;
    line-height: 1.333;
  }

  /* @ds slot: metadata — the fact chips (revision · size · …). */
  .inbound-image-metadata {
    display: flex;
    min-inline-size: 0;
    flex-wrap: wrap;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-family: var(--font-sans);
    font-size: 0.75rem;
    line-height: 1.333;
  }

  .inbound-image-metadata span {
    overflow-wrap: anywhere;
  }

  /* @ds state: privacy-covered · revoked — the card re-inks its (child-rendered) well to the opaque
     privacy cover. The well is rendered by VerifiedImage/ImagePlaceholder, so it is matched globally. */
  .inbound-image-card[data-image-state='privacy-covered'] :global(.inbound-image-well),
  .inbound-image-card[data-image-state='revoked'] :global(.inbound-image-well) {
    border-color: var(--ink);
    background: var(--ink);
  }

  /* @ds state: privacy-covered · revoked — the placeholder pattern is hidden under the privacy cover. */
  .inbound-image-card[data-image-state='privacy-covered'] :global(.inbound-image-placeholder-pattern),
  .inbound-image-card[data-image-state='revoked'] :global(.inbound-image-placeholder-pattern) {
    display: none;
  }

  /* @ds guardrail: keyframes — the card mount fade; not designer-editable. */
  @keyframes inbound-image-card-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  /* @ds guardrail: do-not-edit — reduced-motion bounds the card fade to a short linear step and
     removes the press-scale; motion is never re-enabled beyond this. */
  @media (prefers-reduced-motion: reduce) {
    .inbound-image-card {
      animation: inbound-image-card-in 100ms linear both !important;
      transition: opacity 100ms linear !important;
    }

    .inbound-image-card-button:global([data-pressed]) {
      transform: none !important;
    }
  }
</style>
