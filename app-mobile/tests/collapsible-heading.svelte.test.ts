import type { TodoProjectionV1 } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TodoPanel from '../src/lib/chrome/TodoPanel.svelte';

const projection: TodoProjectionV1 = {
  planId: 'heading-test-plan',
  source: 'pi',
  revision: 1,
  updatedAt: '2026-08-18T10:00:00.000Z',
  tasks: [
    {
      id: 'heading-test-task',
      title: 'Review heading output',
      state: 'pending',
      group: null,
      order: 1,
      revision: 1,
      updatedAt: '2026-08-18T10:00:00.000Z',
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe('Collapsible heading wrapper', () => {
  it('keeps a real todo disclosure headed and operable', async () => {
    const user = userEvent.setup();
    render(TodoPanel, { props: { projection, onRefresh: vi.fn() } });

    const trigger = screen.getByRole('button', { name: 'To do, 1 task' });
    expect(trigger.closest('h3')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();

    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    await user.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
  });
});
