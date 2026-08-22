// Port of app-mobile/tests/useCopyFeedback.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.
// Each assertion mirrors the React oracle. The React CopyHarness (which calls
// useCopyFeedback and projects announcement/actionLabel into the DOM) is
// replaced by CopyFeedbackProbe.svelte, which mounts the runes factory inside
// a real component <script> and renders the same button + status paragraph.
// The factory uses $state (no $effect), so the harness pattern (option b) is
// used: the reactive state is projected to the DOM for assertions.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY_FAILURE_MESSAGE } from '../src/lib/rich-content/useCopyFeedback.svelte.js';

import CopyFeedbackProbe from './support/CopyFeedbackProbe.svelte';

afterEach(cleanup);

describe('useCopyFeedback', () => {
  it('copies directly from the canonical source and announces one named result', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(CopyFeedbackProbe);
    const button = screen.getByRole('button', { name: 'Copy code' });
    button.focus();
    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('exact \nsource\n'));
    expect(screen.getByRole('status')).toHaveTextContent('Copied code');
    expect(document.activeElement).toBe(button);
  });

  it('exposes the exact touch-and-hold recovery message on failure', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(CopyFeedbackProbe);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(COPY_FAILURE_MESSAGE));
  });
});
