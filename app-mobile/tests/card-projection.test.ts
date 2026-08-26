// ───────────────────────────────────────────────────────────────────
// MODULE: Card Projection Seam Tests
// ───────────────────────────────────────────────────────────────────

// The card projection turns a SessionCardDto into a view model from
// existing fields only, and the stale decider decays a running card to an
// UNKNOWN presentation after 20 minutes of silence — never a fake
// "done" — while leaving `status` untouched.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  WORKING_STALE_MS,
  decideStalePresentation,
  projectSessionCard,
} from '../src/shared/format/card-projection.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const UPDATED_AT = '2026-08-17T10:00:00.000Z';
const NOW = Date.parse(UPDATED_AT);

function card(overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    id: 'session_card_001',
    status: 'idle',
    updatedAt: UPDATED_AT,
    messageCount: 3,
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('projectSessionCard', () => {
  it('derives the message-count label from the existing count', () => {
    expect(projectSessionCard(card({ messageCount: 1 })).messageCountLabel).toBe('1 block');
    expect(projectSessionCard(card({ messageCount: 7 })).messageCountLabel).toBe('7 blocks');
  });

  it('keeps the ISO datetime as the absolute tap-to-inspect value', () => {
    expect(projectSessionCard(card()).absoluteOnTap).toBe(UPDATED_AT);
  });

  it('marks a resting-done card without writing anything', () => {
    const projected = projectSessionCard(card({ status: 'idle' }));
    expect(projected.isRestingDone).toBe(true);
    expect(projected.isRecoverableEmpty).toBe(false);
  });

  it('projects a zero-message session as a recoverable marker, not a hidden card', () => {
    const projected = projectSessionCard(card({ messageCount: 0 }));
    expect(projected.isRecoverableEmpty).toBe(true);
    expect(projected.messageCountLabel).toBe('No blocks');
  });

  it('is a deterministic pure projection', () => {
    expect(projectSessionCard(card())).toEqual(projectSessionCard(card()));
  });
});

describe('decideStalePresentation', () => {
  it('keeps a fresh running card at fresh', () => {
    expect(decideStalePresentation('running', UPDATED_AT, NOW + WORKING_STALE_MS - 1)).toBe(
      'fresh',
    );
  });

  it('decays a running card to stale-unknown at the 20-minute boundary', () => {
    expect(decideStalePresentation('running', UPDATED_AT, NOW + WORKING_STALE_MS)).toBe(
      'stale-unknown',
    );
    expect(decideStalePresentation('running', UPDATED_AT, NOW + WORKING_STALE_MS + 1)).toBe(
      'stale-unknown',
    );
  });

  it('never marks a finished card stale, whatever its age', () => {
    expect(decideStalePresentation('idle', UPDATED_AT, NOW + 2 * WORKING_STALE_MS)).toBe('fresh');
    expect(decideStalePresentation('interrupted', UPDATED_AT, NOW + 2 * WORKING_STALE_MS)).toBe(
      'fresh',
    );
    expect(decideStalePresentation('unknown', UPDATED_AT, NOW + 2 * WORKING_STALE_MS)).toBe(
      'fresh',
    );
  });

  it('keeps an unparseable timestamp fresh (genuinely unknown, not celebrated)', () => {
    expect(decideStalePresentation('running', 'nonsense', NOW)).toBe('fresh');
  });
});