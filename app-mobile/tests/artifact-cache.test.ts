import { afterEach, describe, expect, it } from 'vitest';

import { loadCache, saveCache, stripArtifactResourceState } from '../src/shared/transport/cache.js';
import { EMPTY_TRANSCRIPT } from '../src/shared/state/state.js';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

afterEach(() => {
  localStorage.clear();
});

describe('artifact cache boundary', () => {
  it('strips live bytes, object URLs, and non-durable resource state recursively', () => {
    expect(
      stripArtifactResourceState({
        keep: 'metadata',
        artifactId: 'not-persisted-by-cache',
        bytes: [1, 2, 3],
        objectUrl: 'blob:artifact',
        resourceState: { status: 'ready', buffer: 'pixels' },
        nested: { url: 'blob:nested', width: 320 },
      }),
    ).toEqual({
      keep: 'metadata',
      artifactId: 'not-persisted-by-cache',
      nested: { width: 320 },
    });
  });

  it('persists only safe artifact metadata and no resource bytes or URLs', () => {
    const session: SessionCardDto = {
      id: 'session_cache_boundary_001',
      status: 'idle',
      updatedAt: '2026-08-17T10:00:00.000Z',
      messageCount: 1,
    };
    const liveBlock = {
      kind: 'unknown',
      originalKind: 'inbound_image',
      id: 'block_cache_boundary_001',
      revision: 1,
      seq: 1,
      occurredAt: '2026-08-17T10:00:00.000Z',
      raw: {
        bytes: 'PIXELS',
        objectUrl: 'blob:artifact',
        resourceState: 'ready',
      },
    } as never;
    saveCache([session], {
      ...EMPTY_TRANSCRIPT,
      sessionId: session.id,
      source: 'relay',
      blocks: [liveBlock],
    });
    const serialized = localStorage.getItem('pi-remote.read-only.v1') ?? '';
    expect(serialized).not.toContain('PIXELS');
    expect(serialized).not.toContain('blob:artifact');
    expect(serialized).not.toContain('objectUrl');
    expect(loadCache()?.transcripts[0]).toBeDefined();
  });
});
