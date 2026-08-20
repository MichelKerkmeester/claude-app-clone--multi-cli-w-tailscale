import { Button } from 'react-aria-components';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  COPY_FAILURE_MESSAGE,
  useCopyFeedback,
} from '../src/rich-content/useCopyFeedback.js';

afterEach(cleanup);

function CopyHarness() {
  const feedback = useCopyFeedback();
  if (!feedback.canCopy) return <p>Copy unavailable</p>;
  return (
    <>
      <Button onPress={() => feedback.copy('code', 'exact \nsource\n')}>
        {feedback.actionLabel('code')}
      </Button>
      <p role="status" aria-live="polite">
        {feedback.announcement}
      </p>
    </>
  );
}

describe('useCopyFeedback', () => {
  it('copies directly from the canonical source and announces one named result', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<CopyHarness />);
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
    render(<CopyHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(COPY_FAILURE_MESSAGE));
  });
});
