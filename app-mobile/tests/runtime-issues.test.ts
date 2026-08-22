// ───────────────────────────────────────────────────────────────────
// MODULE: Bounded Runtime Issue Copy Tests
// ───────────────────────────────────────────────────────────────────
// Proves the local copy allowlist is keyed exactly to the protocol issue
// union and that every rendered string is bounded local text — raw status,
// body, server, host, or RPC fragments can never be formatted.

import { RUNTIME_ISSUE_CODES } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { RUNTIME_ISSUE_COPY, runtimeIssueMessage } from '../src/shared/data/runtime-issues.js';

describe('runtime issue copy allowlist', () => {
  it('covers every protocol issue code with non-empty local copy', () => {
    for (const code of RUNTIME_ISSUE_CODES) {
      const message = runtimeIssueMessage(code);
      expect(message.length).toBeGreaterThan(0);
      expect(message).toBe(RUNTIME_ISSUE_COPY[code]);
    }
  });

  it('is keyed exactly to the protocol union — no extra, no missing', () => {
    expect(Object.keys(RUNTIME_ISSUE_COPY).sort()).toEqual([...RUNTIME_ISSUE_CODES].sort());
  });

  it('contains only bounded local copy with no raw transport or host fragments', () => {
    for (const code of RUNTIME_ISSUE_CODES) {
      const message = runtimeIssueMessage(code);
      expect(message).not.toMatch(/http|status|\b\d{3}\b|server|reason|error/iu);
      expect(message).not.toMatch(/[{}\\]/u);
    }
  });
});
