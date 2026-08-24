<script lang="ts">
  import './unsupported-preview.css';
  // ───────────────────────────────────────────────────────────────────
  // MODULE: UNSUPPORTED PREVIEW
  // ───────────────────────────────────────────────────────────────────

  interface Props {
    renderer?: string;
    message?: string;
  }

  let { renderer = 'this file type', message }: Props = $props();
</script>

<!-- @ds surface: unsupported-preview — the unavailable/unsupported read notice. -->
<!-- @ds state: unsupported · withheld · denied · missing · corrupt · too-large · … — the caller
     passes the message; this renders the notice. -->
<div class="artifact-unsupported-preview">
  <strong>Preview unavailable</strong>
  <p>{message ?? `${renderer} previews are not available in this reader.`}</p>
</div>

<!-- @ds surface: artifact-unsupported-preview — the unavailable/unsupported read notice. Decomposed into this co-located CSS file;
     the base + dark rules were grouped with the shared .artifact-empty-preview (and
     other viewer chrome), which stay global. The dark re-ink uses the :global(:root[data-theme='dark'])
     foreign ancestor. Literal hex values preserved byte-for-byte. -->
