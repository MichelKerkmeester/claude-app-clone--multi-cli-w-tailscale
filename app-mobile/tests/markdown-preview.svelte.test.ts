// ───────────────────────────────────────────────────────────────────
// MODULE: MARKDOWN PREVIEW TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import MarkdownPreview, { parseMarkdown } from '../src/pages/chat/artifacts/markdown-preview.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('MarkdownPreview', () => {
  it('renders a bounded safe AST without raw HTML, navigation, images, or frames', () => {
    const markdown = [
      '# Safe title',
      '',
      '<script>window.__executed = true</script>',
      '[run](javascript:alert(1))',
      '![remote](https://remote.example/image.png)',
      '<iframe src="https://remote.example/frame"></iframe>',
      '',
      '```ts',
      'const value = 1;',
      '```',
    ].join('\n');
    const { container } = render(MarkdownPreview, { props: { text: markdown } });
    const preview = screen.getByLabelText('Markdown preview');
    expect(preview.textContent).toContain('<script>window.__executed = true</script>');
    expect(preview.textContent).toContain('[remote]');
    expect(preview.querySelector('script, a, img, iframe, frame, object, embed')).toBeNull();
    expect(container.querySelector('[href], [src], [action]')).toBeNull();
    expect((window as Window & { __executed?: boolean }).__executed).toBeUndefined();
  });

  it('keeps code fences, headings, lists, and safe inline text exact', () => {
    const markdown = '# Heading\n\n- one\n- two\n\n`inline`';
    const { container } = render(MarkdownPreview, { props: { text: markdown } });
    expect(container.querySelector('h1')).toHaveTextContent('Heading');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('code')).toHaveTextContent('inline');
    expect(parseMarkdown('```\nraw <b>code</b>\n```')[0]?.kind).toBe('code');
  });

  it('names empty and whitespace-only content without creating an active region', () => {
    const { unmount } = render(MarkdownPreview, { props: { text: '' } });
    expect(screen.getByText('This preview is empty.')).toBeInTheDocument();
    unmount();
    render(MarkdownPreview, { props: { text: ' \n\t' } });
    expect(screen.getByText('This preview contains whitespace only.')).toBeInTheDocument();
  });
});
