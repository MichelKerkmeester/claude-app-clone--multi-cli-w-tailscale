// ───────────────────────────────────────────────────────────────────
// MODULE: Empty State Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import EmptyState from '../src/pages/home/empty-state.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('empty state copy', () => {
  it('uses no sessions here for an empty catalog', () => {
    render(EmptyState, { props: { loading: false, error: null } });
    expect(screen.getByRole('heading', { name: 'No sessions here' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No sessions match' })).not.toBeInTheDocument();
  });

  it('uses no sessions match when a query filtered every row', () => {
    render(EmptyState, { props: { loading: false, error: null, noMatch: true } });
    expect(screen.getByRole('heading', { name: 'No sessions match' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No sessions here' })).not.toBeInTheDocument();
  });
});
