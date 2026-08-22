import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ThemeControl from '../src/lib/views/ThemeControl.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ThemeControl toggle buttons', () => {
  it('renders independent toggle buttons and preserves selected-option behavior', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(ThemeControl, { props: { value: 'system', onChange } });

    expect(screen.getByRole('group', { name: 'Color theme' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Use system theme',
      'Use light theme',
      'Use dark theme',
    ]);
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);

    expect(screen.getByRole('button', { name: 'Use system theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use light theme' })).toBeInTheDocument();
    const darkButton = screen.getByRole('button', { name: 'Use dark theme' });

    await user.click(screen.getByRole('button', { name: 'Use system theme' }));
    expect(onChange).not.toHaveBeenCalled();

    await user.click(darkButton);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
