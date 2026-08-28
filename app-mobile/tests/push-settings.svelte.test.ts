// ───────────────────────────────────────────────────────────────────
// MODULE: Push Settings Permission Tests
// ───────────────────────────────────────────────────────────────────

// Push controls must follow the browser permission state after lifecycle
// events instead of treating relay preferences as permission truth.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PushSettings from '../src/pages/home/push-settings.svelte';

const attention = vi.hoisted(() => ({
  fetchPushConfig: vi.fn(),
}));

vi.mock('../src/shared/format/attention.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/shared/format/attention.js')>()),
  ...attention,
}));

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function notificationApi(permission: 'default' | 'denied' | 'granted') {
  return {
    permission,
    requestPermission: vi.fn().mockResolvedValue(permission),
  };
}

function renderSettings(
  props: { readonly openSettings?: () => void } = {},
): void {
  render(PushSettings, { props });
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

let browserNotification: ReturnType<typeof notificationApi>;

beforeEach(() => {
  browserNotification = notificationApi('granted');
  vi.stubGlobal('Notification', browserNotification);
  attention.fetchPushConfig.mockResolvedValue({
    supported: true,
    vapidPublicKey: 'vapid-key',
    preferences: { needs_input: true, finished: true, error: true },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('push settings permission state', () => {
  it('re-probes an external revoke on the next window focus', async () => {
    renderSettings();
    const switches = await screen.findAllByRole('switch');
    expect(switches[0]).toBeEnabled();
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');

    browserNotification.permission = 'denied';
    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(switches[0]).toBeDisabled();
      expect(switches[0]).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('surfaces the Needs input row for the synonym approval', async () => {
    renderSettings();
    const search = screen.getByRole('searchbox', { name: 'Search notification settings' });
    await userEvent.setup().type(search, 'approval');

    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Needs input' })).toBeInTheDocument();
      expect(screen.queryByRole('switch', { name: 'Finished' })).not.toBeInTheDocument();
      expect(screen.queryByRole('switch', { name: 'Error' })).not.toBeInTheDocument();
    });
  });

  it('emits one blocked toast across repeated focus and foreground events', async () => {
    browserNotification.permission = 'denied';
    renderSettings();
    await waitFor(() => expect(document.querySelector('[data-toast="notification-blocked"]')).not.toBeNull());

    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
    // Svelte applies the update after the dispatch returns, so reading the DOM
    // now would report the value from mount and pass however many times the
    // toast actually re-fired. Flush first, then read.
    await tick();

    const toast = document.querySelector('[data-toast="notification-blocked"]');
    expect(toast).not.toBeNull();
    expect(toast).toHaveAttribute('data-toast-sequence', '1');
    expect(screen.getAllByText(/Notifications are blocked by the browser/)).toHaveLength(1);
  });

  it('never renders an enabled switch while browser permission is denied', async () => {
    browserNotification.permission = 'denied';
    renderSettings();

    const switches = await screen.findAllByRole('switch');
    await waitFor(() => {
      expect(switches).toHaveLength(3);
      for (const control of switches) {
        expect(control).toBeDisabled();
        expect(control).toHaveAttribute('aria-checked', 'false');
        expect(control).not.toHaveAttribute('data-selected');
      }
    });
  });

  it('keeps Open Settings inert when the opener capability is absent', async () => {
    browserNotification.permission = 'denied';
    renderSettings();

    const openSettings = await screen.findByRole('button', { name: 'Open Settings' });
    expect(openSettings).toBeDisabled();
    expect(screen.getByText('Opening browser settings is unavailable here.')).toBeInTheDocument();
  });

  it('calls the supplied Open Settings capability', async () => {
    browserNotification.permission = 'denied';
    const openSettings = vi.fn();
    renderSettings({ openSettings });

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Open Settings' }));

    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
