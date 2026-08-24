// ───────────────────────────────────────────────────────────────────
// MODULE: CARD INBOUND IMAGE TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

// VerifiedImage reads its artifact snapshot off `resource.current`, so the
// Svelte hook mock wraps the snapshot in `{ current }` (the React hook returned
// the snapshot directly). Only `status` and `objectUrl` are read on the ready
// path; `reload`/`close` are wired as no-ops for the retry/error effects.
const resource = vi.hoisted(() => ({
  useArtifactResource: vi.fn(),
}));

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

vi.mock('../src/pages/chat/artifacts/use-artifact-resource.svelte.js', () => resource);

import InboundImageCard from '../src/pages/chat/artifacts/card-inbound-image.svelte';

const READY_BLOCK: InboundImageReadyBlock = {
  id: 'blk_inbound_card_001',
  revision: 3,
  seq: 8,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'inbound_image',
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'tool_result',
  availability: 'ready',
  artifact: {
    id: 'artifact_secret_card_001',
    revision: 'rev_secret_card_001',
    expiresAt: '2099-01-01T00:00:00.000Z',
    full: {
      digest: 'digest_secret_card_001',
      mediaType: 'image/png',
      width: 320,
      height: 200,
      byteLength: 68,
    },
    thumbnail: {
      digest: 'digest_secret_card_001',
      mediaType: 'image/png',
      width: 160,
      height: 100,
      byteLength: 68,
    },
  },
  presentation: { safeAlt: '' },
  redaction: { status: 'applied' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
};

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('InboundImageCard', () => {
  it('renders a ready card as one React Aria dialog button with a reserved well', () => {
    resource.useArtifactResource.mockReturnValue({
      current: {
        status: 'ready',
        objectUrl: 'blob:verified-card',
        reload: vi.fn(),
        close: vi.fn(),
      },
    });

    const { container } = render(
      InboundImageCard,
      { props: { block: READY_BLOCK, sessionId: 'session_card_001', state: 'inline-ready' } },
    );

    const button = screen.getByRole('button', { name: /Open screenshot preview/i });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button.querySelectorAll('button, a, input, select, textarea')).toHaveLength(0);
    expect(button.querySelector('img')).toHaveAttribute('alt', '');

    const well = container.querySelector('[data-image-well]');
    expect(well).not.toBeNull();
    expect(well).toHaveStyle({ aspectRatio: '1.6' });
    expect(container.textContent).toContain('Processed');
    expect(container.textContent).toContain('Revision 3');
    expect(container.textContent).toContain('Redactions applied');
    expect(container.textContent).not.toContain('artifact_secret_card_001');
    expect(container.textContent).not.toContain('digest_secret_card_001');
    expect(container.textContent).not.toContain('screenshot.png');
  });
});
