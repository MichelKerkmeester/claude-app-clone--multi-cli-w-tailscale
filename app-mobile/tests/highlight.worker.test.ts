// ───────────────────────────────────────────────────────────────────
// MODULE: HIGHLIGHT WORKER TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { HIGHLIGHT_LANGUAGES, tokenizeSource } from '../src/pages/chat/rich-content/highlight.worker.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('highlight worker tokenizer', () => {
  it('keeps the allowlist fixed and returns tokens that reconstruct source', () => {
    expect(HIGHLIGHT_LANGUAGES).toEqual([
      'bash',
      'javascript',
      'typescript',
      'jsx',
      'tsx',
      'json',
      'html',
      'css',
      'markdown',
      'python',
      'go',
      'rust',
      'yaml',
      'sql',
      'diff',
      'ansi',
      'plaintext',
    ]);

    for (const [language, source] of [
      ['typescript', 'const value = "redacted"; // safe'],
      ['json', '{"safe": true}'],
      ['html', '<span>safe</span>'],
      ['diff', '+added\n-removed'],
      ['ansi', '\u001b[31mred\u001b[0m'],
      ['plaintext', 'plain text'],
    ] as const) {
      const tokens = tokenizeSource(source, language);
      expect(tokens.map((token) => token.text).join('')).toBe(source);
    }
  });

  it('classifies syntax without creating markup or evaluating source', () => {
    const tokens = tokenizeSource('const value = "safe"; // comment', 'typescript');
    expect(tokens.some((token) => token.kind === 'keyword')).toBe(true);
    expect(tokens.some((token) => token.kind === 'string')).toBe(true);
    expect(tokens.some((token) => token.kind === 'comment')).toBe(true);
    expect(tokens.every((token) => !token.text.includes('dangerouslySetInnerHTML'))).toBe(true);
  });
});
