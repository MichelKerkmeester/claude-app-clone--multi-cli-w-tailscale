import type { FileDiffBlock } from '@pi-remote/pi-rpc-protocol';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ArtifactCard from '../src/pages/chat/artifacts/card-artifact.svelte';

const DIFF: FileDiffBlock = {
  id: 'block_file_diff_card',
  revision: 1,
  seq: 5,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'file_diff',
  summary: 'Harden ticket expiry in policy.ts',
  patch: ' context\n-old\n+new\n context\n+again\n-tail',
};

// The Svelte ArtifactCard resolves its viewer via getOptionalArtifactViewer(), which
// returns null outside a provider; the card still renders identically and the open
// path is a no-op. The React oracle's assertions only observe the rendered card, so
// no provider wrapper is required to reproduce them.
function renderCard() {
  return render(ArtifactCard, { props: { block: DIFF } });
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
