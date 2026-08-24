// ───────────────────────────────────────────────────────────────────
// MODULE: NORMALIZED ACTIVITY GROUP TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import NormalizedActivityGroup from '../src/pages/chat/transcript/normalized-activity-group.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('normalized activity group', () => {
  it('falls back to local disclosure state when the group is empty', () => {
    expect(() =>
      render(NormalizedActivityGroup, {
        props: { blocks: [] },
      }),
    ).not.toThrow();
  });
});
