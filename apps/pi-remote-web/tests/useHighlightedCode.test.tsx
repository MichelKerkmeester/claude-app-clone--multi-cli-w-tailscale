import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getHighlightResourceStats,
  HIGHLIGHT_MAX_CHARS,
  HIGHLIGHT_MAX_LINES,
  hashCanonicalSource,
  highlightEligibility,
  useHighlightedCode,
} from '../src/rich-content/useHighlightedCode.js';

interface WorkerMessage {
  readonly source: string;
  readonly language: string;
  readonly theme: string;
  readonly contentHash: string;
  readonly requestId: string;
  readonly revisionId: string;
}

class ControlledWorker {
  public static readonly instances: ControlledWorker[] = [];

  public onmessage: ((event: MessageEvent<unknown>) => void) | null = null;

  public onerror: ((event: ErrorEvent) => void) | null = null;

  public readonly messages: WorkerMessage[] = [];

  public readonly terminate = vi.fn();

  public constructor(...args: unknown[]) {
    void args;
    ControlledWorker.instances.push(this);
  }

  public postMessage(message: unknown): void {
    this.messages.push(message as WorkerMessage);
  }

  public emit(response: unknown): void {
    this.onmessage?.({ data: response } as MessageEvent<unknown>);
  }

  public fail(): void {
    this.onerror?.(new ErrorEvent('highlight failed'));
  }
}

afterEach(() => {
  cleanup();
  ControlledWorker.instances.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useHighlightedCode', () => {
  it('shows plaintext first, sends only bounded redacted fields, and accepts a matching response', async () => {
    vi.stubGlobal('Worker', ControlledWorker);
    const source = 'const redacted = "safe";';
    const hook = renderHook(() =>
      useHighlightedCode({
        source,
        language: 'typescript',
        revision: 7,
        theme: 'dark',
      }),
    );

    expect(hook.result.current.tokens).toBeNull();
    await waitFor(() => expect(hook.result.current.status).toBe('pending'));
    const worker = ControlledWorker.instances[0];
    expect(worker).toBeDefined();
    const message = worker?.messages[0];
    expect(message).toBeDefined();
    expect(Object.keys(message ?? {}).sort()).toEqual([
      'contentHash',
      'language',
      'requestId',
      'revisionId',
      'source',
      'theme',
    ]);
    expect(message?.source).toBe(source);
    expect(message?.language).toBe('typescript');
    expect(message?.theme).toBe('dark');
    expect(message?.contentHash).toBe(hashCanonicalSource(source));
    expect(message?.revisionId).toBe('7');

    act(() => {
      worker?.emit({
        tokens: [
          { text: 'const', kind: 'keyword' },
          { text: ' redacted = ', kind: 'plain' },
          { text: '"safe"', kind: 'string' },
          { text: ';', kind: 'plain' },
        ],
        contentHash: message?.contentHash,
        requestId: message?.requestId,
        revisionId: message?.revisionId,
      });
    });

    await waitFor(() => expect(hook.result.current.status).toBe('highlighted'));
    expect(hook.result.current.tokens?.map((token) => token.text).join('')).toBe(source);
    expect(worker?.terminate).toHaveBeenCalledTimes(1);
    expect(getHighlightResourceStats()).toEqual({
      activeWorkers: 0,
      pendingRequests: 0,
      retainedHighlightSets: 0,
    });
  });

  it('ignores a stale response after a newer revision starts', async () => {
    vi.stubGlobal('Worker', ControlledWorker);
    const hook = renderHook(
      ({ source, revision }: { readonly source: string; readonly revision: number }) =>
        useHighlightedCode({ source, language: 'javascript', revision }),
      { initialProps: { source: 'return old;', revision: 1 } },
    );
    await waitFor(() => expect(hook.result.current.status).toBe('pending'));
    const oldWorker = ControlledWorker.instances[0];
    const oldMessage = oldWorker?.messages[0];
    expect(oldMessage).toBeDefined();

    hook.rerender({ source: 'return new;', revision: 2 });
    const newWorker = ControlledWorker.instances[1];
    const newMessage = newWorker?.messages[0];
    expect(newMessage).toBeDefined();

    act(() => {
      oldWorker?.emit({
        tokens: [{ text: 'return old;', kind: 'keyword' }],
        contentHash: oldMessage?.contentHash,
        requestId: oldMessage?.requestId,
        revisionId: oldMessage?.revisionId,
      });
    });
    expect(hook.result.current.revisionId).toBe('2');
    expect(hook.result.current.tokens).toBeNull();

    act(() => {
      newWorker?.emit({
        tokens: [{ text: 'return new;', kind: 'keyword' }],
        contentHash: newMessage?.contentHash,
        requestId: newMessage?.requestId,
        revisionId: newMessage?.revisionId,
      });
    });
    await waitFor(() => expect(hook.result.current.status).toBe('highlighted'));
    expect(hook.result.current.tokens?.[0]?.text).toBe('return new;');
  });

  it('never dispatches oversized or unsupported input', async () => {
    vi.stubGlobal('Worker', ControlledWorker);
    const oversized = 'x'.repeat(HIGHLIGHT_MAX_CHARS + 1);
    const tooManyLines = Array.from({ length: HIGHLIGHT_MAX_LINES + 1 }, () => 'x').join('\n');
    expect(highlightEligibility(oversized, 'typescript')).toBe('character-cutoff');
    expect(highlightEligibility(tooManyLines, 'typescript')).toBe('line-cutoff');
    expect(highlightEligibility('safe', 'unknown-language')).toBe('unsupported-language');

    const first = renderHook(() =>
      useHighlightedCode({ source: oversized, language: 'typescript', revision: 1 }),
    );
    const second = renderHook(() =>
      useHighlightedCode({ source: tooManyLines, language: 'typescript', revision: 1 }),
    );
    const third = renderHook(() =>
      useHighlightedCode({ source: 'safe', language: 'unknown-language', revision: 1 }),
    );
    await waitFor(() => {
      expect(first.result.current.status).toBe('skipped');
      expect(second.result.current.status).toBe('skipped');
      expect(third.result.current.status).toBe('skipped');
    });
    expect(ControlledWorker.instances).toHaveLength(0);
    expect(first.result.current.tokens).toBeNull();
    expect(second.result.current.tokens).toBeNull();
    expect(third.result.current.tokens).toBeNull();
  });

  it('terminates workers and clears pending resources on unmount or failure', async () => {
    vi.stubGlobal('Worker', ControlledWorker);
    const hook = renderHook(() =>
      useHighlightedCode({ source: 'const value = 1;', language: 'typescript', revision: 1 }),
    );
    await waitFor(() => expect(hook.result.current.status).toBe('pending'));
    const worker = ControlledWorker.instances[0];
    worker?.fail();
    await waitFor(() => expect(hook.result.current.status).toBe('failed'));
    expect(worker?.terminate).toHaveBeenCalledTimes(1);
    hook.unmount();
    expect(getHighlightResourceStats()).toEqual({
      activeWorkers: 0,
      pendingRequests: 0,
      retainedHighlightSets: 0,
    });
  });

  it('does not grow worker or pending-resource counts across repeated large-block cycles', async () => {
    vi.stubGlobal('Worker', ControlledWorker);
    const source = `${'const retained = "redacted";\n'.repeat(400)}tail`;

    for (let iteration = 0; iteration < 12; iteration += 1) {
      const hook = renderHook(() =>
        useHighlightedCode({
          source,
          language: 'typescript',
          revision: iteration + 1,
        }),
      );
      await waitFor(() => expect(hook.result.current.status).toBe('pending'));
      hook.unmount();
      expect(getHighlightResourceStats()).toEqual({
        activeWorkers: 0,
        pendingRequests: 0,
        retainedHighlightSets: 0,
      });
    }
  });
});
