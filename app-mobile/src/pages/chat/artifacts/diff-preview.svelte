<script module lang="ts">
  // This module holds the unified-diff parser so the artifact well and the
  // transcript diff card number hunks from the same bytes.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: DIFF PREVIEW
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export type ParsedDiffRowKind = 'hunk' | 'meta' | 'context' | 'add' | 'remove';

  export interface ParsedDiffRow {
    readonly kind: ParsedDiffRowKind;
    readonly text: string;
    readonly oldLine: number | null;
    readonly newLine: number | null;
  }

  export interface ParsedUnifiedDiff {
    readonly filePath: string;
    readonly added: number;
    readonly removed: number;
    readonly rows: readonly ParsedDiffRow[];
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // Unified hunk starts; the captured old/new offsets restart that hunk's gutter.
  const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/u;
  const FILE_SECTION_START =
    /^(?:diff --git |index |old mode |new mode |new file mode |deleted file mode |similarity index |dissimilarity index |rename from |rename to |copy from |copy to |Binary files )/u;

  // ───────────────────────────────────────────────────────────────────
  // 3. PARSER
  // ───────────────────────────────────────────────────────────────────

  // Keep strip git path focused on its single responsibility.
  function stripGitPath(value: string): string | null {
    const path = (value.split('\t')[0] ?? '').trim();
    if (path.length === 0 || path === '/dev/null') return null;
    if (path.startsWith('a/') || path.startsWith('b/')) return path.slice(2);
    return path;
  }

  // Keep read unified diff focused on its single responsibility.
  function readUnifiedDiff(patch: string): ParsedUnifiedDiff | null {
    const lines = patch.split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

    const rows: ParsedDiffRow[] = [];
    let filePath = '';
    let added = 0;
    let removed = 0;
    let oldLine = 0;
    let newLine = 0;
    let inHunk = false;
    let hunkCount = 0;

    for (const raw of lines) {
      const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
      const hunk = HUNK_HEADER.exec(line);
      if (hunk !== null) {
        inHunk = true;
        hunkCount += 1;
        oldLine = Number(hunk[1]);
        newLine = Number(hunk[2]);
        const hint = (hunk[3] ?? '').trim();
        if (filePath.length === 0 && hint.length > 0) filePath = hint;
        rows.push({ kind: 'hunk', text: line, oldLine: null, newLine: null });
        continue;
      }

      if (!inHunk) {
        if (line.startsWith('+++ ')) {
          const next = stripGitPath(line.slice(4));
          if (next !== null) filePath = next;
          continue;
        }
        if (line.startsWith('--- ')) {
          const next = stripGitPath(line.slice(4));
          if (next !== null && filePath.length === 0) filePath = next;
          continue;
        }
        const gitFile = /^diff --git a\/.+ b\/(.+)$/u.exec(line);
        if (gitFile?.[1] !== undefined && filePath.length === 0) {
          filePath = gitFile[1];
          continue;
        }
        continue;
      }

      if (FILE_SECTION_START.test(line)) {
        inHunk = false;
        const gitFile = /^diff --git a\/.+ b\/(.+)$/u.exec(line);
        if (gitFile?.[1] !== undefined) filePath = gitFile[1];
        continue;
      }

      if (line.startsWith('\\')) {
        rows.push({ kind: 'meta', text: line, oldLine: null, newLine: null });
        continue;
      }

      if (line.startsWith('+')) {
        added += 1;
        rows.push({ kind: 'add', text: line, oldLine: null, newLine });
        newLine += 1;
        continue;
      }

      if (line.startsWith('-')) {
        removed += 1;
        rows.push({ kind: 'remove', text: line, oldLine, newLine: null });
        oldLine += 1;
        continue;
      }

      rows.push({ kind: 'context', text: line, oldLine, newLine });
      oldLine += 1;
      newLine += 1;
    }

    if (hunkCount === 0) return null;
    return { filePath, added, removed, rows };
  }

  // A headerless or unreadable patch must not take down the well.
  export function parseUnifiedDiff(patch: string): ParsedUnifiedDiff | null {
    try {
      return readUnifiedDiff(patch);
    } catch {
      return null;
    }
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  interface Props extends Pick<FileDiffBlock, 'patch'> {
    wrap?: boolean;
    findTerm?: string;
  }

  let { patch, wrap = false, findTerm = '' }: Props = $props();

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const parsed = $derived(parseUnifiedDiff(patch));
  const lines = $derived(patch.split('\n'));

  // Keep diff line class focused on its single responsibility.
  function rowClass(kind: ParsedDiffRowKind, text: string): string {
    const tint =
      kind === 'add' ? ' artifact-diff--add' : kind === 'remove' ? ' artifact-diff--remove' : '';
    const find =
      findTerm.length > 0 && text.toLocaleLowerCase().includes(findTerm.toLocaleLowerCase())
        ? ' is-find-match'
        : '';
    return `artifact-diff--line${tint}${find}`;
  }
</script>

<!-- Component content -->
<!-- Diff preview -->
<!-- This surface: diff-preview — the unified-diff read well. -->
<!-- This state: add · remove · context · find-match — per-line classes drive the tint. -->
{#if parsed !== null}
  <div
    class={`artifact-diff--preview is-parsed${wrap ? ' is-wrapped' : ''}`}
    aria-label="Redacted file diff"
    dir="ltr"
    data-display-buffer="true"
  >
    <div class="artifact-diff--header">
      {#if parsed.filePath.length > 0}
        <span class="artifact-diff--path" data-diff-path={parsed.filePath}>{parsed.filePath}</span>
      {/if}
      <span
        class="artifact-diff--stat"
        data-added={String(parsed.added)}
        data-removed={String(parsed.removed)}
        aria-label={`${String(parsed.added)} added, ${String(parsed.removed)} removed`}
      >+{parsed.added}/-{parsed.removed}</span>
    </div>
    <div class="artifact-diff--body">
      {#each parsed.rows as row, index (index)}
        <span class={rowClass(row.kind, row.text)}>
          <span
            class="artifact-diff--old"
            aria-hidden="true"
            data-old-line={row.oldLine ?? undefined}
          >{row.oldLine ?? ''}</span>
          <span
            class="artifact-diff--new"
            aria-hidden="true"
            data-new-line={row.newLine ?? undefined}
          >{row.newLine ?? ''}</span>
          <span class="artifact-diff--src">{row.text}</span>
        </span>
      {/each}
    </div>
  </div>
{:else}
  <pre class={`artifact-diff--preview${wrap ? ' is-wrapped' : ''}`} aria-label="Redacted file diff" dir="ltr" data-display-buffer="true">{#each lines as line, index (index)}<span class={`${line.startsWith('+') ? 'artifact-diff--line artifact-diff--add' : line.startsWith('-') ? 'artifact-diff--line artifact-diff--remove' : 'artifact-diff--line artifact-diff-context'}${findTerm.length > 0 && line.toLocaleLowerCase().includes(findTerm.toLocaleLowerCase()) ? ' is-find-match' : ''}`}>{line}{index < lines.length - 1 ? '\n' : ''}</span>{/each}</pre>
{/if}

<!-- Artifact diff preview -->
<!-- This surface: artifact-diff--preview — the unified-diff read well + per-line add/remove/find tints.
     Decomposed into this scoped block; the .artifact-diff--preview base merges the shared well-guardrail group
     (overflow/overscroll/user-select) with the diff-specific layout into one faithful rule. The add/
     remove tints read --diff-add/--diff-remove tokens; those tokens and the find-match tint stay
     invariant because the well is a theme-invariant dark surface. is-wrapped / is-find-match are
     per-element modifiers local to this component. Values unchanged. -->
<style>
  /* This slot: diff-well — the unified-diff read-out. */
  /* Do not edit — Fixed reading well; selectable and pan-scoped; never overflow the page. */
  .artifact-diff--preview {
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
    color: var(--on-code);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.65;
    white-space: pre;
    unicode-bidi: isolate;
    user-select: text;
    -webkit-user-select: text;
  }

  /* This state: wrapped — soft-wrap toggle. */
  .artifact-diff--preview.is-wrapped {
    white-space: pre-wrap;
  }

  /* This slot: diff-line — one diff row. */
  .artifact-diff--line {
    min-block-size: 1.65em;
    padding-inline: var(--space-4);
    display: block;
  }

  /* This state: add — inserted line tint (token; invariant because the well is). */
  .artifact-diff--add {
    background: color-mix(in oklch, var(--diff-add) 90%, transparent);
  }

  /* This state: remove — deleted line tint (token; invariant because the well is). */
  .artifact-diff--remove {
    background: color-mix(in oklch, var(--diff-remove) 90%, transparent);
  }

  /* This state: find-match — highlighted find hit (invariant because the well is). */
  .artifact-diff--line.is-find-match {
    background: #3a2720;
  }

  /* This state: parsed — numbered hunk layout over the same well. */
  .artifact-diff--preview.is-parsed {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    white-space: normal;
  }

  /* This slot: file-header — path plus the +N/-M blast-radius stat. */
  .artifact-diff--header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
    padding-inline: var(--space-4);
    padding-block-end: var(--space-2);
    margin-block-end: var(--space-2);
    border-block-end: 1px solid var(--line);
  }

  /* This slot: path — the file the hunks belong to. */
  .artifact-diff--path {
    min-inline-size: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* This slot: stat — added versus removed counts from the hunk body. */
  .artifact-diff--stat {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
  }

  /* This slot: numbered-row — old and new gutters beside the source. */
  .artifact-diff--preview.is-parsed .artifact-diff--line {
    display: grid;
    grid-template-columns: 4ch 4ch minmax(0, 1fr);
    column-gap: var(--space-2);
    padding-inline: var(--space-3);
  }

  /* This slot: gutter — old or new line number; not part of copied source. */
  .artifact-diff--old,
  .artifact-diff--new {
    color: var(--ink-muted);
    text-align: end;
    user-select: none;
    -webkit-user-select: none;
  }

  /* This slot: source — the unified-diff text column. */
  .artifact-diff--src {
    min-inline-size: 0;
    white-space: pre;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .artifact-diff--preview.is-parsed.is-wrapped .artifact-diff--src {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
