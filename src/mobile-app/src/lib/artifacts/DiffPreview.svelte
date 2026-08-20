<script lang="ts">
  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  interface Props extends Pick<FileDiffBlock, 'patch'> {
    wrap?: boolean;
    findTerm?: string;
  }

  let { patch, wrap = false, findTerm = '' }: Props = $props();

  const lines = $derived(patch.split('\n'));
</script>

<!-- @ds surface: diff-preview — the unified-diff read well. -->
<!-- @ds state: add · remove · context · find-match — per-line classes drive the tint. -->
<pre class={`artifact-diff-preview${wrap ? ' is-wrapped' : ''}`} aria-label="Redacted file diff" dir="ltr" data-display-buffer="true">{#each lines as line, index (index)}<span class={`${line.startsWith('+') ? 'artifact-diff-line artifact-diff-add' : line.startsWith('-') ? 'artifact-diff-line artifact-diff-remove' : 'artifact-diff-line artifact-diff-context'}${findTerm.length > 0 && line.toLocaleLowerCase().includes(findTerm.toLocaleLowerCase()) ? ' is-find-match' : ''}`}>{line}{index < lines.length - 1 ? '\n' : ''}</span>{/each}</pre>
