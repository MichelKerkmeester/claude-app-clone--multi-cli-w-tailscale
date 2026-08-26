// ───────────────────────────────────────────────────────────────────
// MODULE: Host Command Ranking Tests
// ───────────────────────────────────────────────────────────────────
// Proves the deterministic tier order, Unicode/case/diacritic
// normalization, host-order tie-breaks, disabled-row handling, active-name
// retention, grapheme match ranges, and the hard no-autocorrect rule.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import {
  normalizeCommandText,
  rankHostCommands,
  type RankedHostCommand,
} from '../src/shared/commands/rank-host-commands.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function command(name: string, extra?: Partial<CommandDescriptorDto>): CommandDescriptorDto {
  return {
    name,
    description: null,
    source: 'extension',
    enabled: true,
    disabledReason: null,
    requiresConfirmation: false,
    ...extra,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function names(items: readonly RankedHostCommand[]): readonly string[] {
  return items.map((item) => item.name);
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('rankHostCommands tiers', () => {
  it('ranks exact canonical names above name prefixes, with host order between prefix ties', () => {
    const result = rankHostCommands([command('plan-mode'), command('plan'), command('plan:full')], 'plan');
    expect(names(result.items)).toEqual(['plan', 'plan-mode', 'plan:full']);
    expect(result.items[0]?.matchTier).toBe('exact-name');
    expect(result.items[1]?.matchTier).toBe('name-prefix');
    expect(result.items[2]?.matchTier).toBe('name-prefix');
  });

  it('ranks an exact authoritative alias above a name prefix', () => {
    const result = rankHostCommands(
      [command('plan-mode'), command('plan', { aliases: ['p'] })],
      'p',
    );
    expect(names(result.items)).toEqual(['plan', 'plan-mode']);
    expect(result.items[0]?.matchTier).toBe('exact-alias');
    expect(result.items[1]?.matchTier).toBe('name-prefix');
  });

  it('ranks alias prefixes above boundary prefixes', () => {
    const result = rankHostCommands(
      [command('my-plan-x'), command('plan', { aliases: ['plan-now'] })],
      'plan-',
    );
    expect(names(result.items)).toEqual(['plan', 'my-plan-x']);
    expect(result.items[0]?.matchTier).toBe('alias-prefix');
    expect(result.items[1]?.matchTier).toBe('boundary-prefix');
  });

  it('ranks a prefix after a boundary above substrings, and host order between boundary ties', () => {
    const result = rankHostCommands(
      [command('plan:full'), command('x-full-notes'), command('full-notes')],
      'full',
    );
    expect(names(result.items)).toEqual(['full-notes', 'plan:full', 'x-full-notes']);
    expect(result.items[0]?.matchTier).toBe('name-prefix');
    expect(result.items[1]?.matchTier).toBe('boundary-prefix');
    expect(result.items[2]?.matchTier).toBe('boundary-prefix');
  });

  it('ranks contiguous substrings above ordered subsequences, penalizing gaps', () => {
    const result = rankHostCommands(
      [
        command('a-x-b-x-c'),
        command('xxabcxx'),
        command('a-b-c'),
      ],
      'abc',
    );
    expect(names(result.items)).toEqual(['xxabcxx', 'a-b-c', 'a-x-b-x-c']);
    expect(result.items[0]?.matchTier).toBe('substring');
    expect(result.items[1]?.matchTier).toBe('subsequence');
    expect(result.items[2]?.matchTier).toBe('subsequence');
  });

  it('ranks description and argument-hint matches last, below subsequences', () => {
    const result = rankHostCommands(
      [
        command('zed', { description: 'alp mount notes' }),
        command('zed2', { argumentHint: 'alp target' }),
        command('a-l-p'),
      ],
      'alp',
    );
    expect(names(result.items)).toEqual(['a-l-p', 'zed', 'zed2']);
    expect(result.items[0]?.matchTier).toBe('subsequence');
    expect(result.items[1]?.matchTier).toBe('description');
    expect(result.items[2]?.matchTier).toBe('hint');
  });

  it('matches authoritative aliases only when the host provided them', () => {
    const result = rankHostCommands([command('plan', { aliases: ['plan-full'] })], 'plan-full');
    expect(names(result.items)).toEqual(['plan']);
    expect(result.items[0]?.matchTier).toBe('exact-alias');
  });
});

describe('rankHostCommands normalization', () => {
  it('matches case-insensitively and never alters the canonical name', () => {
    const result = rankHostCommands([command('Plan')], 'pLAN');
    expect(names(result.items)).toEqual(['Plan']);
    expect(result.items[0]?.name).toBe('Plan');
  });

  it('folds diacritics in the query and the candidate', () => {
    const result = rankHostCommands([command('Café-Mode')], 'cafe');
    expect(names(result.items)).toEqual(['Café-Mode']);
    expect(result.items[0]?.matchTier).toBe('name-prefix');
  });

  it('matches a diacritic query against a plain candidate', () => {
    const result = rankHostCommands([command('cafe-mode')], 'café');
    expect(names(result.items)).toEqual(['cafe-mode']);
  });

  it('normalizes NFC and NFD input to the same match', () => {
    const composed = rankHostCommands([command('Café')], 'cafe');
    const decomposed = rankHostCommands([command('Cafe\u0301')], 'cafe');
    expect(names(composed.items)).toEqual(['Café']);
    expect(names(decomposed.items)).toEqual(['Cafe\u0301']);
  });

  it('never autocorrects a plausible typo into a different command', () => {
    const result = rankHostCommands([command('plan'), command('plant')], 'plna');
    expect(result.items).toEqual([]);
    const extra = rankHostCommands([command('plan')], 'plann');
    expect(extra.items).toEqual([]);
  });
});

describe('rankHostCommands grapheme ranges', () => {
  it('marks the full name for an exact match', () => {
    const result = rankHostCommands([command('plan')], 'plan');
    expect(result.items[0]?.matchRanges).toEqual([{ start: 0, end: 4 }]);
  });

  it('marks the matched prefix graphemes', () => {
    const result = rankHostCommands([command('plan-mode')], 'plan');
    expect(result.items[0]?.matchRanges).toEqual([{ start: 0, end: 4 }]);
  });

  it('marks a substring range past the prefix boundary', () => {
    const result = rankHostCommands([command('plan-mode')], 'mode');
    expect(result.items[0]?.matchRanges).toEqual([{ start: 5, end: 9 }]);
  });

  it('splits subsequence matches into grapheme ranges', () => {
    const result = rankHostCommands([command('a-l-p')], 'alp');
    expect(result.items[0]?.matchRanges).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 5 },
    ]);
  });

  it('counts emoji as single graphemes for ranges', () => {
    const result = rankHostCommands([command('plan🚀')], '🚀');
    expect(result.items[0]?.matchRanges).toEqual([{ start: 4, end: 5 }]);
  });

  it('leaves ranges empty when only the description matched', () => {
    const result = rankHostCommands([command('zed', { description: 'alp notes' })], 'alp');
    expect(result.items[0]?.matchRanges).toEqual([]);
  });
});

describe('rankHostCommands ordering and activation', () => {
  it('returns every row in host order for an empty query', () => {
    const commands = [command('zap'), command('plan'), command('alpha')];
    const result = rankHostCommands(commands, '');
    expect(names(result.items)).toEqual(['zap', 'plan', 'alpha']);
    for (const item of result.items) {
      expect(item.matchTier).toBe('host-order');
      expect(item.matchRanges).toEqual([]);
    }
  });

  it('keeps disabled rows in their ranked position', () => {
    const result = rankHostCommands(
      [
        command('plan'),
        command('zap', { enabled: false, description: 'planning notes' }),
        command('planner'),
      ],
      'plan',
    );
    expect(names(result.items)).toEqual(['plan', 'planner', 'zap']);
    expect(result.items[2]?.enabled).toBe(false);
  });

  it('activates the first enabled row, never a disabled one', () => {
    const result = rankHostCommands([command('zap', { enabled: false }), command('plan')], '');
    expect(result.activeName).toBe('plan');
    const allDisabled = rankHostCommands([command('zap', { enabled: false })], '');
    expect(allDisabled.activeName).toBeNull();
  });

  it('retains the active name while it remains visible and enabled', () => {
    const commands = [command('alpha'), command('beta')];
    const retained = rankHostCommands(commands, '', { activeName: 'beta' });
    expect(retained.activeName).toBe('beta');
    const filtered = rankHostCommands(commands, 'al', { activeName: 'beta' });
    expect(filtered.activeName).toBe('alpha');
  });

  it('breaks every tie with host order', () => {
    const result = rankHostCommands([command('planner'), command('plot')], 'pl');
    expect(names(result.items)).toEqual(['planner', 'plot']);
  });

  it('matches nothing when the query is empty and there are no rows', () => {
    const result = rankHostCommands([], '');
    expect(result.items).toEqual([]);
    expect(result.activeName).toBeNull();
  });
});

describe('normalizeCommandText', () => {
  it('lowercases, folds diacritics, and normalizes Unicode', () => {
    expect(normalizeCommandText('Café-MODE')).toBe('cafe-mode');
    expect(normalizeCommandText('Cafe\u0301')).toBe('cafe');
    expect(normalizeCommandText('PLAN')).toBe('plan');
  });
});

describe('rankHostCommands cap', () => {
  it('caps the suggestion list at 12 rows', () => {
    const commands = Array.from({ length: 20 }, (_, index) =>
      command(`cmd-${index + 1}`),
    );
    const result = rankHostCommands(commands, '');
    expect(result.items.length).toBeLessThanOrEqual(12);
    expect(result.items.length).toBe(12);
  });

  it('returns all rows when fewer than 12 match', () => {
    const commands = [command('plan'), command('zap')];
    const result = rankHostCommands(commands, '');
    expect(result.items.length).toBe(2);
  });

  it('returns rows only from the host catalog', () => {
    const commands = [command('plan'), command('zap'), command('alpha')];
    const result = rankHostCommands(commands, '');
    expect(result.items.every((item) => commands.some((c) => c.name === item.name))).toBe(true);
    expect(result.items.length).toBe(3);
  });
});
