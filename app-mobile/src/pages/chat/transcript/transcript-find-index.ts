// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Find Index
// ───────────────────────────────────────────────────────────────────

// Flat line index over the loaded snapshot. Off-screen virtual rows are not
// in the DOM, so search cannot walk mounted markup and must scroll the
// virtualizer to a match instead.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { DisplayTranscriptBlock } from '$shared/state/state.js';

import type { RenderItem } from './transcript-helpers.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type SearchRole = 'user' | 'assistant' | 'tool';

export interface SearchSnippet {
  readonly role: SearchRole;
  readonly text: string;
  readonly haystack: string;
  readonly rowIndex: number;
  readonly sourceBlockId: string;
}

export interface FindMatch {
  readonly snippetIndex: number;
  readonly start: number;
  readonly end: number;
}

export interface TranscriptFindIndex {
  readonly snippets: readonly SearchSnippet[];
}

export interface FindCursor {
  readonly matches: readonly FindMatch[];
  readonly matchCount: number;
  /** 1-based; 0 when there are no matches. */
  readonly matchIndex: number;
}

export interface FindPart {
  readonly text: string;
  readonly mark: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. SNAPSHOT INDEX
// ───────────────────────────────────────────────────────────────────

// Map a source block onto the virtual row that currently projects it.
export function rowIndexForSourceBlock(
  renderItems: readonly RenderItem[],
  sourceBlockId: string,
): number {
  return renderItems.findIndex((item) => {
    if (item.kind === 'block') return item.block.sourceBlockId === sourceBlockId;
    if (item.kind === 'actions') return item.sourceBlockId === sourceBlockId;
    if (item.kind === 'activity' || item.kind === 'inbound-stack') {
      return item.blocks.some((block) => block.sourceBlockId === sourceBlockId);
    }
    return false;
  });
}

// Pull the host-supplied searchable text for one block; never invent fields.
function blockSearchText(block: DisplayTranscriptBlock): { readonly role: SearchRole; readonly text: string } | null {
  switch (block.kind) {
    case 'text':
      return { role: block.role === 'user' ? 'user' : 'assistant', text: block.text };
    case 'text_artifact':
      return { role: 'assistant', text: block.source };
    case 'thinking':
      return { role: 'assistant', text: block.summary };
    case 'plan':
      return { role: 'assistant', text: block.items.map((item) => item.text).join('\n') };
    case 'tool_call':
      return { role: 'tool', text: `${block.toolName}\n${block.inputSummary}` };
    case 'tool_result':
      return { role: 'tool', text: `${block.toolName}\n${block.output}` };
    case 'file_diff':
    case 'file_preview':
      return { role: 'assistant', text: block.kind };
    case 'usage':
      return { role: 'tool', text: 'Usage' };
    case 'attachment':
      return { role: 'user', text: `Photo ${block.ordinal}` };
    case 'inbound_image':
      return { role: 'assistant', text: block.displayName };
    case 'ask-question':
      return { role: 'assistant', text: 'Question' };
    case 'unknown':
      return { role: 'assistant', text: block.originalKind };
  }
}

// Lowercase each line once per snapshot so keystrokes only lowercase the query.
export function buildTranscriptFindIndex(
  blocks: readonly DisplayTranscriptBlock[],
  renderItems: readonly RenderItem[],
): TranscriptFindIndex {
  const snippets: SearchSnippet[] = [];
  for (const block of blocks) {
    const extracted = blockSearchText(block);
    if (extracted === null || extracted.text.length === 0) continue;
    const rowIndex = rowIndexForSourceBlock(renderItems, block.id);
    if (rowIndex < 0) continue;
    const lines = extracted.text.split(/\r?\n/u);
    for (const line of lines) {
      if (line.length === 0) continue;
      snippets.push({
        role: extracted.role,
        text: line,
        haystack: line.toLocaleLowerCase(),
        rowIndex,
        sourceBlockId: block.id,
      });
    }
  }
  return { snippets };
}

// ───────────────────────────────────────────────────────────────────
// 4. MATCHING AND CURSOR
// ───────────────────────────────────────────────────────────────────

export function matchFindQuery(index: TranscriptFindIndex, query: string): readonly FindMatch[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length === 0) return [];
  const matches: FindMatch[] = [];
  index.snippets.forEach((snippet, snippetIndex) => {
    let cursor = 0;
    let found = snippet.haystack.indexOf(needle, cursor);
    while (found >= 0) {
      matches.push({
        snippetIndex,
        start: found,
        end: found + needle.length,
      });
      cursor = found + needle.length;
      found = snippet.haystack.indexOf(needle, cursor);
    }
  });
  return matches;
}

export function createFindCursor(matches: readonly FindMatch[]): FindCursor {
  return {
    matches,
    matchCount: matches.length,
    matchIndex: matches.length > 0 ? 1 : 0,
  };
}

export function nextFindMatch(cursor: FindCursor): FindCursor {
  if (cursor.matchCount === 0) return cursor;
  const nextIndex = cursor.matchIndex === cursor.matchCount ? 1 : cursor.matchIndex + 1;
  return { ...cursor, matchIndex: nextIndex };
}

export function prevFindMatch(cursor: FindCursor): FindCursor {
  if (cursor.matchCount === 0) return cursor;
  const prevIndex = cursor.matchIndex <= 1 ? cursor.matchCount : cursor.matchIndex - 1;
  return { ...cursor, matchIndex: prevIndex };
}

export function currentFindMatch(cursor: FindCursor): FindMatch | null {
  if (cursor.matchCount === 0 || cursor.matchIndex < 1) return null;
  return cursor.matches[cursor.matchIndex - 1] ?? null;
}

// Split display text into inert highlight parts using the same <mark> primitive
// the artifact previews already render.
export function findParts(text: string, findTerm: string): readonly FindPart[] {
  if (findTerm.trim().length === 0) return [{ text, mark: false }];
  const needle = findTerm.toLocaleLowerCase();
  const source = text.toLocaleLowerCase();
  const parts: FindPart[] = [];
  let cursor = 0;
  let match = source.indexOf(needle, cursor);
  while (match >= 0) {
    if (match > cursor) parts.push({ text: text.slice(cursor, match), mark: false });
    parts.push({ text: text.slice(match, match + findTerm.length), mark: true });
    cursor = match + findTerm.length;
    match = source.indexOf(needle, cursor);
  }
  if (cursor === 0) return [{ text, mark: false }];
  if (cursor < text.length) parts.push({ text: text.slice(cursor), mark: false });
  return parts;
}
