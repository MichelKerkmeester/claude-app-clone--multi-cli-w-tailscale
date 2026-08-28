<script module lang="ts">
  // This module holds the explicit media source contract for the player.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: MEDIA PLAYER
  // ───────────────────────────────────────────────────────────────────

  import type { PlayableMediaSource } from './media-player.js';

  export interface MediaPlayerProps {
    readonly source: PlayableMediaSource;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onDestroy, untrack } from 'svelte';

  import { createScopedMediaObjectUrl } from './media-player.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS AND STATE
  // ───────────────────────────────────────────────────────────────────

  let { source }: MediaPlayerProps = $props();
  let objectUrl = $state<string | null>(null);
  let activeObjectUrl: string | null = null;

  // Replaces old URLs immediately; teardown-only cleanup lives in onDestroy.
  $effect(() => {
    const nextObjectUrl = createScopedMediaObjectUrl(source);
    const previousObjectUrl = activeObjectUrl;
    activeObjectUrl = nextObjectUrl;
    if (previousObjectUrl !== null) URL.revokeObjectURL(previousObjectUrl);
    untrack(() => {
      objectUrl = nextObjectUrl;
    });
  });

  // Releases the blob-backed URL when this player leaves the document.
  onDestroy(() => {
    const url = activeObjectUrl;
    activeObjectUrl = null;
    if (url !== null) URL.revokeObjectURL(url);
  });
</script>

<!-- Component content -->
<!-- Media player -->
<!-- This surface: media-player — explicit artifact bytes rendered by a native playback control. -->
{#if objectUrl === null}
  <p role="status">Media preview unavailable.</p>
{:else if source.kind === 'audio'}
  <audio
    controls
    preload="metadata"
    src={objectUrl}
    aria-label={source.label ?? 'Audio preview'}
  ></audio>
{:else}
  <!-- The source contract carries media bytes only, so no caption track is available here. -->
  <!-- svelte-ignore a11y_media_has_caption -->
  <video
    controls
    preload="metadata"
    src={objectUrl}
    aria-label={source.label ?? 'Video preview'}
  ></video>
{/if}
