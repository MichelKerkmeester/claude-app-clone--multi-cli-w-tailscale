// ───────────────────────────────────────────────────────────────────
// MODULE: Safe Markdown Media Tests
// ───────────────────────────────────────────────────────────────────

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import { parseSafeMarkdown } from '../src/pages/chat/rich-content/safe-markdown.svelte';
import SafeMarkdown from '../src/pages/chat/rich-content/safe-markdown.svelte';

// ───────────────────────────────────────────────────────────────────
// 1. TESTS
// ───────────────────────────────────────────────────────────────────

describe('SafeMarkdown media and reader gates', () => {
  it('renders a valid mermaid fence as a diagram and an invalid fence as a code block', () => {
    const valid = render(SafeMarkdown, {
      props: { source: '```mermaid\ngraph TD; A-->B\n```', ariaLabel: 'Valid diagram' },
    });
    const validFrame = valid.container.querySelector('iframe.sandboxed-diagram--frame');
    expect(validFrame).not.toBeNull();
    expect(validFrame?.getAttribute('srcdoc') ?? '').toContain('<svg');
    expect(valid.container.querySelector('pre.safe-markdown--code')).toBeNull();
    valid.unmount();

    const invalid = render(SafeMarkdown, {
      props: { source: '```mermaid\nthis is not a diagram\n```', ariaLabel: 'Invalid diagram' },
    });
    expect(invalid.container.querySelector('iframe')).toBeNull();
    expect(invalid.container.querySelector('pre.safe-markdown--code')).toHaveTextContent(
      'this is not a diagram',
    );
  });

  it('does not execute a script payload inside a mermaid fence', () => {
    const source = ['```mermaid', 'graph TD; A-->B', '<script>window.__mdPwned = true</script>', '```'].join(
      '\n',
    );
    const { container } = render(SafeMarkdown, { props: { source, ariaLabel: 'Unsafe diagram' } });
    expect(container.querySelector('script')).toBeNull();
    expect((window as Window & { __mdPwned?: boolean }).__mdPwned).toBeUndefined();
  });

  it('classifies src/app.ts:42 in prose and in a code span, but not a URL', () => {
    const { container } = render(SafeMarkdown, {
      props: {
        source: 'See src/app.ts:42 and `src/app.ts:42` versus https://example.com/a.ts',
        ariaLabel: 'Path classification',
      },
    });
    const paths = [...container.querySelectorAll('.safe-markdown--file-path')].map(
      (node) => node.textContent,
    );
    expect(paths).toEqual(['src/app.ts:42', 'src/app.ts:42']);
    expect(container.querySelector('a[href="https://example.com/a.ts"]')).toBeNull();
    expect(container.textContent).toContain('https://example.com/a.ts');
  });

  it('opens an in-app overlay for a tapped http(s) link and restores focus', async () => {
    const { container } = render(SafeMarkdown, {
      props: {
        source: 'See [docs](https://example.com/docs).',
        ariaLabel: 'Link overlay',
      },
    });
    const link = container.querySelector('a.safe-markdown--link');
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('rel', 'external noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
    if (!(link instanceof HTMLAnchorElement)) throw new Error('expected an external link');
    link.focus();
    await fireEvent.click(link);

    const dialog = await screen.findByRole('dialog', { name: 'In-app link' });
    expect(dialog).toBeInTheDocument();
    expect(container.querySelector('iframe.in-app-link--frame')).toHaveAttribute(
      'src',
      'https://example.com/docs',
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Close in-app link' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'In-app link' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(link));
  });

  it('never lets a rejected scheme reach the overlay', () => {
    expect(parseSafeMarkdown('[run](javascript:alert(1))')).toBeNull();
    expect(parseSafeMarkdown('[call](tel:+15555550100)')).toBeNull();
    const { container } = render(SafeMarkdown, {
      props: { source: '[run](javascript:alert(1))', ariaLabel: 'Rejected scheme' },
    });
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('[href]')).toBeNull();
  });
});
