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

<!-- @ds surface: artifact-diff-preview — the unified-diff read well + per-line add/remove/find tints.
     Decomposed from style.css; the .artifact-diff-preview base merges the shared well-guardrail group
     (overflow/overscroll/user-select) with the diff-specific layout into one faithful rule. The add/
     remove tints read --diff-add/--diff-remove tokens (system-dark remaps the token); the explicit
     :root[data-theme='dark'] literal overrides use :global(:root[data-theme='dark']). is-wrapped /
     is-find-match are per-element modifiers local to this component. Values unchanged. -->
<style>
  /* @ds slot: diff-well — the unified-diff read-out. */
  /* @ds guardrail: do-not-edit — fixed reading well; selectable and pan-scoped; never overflow the page. */
  .artifact-diff-preview {
    min-inline-size: 0;
    max-inline-size: 100%;
    margin: 0;
    overflow: auto;
    overscroll-behavior: contain;
    overflow-anchor: none;
    padding-block: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface-code);
    color: var(--ink-inverse);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.65;
    white-space: pre;
    unicode-bidi: isolate;
    user-select: text;
    -webkit-user-select: text;
  }

  /* @ds state: wrapped — soft-wrap toggle. */
  .artifact-diff-preview.is-wrapped {
    white-space: pre-wrap;
  }

  /* @ds slot: diff-line — one diff row. */
  .artifact-diff-line {
    min-block-size: 1.65em;
    padding-inline: var(--space-4);
    display: block;
  }

  /* @ds state: add — inserted line tint (token; system-dark remaps --diff-add). */
  .artifact-diff-add {
    background: color-mix(in oklch, var(--diff-add) 90%, transparent);
  }

  /* @ds state: remove — deleted line tint (token; system-dark remaps --diff-remove). */
  .artifact-diff-remove {
    background: color-mix(in oklch, var(--diff-remove) 90%, transparent);
  }

  /* @ds state: find-match — highlighted find hit. */
  .artifact-diff-line.is-find-match {
    background: #f3e4de;
  }

  /* @ds state: dark — explicit dark-theme tints (foreign ancestor via :global). */
  :global(:root[data-theme='dark']) .artifact-diff-add {
    background: #3a2720;
  }

  :global(:root[data-theme='dark']) .artifact-diff-remove {
    background: #3a2720;
  }

  :global(:root[data-theme='dark']) .artifact-diff-line.is-find-match {
    background: #3a2720;
  }
</style>
