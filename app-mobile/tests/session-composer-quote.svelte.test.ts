// ───────────────────────────────────────────────────────────────────
// MODULE: Session Composer Transcript Quote Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HostCommandCatalogState } from '../src/shared/commands/commands.js';
import { excerptToBudget } from '../src/shared/format/excerpt.js';
import { INITIAL_RUNTIME_STATE, type RuntimeControls } from '../src/shared/state/runtime.js';
import SessionComposer, {
  type TranscriptQuoteCapability,
} from '../src/pages/chat/chrome/session-composer.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const catalog: HostCommandCatalogState = {
  status: 'ready',
  snapshot: null,
  commands: [],
  refresh: vi.fn(),
};

const runtimeControls: RuntimeControls = {
  runtime: INITIAL_RUNTIME_STATE,
  refresh: async () => undefined,
  setModel: async () => null,
  setThinkingLevel: async () => null,
  setMode: async () => null,
};

const selectedText = `${'old transcript '.repeat(12)}newest transcript tail`;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function selectTranscriptText(): void {
  const frame = document.createElement('div');
  frame.className = 'transcript--frame';
  frame.append(document.createTextNode(selectedText));
  document.body.append(frame);

  const range = document.createRange();
  range.selectNodeContents(frame);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event('selectionchange'));
}

function renderComposer(transcriptQuoteCapability?: TranscriptQuoteCapability) {
  const sendPrompt = vi.fn();
  render(SessionComposer, {
    props: {
      prompt: '',
      setPrompt: vi.fn(),
      onDraftChange: vi.fn(),
      sendPrompt,
      sendSlashDraft: vi.fn(),
      stopRun: vi.fn(),
      canSubmit: true,
      status: 'idle',
      connection: 'live',
      inputLock: 'none',
      awaitingSnapshot: false,
      sendingPrompt: false,
      stopping: false,
      promptError: null,
      runtimeControls,
      catalog,
      binding: null,
      slashSubmitting: false,
      runtimeAuthority: true,
      runtimeRunning: false,
      onInsertCommand: vi.fn(),
      mediaCapability: null,
      ...(transcriptQuoteCapability === undefined ? {} : { transcriptQuoteCapability }),
    },
  });
  return { sendPrompt };
}

// ───────────────────────────────────────────────────────────────────
// 4. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
});

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('transcript quote action', () => {
  it('passes a budgeted transcript excerpt to the fresh-chat draft and never sends it', async () => {
    selectTranscriptText();
    const openFreshChat = vi.fn();
    const { sendPrompt } = renderComposer({ excerptBudget: 64, openFreshChat });

    await tick();
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Quote selection into a new chat' }),
    );

    expect(openFreshChat).toHaveBeenCalledWith(excerptToBudget(selectedText, 64));
    expect(sendPrompt).not.toHaveBeenCalled();
  });

  it('renders no fresh-chat quote action when its host capability is absent', async () => {
    selectTranscriptText();
    renderComposer();

    await tick();

    expect(
      screen.queryByRole('button', { name: 'Quote selection into a new chat' }),
    ).toBeNull();
  });
});
