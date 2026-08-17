import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RootErrorBoundary } from '../src/ErrorBoundary.js';

afterEach(cleanup);

function Throwing(): never {
  throw new Error('boom during render');
}

describe('RootErrorBoundary', () => {
  it('renders children unchanged when nothing throws', () => {
    render(
      <RootErrorBoundary>
        <p>All good</p>
      </RootErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a recoverable fallback instead of a blank tree when a child throws', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <RootErrorBoundary>
        <Throwing />
      </RootErrorBoundary>,
    );
    // The tree is not left empty: an accessible alert with recovery actions renders.
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pi Remote hit an unexpected error' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset app data' })).toBeInTheDocument();
    // The throwing stack is surfaced for diagnosis rather than swallowed silently.
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
