<script module lang="ts">
  // This module holds the committed-on-branch changed-files contract.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: CHANGED FILES
  // ───────────────────────────────────────────────────────────────────

  import type { ChangedFilesData } from './source-control-types.js';

  export interface ChangedFilesProps {
    readonly data?: ChangedFilesData | null;
    readonly capability?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import DiffPreview, { parseUnifiedDiff } from '../artifacts/diff-preview.svelte';
  import { focusVisible, hover, press } from '$shared/primitives/a11y/interactions.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { data = null, capability = true }: ChangedFilesProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let selectedPath = $state<string | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const selectedFile = $derived(data?.files.find((file) => file.path === selectedPath) ?? null);
  // Use the shared parser as the read-only availability check before mounting the preview.
  const selectedParsedDiff = $derived(
    selectedFile?.patch !== undefined && selectedFile.patch !== null
      ? parseUnifiedDiff(selectedFile.patch)
      : null,
  );

  // ───────────────────────────────────────────────────────────────────
  // 5. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep the read-only panel tied to the selected host file.
  function closeDiff(): void {
    selectedPath = null;
  }
</script>

<!-- Component content -->
{#if capability && data !== null && data.files.length > 0}
  <section class="source-control-changed-files" aria-label="Changed files" data-source-control-surface="changed-files">
    <header class="source-control-changed-files--header">
      <h3>Changes</h3>
      {#if data.branchLabel !== undefined && data.branchLabel.length > 0}
        <span class="source-control-changed-files--branch">{data.branchLabel}</span>
      {/if}
    </header>
    <ul>
      {#each data.files as file (file.path)}
        <li class="source-control-changed-files--row">
          <button
            type="button"
            class="source-control-changed-files--file"
            aria-label={`Open diff for ${file.path}`}
            aria-pressed={selectedPath === file.path}
            use:hover
            use:press
            use:focusVisible
            onclick={() => {
              selectedPath = file.path;
            }}
          >
            <span class="source-control-changed-files--path" dir="ltr">{file.path}</span>
            {#if file.additions !== undefined || file.deletions !== undefined}
              <span class="source-control-changed-files--stats">
                {#if file.additions !== undefined}<span>+{file.additions}</span>{/if}
                {#if file.deletions !== undefined}<span>−{file.deletions}</span>{/if}
              </span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if capability && selectedFile !== null}
  <section
    class="source-control-diff-readout"
    aria-label={`Read-only diff for ${selectedFile.path}`}
    data-read-only="true"
    data-source-control-surface="read-only-diff"
  >
    <header class="source-control-diff-readout--header">
      <h3>Read-only diff</h3>
      <button
        type="button"
        class="source-control-diff-readout--close"
        aria-label={`Close diff for ${selectedFile.path}`}
        use:hover
        use:press
        use:focusVisible
        onclick={closeDiff}
      >
        <span aria-hidden="true">×</span>
      </button>
    </header>
    {#if selectedFile.patch !== undefined && selectedFile.patch !== null && selectedParsedDiff !== null}
      <DiffPreview patch={selectedFile.patch} />
    {:else}
      <p class="source-control-diff-readout--unavailable">Diff unavailable.</p>
    {/if}
  </section>
{/if}

<style>
  /* This surface: changed-files — lists files from the host's committed branch snapshot. */
  .source-control-changed-files {
    min-inline-size: 0;
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* This slot: header — names the change set and its host branch label. */
  .source-control-changed-files--header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* This slot: heading — identifies the committed change list. */
  .source-control-changed-files h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  /* This slot: branch — identifies the host-selected branch without local inference. */
  .source-control-changed-files--branch {
    color: var(--ink-muted);
    font-size: 0.78rem;
    overflow-wrap: anywhere;
    text-align: end;
  }

  /* This slot: rows — provides stable file row grouping. */
  .source-control-changed-files ul {
    display: grid;
    gap: var(--space-1);
    margin: var(--space-2) 0 0;
    padding: 0;
    list-style: none;
  }

  /* This slot: file — makes each host file openable without mutation actions. */
  .source-control-changed-files--file {
    display: flex;
    min-inline-size: 100%;
    min-block-size: 44px;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  /* This slot: path — keeps file names LTR and readable when they contain punctuation. */
  .source-control-changed-files--path {
    min-inline-size: 0;
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
    font-size: 0.82rem;
  }

  /* This slot: stats — shows only host-supplied line counts. */
  .source-control-changed-files--stats {
    display: inline-flex;
    flex: 0 0 auto;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-family: var(--font-mono);
    font-size: 0.76rem;
  }

  /* This state: hover · pressed — gives file rows non-color-only feedback. */
  :global(.source-control-changed-files--file[data-hovered]),
  :global(.source-control-changed-files--file[data-pressed]) {
    background: var(--canvas-subtle);
  }

  /* This state: focus-visible — keeps keyboard focus visible on a file row. */
  :global(.source-control-changed-files--file[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This surface: read-only-diff — wraps the shared parser-backed preview without edit controls. */
  .source-control-diff-readout {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-2);
    margin-block-start: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* This slot: diff-header — names the read-only preview and its close action. */
  .source-control-diff-readout--header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* This slot: diff-heading — identifies the non-editable preview. */
  .source-control-diff-readout h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  /* This slot: diff-close — provides a named 44px local close action. */
  .source-control-diff-readout--close {
    display: grid;
    min-inline-size: 44px;
    min-block-size: 44px;
    place-items: center;
    border: 0;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--ink);
    font-size: 1.4rem;
    cursor: pointer;
  }

  /* This state: hover · pressed — gives the close action a visible state. */
  :global(.source-control-diff-readout--close[data-hovered]),
  :global(.source-control-diff-readout--close[data-pressed]) {
    background: var(--canvas-subtle);
  }

  /* This state: focus-visible — keeps the close action keyboard-visible. */
  :global(.source-control-diff-readout--close[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This slot: unavailable — distinguishes a missing host patch from an empty diff. */
  .source-control-diff-readout--unavailable {
    margin: 0;
    color: var(--ink-muted);
  }
</style>
