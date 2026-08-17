import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

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
