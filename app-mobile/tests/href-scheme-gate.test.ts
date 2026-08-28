// ───────────────────────────────────────────────────────────────────
// MODULE: Href Scheme Gate Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { classifyHrefScheme, type HrefSchemeVerdict } from '../src/pages/chat/rich-content/prose-link.js';

// ───────────────────────────────────────────────────────────────────
// 1. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SCHEME_CASES: readonly {
  readonly name: string;
  readonly input: string;
  readonly verdict: HrefSchemeVerdict;
}[] = [
  { name: 'https', input: 'https://example.com/docs', verdict: 'open-external' },
  { name: 'http', input: 'http://example.com/docs', verdict: 'open-external' },
  { name: 'mailto', input: 'mailto:reader@example.com', verdict: 'open-external' },
  { name: 'file', input: 'file:///tmp/secret', verdict: 'inert' },
  { name: 'schemeless path', input: './README.md', verdict: 'inert' },
  { name: 'javascript', input: 'javascript:alert(1)', verdict: 'rejected' },
  { name: 'tel', input: 'tel:+15555550100', verdict: 'rejected' },
  { name: 'data', input: 'data:text/html,nope', verdict: 'rejected' },
  { name: 'blob', input: 'blob:https://example.com/uuid', verdict: 'rejected' },
  { name: 'vbscript', input: 'vbscript:msgbox(1)', verdict: 'rejected' },
  { name: 'ftp unknown', input: 'ftp://files.example.com/a', verdict: 'rejected' },
  { name: 'novel custom scheme', input: 'slack://channel/C123', verdict: 'rejected' },
];

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('classifyHrefScheme', () => {
  it.each(SCHEME_CASES)('$name → $verdict', ({ input, verdict }) => {
    expect(classifyHrefScheme(input)).toBe(verdict);
  });

  it('rejects an unknown scheme by default rather than allowing it by omission', () => {
    expect(classifyHrefScheme('orca-custom://payload')).toBe('rejected');
    expect(classifyHrefScheme('intent://scan/#Intent;end')).toBe('rejected');
  });
});
