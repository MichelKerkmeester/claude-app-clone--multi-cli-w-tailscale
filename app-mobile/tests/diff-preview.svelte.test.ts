// ───────────────────────────────────────────────────────────────────
// MODULE: DIFF PREVIEW TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import DiffPreview, { parseUnifiedDiff } from '../src/pages/chat/artifacts/diff-preview.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const MULTI_HUNK_PATCH = [
  'diff --git a/src/policy.ts b/src/policy.ts',
  '--- a/src/policy.ts',
  '+++ b/src/policy.ts',
  '@@ -10,3 +10,4 @@ function alpha() {',
  ' context-a',
  '-removed-a',
  '+added-a',
  ' more-a',
  '@@ -80,4 +81,3 @@ function beta() {',
  ' context-b',
  '-removed-b',
  ' more-b',
  ' still-b',
].join('\n');

const HEADERLESS_PATCH = ['not a diff', '-looks-like-a-deletion', '+looks-like-an-addition'].join('\n');

const MALFORMED_HUNK_PATCH = ['@@ not-a-hunk', '-old', '+new'].join('\n');

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function bodyAdds(patch: string): number {
  return patch.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++')).length;
}

function bodyRemoves(patch: string): number {
  return patch.split('\n').filter((line) => line.startsWith('-') && !line.startsWith('---')).length;
}

function attrValues(name: 'data-old-line' | 'data-new-line'): string[] {
  return [...document.querySelectorAll(`[${name}]`)].map((node) => node.getAttribute(name) ?? '');
}

// ───────────────────────────────────────────────────────────────────
// 4. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(cleanup);

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('parseUnifiedDiff', () => {
  it('restarts old and new line numbers at each hunk header', () => {
    const parsed = parseUnifiedDiff(MULTI_HUNK_PATCH);
    expect(parsed).not.toBeNull();
    const numbered = parsed?.rows.filter((row) => row.kind === 'context' || row.kind === 'add' || row.kind === 'remove') ?? [];
    expect(numbered.map((row) => [row.oldLine, row.newLine])).toEqual([
      [10, 10],
      [11, null],
      [null, 11],
      [12, 12],
      [80, 81],
      [81, null],
      [82, 82],
      [83, 83],
    ]);
  });

  it('counts added and removed body lines, ignoring file headers', () => {
    const parsed = parseUnifiedDiff(MULTI_HUNK_PATCH);
    expect(parsed?.added).toBe(bodyAdds(MULTI_HUNK_PATCH));
    expect(parsed?.removed).toBe(bodyRemoves(MULTI_HUNK_PATCH));
    expect(parsed?.filePath).toBe('src/policy.ts');
  });

  it('returns null for a headerless or malformed patch instead of throwing', () => {
    expect(parseUnifiedDiff(HEADERLESS_PATCH)).toBeNull();
    expect(parseUnifiedDiff(MALFORMED_HUNK_PATCH)).toBeNull();
    expect(parseUnifiedDiff('')).toBeNull();
    expect(() => parseUnifiedDiff(MALFORMED_HUNK_PATCH)).not.toThrow();
  });
});

describe('DiffPreview', () => {
  it('renders a file header, per-hunk gutters, and a +N/-M stat for a multi-hunk patch', () => {
    render(DiffPreview, { props: { patch: MULTI_HUNK_PATCH } });
    const preview = screen.getByLabelText('Redacted file diff');
    expect(preview.querySelector('[data-diff-path]')?.getAttribute('data-diff-path')).toBe('src/policy.ts');
    expect(preview.textContent).toContain('src/policy.ts');

    const added = bodyAdds(MULTI_HUNK_PATCH);
    const removed = bodyRemoves(MULTI_HUNK_PATCH);
    const stat = screen.getByLabelText(`${String(added)} added, ${String(removed)} removed`);
    expect(stat.textContent).toBe(`+${String(added)}/-${String(removed)}`);
    expect(stat.getAttribute('data-added')).toBe(String(added));
    expect(stat.getAttribute('data-removed')).toBe(String(removed));

    expect(attrValues('data-old-line')).toEqual(['10', '11', '12', '80', '81', '82', '83']);
    expect(attrValues('data-new-line')).toEqual(['10', '11', '12', '81', '82', '83']);
    expect(attrValues('data-old-line')).not.toContain('13');
    expect(attrValues('data-new-line')).not.toContain('13');
    expect(preview.textContent).toContain('context-b');
    expect(preview.textContent).toContain('+added-a');
  });

  it('falls back to the plain undifferentiated block when the patch has no hunk header', () => {
    render(DiffPreview, { props: { patch: MALFORMED_HUNK_PATCH } });
    const preview = screen.getByLabelText('Redacted file diff');
    expect(preview.tagName).toBe('PRE');
    expect(preview.textContent).toBe(MALFORMED_HUNK_PATCH);
    expect(preview.querySelector('[data-old-line]')).toBeNull();
    expect(preview.querySelector('.artifact-diff--stat')).toBeNull();
    expect(screen.queryByLabelText(/added, .* removed/u)).toBeNull();
  });
});
