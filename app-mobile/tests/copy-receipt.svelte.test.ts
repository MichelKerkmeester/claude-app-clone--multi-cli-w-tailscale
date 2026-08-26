// ───────────────────────────────────────────────────────────────────
// MODULE: Copy Receipt Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  COPY_FAILURE_MESSAGE,
  copiedReceipt,
} from '../src/pages/chat/rich-content/use-copy-feedback.svelte.js';
import CopyFeedbackProbe from './support/CopyFeedbackProbe.svelte';

afterEach(cleanup);

describe('copiedReceipt', () => {
  it('counts lines after stripping one trailing newline', () => {
    expect(copiedReceipt('exact \nsource\n')).toBe('Copied 2 lines');
    expect(copiedReceipt('one\ntwo\nthree\n')).toBe('Copied 3 lines');
  });

  it('counts characters on a single line', () => {
    expect(copiedReceipt('abcd')).toBe('Copied 4 chars');
    expect(copiedReceipt('abcd\n')).toBe('Copied 4 chars');
  });

  it('returns null on empty or newline-only input', () => {
    expect(copiedReceipt('')).toBeNull();
    expect(copiedReceipt('\n')).toBeNull();
  });
});

describe('copy receipt affordance', () => {
  it('announces a quantified receipt and never a green label beside a failure', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const view = render(CopyFeedbackProbe, { props: { unit: 'code', source: 'single line' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied 11 chars'));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument());

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    await view.rerender({ unit: 'code', source: 'single line' });
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(COPY_FAILURE_MESSAGE));
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });
});
