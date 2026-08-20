<script lang="ts">
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
