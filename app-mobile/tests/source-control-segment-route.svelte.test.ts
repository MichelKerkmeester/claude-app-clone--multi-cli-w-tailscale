// ───────────────────────────────────────────────────────────────────
// MODULE: Source Control Segment Route Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import SourceControlRoute from '../src/routes/source-control/source-control-route.svelte';
import { resolveSourceControlSegment } from '../src/routes/source-control/segment.js';
import type { SourceControlHubData } from '../src/pages/chat/source-control/source-control-types.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const sourceControl: SourceControlHubData = {
  changes: {
    branchLabel: 'feature/mobile',
    files: [{ path: 'src/routes.ts', additions: 2, deletions: 1 }],
  },
  pullRequest: {
    state: 'open',
    rollup: 'Host-resolved review status',
  },
  commits: {
    commits: [{ id: 'commit-1', subject: 'Keep route usable', filesState: 'idle' }],
  },
};

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(cleanup);

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('source-control segment route', () => {
  it('selects a known deep-link segment and renders its host-backed content', () => {
    render(SourceControlRoute, {
      props: {
        data: {
          sourceControl,
          sourceControlCapability: true,
          requestedSegment: 'pr',
        },
      },
    });

    expect(screen.getByRole('tab', { name: 'PR' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Host-resolved review status')).toBeInTheDocument();
    expect(screen.queryByText('src/routes.ts')).toBeNull();
  });

  it('maps an unknown or missing segment to the hub safe default and keeps content visible', () => {
    expect(resolveSourceControlSegment('retired')).toBe('changes');
    expect(resolveSourceControlSegment(undefined)).toBe('changes');

    render(SourceControlRoute, {
      props: {
        data: {
          sourceControl,
          sourceControlCapability: true,
          requestedSegment: resolveSourceControlSegment('retired'),
        },
      },
    });

    expect(screen.getByRole('tab', { name: 'Changes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('src/routes.ts')).toBeInTheDocument();
  });

  it('keeps the route inert when source-control capability is absent', () => {
    render(SourceControlRoute, {
      props: {
        data: { sourceControl },
      },
    });

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('src/routes.ts')).toBeNull();
  });
});
