// ───────────────────────────────────────────────────────────────────
// MODULE: COLLAPSIBLE HEADING TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { TodoProjectionV1 } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TodoPanel from '../src/pages/chat/chrome/todo-panel.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('Collapsible heading wrapper', () => {
  it('keeps a real todo disclosure headed and operable', async () => {
    const user = userEvent.setup();
    render(TodoPanel, { props: { projection, onRefresh: vi.fn() } });

    const trigger = screen.getByRole('button', { name: 'To do, 1 task' });
    expect(trigger.closest('h3')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();

    const contentId = trigger.getAttribute('aria-controls');
    expect(contentId).not.toBeNull();
    const content = document.getElementById(contentId as string);
    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('role', 'group');
    expect(content).toHaveAttribute('aria-labelledby', trigger.id);

    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    await user.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    expect(document.getElementById(contentId as string)).toHaveAttribute('hidden', 'until-found');
  });
});
