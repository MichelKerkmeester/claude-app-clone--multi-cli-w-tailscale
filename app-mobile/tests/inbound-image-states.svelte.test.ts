// Port of app-mobile/tests/inbound-image-states.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle. The React useArtifactResource hook
// mock is replaced by a Svelte factory mock whose mockReturnValue wraps the
// snapshot in `{ current }` (the runes factory returns `{ current }`, while the
// React hook returned the snapshot directly) — only `status` and `objectUrl`
// are read on the ready path. The corpus of one InboundImageCard per lifecycle
// state is rendered via InboundImageStatesCorpus.svelte (the Svelte equivalent
// of the oracle's INBOUND_IMAGE_LIFECYCLE_STATES.map(<InboundImageCard/>)).

import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';
import { render, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

const resource = vi.hoisted(() => ({
  useArtifactResource: vi.fn(),
}));

vi.mock('../src/lib/artifacts/useArtifactResource.svelte.js', () => resource);

import InboundImageStatesCorpus from './support/InboundImageStatesCorpus.svelte';
import {
  imageStatusDefinition,
  INBOUND_IMAGE_LIFECYCLE_STATES,
  type InboundImageLifecycleState,
} from '../src/lib/artifacts/ImageStatus.svelte';

const READY_BLOCK: InboundImageReadyBlock = {
  id: 'blk_inbound_states_001',
  revision: 4,
  seq: 9,
  occurredAt: '2026-08-17T10:00:00.000Z',
  kind: 'inbound_image',
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Image from pi',
  source: 'assistant_output',
  availability: 'ready',
  artifact: {
    id: 'artifact_states_private_001',
    revision: 'rev_states_private_001',
    expiresAt: '2099-01-01T00:00:00.000Z',
    full: {
      digest: 'digest_states_private_001',
      mediaType: 'image/png',
      width: 320,
      height: 200,
      byteLength: 68,
    },
    thumbnail: {
      digest: 'digest_states_private_001',
      mediaType: 'image/png',
      width: 160,
      height: 100,
      byteLength: 68,
    },
  },
  presentation: { safeAlt: '' },
  redaction: { status: 'not-needed' },
  shareAllowed: false,
  content: { kind: 'artifact-ref' },
};

const COPY: Partial<Record<InboundImageLifecycleState, string>> = {
  processing: 'Preparing preview…',
  opening: 'Opening preview…',
  'full-fetching': 'Opening preview…',
  'full-degraded': 'Low-resolution preview',
  stalled: 'Still waiting for the Pi relay.',
  'offline-loaded': 'Offline copy',
  'offline-unavailable': 'This preview isn’t available while the relay is unreachable.',
  'capture-permission': 'Screenshot not shared — capture access is off on the host.',
  withheld: 'Preview withheld by relay policy.',
  denied: 'Preview not permitted for this session.',
  expired: 'This preview has expired.',
  missing: 'This revision is no longer available.',
  'revision-conflict': 'This revision is no longer available.',
  corrupt: 'This image couldn’t be verified.',
  'rate-limited': 'Preview temporarily unavailable.',
  stale: 'A newer preview is available.',
  revoked: 'Preview revoked.',
  unsupported: 'This client can’t display this image block.',
};

const ACTION_LABEL: Record<string, string> = {
  close: 'Close',
  'close-details': 'Close details',
  retry: 'Retry',
  cancel: 'Cancel',
  'host-setup': 'Host setup help',
  reauthenticate: 'Reauthenticate',
  resync: 'Resync transcript',
  report: 'Report',
  'view-latest': 'View latest',
  reveal: 'Reveal preview',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('inbound image lifecycle states', () => {
  it('renders every state copy, geometry, busy signal, and only its listed actions', () => {
    resource.useArtifactResource.mockReturnValue({
      current: {
        status: 'ready',
        objectUrl: 'blob:verified-states',
        reload: vi.fn(),
        close: vi.fn(),
      },
    });

    const { container } = render(InboundImageStatesCorpus, {
      props: { block: READY_BLOCK, sessionId: 'session_states_001' },
    });

    const cards = [...container.querySelectorAll('[data-inbound-image-card="true"]')];
    expect(cards).toHaveLength(INBOUND_IMAGE_LIFECYCLE_STATES.length);

    for (const state of INBOUND_IMAGE_LIFECYCLE_STATES) {
      const card = container.querySelector(`[data-image-state="${state}"]`);
      expect(card).not.toBeNull();
      const definition = imageStatusDefinition(state);
      if (COPY[state] !== undefined) expect(card).toHaveTextContent(COPY[state] as string);
      if (state === 'aborted') {
        expect(card).not.toHaveTextContent(/couldn’t|unavailable|error|failed/i);
      }
      if (definition.ariaBusy) expect(card).toHaveAttribute('aria-busy', 'true');
      const actionButtons = [...(card?.querySelectorAll('.inbound-image-status-action') ?? [])];
      expect(actionButtons.map((button) => button.textContent)).toEqual(
        definition.actions.map((action) => ACTION_LABEL[action]),
      );
      if (definition.noPixels) expect(card?.querySelectorAll('img')).toHaveLength(0);
      if (state === 'withheld' || state === 'revoked') {
        expect(card?.querySelector('[data-image-well]')).toHaveAttribute('data-no-pixels', 'true');
      }
      if (state === 'inline-ready') {
        expect(within(card as HTMLElement).getAllByRole('button')).toHaveLength(1);
      }
    }
  });
});
