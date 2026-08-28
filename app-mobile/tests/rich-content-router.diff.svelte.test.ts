// ───────────────────────────────────────────────────────────────────
// MODULE: RICH CONTENT ROUTER DIFF BRANCH TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { TranscriptBlock } from '@pi-remote/pi-rpc-protocol';
import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { parseUnifiedDiff } from '../src/pages/chat/artifacts/diff-preview.svelte';
import RichContentRouter from '../src/pages/chat/rich-content/rich-content-router.svelte';
import {
  normalizeTranscriptBlocks,
  type NormalizedTranscriptBlock,
} from '../src/pages/chat/rich-content/normalize-transcript-blocks.js';

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

const MALFORMED_HUNK_PATCH = ['@@ not-a-hunk', '-old', '+new'].join('\n');

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function normalizedDiff(patch: string): NormalizedTranscriptBlock {
  const [block] = normalizeTranscriptBlocks({
    sessionId: 'session-router-diff-001',
    blocks: [
      {
        id: 'router-file-diff',
        revision: 1,
        seq: 1,
        occurredAt: '2026-08-17T04:00:00.000Z',
        kind: 'file_diff',
        summary: 'Harden ticket expiry',
        patch,
      } as unknown as TranscriptBlock,
    ],
  });
  if (block === undefined) throw new Error('Expected file_diff block.');
  return block;
}

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

describe('RichContentRouter diff branch', () => {
  it('shares parseUnifiedDiff so a multi-hunk patch gets per-hunk gutters and the real +N/-M stat', () => {
    expect(parseUnifiedDiff(MULTI_HUNK_PATCH)).not.toBeNull();
    render(RichContentRouter, { props: { block: normalizedDiff(MULTI_HUNK_PATCH) } });

    expect(screen.getByRole('heading', { name: 'File diff' })).toBeInTheDocument();
    expect(document.querySelector('.rich--shell-well')).toBeNull();

    const added = bodyAdds(MULTI_HUNK_PATCH);
    const removed = bodyRemoves(MULTI_HUNK_PATCH);
    const stat = screen.getByLabelText(`${String(added)} added, ${String(removed)} removed`);
    expect(stat.textContent).toBe(`+${String(added)}/-${String(removed)}`);

    expect(attrValues('data-old-line')).toEqual(['10', '11', '12', '80', '81', '82', '83']);
    expect(attrValues('data-new-line')).toEqual(['10', '11', '12', '81', '82', '83']);
    expect(document.querySelector('[data-diff-path]')?.getAttribute('data-diff-path')).toBe(
      'src/policy.ts',
    );
  });

  it('degrades the raw pre branch to the plain block when the patch has no hunk header', () => {
    expect(parseUnifiedDiff(MALFORMED_HUNK_PATCH)).toBeNull();
    render(RichContentRouter, { props: { block: normalizedDiff(MALFORMED_HUNK_PATCH) } });

    const well = document.querySelector('.rich--shell-well');
    expect(well).not.toBeNull();
    expect(well?.textContent).toBe(MALFORMED_HUNK_PATCH);
    expect(document.querySelector('[data-old-line]')).toBeNull();
    expect(document.querySelector('.artifact-diff--stat')).toBeNull();
  });
});
