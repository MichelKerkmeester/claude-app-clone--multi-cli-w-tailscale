// ───────────────────────────────────────────────────────────────────
// MODULE: CARD SESSION TOOL GLYPH
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

import CardSession from '../src/pages/home/card-session.svelte';
import { toolGlyphFor } from '../src/shared/chrome/session-state-icon.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function makeCard(tool: string, activity: string): SessionCardDto {
  return {
    id: `session-tool-${tool}`,
    status: 'running',
    messageCount: 1,
    updatedAt: '2025-01-01T00:00:00.000Z',
    tool,
    activity,
  } as unknown as SessionCardDto;
}

function renderCard(card: SessionCardDto) {
  return render(CardSession, {
    sessionId: card.id,
    selectSession: () => card,
    source: 'relay',
    unread: false,
    launchingId: null,
    openDisabled: false,
    onOpen: () => undefined,
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('card-session tool activity presentation', () => {
  it('maps a known bash tool to a pure glyph', () => {
    expect(toolGlyphFor('bash')).toBe('⌘');
  });

  it('renders the known tool glyph instead of the text activity line', () => {
    const { container } = renderCard(makeCard('bash', 'Running command'));

    expect(container.querySelector('[data-tool-glyph]')?.textContent).toBe('⌘');
    expect(container.querySelector('.session--activity')).toBeNull();
    expect(screen.getByRole('img', { name: 'Tool: bash' })).toHaveAttribute('data-tool-glyph', '⌘');
  });

  it('falls back to the host activity text for an unknown tool', () => {
    const { container } = renderCard(makeCard('unfamiliar-host-tool', 'Reading files'));

    expect(screen.getByText('Reading files', { exact: true })).toBeInTheDocument();
    expect(container.querySelector('[data-tool-glyph]')).toBeNull();
    expect(container.querySelector('.session--activity')?.textContent).toBe('Reading files');
  });
});
