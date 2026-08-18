import type { TodoProjectionV1, TodoTaskProjectionV1 } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TodoPanel, TodoProjectionBlock } from '../src/TodoPanel.js';
import { DEMO_TODO_FIXTURE } from '../src/demo.js';
import type { TodoProjectionState } from '../src/todo-state.js';

const updatedAt = '2026-08-18T10:00:00.000Z';

const tasks: readonly TodoTaskProjectionV1[] = [
  task('task_pending_z', 'Write the panel shell', 'pending', 20, 'Panel'),
  task('task_done_a', 'Ship the protocol types', 'done', 50, 'Protocol'),
  task('task_pending_a', 'Map transcript placement', 'pending', 10, 'Panel'),
  task('task_active_a', 'Wire projection state', 'active', 30, 'State'),
  task('task_active_b', 'Connect read-only refresh', 'active', 40, 'State'),
  task('task_done_b', 'Apply relay redaction', 'done', 60, 'Protocol'),
  task('task_done_c', 'Advertise capability', 'done', 70, 'Protocol'),
  task('task_blocked_a', 'Run device verification', 'blocked', 80, null),
];

function task(
  id: string,
  title: string,
  state: TodoTaskProjectionV1['state'],
  order: number,
  group: string | null,
): TodoTaskProjectionV1 {
  return { id, title, state, group, order, revision: 1, updatedAt };
}

function projection(entries: readonly TodoTaskProjectionV1[] = tasks): TodoProjectionV1 {
  return { planId: 'plan_panel_001', source: 'pi', revision: 1, updatedAt, tasks: entries };
}

function projectionState(value: TodoProjectionV1 | null): TodoProjectionState {
  return {
    sessionId: 'session_panel_001',
    epoch: 'epoch_panel_001',
    availability: value === null ? 'unsupported' : 'available',
    projection: value,
    anchorSeq: value === null ? null : 4,
    refreshing: false,
    needsRefresh: false,
    announcement: '',
  };
}

afterEach(cleanup);

describe('read-only todo panel', () => {
  it('renders 3/8, the clay hairline, localized state counts, groups, and host order', () => {
    const { container } = render(<TodoPanel projection={projection()} onRefresh={vi.fn()} />);

    expect(screen.getByText('3/8')).toBeInTheDocument();
    const progress = screen.getByRole('progressbar', { name: 'Todo progress' });
    expect(progress).toHaveAttribute('aria-valuenow', '3');
    expect(progress).toHaveAttribute('aria-valuemax', '8');
    expect(progress.querySelector('[data-todo-progress-fill]')).toHaveStyle({
      inlineSize: '37.5%',
    });
    for (const name of ['To do, 2 tasks', 'Doing, 2 tasks', 'Done, 3 tasks', 'Blocked, 1 task']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Panel' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'State' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Protocol' })).toBeInTheDocument();
    expect(
      [...container.querySelectorAll('.todo-task-title')].map((node) => node.textContent),
    ).toEqual([
      'Map transcript placement',
      'Write the panel shell',
      'Wire projection state',
      'Connect read-only refresh',
      'Ship the protocol types',
      'Apply relay redaction',
      'Advertise capability',
      'Run device verification',
    ]);
  });

  it('keeps every task row static and exposes state with text rather than color alone', () => {
    const { container } = render(<TodoPanel projection={projection()} onRefresh={vi.fn()} />);
    const rows = [...container.querySelectorAll('[data-todo-task-id]')];

    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(row.tagName).toBe('LI');
      expect(row.querySelector('input, button, a, [role="checkbox"], [role="switch"]')).toBeNull();
      expect(row).not.toHaveAttribute('draggable');
      expect(row).not.toHaveAttribute('tabindex');
      expect((row as HTMLElement).onclick).toBeNull();
      expect(within(row as HTMLElement).getByText(/To do|Doing|Done|Blocked/u)).toBeInTheDocument();
    }
  });

  it('supports keyboard disclosure and read-only refresh through named controls', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<TodoPanel projection={projection()} onRefresh={onRefresh} />);
    const disclosure = screen.getByRole('button', { name: 'To do, 2 tasks' });
    const refresh = screen.getByRole('button', { name: 'Refresh pi todos' });

    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    disclosure.focus();
    await user.keyboard(' ');
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Map transcript placement')).not.toBeVisible();
    await user.click(refresh);
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('renders only the calm completion line in the all-done task body', () => {
    const allDone = tasks.map((entry) => ({ ...entry, state: 'done' as const }));
    const { container } = render(
      <TodoPanel projection={projection(allDone)} onRefresh={vi.fn()} />,
    );

    expect(screen.getByText('All done · 8/8')).toBeInTheDocument();
    expect(container.querySelector('.todo-task-list')).toBeNull();
    expect(container.querySelector('.todo-state-section')).toBeNull();
  });

  it('shows an honest empty plan and renders nothing for unsupported hosts', () => {
    const { container, rerender } = render(
      <TodoPanel projection={projection([])} onRefresh={vi.fn()} />,
    );

    expect(screen.getByText("No tasks in pi's current plan.")).toBeInTheDocument();
    expect(container.querySelector('[data-todo-task-id]')).toBeNull();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    rerender(<TodoProjectionBlock state={projectionState(null)} />);
    expect(container.querySelector('[data-todo-panel]')).toBeNull();
    expect(container.querySelector('[data-todo-task-id]')).toBeNull();
  });

  it('does not persist projection identity or task content during disclosure and refresh', async () => {
    const user = userEvent.setup();
    localStorage.clear();
    localStorage.setItem('safe-canary', 'retained');
    render(<TodoPanel projection={projection()} onRefresh={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Doing, 2 tasks' }));
    await user.click(screen.getByRole('button', { name: 'Refresh pi todos' }));

    const serialized = JSON.stringify(localStorage);
    expect(localStorage.getItem('safe-canary')).toBe('retained');
    expect(localStorage).toHaveLength(1);
    expect(serialized).not.toContain('plan_panel_001');
    expect(serialized).not.toContain('Wire projection state');
  });

  it('publishes deterministic demo routes for grouped, all-done, empty, and unsupported states', () => {
    expect(DEMO_TODO_FIXTURE).toEqual({
      query: '?demo=1&fixture=todos&state=grouped',
      states: ['grouped', 'all-done', 'empty', 'unsupported'],
    });
  });
});
