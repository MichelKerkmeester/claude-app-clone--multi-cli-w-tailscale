import { isTranscriptBlock, isTranscriptPageDto } from '@pi-remote/pi-rpc-protocol';
import { afterEach, describe, expect, it } from 'vitest';

import { demoPostJson } from '../src/shared/data/demo.js';

const ORIGINAL_URL = window.location.href;

afterEach(() => {
  window.history.replaceState({}, '', ORIGINAL_URL);
});

describe('rich-release demo fixture', () => {
  it('returns a protocol-valid transcript page for the release matrix', () => {
    window.history.replaceState({}, '', '/?demo=1&fixture=rich-release');

    const page = demoPostJson('/api/sessions/demo-session-refactor/transcript', {
      after: 0,
      limit: 100,
    });

    const items = (page as { items?: unknown[] }).items ?? [];
    const invalidIndex = items.findIndex((item) => !isTranscriptBlock(item));
    if (invalidIndex !== -1) throw new Error(JSON.stringify(items[invalidIndex]));
    expect(invalidIndex).toBe(-1);
    expect(isTranscriptPageDto(page)).toBe(true);
    expect(page).toMatchObject({
      sessionId: 'demo-session-refactor',
      nextSeq: null,
    });
  });
});
