// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  type NormalizedActivityBlock,
  type NormalizedFallbackBlock,
  type NormalizedTranscriptBlock,
} from '../rich-content/normalizeTranscriptBlocks.js';
import { type DisplayTranscriptBlock, type TodoProjectionState } from '$shared/state/state.js';
import { groupBlocksIntoTurns } from '$shared/state/turns.js';

// ───────────────────────────────────────────────────────────────────
// 2. RENDER ITEM MODEL
// ───────────────────────────────────────────────────────────────────

export type RenderItem =
  | { readonly kind: 'todo'; readonly id: string; readonly state: TodoProjectionState }
  | { readonly kind: 'block'; readonly id: string; readonly block: NormalizedTranscriptBlock }
  | {
      readonly kind: 'activity';
      readonly id: string;
      readonly blocks: readonly NormalizedActivityBlock[];
    }
  | {
      readonly kind: 'inbound-stack';
      readonly id: string;
      readonly blocks: readonly NormalizedFallbackBlock[];
    }
  | {
      readonly kind: 'actions';
      readonly id: string;
      readonly sourceBlockId: string;
      readonly text: string;
    };

// ───────────────────────────────────────────────────────────────────
// 3. SEQUENCE GROUPING
// ───────────────────────────────────────────────────────────────────

export function groupNormalizedSequence(blocks: readonly NormalizedTranscriptBlock[]): RenderItem[] {
  const items: RenderItem[] = [];
  let run: NormalizedActivityBlock[] = [];
  let imageRun: NormalizedFallbackBlock[] = [];
  const flushActivity = () => {
    const first = run[0];
    if (first !== undefined) {
      items.push({ kind: 'activity', id: `activity-${first.blockId}`, blocks: run });
    }
    run = [];
  };
  const flushImages = () => {
    const first = imageRun[0];
    if (first !== undefined) {
      items.push({ kind: 'inbound-stack', id: `inbound-stack-${first.blockId}`, blocks: imageRun });
    }
    imageRun = [];
  };
  for (const block of blocks) {
    if (block.kind === 'activity') {
      flushImages();
      run.push(block);
    } else if (isInboundImageFallback(block)) {
      flushActivity();
      imageRun.push(block);
    } else {
      flushImages();
      flushActivity();
      items.push({ kind: 'block', id: block.blockId, block });
    }
  }
  flushImages();
  flushActivity();
  return items;
}

export function isInboundImageFallback(
  block: NormalizedTranscriptBlock,
): block is NormalizedFallbackBlock & {
  readonly sourceBlock: NormalizedFallbackBlock['sourceBlock'] & { readonly kind: 'inbound_image' };
} {
  return block.kind === 'fallback' && block.sourceBlock.kind === 'inbound_image';
}

// ───────────────────────────────────────────────────────────────────
// 4. TURN-AWARE GROUPING
// ───────────────────────────────────────────────────────────────────

export function groupNormalizedTranscript(
  blocks: readonly NormalizedTranscriptBlock[],
  sourceBlocks: readonly DisplayTranscriptBlock[],
): RenderItem[] {
  const turns = groupBlocksIntoTurns(sourceBlocks);
  if (turns.length === 0) return groupNormalizedSequence(blocks);
  const turnIndexes = new Map<string, number>();
  turns.forEach((turn, index) => {
    turn.blocks.forEach((block) => turnIndexes.set(block.id, index));
  });
  const buckets = turns.map(() => [] as NormalizedTranscriptBlock[]);
  const unassigned: NormalizedTranscriptBlock[] = [];
  for (const block of blocks) {
    const index = turnIndexes.get(block.sourceBlockId);
    if (index === undefined) unassigned.push(block);
    else buckets[index]?.push(block);
  }
  const items: RenderItem[] = [];
  turns.forEach((turn, index) => {
    items.push(...groupNormalizedSequence(buckets[index] ?? []));
    const answer = turn.blocks
      .filter((block) => block.kind === 'text' && block.role === 'assistant')
      .map((block) => (block.kind === 'text' ? block.text : null))
      .filter((text): text is string => text !== null)
      .join('\n\n');
    const lastBlock = turn.blocks.at(-1);
    if (answer.length > 0 && lastBlock !== undefined) {
      items.push({
        kind: 'actions',
        id: `actions-${turn.key}`,
        sourceBlockId: lastBlock.id,
        text: answer,
      });
    }
  });
  if (unassigned.length > 0) items.push(...groupNormalizedSequence(unassigned));
  return items;
}

// ───────────────────────────────────────────────────────────────────
// 5. TODO PROJECTION INSERTION
// ───────────────────────────────────────────────────────────────────

export function insertTodoProjectionItem(
  items: readonly RenderItem[],
  sourceBlocks: readonly DisplayTranscriptBlock[],
  state: TodoProjectionState,
): RenderItem[] {
  if (state.availability !== 'available' || state.projection === null) return [...items];
  const todoItem: RenderItem = {
    kind: 'todo',
    id: `todo-${state.projection.planId}`,
    state,
  };
  const anchorSeq = state.anchorSeq ?? Number.POSITIVE_INFINITY;
  const seqById = new Map(sourceBlocks.map((block) => [block.id, block.seq]));
  const result: RenderItem[] = [];
  let inserted = false;
  for (const item of items) {
    if (item.kind === 'todo') continue;
    if (item.kind === 'activity') {
      const before = item.blocks.filter((block) => block.sourceBlock.seq <= anchorSeq);
      const after = item.blocks.filter((block) => block.sourceBlock.seq > anchorSeq);
      if (!inserted && before.length > 0 && after.length > 0) {
        result.push({ ...item, id: `${item.id}-before-todo`, blocks: before });
        result.push(todoItem);
        result.push({ ...item, id: `${item.id}-after-todo`, blocks: after });
        inserted = true;
        continue;
      }
    }
    if (item.kind === 'inbound-stack') {
      const before = item.blocks.filter((block) => block.sourceBlock.seq <= anchorSeq);
      const after = item.blocks.filter((block) => block.sourceBlock.seq > anchorSeq);
      if (!inserted && before.length > 0 && after.length > 0) {
        result.push({ ...item, id: `${item.id}-before-todo`, blocks: before });
        result.push(todoItem);
        result.push({ ...item, id: `${item.id}-after-todo`, blocks: after });
        inserted = true;
        continue;
      }
    }
    const itemSeq =
      item.kind === 'block'
        ? item.block.sourceBlock.seq
        : item.kind === 'actions'
          ? (seqById.get(item.sourceBlockId) ?? 0)
          : (item.blocks[0]?.sourceBlock.seq ?? 0);
    if (!inserted && itemSeq > anchorSeq) {
      result.push(todoItem);
      inserted = true;
    }
    result.push(item);
  }
  if (!inserted) result.push(todoItem);
  return result;
}

// ───────────────────────────────────────────────────────────────────
// 6. ACTIVITY SUMMARY LABELS
// ───────────────────────────────────────────────────────────────────

export function normalizedActivitySummary(blocks: readonly NormalizedActivityBlock[]): string {
  const tools = blocks.filter((block) => block.sourceBlock.kind === 'tool_call').length;
  if (tools > 0) return `Worked · ${tools} tool${tools === 1 ? '' : 's'}`;
  if (blocks.some((block) => block.sourceBlock.kind === 'thinking')) return 'Thinking';
  if (blocks.some((block) => block.sourceBlock.kind === 'usage')) return 'Usage';
  return 'Activity';
}
