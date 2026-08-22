// Port of app-mobile/tests/useHighlightedCode.test.tsx (React behavior oracle)
// to @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle. The React renderHook probe is
// replaced by HighlightedCodeProbe.svelte, which mounts the runes factory
// inside a real component <script> and projects the HighlightState (status,
// tokens, revisionId) into the DOM. The factory uses $state/$effect, so the
// harness pattern (option b) is used. The ControlledWorker stub and
// getHighlightResourceStats / highlightEligibility / hashCanonicalSource
// pure-helper assertions are ported verbatim. React act() calls are replaced
// by await tick() / waitFor to flush Svelte's reactive updates.

import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getHighlightResourceStats,
  HIGHLIGHT_MAX_CHARS,
  HIGHLIGHT_MAX_LINES,
  hashCanonicalSource,
  highlightEligibility,
} from '../src/pages/chat/rich-content/useHighlightedCode.svelte.js';

import HighlightedCodeProbe from './support/HighlightedCodeProbe.svelte';

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
    render(HighlightedCodeProbe, {
      props: { source, language: 'typescript', revision: 7, theme: 'dark' },
    });

    expect(screen.getByTestId('tokens').textContent).toBe('');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'));
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

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('highlighted'));
    expect(screen.getByTestId('tokens')).toHaveTextContent(source);
    expect(worker?.terminate).toHaveBeenCalledTimes(1);
    expect(getHighlightResourceStats()).toEqual({
      activeWorkers: 0,
      pendingRequests: 0,
      retainedHighlightSets: 0,
    });
  });

  it('ignores a stale response after a newer revision starts', async () => {
    vi.stubGlobal('Worker', ControlledWorker);
    const view = render(HighlightedCodeProbe, {
      props: { source: 'return old;', language: 'javascript', revision: 1 },
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'));
    const oldWorker = ControlledWorker.instances[0];
    const oldMessage = oldWorker?.messages[0];
    expect(oldMessage).toBeDefined();

    await view.rerender({ source: 'return new;', language: 'javascript', revision: 2 });
    await waitFor(() => expect(ControlledWorker.instances.length).toBe(2));
    const newWorker = ControlledWorker.instances[1];
    const newMessage = newWorker?.messages[0];
    expect(newMessage).toBeDefined();

    oldWorker?.emit({
      tokens: [{ text: 'return old;', kind: 'keyword' }],
      contentHash: oldMessage?.contentHash,
      requestId: oldMessage?.requestId,
      revisionId: oldMessage?.revisionId,
    });
    await tick();
    expect(screen.getByTestId('revision-id')).toHaveTextContent('2');
    expect(screen.getByTestId('tokens').textContent).toBe('');

    newWorker?.emit({
      tokens: [{ text: 'return new;', kind: 'keyword' }],
      contentHash: newMessage?.contentHash,
      requestId: newMessage?.requestId,
      revisionId: newMessage?.revisionId,
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('highlighted'));
    expect(screen.getByTestId('tokens')).toHaveTextContent('return new;');
  });

  it('never dispatches oversized or unsupported input', async () => {
    vi.stubGlobal('Worker', ControlledWorker);
    const oversized = 'x'.repeat(HIGHLIGHT_MAX_CHARS + 1);
    const tooManyLines = Array.from({ length: HIGHLIGHT_MAX_LINES + 1 }, () => 'x').join('\n');
    expect(highlightEligibility(oversized, 'typescript')).toBe('character-cutoff');
    expect(highlightEligibility(tooManyLines, 'typescript')).toBe('line-cutoff');
    expect(highlightEligibility('safe', 'unknown-language')).toBe('unsupported-language');

    const first = render(HighlightedCodeProbe, {
      props: { source: oversized, language: 'typescript', revision: 1 },
    });
    const second = render(HighlightedCodeProbe, {
      props: { source: tooManyLines, language: 'typescript', revision: 1 },
    });
    const third = render(HighlightedCodeProbe, {
      props: { source: 'safe', language: 'unknown-language', revision: 1 },
    });
    await waitFor(() => {
      expect(within(first.container).getByTestId('status')).toHaveTextContent('skipped');
      expect(within(second.container).getByTestId('status')).toHaveTextContent('skipped');
      expect(within(third.container).getByTestId('status')).toHaveTextContent('skipped');
    });
    expect(ControlledWorker.instances).toHaveLength(0);
    expect(within(first.container).getByTestId('tokens').textContent).toBe('');
    expect(within(second.container).getByTestId('tokens').textContent).toBe('');
    expect(within(third.container).getByTestId('tokens').textContent).toBe('');
  });

  it('terminates workers and clears pending resources on unmount or failure', async () => {
    vi.stubGlobal('Worker', ControlledWorker);
    const view = render(HighlightedCodeProbe, {
      props: { source: 'const value = 1;', language: 'typescript', revision: 1 },
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'));
    const worker = ControlledWorker.instances[0];
    worker?.fail();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));
    expect(worker?.terminate).toHaveBeenCalledTimes(1);
    view.unmount();
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
      const view = render(HighlightedCodeProbe, {
        props: { source, language: 'typescript', revision: iteration + 1 },
      });
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('pending'));
      view.unmount();
      expect(getHighlightResourceStats()).toEqual({
        activeWorkers: 0,
        pendingRequests: 0,
        retainedHighlightSets: 0,
      });
    }
  });
});
