<script module lang="ts">
  export interface ArtifactHeaderProps {
    headingRef?: HTMLHeadingElement | null;
    readonly onClose: () => void;
    readonly title?: string;
    readonly kindLabel?: string;
    readonly revision?: string | null;
  }
</script>

<script lang="ts">
  import { hover, focusVisible } from '../../../shared/primitives/interactions.js';

  let {
    headingRef = $bindable(null),
    onClose,
    title = 'File diff',
    kindLabel = 'Redacted artifact',
    revision = null,
  }: ArtifactHeaderProps = $props();
</script>

<!-- @ds surface: artifact-header — the viewer heading + close chrome. -->
<!-- @ds slot: heading-group (kicker · title · revision) | close — the header regions. -->
<!-- @ds guardrail: do-not-edit — the heading focus target (tabindex=-1) and the close aria-label are frozen. -->
<header class="artifact-viewer-header">
  <div class="artifact-viewer-heading-group">
    <span class="artifact-viewer-kicker">{kindLabel}</span>
    <h2
      bind:this={headingRef}
      id="artifact-viewer-title"
      tabindex="-1"
      class="artifact-viewer-title"
      dir="auto"
    >{title}</h2>
    {#if revision !== null}
      <span class="artifact-viewer-revision" dir="ltr">Exact revision {revision}</span>
    {/if}
  </div>
  <button
    type="button"
    class="artifact-viewer-close"
    aria-label={`Close ${title.toLocaleLowerCase()} viewer`}
    use:hover
    use:focusVisible
    onclick={onClose}
  >
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  </button>
</header>

<!-- @ds surface: artifact-viewer-revision — the exact-revision line in the viewer header. Decomposed into this scoped block;
     single-component (only ArtifactHeader renders it). The rest of the header chrome
     (artifact-viewer-header/heading-group/kicker/title/close) is shared with AttachmentPreviewDialog
     and stays in the global sheet (→ app.css at cutover). Dark re-ink via :global(:root[data-theme]).
     Literal hex preserved. Values unchanged. -->
<style>
  /* @ds slot: revision — the exact-revision provenance line (LTR-isolated). */
  .artifact-viewer-revision {
    max-inline-size: 100%;
    overflow-wrap: anywhere;
    color: #6c6a65;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    min-inline-size: 0;
    direction: ltr;
    unicode-bidi: isolate;
  }

  /* @ds state: dark — dark-theme re-ink (foreign ancestor via :global). */
  :global(:root[data-theme='dark']) .artifact-viewer-revision {
    color: #9f998f;
  }
</style>
