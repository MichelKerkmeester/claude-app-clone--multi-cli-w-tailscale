import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import SafeMarkdown, { parseSafeMarkdown } from '../src/lib/rich-content/SafeMarkdown.svelte';

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
});
