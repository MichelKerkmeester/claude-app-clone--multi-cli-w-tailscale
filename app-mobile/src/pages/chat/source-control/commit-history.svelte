<script module lang="ts">
  // This module holds the lazy commit-history contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: COMMIT HISTORY
  // ───────────────────────────────────────────────────────────────────

  import type { CommitHistoryData } from './source-control-types.js';

  export interface CommitHistoryProps {
    readonly data?: CommitHistoryData | null;
    readonly onExpandFiles?: (commitId: string) => void;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { focusVisible, hover, press } from '$shared/primitives/a11y/interactions.js';
  import type { CommitRecord } from './source-control-types.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    data = null,
    onExpandFiles,
    capability = true,
  }: CommitHistoryProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let expandedById = $state<Record<string, boolean>>({});

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep file expansion lazy so the host is not asked for every commit up front.
  function toggle(commit: CommitRecord): void {
    const nextOpen = expandedById[commit.id] !== true;
    expandedById = nextOpen ? { [commit.id]: true } : {};
    if (nextOpen) onExpandFiles?.(commit.id);
  }

  // A failed host expansion must remain visible instead of becoming an empty list.
  function failureText(commit: CommitRecord): string {
    return commit.failureMessage ?? 'Unable to load files for this commit. Try again.';
  }

  function isExpanded(commit: CommitRecord): boolean {
    return expandedById[commit.id] === true;
  }
</script>

<!-- Component content -->
{#if capability && data !== null && data.commits.length > 0}
  <section class="source-control-commit-history" aria-label="Commit history" data-source-control-surface="commit-history">
    <header class="source-control-commit-history--header">
      <h3>Commits</h3>
      {#if data.branchLabel !== undefined && data.branchLabel.length > 0}
        <span class="source-control-commit-history--branch">{data.branchLabel}</span>
      {/if}
    </header>
    <ol>
      {#each data.commits as commit (commit.id)}
        {@const expanded = isExpanded(commit)}
        <li class="source-control-commit-history--row">
          <div class="source-control-commit-history--summary">
            <div class="source-control-commit-history--subject" dir="auto">{commit.subject}</div>
            {#if commit.author !== undefined || commit.committedAt !== undefined}
              <div class="source-control-commit-history--meta">
                {#if commit.author !== undefined}<span>{commit.author}</span>{/if}
                {#if commit.committedAt !== undefined}<time datetime={commit.committedAt}>{commit.committedAt}</time>{/if}
              </div>
            {/if}
          </div>
          <button
            type="button"
            class="source-control-commit-history--toggle"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} files for commit ${commit.id}`}
            use:hover
            use:press
            use:focusVisible
            onclick={() => toggle(commit)}
          >
            {expanded ? 'Hide files' : 'Files'}
          </button>
        </li>
        {#if expanded}
          <li class="source-control-commit-history--files" data-commit-files-state={commit.filesState}>
            {#if commit.filesState === 'loading'}
              <p role="status">Loading files…</p>
            {:else if commit.filesState === 'failed'}
              <p role="alert">{failureText(commit)}</p>
            {:else if commit.filesState === 'loaded' && commit.files !== undefined}
              {#if commit.files.length > 0}
                <ul aria-label={`Files changed in commit ${commit.id}`}>
                  {#each commit.files as file (file.path)}
                    <li dir="ltr">{file.path}</li>
                  {/each}
                </ul>
              {:else}
                <p>No files changed in this commit.</p>
              {/if}
            {:else}
              <p role="status">Files have not been loaded.</p>
            {/if}
          </li>
        {/if}
      {/each}
    </ol>
  </section>
{/if}

<style>
  /* This surface: commit-history — renders host commits and defers file expansion. */
  .source-control-commit-history {
    min-inline-size: 0;
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* This slot: header — names the history and its host branch label. */
  .source-control-commit-history--header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* This slot: heading — identifies the commit list. */
  .source-control-commit-history h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  /* This slot: branch — keeps the host branch identity visible. */
  .source-control-commit-history--branch {
    color: var(--ink-muted);
    font-size: 0.78rem;
    overflow-wrap: anywhere;
    text-align: end;
  }

  /* This slot: rows — keeps commit order and list semantics. */
  .source-control-commit-history ol {
    display: grid;
    gap: var(--space-2);
    margin: var(--space-2) 0 0;
    padding: 0;
    list-style: none;
  }

  /* This slot: row — pairs one commit with its lazy expansion action. */
  .source-control-commit-history--row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-3);
    padding-block: var(--space-2);
    border-block-start: 1px solid var(--line);
  }

  /* This slot: subject — keeps commit text readable in both directions. */
  .source-control-commit-history--subject {
    min-inline-size: 0;
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  /* This slot: metadata — presents optional host commit provenance. */
  .source-control-commit-history--meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-block-start: var(--space-1);
    color: var(--ink-muted);
    font-size: 0.76rem;
  }

  /* This slot: toggle — gives file expansion a 44px target. */
  .source-control-commit-history--toggle {
    min-inline-size: 44px;
    min-block-size: 44px;
    padding-inline: var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }

  /* This state: hover · pressed — gives the expansion action visible feedback. */
  :global(.source-control-commit-history--toggle[data-hovered]),
  :global(.source-control-commit-history--toggle[data-pressed]) {
    background: var(--canvas-subtle);
  }

  /* This state: focus-visible — keeps the expansion action keyboard-visible. */
  :global(.source-control-commit-history--toggle[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This slot: files — separates lazy file state from the commit row. */
  .source-control-commit-history--files {
    grid-column: 1 / -1;
    padding: var(--space-2) var(--space-3);
    border-inline-start: 2px solid var(--line-strong);
    color: var(--ink-secondary);
    font-size: 0.82rem;
  }

  /* This slot: file-list — retains host file order without mutation affordances. */
  .source-control-commit-history--files ul {
    display: grid;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-mono);
  }

  /* This slot: state-copy — resets status paragraphs in the lazy panel. */
  .source-control-commit-history--files p {
    margin: 0;
  }

  /* This state: failed — makes expansion failure prominent and actionable. */
  .source-control-commit-history--files:has([role='alert']) {
    color: var(--danger);
  }
</style>
