// ───────────────────────────────────────────────────────────────────
// MODULE: PREVIEW FIND STEPPER TEST
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import CodePreview from '../src/pages/chat/artifacts/code-preview.svelte';
import PreviewControls from '../src/pages/chat/artifacts/preview-controls.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('preview find stepper', () => {
  it('counts, wraps in both directions, and keeps every match highlighted', async () => {
    const findTerm = 'needle';
    render(PreviewControls, {
      kind: 'code',
      findTerm,
      onFindTermChange: vi.fn(),
    });
    render(CodePreview, {
      text: 'needle middle needle',
      findTerm,
      enableHighlighting: false,
    });

    await waitFor(() => expect(screen.getByText('1/2')).toBeInTheDocument());
    expect(document.querySelectorAll('mark.artifact-find--match')).toHaveLength(2);
    expect(document.querySelector('[data-find-index="1"]')).toHaveClass('is-current');

    const next = screen.getByRole('button', { name: 'Next match' });
    const previous = screen.getByRole('button', { name: 'Previous match' });

    await fireEvent.click(next);
    await waitFor(() => expect(screen.getByText('2/2')).toBeInTheDocument());
    expect(document.querySelector('[data-find-index="2"]')).toHaveClass('is-current');
    expect(document.querySelectorAll('mark.artifact-find--match')).toHaveLength(2);

    await fireEvent.click(next);
    await waitFor(() => expect(screen.getByText('1/2')).toBeInTheDocument());
    expect(document.querySelector('[data-find-index="1"]')).toHaveClass('is-current');

    await fireEvent.click(previous);
    await waitFor(() => expect(screen.getByText('2/2')).toBeInTheDocument());
    expect(document.querySelector('[data-find-index="2"]')).toHaveClass('is-current');

    await fireEvent.click(previous);
    await waitFor(() => expect(screen.getByText('1/2')).toBeInTheDocument());
    expect(document.querySelector('[data-find-index="1"]')).toHaveClass('is-current');
    expect(document.querySelectorAll('mark.artifact-find--match')).toHaveLength(2);
  });
});
