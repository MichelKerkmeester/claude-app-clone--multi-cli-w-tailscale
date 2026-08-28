// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript disclosure state
// ───────────────────────────────────────────────────────────────────

import { SvelteMap } from 'svelte/reactivity';

// Disclosure at block id because virtualized rows remount across viewport churn.
const openByBlockId = new SvelteMap<string, boolean>();

export interface TranscriptDisclosureState {
  open: boolean;
}

// Thinking content is readable on first paint, while explicit user toggles still persist.
export function openTranscriptDisclosureByDefault(blockId: string | undefined): void {
  if (blockId === undefined || openByBlockId.has(blockId)) return;
  openByBlockId.set(blockId, true);
}

export function getTranscriptDisclosureState(
  blockId: string | undefined,
): TranscriptDisclosureState {
  let unkeyedOpen = false;
  return createTranscriptDisclosureBinding(() => blockId, {
    get open(): boolean {
      return unkeyedOpen;
    },
    set open(value: boolean) {
      unkeyedOpen = value;
    },
  });
}

export function createTranscriptDisclosureBinding(
  getBlockId: () => string | undefined,
  unkeyedState: TranscriptDisclosureState = { open: false },
): TranscriptDisclosureState {
  return {
    get open(): boolean {
      const blockId = getBlockId();
      return blockId === undefined ? unkeyedState.open : openByBlockId.get(blockId) === true;
    },
    set open(value: boolean) {
      const blockId = getBlockId();
      if (blockId === undefined) unkeyedState.open = value;
      else openByBlockId.set(blockId, value);
    },
  };
}

export function pruneTranscriptDisclosureState(blockIds: Iterable<string>): void {
  const retainedBlockIds = new Set(blockIds);
  for (const blockId of openByBlockId.keys()) {
    if (!retainedBlockIds.has(blockId)) openByBlockId.delete(blockId);
  }
}
