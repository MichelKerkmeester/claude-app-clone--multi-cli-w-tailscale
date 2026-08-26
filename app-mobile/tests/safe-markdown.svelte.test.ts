// ───────────────────────────────────────────────────────────────────
// MODULE: Safe Markdown Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import SafeMarkdown, { parseSafeMarkdown } from '../src/pages/chat/rich-content/safe-markdown.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('SafeMarkdown', () => {
  it('renders an inert plain-text fallback for raw HTML and unsafe destinations', () => {
    const source = [
      '# Title',
      '<script>window.__richMarkdown = true</script>',
      '[run](javascript:alert(1))',
      '![pixel](data:image/svg+xml;base64,unsafe)',
      '<iframe src="https://remote.example"></iframe>',
      '<form action="/submit"><input></form>',
    ].join('\n');
    const { container } = render(SafeMarkdown, { props: { source, ariaLabel: 'Safe content' } });
    const content = screen.getByLabelText('Safe content');
    expect(content).toHaveTextContent('<script>window.__richMarkdown = true</script>');
    expect(container.querySelector('script, a, img, iframe, form, input')).toBeNull();
    expect(container.querySelector('[href], [src], [action]')).toBeNull();
    expect((window as Window & { __richMarkdown?: boolean }).__richMarkdown).toBeUndefined();
  });

  it('renders only the allowlisted AST subset without innerHTML', () => {
    const { container } = render(SafeMarkdown, {
      props: { source: '# Heading\n\n- one\n- two\n\n**bold** and `inline`\n\n```bash\nprintf "x"\n```' },
    });
    expect(container.querySelector('h1')).toHaveTextContent('Heading');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('strong')).toHaveTextContent('bold');
    expect(container.querySelector('pre code')).toHaveTextContent('printf "x"');
    expect(container.innerHTML).not.toContain('dangerouslySetInnerHTML');
    expect(parseSafeMarkdown('```bash\nincomplete')).toBeNull();
  });

  it('presents ANSI and bidi controls as read-only markers without exposing controls to the DOM', () => {
    const source = 'prefix \u001b[31mred\u001b[0m \u202ehidden order';
    const { container } = render(SafeMarkdown, { props: { source, ariaLabel: 'Control-safe text' } });
    const content = screen.getByLabelText('Control-safe text');

    expect(content).toHaveAttribute('data-control-presentation', 'readonly');
    expect(content.textContent).toContain('␛[31m');
    expect(content.textContent).toContain('⟦RLO⟧');
    expect(content.textContent).not.toContain('\u001b');
    expect(content.textContent).not.toContain('\u202e');
    expect(container.querySelector('script, style, iframe, form, img, audio, video')).toBeNull();
  });

  it('fails closed for obfuscated schemes and raw markup comments', () => {
    expect(parseSafeMarkdown('[unsafe](java\nscript:alert(1))')).toBeNull();
    expect(parseSafeMarkdown('[unsafe](data%3Atext/html%2Cnope)')).toBeNull();
    expect(parseSafeMarkdown('<!-- remote-looking markup -->')).toBeNull();
  });

  it('opens http(s) in a new tab and keeps file-path tokens inert', () => {
    const { container } = render(SafeMarkdown, {
      props: {
        source: 'See [docs](https://example.com/docs) and [readme](./README.md).',
        ariaLabel: 'Link handling',
      },
    });
    const link = container.querySelector('a.safe-markdown--link');
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'external noopener noreferrer');
    expect(container.querySelector('a[href="./README.md"]')).toBeNull();
    expect(container.querySelector('a[href^="file:"]')).toBeNull();
    const unavailable = container.querySelector('span.safe-markdown--unavailable');
    expect(unavailable).toHaveTextContent('readme');
    expect(unavailable).toHaveAttribute('title', 'Link unavailable');
  });

  it('never turns a local URI into an openable href', () => {
    const { container } = render(SafeMarkdown, {
      props: { source: '[secret](file:///tmp/secret)', ariaLabel: 'Local URI' },
    });
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('[href]')).toBeNull();
  });
});
