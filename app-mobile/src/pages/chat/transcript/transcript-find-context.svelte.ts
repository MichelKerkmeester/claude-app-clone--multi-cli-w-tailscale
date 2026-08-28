// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Find Context
// ───────────────────────────────────────────────────────────────────

import { getContext, setContext } from 'svelte';

const FIND_CONTEXT_KEY = Symbol('transcript-find');

export interface TranscriptFindContext {
  term: string;
  open: boolean;
}

const EMPTY_FIND: TranscriptFindContext = { term: '', open: false };

export function setTranscriptFindContext(ctx: TranscriptFindContext): void {
  setContext(FIND_CONTEXT_KEY, ctx);
}

export function getTranscriptFindContext(): TranscriptFindContext {
  return getContext<TranscriptFindContext | undefined>(FIND_CONTEXT_KEY) ?? EMPTY_FIND;
}
