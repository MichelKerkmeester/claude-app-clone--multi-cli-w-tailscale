import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtifactCard } from '../src/artifacts/ArtifactCard.js';
import { ArtifactViewerProvider } from '../src/artifacts/ArtifactViewerProvider.js';
import '../src/style.css';

const DIFF: FileDiffBlock = {
  id: 'block_file_diff_card',
  revision: 1,
  seq: 5,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'file_diff',
  summary: 'Harden ticket expiry in policy.ts',
  patch: ' context\n-old\n+new\n context\n+again\n-tail',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderCard() {
  return render(
    <ArtifactViewerProvider>
      <ArtifactCard block={DIFF} />
    </ArtifactViewerProvider>,
  );
}

describe('ArtifactCard', () => {
  it('does not auto-open and exposes one whole-card button', () => {
    renderCard();

    const card = screen.getByRole('button', {
      name: 'Open file diff: Harden ticket expiry in policy.ts',
    });
    expect(card).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.artifact-card')).toHaveLength(1);
    expect(document.querySelectorAll('.artifact-card button')).toHaveLength(0);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('keeps the six-line peek noninteractive and preserves diff prefixes', () => {
    renderCard();

    const lines = document.querySelectorAll('.artifact-card-peek-line');
    expect(lines).toHaveLength(6);
    expect(lines[1]).toHaveTextContent('-old');
    expect(lines[2]).toHaveTextContent('+new');
    expect(lines[5]).toHaveTextContent('-tail');
    expect(document.querySelector('.artifact-card-peek button')).toBeNull();
  });
});
