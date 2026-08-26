// ───────────────────────────────────────────────────────────────────
// MODULE: Tool Run Pairing
// ───────────────────────────────────────────────────────────────────

// Project consecutive activity blocks into call↔result runs. A call with no
// result is in-flight; grouping stays a view over host blocks.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { NormalizedActivityBlock } from '../rich-content/normalize-transcript-blocks.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface ToolRun {
  readonly id: string;
  readonly toolName: string;
  readonly summary: string;
  readonly inFlight: boolean;
  readonly callBlock: NormalizedActivityBlock | null;
  readonly resultBlock: NormalizedActivityBlock | null;
  readonly blocks: readonly NormalizedActivityBlock[];
}

// ───────────────────────────────────────────────────────────────────
// 3. PAIRING
// ───────────────────────────────────────────────────────────────────

function toolNameOf(block: NormalizedActivityBlock): string {
  const source = block.sourceBlock;
  if (source.kind === 'tool_call' || source.kind === 'tool_result') return source.toolName;
  if (source.kind === 'thinking') return 'Thinking';
  if (source.kind === 'usage') return 'Usage';
  return 'Activity';
}

function summaryOf(block: NormalizedActivityBlock): string {
  const source = block.sourceBlock;
  if (source.kind === 'tool_call') return source.toolName;
  if (source.kind === 'tool_result') return source.toolName;
  if (source.kind === 'thinking') return 'Thinking';
  if (source.kind === 'usage') return 'Usage';
  return 'Activity';
}

// Pair each tool_call with the next unmatched tool_result of the same name.
export function pairActivityRuns(blocks: readonly NormalizedActivityBlock[]): readonly ToolRun[] {
  const runs: ToolRun[] = [];
  const consumed = new Set<string>();

  blocks.forEach((block, index) => {
    if (consumed.has(block.blockId)) return;
    const source = block.sourceBlock;

    if (source.kind === 'tool_call') {
      let result: NormalizedActivityBlock | null = null;
      for (let cursor = index + 1; cursor < blocks.length; cursor += 1) {
        const candidate = blocks[cursor];
        if (candidate === undefined || consumed.has(candidate.blockId)) continue;
        if (
          candidate.sourceBlock.kind === 'tool_result' &&
          candidate.sourceBlock.toolName === source.toolName
        ) {
          result = candidate;
          break;
        }
        if (candidate.sourceBlock.kind === 'tool_call') break;
      }
      if (result !== null) consumed.add(result.blockId);
      consumed.add(block.blockId);
      const paired = result === null ? [block] : [block, result];
      runs.push({
        id: block.blockId,
        toolName: source.toolName,
        summary: source.toolName,
        inFlight: result === null,
        callBlock: block,
        resultBlock: result,
        blocks: paired,
      });
      return;
    }

    if (source.kind === 'tool_result') {
      consumed.add(block.blockId);
      runs.push({
        id: block.blockId,
        toolName: source.toolName,
        summary: source.toolName,
        inFlight: false,
        callBlock: null,
        resultBlock: block,
        blocks: [block],
      });
      return;
    }

    consumed.add(block.blockId);
    runs.push({
      id: block.blockId,
      toolName: toolNameOf(block),
      summary: summaryOf(block),
      inFlight: false,
      callBlock: null,
      resultBlock: null,
      blocks: [block],
    });
  });

  return runs;
}
