<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: DIFF PREVIEW
  // ───────────────────────────────────────────────────────────────────

  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  import './diff-preview.css';

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

<!-- @ds surface: artifact-diff-preview — the unified-diff read well + per-line add/remove/find tints.
     Decomposed into this co-located CSS file; the .artifact-diff-preview base merges the shared well-guardrail group
     (overflow/overscroll/user-select) with the diff-specific layout into one faithful rule. The add/
     remove tints read --diff-add/--diff-remove tokens (system-dark remaps the token); the explicit
     :root[data-theme='dark'] literal overrides use :global(:root[data-theme='dark']). is-wrapped /
     is-find-match are per-element modifiers local to this component. Values unchanged. -->
