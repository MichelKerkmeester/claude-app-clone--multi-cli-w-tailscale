// ───────────────────────────────────────────────────────────────────
// MODULE: Account Usage Detail Sheet Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import UsageSheet from '../src/pages/home/usage-sheet.svelte';
import type {
  AccountUsagePayload,
  UsageReading,
  UsageWindow,
} from '$shared/format/usage-format.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const NOW = 10_000_000;

function reading(usedPercent: number, observedAt = NOW - 1_000): UsageReading {
  return { usedPercent, resetsAt: null, observedAt, severity: 'normal' };
}

function usageWindow(overrides: Partial<UsageWindow> = {}): UsageWindow {
  return {
    id: 'hour',
    label: 'Hourly window',
    isActive: false,
    primary: false,
    poll: 'success',
    current: reading(20),
    lastGood: null,
    rateLimitedAt: null,
    ...overrides,
  };
}

function renderSheet(usage: AccountUsagePayload, open = true) {
  return render(UsageSheet, { usage, open, now: NOW, onClose: vi.fn() });
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('account usage detail sheet', () => {
  it('renders no dialog when the usage payload is absent', () => {
    const { container } = render(UsageSheet, {
      usage: null,
      open: true,
      now: NOW,
      onClose: vi.fn(),
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[data-usage-headline="true"]')).toBeNull();
  });

  it('shows the host-marked headline when another window has the fullest bar', () => {
    const fullest = usageWindow({
      id: 'week',
      label: 'Weekly window',
      current: reading(95),
    });
    const gating = usageWindow({
      id: 'hour',
      label: 'Hourly window',
      isActive: true,
      current: reading(25),
    });

    const { container } = renderSheet({ windows: [fullest, gating] });

    expect(container.querySelector('[data-usage-headline="true"]')?.textContent).toBe(
      'Hourly window',
    );
  });

  it('renders loading, unavailable, and stale-but-shown window states distinctly', () => {
    const { container } = renderSheet({
      windows: [
        usageWindow({ id: 'loading', label: 'Loading window', poll: 'loading', current: null }),
        usageWindow({
          id: 'unavailable',
          label: 'Unavailable window',
          poll: 'unavailable',
          current: null,
          lastGood: null,
        }),
        usageWindow({
          id: 'stale',
          label: 'Stale window',
          isActive: true,
          poll: 'failed',
          current: null,
          lastGood: reading(37),
        }),
      ],
    });

    expect(container.querySelector('[data-usage-window="loading"]')?.textContent).toContain(
      'Loading usage',
    );
    expect(container.querySelector('[data-usage-window="unavailable"]')?.textContent).toContain(
      'Usage unavailable',
    );
    const stale = container.querySelector('[data-usage-window="stale"]');
    expect(stale?.getAttribute('data-usage-state')).toBe('shown');
    expect(stale?.getAttribute('data-usage-stale')).toBe('true');
    expect(stale?.textContent).toContain('37% used');
    expect(stale?.textContent).toContain('Stale');
  });

  it('calls the close handler from the accessible close control', async () => {
    const onClose = vi.fn();
    render(UsageSheet, {
      usage: { windows: [usageWindow({ isActive: true })] },
      open: true,
      now: NOW,
      onClose,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Close account usage' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
