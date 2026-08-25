<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: VERIFIED IMAGE
  // ───────────────────────────────────────────────────────────────────

  import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

  import type { ArtifactResourceStatus } from './use-artifact-resource.svelte.js';
  import type { InboundImageLifecycleState } from './image-status.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface VerifiedImageProps {
    readonly block: InboundImageReadyBlock;
    readonly sessionId: string;
    readonly aspectRatio: number;
    readonly enabled?: boolean;
    readonly forceLoad?: boolean;
    readonly lifecycleState?: InboundImageLifecycleState;
    readonly onStateChange?: (state: InboundImageLifecycleState) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function stateForResourceStatus(status: ArtifactResourceStatus): InboundImageLifecycleState | null {
    switch (status) {
      case 'loading':
        return 'thumbnail-fetching';
      case 'stalled':
        return 'stalled';
      case 'ready':
        return 'inline-ready';
      case 'offline':
        return 'offline-unavailable';
      case 'stale':
        return 'stale';
      case 'denied':
        return 'denied';
      case 'expired':
        return 'expired';
      case 'missing':
      case 'conflict':
        return 'revision-conflict';
      case 'revoked':
        return 'revoked';
      case 'corrupt':
        return 'corrupt';
      case 'rate-limited':
        return 'rate-limited';
      case 'aborted':
        return 'aborted';
      default:
        return null;
    }
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { demoInboundArtifactResource, isDemoMode } from '$shared/fixtures/demo.js';
  import { useArtifactResource } from './use-artifact-resource.svelte.js';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    block,
    sessionId,
    aspectRatio,
    enabled = true,
    forceLoad = false,
    lifecycleState,
    onStateChange,
  }: VerifiedImageProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // svelte-ignore state_referenced_locally
  let nearViewport = $state(forceLoad || typeof IntersectionObserver === 'undefined');
  let imageFailed = $state(false);
  let wellEl = $state<HTMLDivElement | null>(null);
  let autoRetry = false;

  const resource = useArtifactResource(
    () => sessionId,
    () => block,
    () => ({
      enabled: enabled && (forceLoad || nearViewport),
      variant: 'thumbnail',
      requireImageDecode: true,
      ...(isDemoMode() ? { read: demoInboundArtifactResource } : {}),
    }),
  );

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const showPixels = $derived(
    !imageFailed &&
      resource.current.status === 'ready' &&
      resource.current.objectUrl !== null &&
      (lifecycleState === undefined ||
        lifecycleState === 'inline-ready' ||
        lifecycleState === 'full-fetching' ||
        lifecycleState === 'stalled' ||
        lifecycleState === 'full-degraded' ||
        lifecycleState === 'offline-loaded'),
  );

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    void block.id;
    void block.revision;
    void forceLoad;
    nearViewport = forceLoad || typeof IntersectionObserver === 'undefined';
    imageFailed = false;
    autoRetry = false;
  });

  $effect(() => {
    if (!enabled || forceLoad || nearViewport) return undefined;
    const element = wellEl;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      nearViewport = true;
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          nearViewport = true;
          observer.disconnect();
        }
      },
      { rootMargin: '200% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  });

  $effect(() => {
    const status = resource.current.status;
    if (!enabled || (status !== 'relay-error' && status !== 'stalled')) {
      return undefined;
    }
    if (autoRetry) return undefined;
    autoRetry = true;
    const timer = window.setTimeout(() => resource.current.reload(), 750);
    return () => window.clearTimeout(timer);
  });

  $effect(() => {
    const status = resource.current.status;
    if (lifecycleState !== undefined || onStateChange === undefined) return;
    const next = stateForResourceStatus(status);
    if (next !== null) onStateChange(next);
  });

</script>

<div
  bind:this={wellEl}
  class={showPixels ? 'inbound-image--well inbound-image-well-ready' : 'inbound-image--well'}
  data-image-well={showPixels ? 'verified' : 'placeholder'}
  data-verified-image={showPixels ? 'true' : undefined}
  data-image-state={lifecycleState ?? stateForResourceStatus(resource.current.status) ?? 'deferred'}
  data-no-pixels={showPixels ? undefined : 'true'}
  style:aspect-ratio={String(aspectRatio)}
  aria-hidden="true"
>
  {#if showPixels}
    <img
      class="inbound-image--thumbnail"
      src={resource.current.objectUrl}
      alt=""
      draggable={false}
      onerror={() => {
        imageFailed = true;
        resource.current.close();
        onStateChange?.('corrupt');
      }}
    />
  {:else}
    <span class="inbound-image--placeholder-pattern"></span>
  {/if}
</div>

<!-- @ds surface: inbound-image--thumbnail — the decoded inbound image inside the well. Decomposed into this scoped block;
     the well itself (.inbound-image--well) is shared with ImagePlaceholder and stays global.
     Values unchanged. -->
<style>
  /* @ds slot: thumbnail — the contained, non-interactive decoded image. */
  .inbound-image--thumbnail {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }
</style>
