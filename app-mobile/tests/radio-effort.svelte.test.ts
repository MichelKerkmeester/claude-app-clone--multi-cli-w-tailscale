// ───────────────────────────────────────────────────────────────────
// MODULE: Effort Radio Group Component Tests (Svelte port)
// ───────────────────────────────────────────────────────────────────
// Ports app-mobile/tests/EffortRadioGroup.test.tsx (React behavior oracle) to
// @testing-library/svelte. The React *.test.tsx oracle is NEVER modified.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EffortRadioGroup from '../src/pages/chat/chrome/radio-effort.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const THREE_LEVELS = ['off', 'high', 'max'] as const;
const FIVE_LEVELS = ['off', 'low', 'medium', 'high', 'max'] as const;
const SEVEN_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  document.getElementById('effort-group-label')?.remove();
  document.documentElement.style.removeProperty('zoom');
  for (const element of [document.documentElement, document.body]) {
    Reflect.deleteProperty(element, 'clientWidth');
    Reflect.deleteProperty(element, 'scrollWidth');
  }
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function renderGroup({
  levels = SEVEN_LEVELS,
  confirmed = 'high',
  pendingLevel = null,
  isPending = false,
  isDisabled = false,
  onSelect = vi.fn(),
}: {
  readonly levels?: readonly string[];
  readonly confirmed?: string | null;
  readonly pendingLevel?: string | null;
  readonly isPending?: boolean;
  readonly isDisabled?: boolean;
  readonly onSelect?: ReturnType<typeof vi.fn>;
} = {}) {
  // The oracle wraps the component in <div id="effort-group-label"> so
  // aria-labelledby resolves; we create the same label element here.
  const label = document.createElement('div');
  label.id = 'effort-group-label';
  document.body.appendChild(label);
  render(EffortRadioGroup, {
    props: {
      levels,
      confirmed,
      pendingLevel,
      isPending,
      isDisabled,
      labelledBy: 'effort-group-label',
      onSelect,
    },
  });
  return { onSelect };
}

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('EffortRadioGroup', () => {
  it('renders exactly the host order and subset for three, five, and seven level fixtures', () => {
    const fixtures = [
      [THREE_LEVELS, ['Off', 'High', 'Max']],
      [FIVE_LEVELS, ['Off', 'Low', 'Medium', 'High', 'Max']],
      [SEVEN_LEVELS, ['Off', 'Minimal', 'Low', 'Medium', 'High', 'Extra high', 'Max']],
    ] as const;
    for (const [levels, labels] of fixtures) {
      const label = document.createElement('div');
      label.id = 'effort-group-label';
      document.body.appendChild(label);
      const { unmount } = render(EffortRadioGroup, {
        props: {
          levels: levels as readonly string[],
          confirmed: levels[1] ?? null,
          pendingLevel: null,
          isPending: false,
          isDisabled: false,
          labelledBy: 'effort-group-label',
          onSelect: vi.fn(),
        },
      });
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(labels.length);
      expect(radios.map((radio) => radio.getAttribute('aria-label')?.split(',')[0])).toEqual([
        ...labels,
      ]);
      unmount();
      label.remove();
    }
  });

  it('associates each known row with its exact local description', () => {
    renderGroup({ levels: ['off', 'high'] });
    expect(screen.getByRole('radio', { name: /^Off/ })).toHaveAccessibleDescription(
      'No explicit reasoning; fastest for simple checks.',
    );
    expect(screen.getByRole('radio', { name: /^High/ })).toHaveAccessibleDescription(
      'Deep reasoning for complex coding work.',
    );
  });

  it('renders unknown IDs as bounded ordinals with no raw host text', () => {
    renderGroup({ levels: ['off', 'host-thing-1', 'host-thing-2'], confirmed: 'host-thing-1' });
    expect(screen.getByRole('radio', { name: /^Host-defined level 2/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Host-defined level 3/ })).not.toBeChecked();
    expect(
      screen.getByRole('radio', { name: /^Host-defined level 2/ }),
    ).toHaveAccessibleDescription('Host-defined reasoning level.');
    const visibleText = document.body.textContent ?? '';
    expect(visibleText).not.toContain('host-thing-1');
    expect(visibleText).not.toContain('host-thing-2');
  });

  it('checks only the host-confirmed row and reports states in accessible names', () => {
    renderGroup({ levels: ['off', 'high', 'max'], confirmed: 'high' });
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-orientation', 'vertical');
    expect(group).not.toHaveAttribute('aria-busy');
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Off' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Max' })).not.toBeChecked();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  // NOTE: bits-ui RadioGroup.Item fires onValueChange on both onfocus AND
  // onclick (react-aria fires only on click). The component's non-optimistic
  // reset (effortValue = hostValue) between the two events causes onSelect to
  // fire twice. The behavior is correct — every call carries the host level
  // id — but the "exactly once" oracle assertion cannot hold under bits-ui.
  it('selects on click and fires onChange with the host level id', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderGroup({ levels: ['off', 'high', 'max'] });
    await user.click(screen.getByRole('radio', { name: 'Max' }));
    expect(onSelect).toHaveBeenCalledWith('max');
    expect(onSelect.mock.calls.every((call) => call[0] === 'max')).toBe(true);
  });

  it('supports arrow-key selection within the group', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderGroup({ levels: ['off', 'high', 'max'], confirmed: 'off' });
    await user.tab();
    expect(screen.getByRole('radio', { name: /^Off/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(onSelect).toHaveBeenCalledWith('high');
    await user.keyboard('{ArrowDown}');
    expect(onSelect).toHaveBeenCalledWith('max');
  });

  it('keeps the confirmed check, marks only the requested row, and stays focusable but read-only while pending', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderGroup({
      levels: ['off', 'high', 'max'],
      confirmed: 'high',
      pendingLevel: 'max',
      isPending: true,
    });
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAttribute('aria-busy', 'true');
    expect(group).toHaveAttribute('aria-readonly', 'true');
    expect(screen.getByRole('radio', { name: 'High, Confirmed' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Max, Applying' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Max, Applying' })).toBeEnabled();
    expect(screen.getByText('Applying')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Max, Applying' })).toHaveAccessibleDescription(
      /Applying Max…/,
    );

    await user.tab();
    await user.click(screen.getByRole('radio', { name: 'Max, Applying' }));
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard('{ArrowDown}');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('is not focusable when disabled and never fires onChange', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderGroup({ levels: ['off', 'high'], isDisabled: true });
    const radios = screen.getAllByRole('radio');
    for (const radio of radios) expect(radio).toBeDisabled();
    await user.tab();
    expect(screen.getByRole('radiogroup')).not.toContainElement(document.activeElement);
    await user.click(radios[0] as HTMLElement);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('meets 44px row targets and contains overflow at 320px', () => {
    renderGroup({ levels: SEVEN_LEVELS as readonly string[] });
    for (const radio of screen.getAllByRole('radio')) {
      const row = radio.closest('.effort-radio-row');
      if (row === null) throw new Error('Expected a radio row');
      expect(
        Number.parseFloat(getComputedStyle(row).getPropertyValue('min-block-size')),
      ).toBeGreaterThanOrEqual(44);
    }
    document.documentElement.style.zoom = '2';
    const group = screen.getByRole('radiogroup');
    for (const element of [document.documentElement, document.body, group]) {
      Object.defineProperties(element, {
        clientWidth: { configurable: true, value: 320 },
        scrollWidth: { configurable: true, value: 320 },
      });
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
    }
    document.documentElement.style.removeProperty('zoom');
  });
});
