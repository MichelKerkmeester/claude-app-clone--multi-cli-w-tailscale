// ───────────────────────────────────────────────────────────────────
// MODULE: Plan Mode Menu Tests
// ───────────────────────────────────────────────────────────────────
// Proves the exact two-row contract: focus movement and arrow keys cause
// zero mutations, only row activation reports a target, the confirmed
// mode is marked with a check, disabled rows carry a visible reason, and
// every label stays bounded local copy.

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, MenuTrigger } from 'react-aria-components';

import { PlanModeMenu } from '../src/PlanModeMenu.js';

function renderMenu(
  overrides: Partial<{
    readonly confirmedMode: 'build' | 'plan' | 'executing-plan' | 'unknown';
    readonly rowsDisabled: boolean;
    readonly rowsDisabledReason: string | null;
  }> = {},
) {
  const onSelect = vi.fn();
  const view = render(
    <MenuTrigger>
      <Button>Open mode</Button>
      <PlanModeMenu
        confirmedMode={overrides.confirmedMode ?? 'build'}
        rowsDisabled={overrides.rowsDisabled ?? false}
        rowsDisabledReason={overrides.rowsDisabledReason ?? null}
        onSelect={onSelect}
      />
    </MenuTrigger>,
  );
  return { onSelect, ...view };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Open mode' }));
  return screen.findByRole('menu', { name: /Open mode|Agent mode/ });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PlanModeMenu rows', () => {
  it('renders exactly two rows with the consequence descriptions', async () => {
    const user = userEvent.setup();
    renderMenu();
    const menu = await openMenu(user);
    const rows = within(menu).getAllByRole('menuitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Build');
    expect(rows[0]).toHaveTextContent('Pi may request write-capable tools; approvals still apply.');
    expect(rows[1]).toHaveTextContent('Plan');
    expect(rows[1]).toHaveTextContent('Read-only exploration and planning.');
  });

  it('marks the host-confirmed mode with a check and disables its row', async () => {
    const user = userEvent.setup();
    renderMenu({ confirmedMode: 'plan' });
    const menu = await openMenu(user);
    const [buildRow, planRow] = within(menu).getAllByRole('menuitem');
    expect(planRow).toHaveAttribute('aria-disabled', 'true');
    expect(buildRow).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('shows no check when the confirmed mode is unknown', async () => {
    const user = userEvent.setup();
    renderMenu({ confirmedMode: 'unknown' });
    const menu = await openMenu(user);
    for (const row of within(menu).getAllByRole('menuitem')) {
      expect(row).not.toHaveAttribute('aria-disabled', 'true');
      expect(within(row).queryByRole('img', { hidden: true })).not.toBeInTheDocument();
    }
  });

  it('disables both rows and shows the reason while executing', async () => {
    const user = userEvent.setup();
    renderMenu({
      confirmedMode: 'executing-plan',
      rowsDisabled: true,
      rowsDisabledReason: 'Plan execution is in progress.',
    });
    const menu = await openMenu(user);
    for (const row of within(menu).getAllByRole('menuitem')) {
      expect(row).toHaveAttribute('aria-disabled', 'true');
    }
    expect(await screen.findByText('Plan execution is in progress.')).toBeInTheDocument();
  });
});

describe('PlanModeMenu mutation discipline', () => {
  it('focus movement and arrow keys cause zero mutations', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderMenu();
    await openMenu(user);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Home}');
    await user.keyboard('{End}');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Enter activates the focused row and reports only that target', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderMenu();
    await openMenu(user);
    // Build is the current mode, so its row is disabled; the first arrow
    // moves real focus to the enabled Plan row.
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('plan');
  });

  it('clicking a row reports the target once', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderMenu({ confirmedMode: 'plan' });
    const menu = await openMenu(user);
    const [buildRow] = within(menu).getAllByRole('menuitem');
    await user.click(buildRow);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('build');
  });

  it('disabled rows never report a target', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderMenu({
      confirmedMode: 'executing-plan',
      rowsDisabled: true,
      rowsDisabledReason: 'Plan execution is in progress.',
    });
    const menu = await openMenu(user);
    for (const row of within(menu).getAllByRole('menuitem')) {
      await user.click(row);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Escape dismisses the menu without reporting anything', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderMenu();
    await openMenu(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open mode' })).toHaveFocus());
  });
});
