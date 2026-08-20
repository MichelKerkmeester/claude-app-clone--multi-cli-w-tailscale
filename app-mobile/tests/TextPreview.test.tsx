import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TextPreview } from '../src/artifacts/TextPreview.js';
import '../src/style.css';

afterEach(cleanup);

describe('TextPreview', () => {
  it('renders exact text as selectable DOM content and supports bounded chunks', () => {
    const text = 'first line\nsecond line\n' + 'x'.repeat(9_000);
    const { container } = render(<TextPreview text={text} />);
    const preview = screen.getByLabelText('Text preview');
    expect(preview.textContent).toBe(text);
    expect(container.querySelectorAll('[data-text-chunk]').length).toBeGreaterThan(1);
    expect(getComputedStyle(preview).userSelect).not.toBe('none');
  });

  it('supports native selection, Find matches, and explicit wrapping', () => {
    const text = 'Alpha beta alpha';
    render(<TextPreview text={text} wrap findTerm="alpha" />);
    const preview = screen.getByLabelText('Text preview');
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(preview);
    selection?.removeAllRanges();
    selection?.addRange(range);
    expect(selection?.toString()).toBe(text);
    expect(preview).toHaveClass('is-wrapped');
    expect(preview.querySelectorAll('.artifact-find-match')).toHaveLength(2);
  });

  it.each([
    ['', 'This preview is empty.'],
    ['   \n\t', 'This preview contains whitespace only.'],
  ])('names the %s empty state safely', (text, message) => {
    render(<TextPreview text={text} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
