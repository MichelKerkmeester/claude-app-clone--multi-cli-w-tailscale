// ───────────────────────────────────────────────────────────────────
// MODULE: Session Composer Launch Draft Tests
// ───────────────────────────────────────────────────────────────────
// These tests mount SessionComposer so the adoption policy is proven through
// the controlled prompt used by the real composer, not only through its helper.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HostCommandCatalogState } from '../src/shared/commands/commands.js';
import LaunchDraftComposerHarness from './support/LaunchDraftComposerHarness.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function catalogState(): HostCommandCatalogState {
  return {
    status: 'ready',
    snapshot: {
      hostEpoch: 'epoch_launch_draft',
      sessionId: 'session-launch-draft',
      sessionRevision: 1,
      catalogRevision: 1,
      commands: [],
      fetchedAt: 1,
    },
    commands: [],
    refresh: vi.fn(),
  };
}

function renderComposer(
  overrides: {
    readonly initialPrompt?: string;
    readonly launchDraft?: string | null;
  } = {},
) {
  return render(LaunchDraftComposerHarness, {
    props: {
      catalog: catalogState(),
      sendPrompt: vi.fn(),
      sendSlashDraft: vi.fn(),
      onInsertCommand: vi.fn(),
      initialPrompt: overrides.initialPrompt ?? '',
      launchDraft: overrides.launchDraft,
      sessionId: 'session-launch-draft',
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => cleanup());

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('host launch draft adoption', () => {
  it('adopts once into an empty composer and does not restore deleted text', async () => {
    const view = renderComposer({ launchDraft: 'continue the parked work' });
    const composer = await screen.findByLabelText('Message Pi');

    await waitFor(() => expect(composer).toHaveValue('continue the parked work'));

    fireEvent.input(composer, { target: { value: '' } });
    await waitFor(() => expect(composer).toHaveValue(''));

    await view.rerender({
      catalog: catalogState(),
      sendPrompt: vi.fn(),
      sendSlashDraft: vi.fn(),
      onInsertCommand: vi.fn(),
      initialPrompt: '',
      launchDraft: 'a later host report',
      sessionId: 'session-launch-draft',
    });

    expect(composer).toHaveValue('');
  });

  it('never overwrites a non-empty composer with a host draft', async () => {
    renderComposer({ initialPrompt: 'text being typed', launchDraft: 'host text' });
    const composer = await screen.findByLabelText('Message Pi');

    await waitFor(() => expect(composer).toHaveValue('text being typed'));
  });

  it('stays empty when the host launch-draft field is absent', async () => {
    renderComposer();
    const composer = await screen.findByLabelText('Message Pi');

    await waitFor(() => expect(composer).toHaveValue(''));
  });
});
