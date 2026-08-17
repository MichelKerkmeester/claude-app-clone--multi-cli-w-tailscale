import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FilePreviewBlock, SessionCardDto } from '@pi-remote/pi-rpc-protocol';

import { loadCache, saveCache } from '../src/cache.js';
import { EMPTY_TRANSCRIPT } from '../src/state.js';
import { PlanReadyCard } from '../src/PlanReadyCard.js';
import { PlanReviewSheet } from '../src/PlanReviewSheet.js';

const SERVICE_WORKER = readFileSync('apps/pi-remote-web/public/service-worker.js', 'utf8');
const MANIFEST = JSON.parse(
  readFileSync('apps/pi-remote-web/public/manifest.webmanifest', 'utf8'),
) as {
  readonly display: string;
  readonly orientation: string;
};

const SESSION: SessionCardDto = {
  id: 'session_cache_001',
  status: 'idle',
  updatedAt: '2026-01-01T00:00:00.000Z',
  messageCount: 1,
};

const ARTIFACT = {
  planId: 'plan_cache_001',
  planRevision: 2,
  title: 'Cached plan history',
  summary: 'History remains readable but cannot become authority.',
  stepCount: 2,
  approachCount: 1,
  validity: 'valid' as const,
  occurredAt: '2026-01-01T00:00:00.000Z',
};

const FILE_PREVIEW: FilePreviewBlock = {
  id: 'block_cache_preview_001',
  revision: 'rev_cache_001',
  seq: 2,
  occurredAt: '2026-01-01T00:00:00.000Z',
  kind: 'file_preview',
  artifactId: 'artifact_cache_001',
  displayName: 'safe.txt',
  renderer: 'text',
  mimeType: 'text/plain',
  byteLength: 18,
  digest: 'a'.repeat(64),
  redaction: 'applied',
  completeness: 'complete',
  shareAllowed: false,
  availability: 'ready',
  content: { kind: 'inline-text', text: 'CACHE_ARTIFACT_SECRET' },
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('PWA shell and history-only cache boundary', () => {
  it('keeps standalone rotation enabled and caches only shell/static requests', () => {
    expect(MANIFEST.display).toBe('standalone');
    expect(MANIFEST.orientation).toBe('any');
    expect(SERVICE_WORKER).toContain("const CACHE_NAME = 'pi-remote-shell-v3'");
    expect(SERVICE_WORKER).toContain("cache: 'no-store'");
    expect(SERVICE_WORKER).toContain('function isShellRequest');
    expect(SERVICE_WORKER).toContain('if (!isShellRequest(url))');
    expect(SERVICE_WORKER).not.toContain('cache.put(request');
    expect(SERVICE_WORKER).toContain("url.pathname.startsWith('/assets/')");
    expect(SERVICE_WORKER).toContain("url.pathname.startsWith('/fonts/')");
    expect(SERVICE_WORKER).toContain('function isArtifactRequest');
  });

  it('fetches exact artifact routes network-only and never opens Cache Storage', async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const cacheOpen = vi.fn();
    const fetchSpy = vi.fn(async (request: Request) => {
      expect(request.cache).toBe('no-store');
      return new Response('safe artifact bytes', { status: 200 });
    });
    const context = {
      Request,
      URL,
      Promise,
      Response,
      fetch: fetchSpy,
      caches: { open: cacheOpen, keys: vi.fn(), match: vi.fn(), delete: vi.fn() },
      self: {
        location: { origin: 'https://pi-remote.example.test' },
        addEventListener: (type: string, listener: (event: unknown) => void) => {
          listeners.set(type, listener);
        },
        skipWaiting: vi.fn(),
        clients: { claim: vi.fn(), matchAll: vi.fn(), openWindow: vi.fn() },
        registration: { showNotification: vi.fn() },
      },
    };
    runInNewContext(SERVICE_WORKER, context);
    const event: { readonly request: Request; response?: Promise<Response>; respondWith: (value: Promise<Response>) => void } = {
      request: new Request(
        'https://pi-remote.example.test/api/sessions/session_local/artifacts/artifact_001/revisions/rev_001',
        { method: 'GET' },
      ),
      respondWith(value) {
        this.response = value;
      },
    };
    listeners.get('fetch')?.(event);
    expect(await event.response).toBeInstanceOf(Response);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(cacheOpen).not.toHaveBeenCalled();
  });

  it('does not expose a stale token or authority field from persisted history', () => {
    const staleToken = 'token_should_not_escape_history';
    localStorage.setItem(
      'pi-remote.read-only.v1',
      JSON.stringify({
        savedAt: new Date().toISOString(),
        sessions: [SESSION],
        transcripts: [],
        planToken: staleToken,
        confirmedMode: 'build',
      }),
    );

    const cache = loadCache();
    expect(cache).not.toBeNull();
    expect(JSON.stringify(cache)).not.toContain(staleToken);
    expect(JSON.stringify(cache)).not.toMatch(/planToken|confirmedMode/u);

    saveCache([SESSION], {
      ...EMPTY_TRANSCRIPT,
      sessionId: SESSION.id,
      source: 'relay',
      epoch: 'epoch_cache_001',
    });
    expect(localStorage.getItem('pi-remote.read-only.v1')).not.toMatch(/planToken|confirmedMode/u);
  });

  it('strips inline artifact bodies and exact artifact references before persistence', () => {
    saveCache([SESSION], {
      ...EMPTY_TRANSCRIPT,
      sessionId: SESSION.id,
      source: 'relay',
      epoch: 'epoch_cache_001',
      coversThrough: FILE_PREVIEW.seq,
      blocks: [FILE_PREVIEW],
    });
    const serialized = localStorage.getItem('pi-remote.read-only.v1') ?? '';
    expect(serialized).not.toContain('CACHE_ARTIFACT_SECRET');
    expect(serialized).not.toContain(FILE_PREVIEW.artifactId);
    expect(loadCache()?.transcripts[0]?.blocks).toEqual([]);
  });

  it('renders no review control from cached plan history and no Execute without live artifact authority', () => {
    render(<PlanReadyCard artifact={ARTIFACT} isLive={false} onReview={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /review plan/i })).not.toBeInTheDocument();

    render(
      <PlanReviewSheet
        isOpen
        artifact={null}
        onOpenChange={vi.fn()}
        onKeepPlanning={vi.fn()}
        onRevisePlan={vi.fn()}
        onLeaveWithoutRunning={vi.fn()}
        onExecuteReviewedPlan={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /execute/i })).not.toBeInTheDocument();
  });
});
