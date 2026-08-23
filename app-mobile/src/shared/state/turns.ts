// ───────────────────────────────────────────────────────────────────
// MODULE: Derived Conversational Turns
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface BlockLike {
  readonly kind: string;
  readonly id: string;
  readonly role?: 'user' | 'assistant';
}

export interface Turn<T extends BlockLike = TranscriptBlock> {
  /** Stable key derived from the first block's id; survives revision updates. */
  readonly key: string;
  /** The user prompt that opened the turn, or null for leading/orphan evidence. */
  readonly prompt: T | null;
  /** Every block in the turn, in original order (including the prompt). */
  readonly blocks: readonly T[];
}

// ───────────────────────────────────────────────────────────────────
// 3. TURN GROUPING
// ───────────────────────────────────────────────────────────────────

/**
 * Group an ordered, already-normalized block list into conversational turns without
 * Mutating, renumbering, reprojecting, or dropping any block. A turn opens at each user
 * Text block and gathers the following assistant text and typed evidence until the next
 * User block. Leading or orphan evidence forms a synthetic prompt-less turn. Keys derive
 * From constituent ids so a streaming revision replacement keeps the same turn.
 */
export function groupBlocksIntoTurns<T extends BlockLike>(
  blocks: readonly T[],
): readonly Turn<T>[] {
  const turns: Turn<T>[] = [];
  let prompt: T | null = null;
  let bucket: T[] = [];

  const flush = (): void => {
    const first = bucket[0];
    if (first !== undefined) {
      turns.push({ key: `turn_${first.id}`, prompt, blocks: bucket });
    }
  };

  for (const block of blocks) {
    if (isUserText(block)) {
      flush();
      prompt = block;
      bucket = [block];
    } else if (bucket.length === 0) {
      // Evidence before any user prompt becomes a synthetic prompt-less turn.
      prompt = null;
      bucket = [block];
    } else {
      bucket.push(block);
    }
  }
  flush();
  return turns;
}

function isUserText(block: BlockLike): boolean {
  return block.kind === 'text' && block.role === 'user';
}
