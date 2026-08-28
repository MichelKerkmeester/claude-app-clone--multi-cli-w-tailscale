<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: UNSUPPORTED PREVIEW
  // ───────────────────────────────────────────────────────────────────

  import MediaPlayer from './media-player.svelte';
  import { resolvePlayableMedia, type MediaPreviewInput } from './media-player.js';

  interface Props {
    renderer?: string;
    message?: string;
    media?: MediaPreviewInput | null;
  }

  let { renderer = 'this file type', message, media = null }: Props = $props();
  const playableMedia = $derived(resolvePlayableMedia(media));
</script>

<!-- Component content -->
<!-- Unsupported preview -->
<!-- This surface: unsupported-preview — the unavailable/unsupported read notice. -->
<!-- This state: unsupported · withheld · denied · missing · corrupt · too-large · … — the caller
     passes explicit media bytes when a native player is allowed; otherwise this renders the notice. -->
{#if playableMedia !== null}
  <MediaPlayer source={playableMedia} />
{:else}
  <div class="artifact--unsupported-preview">
    <strong>Preview unavailable</strong>
    <p>{message ?? `${renderer} previews are not available in this reader.`}</p>
  </div>
{/if}

<!-- Artifact unsupported preview -->
<!-- This surface: artifact--unsupported-preview — the unavailable/unsupported read notice. Decomposed into this scoped block;
     the base + dark rules were grouped with the shared .artifact--empty-preview (and
     other viewer chrome), which stay global. The dark re-ink uses the :global(:root[data-theme='dark'])
     foreign ancestor. Literal hex values preserved byte-for-byte. -->
<style>
  /* This surface: unsupported-preview — the unavailable/unsupported read notice card. */
  /* Do not edit — theme-invariant light literal; stays fixed. */
  .artifact--unsupported-preview {
    max-inline-size: 100%;
    margin: 0;
    padding: 1rem;
    border: 1px solid #6c6a65;
    border-radius: 0.5rem;
    background: #ffffff;
    color: #24221f;
    font-family: var(--font-display);
    line-height: 1.55;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .artifact--unsupported-preview p {
    margin: 0.5rem 0 0;
  }

  /* This state: dark — dark-theme re-ink (a shared group in app.css; only the unsupported slice here). */
  :global(:root[data-theme='dark']) .artifact--unsupported-preview {
    background: #2d2a26;
    color: #f8f8f6;
  }
</style>
