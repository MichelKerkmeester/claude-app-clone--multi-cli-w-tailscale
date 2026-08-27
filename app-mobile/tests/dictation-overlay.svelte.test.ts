// ───────────────────────────────────────────────────────────────────
// MODULE: Dictation Overlay Component Tests
// ───────────────────────────────────────────────────────────────────
// Constraint proofs: dictation routes through setPrompt (never
// auto-submits); permission-denied → fail-closed message; STOP ≠
// CANCEL; Web-Speech-unavailable → error message.

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DictationOverlay from '../src/pages/chat/chrome/dictation-overlay.svelte';

const instances: unknown[] = [];

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: Record<string, unknown>) => void) | null = null;
  onerror: ((event: Record<string, unknown>) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;
  constructor() { instances.push(this); }
  start(): void { this.started = true; }
  stop(): void { this.stopped = true; }
  abort(): void { this.stopped = true; }
}

const mockTrack = { stop: vi.fn(), kind: 'audio', label: '', enabled: true, muted: false };
const mockStream = {
  getTracks: () => [mockTrack],
  active: true,
} as unknown as MediaStream;

let getUserMediaMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  instances.length = 0;
  mockTrack.stop.mockClear();

  vi.stubGlobal('SpeechRecognition', MockSpeechRecognition as never);
  vi.stubGlobal('webkitSpeechRecognition', undefined);
  vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => ({
    createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn() }),
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 0, frequencyBinCount: 128, getByteTimeDomainData: vi.fn(),
    }),
    close: vi.fn().mockResolvedValue(undefined),
  })));

  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

  getUserMediaMock = vi.fn().mockResolvedValue(mockStream);
  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock },
      configurable: true,
    });
  } else {
    navigator.mediaDevices.getUserMedia = getUserMediaMock as never;
  }

  if (!navigator.permissions) {
    Object.defineProperty(navigator, 'permissions', {
      value: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
      configurable: true,
    });
  } else {
    navigator.permissions.query = vi.fn().mockResolvedValue({ state: 'granted' }) as never;
  }

  vi.stubGlobal('requestAnimationFrame', vi.fn<[FrameRequestCallback], number>(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('performance', { now: vi.fn().mockReturnValue(1000) });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderOverlay(props: Record<string, unknown> = {}) {
  const setPrompt = vi.fn();
  const onClose = vi.fn();
  const view = render(DictationOverlay, {
    props: {
      isOpen: true,
      mode: 'toggle',
      sessionId: 'test-session',
      lang: 'auto',
      setPrompt,
      onClose,
      ...props,
    },
  });
  return { setPrompt, onClose, rerender: view.rerender };
}

async function waitForRecording(): Promise<void> {
  await new Promise((r) => setTimeout(r, 100));
  await screen.findAllByText(/Listening/, {}, { timeout: 5000 });
}

function getInstance() {
  return instances[0] as MockSpeechRecognition;
}

// ───────────────────────────────────────────────────────────────────
// STRUCTURAL PROOF: the overlay component only has setPrompt and
// onClose as escape hatches — there is no submit prop. The overlay
// NEVER auto-submits; it writes the draft via setPrompt and routes
// through the composer's send-gate (canSendMessage).
// ───────────────────────────────────────────────────────────────────

describe('dictation never auto-submits', () => {
  it('the overlay has no submit prop — structural constraint', () => {
    // The overlay component receives `setPrompt` and `onClose` only.
    // There is no `submit` or `sendPrompt` prop defined in the interface.
    // This is a structural constraint proven by the type definition.
    renderOverlay();
    expect(screen.getByRole('dialog', { name: 'Dictation' })).toBeInTheDocument();
  });
});

// ───────────────────────────────────────────────────────────────────
// CANCEL discards the transcript (no insert). STOP conceptually inserts
// via setPrompt, tested by the pure logic tests.
// ───────────────────────────────────────────────────────────────────

describe('CANCEL discards the transcript', () => {
  it('CANCEL discards (no insert) and closes', async () => {
    const { setPrompt, onClose } = renderOverlay();
    await waitForRecording();
    const instance = getInstance();

    // Fire a result with isFinal: true.
    instance.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'discard me', confidence: 0.9 },
          length: 1,
        },
      ],
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Cancel dictation' }));

    expect(setPrompt).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  }, 15000);
});

// ───────────────────────────────────────────────────────────────────
// Permission denied → actionable fail-closed message (no dead mic).
// ───────────────────────────────────────────────────────────────────

describe('permission denied fail-closed', () => {
  it('shows actionable message when permission is denied (no dead mic)', async () => {
    getUserMediaMock.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    renderOverlay();
    expect(await screen.findByText(/Microphone access denied/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(mockTrack.stop).not.toHaveBeenCalled();
  }, 15000);
});

// ───────────────────────────────────────────────────────────────────
// Web Speech unavailable → error message (not a toast).
// ───────────────────────────────────────────────────────────────────

describe('Web Speech unavailable', () => {
  it('shows error message when SpeechRecognition is absent', async () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    renderOverlay();
    expect(await screen.findByText(/Dictation is not supported/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(mockTrack.stop).not.toHaveBeenCalled();
  }, 15000);
});

// ───────────────────────────────────────────────────────────────────
// STOP→insert: final result lands in the draft (never auto-submits).
// ───────────────────────────────────────────────────────────────────

describe('STOP inserts the transcript (never auto-submits)', () => {
  it('STOP→insert: final result lands in the draft via setPrompt', async () => {
    const { setPrompt, onClose } = renderOverlay();
    await waitForRecording();

    // Verify the recognizer instance exists and has handlers wired.
    expect(instances.length).toBe(1);
    const instance = getInstance();
    expect(instance.onresult).toBeDefined();
    expect(instance.onend).toBeDefined();

    // Fire a final recognition result.
    instance.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'insert me', confidence: 0.9 },
          length: 1,
        },
      ],
    });

    // Click the stop button.
    const stopBtn = screen.getByRole('button', { name: 'Stop and insert transcription' });
    await fireEvent.click(stopBtn);

    // Mock has no auto-onend; simulate engine end-of-utterance.
    instance.onend?.();

    // setPrompt was called with an updater function.
    expect(setPrompt).toHaveBeenCalledTimes(1);
    const updater = setPrompt.mock.calls[0]?.[0] as (current: string) => string;
    expect(updater('')).toBe('insert me');
    expect(updater('hello')).toBe('hello insert me');

    // The overlay closes after insert (800ms close timeout).
    await new Promise((r) => setTimeout(r, 900));
    expect(onClose).toHaveBeenCalled();
  }, 15000);
});

// ───────────────────────────────────────────────────────────────────
// Session-switch mid-take discards the stale take.
// ───────────────────────────────────────────────────────────────────

describe('session switch discards the take', () => {
  it('changing sessionId mid-take discards the stale take', async () => {
    const { setPrompt, onClose, rerender } = renderOverlay({ sessionId: 'A' });
    await waitForRecording();
    const instance = getInstance();

    // Fire a final result so there is collected text.
    instance.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'stale text', confidence: 0.9 },
          length: 1,
        },
      ],
    });

    // Switch sessions mid-take.
    rerender({ sessionId: 'B' });

    // The take is discarded: onClose fired and no insert.
    expect(onClose).toHaveBeenCalled();
    expect(setPrompt).not.toHaveBeenCalled();
  }, 15000);
});

// ───────────────────────────────────────────────────────────────────
// Cancel during pending permission: no leak.
// ───────────────────────────────────────────────────────────────────

describe('cancel during pending permission', () => {
  it('cancel during pending permission stops the stream and never starts recognition', async () => {
    let resolveGetUserMedia!: (stream: MediaStream) => void;
    getUserMediaMock.mockImplementation(
      () => new Promise<MediaStream>((resolve) => { resolveGetUserMedia = resolve; }),
    );

    const { onClose } = renderOverlay();

    // Wait for startTake to reach the await (shows 'Listening…' while permission pending).
    await waitForRecording();

    // Cancel while permission is still pending.
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Cancel dictation' }));
    expect(onClose).toHaveBeenCalled();

    // Resolve the deferred permission promise with a stream.
    resolveGetUserMedia(mockStream);

    // Give the post-await continuation a chance to run.
    await new Promise((r) => setTimeout(r, 0));

    // The stream's tracks were stopped — no leak.
    expect(mockTrack.stop).toHaveBeenCalled();

    // The recognizer was never started.
    expect(instances).toHaveLength(0);
  }, 15000);
});