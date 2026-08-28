// ───────────────────────────────────────────────────────────────────
// MODULE: File Path Classification Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  detectFilePathSegments,
  isFilePathToken,
} from '../src/pages/chat/rich-content/prose-link.js';

// ───────────────────────────────────────────────────────────────────
// 1. TESTS
// ───────────────────────────────────────────────────────────────────

describe('file path classification', () => {
  it('classifies src/app.ts:42 as a file path', () => {
    expect(isFilePathToken('src/app.ts:42')).toBe(true);
    expect(detectFilePathSegments('see src/app.ts:42 now')).toEqual([
      { kind: 'text', text: 'see ' },
      { kind: 'file-path', text: 'src/app.ts:42' },
      { kind: 'text', text: ' now' },
    ]);
  });

  it('classifies a code-span token, including a bare name.ext', () => {
    expect(isFilePathToken('src/app.ts:42', { allowBareName: true })).toBe(true);
    expect(isFilePathToken('app.ts:42', { allowBareName: true })).toBe(true);
    expect(isFilePathToken('app.ts:42')).toBe(false);
  });

  it('does not classify a URL that ends in a code extension', () => {
    expect(isFilePathToken('https://example.com/a.ts')).toBe(false);
    expect(isFilePathToken('https://example.com/a.ts', { allowBareName: true })).toBe(false);
    expect(detectFilePathSegments('https://example.com/a.ts')).toEqual([
      { kind: 'text', text: 'https://example.com/a.ts' },
    ]);
  });
});
