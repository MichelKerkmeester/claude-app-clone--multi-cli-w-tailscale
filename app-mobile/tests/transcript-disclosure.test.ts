import { afterEach, describe, expect, it } from 'vitest';

import {
  getTranscriptDisclosureState,
  pruneTranscriptDisclosureState,
} from '../src/shared/state/transcript-disclosure.svelte.js';

afterEach(() => {
  pruneTranscriptDisclosureState([]);
});

describe('transcript disclosure state', () => {
  it('keeps expansion when a block row unmounts and remounts', () => {
    const blockId = 'block_disclosure_remount_001';
    const firstMount = getTranscriptDisclosureState(blockId);

    expect(firstMount.open).toBe(false);
    firstMount.open = true;

    // Virtualization removes the component, while the protocol block remains in the transcript.
    const remount = getTranscriptDisclosureState(blockId);
    expect(remount.open).toBe(true);

    pruneTranscriptDisclosureState([]);
    expect(getTranscriptDisclosureState(blockId).open).toBe(false);
  });
});
