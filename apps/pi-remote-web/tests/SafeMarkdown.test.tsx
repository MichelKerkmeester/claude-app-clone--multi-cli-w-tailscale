import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { parseSafeMarkdown, SafeMarkdown } from '../src/rich-content/SafeMarkdown.js';

afterEach(cleanup);

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
    const { container } = render(<SafeMarkdown source={source} ariaLabel="Safe content" />);
    const content = screen.getByLabelText('Safe content');
    expect(content).toHaveTextContent('<script>window.__richMarkdown = true</script>');
    expect(container.querySelector('script, a, img, iframe, form, input')).toBeNull();
    expect(container.querySelector('[href], [src], [action]')).toBeNull();
    expect((window as Window & { __richMarkdown?: boolean }).__richMarkdown).toBeUndefined();
  });

  it('renders only the allowlisted AST subset without innerHTML', () => {
    const { container } = render(
      <SafeMarkdown
        source={'# Heading\n\n- one\n- two\n\n**bold** and `inline`\n\n```bash\nprintf "x"\n```'}
      />,
    );
    expect(container.querySelector('h1')).toHaveTextContent('Heading');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('strong')).toHaveTextContent('bold');
    expect(container.querySelector('pre code')).toHaveTextContent('printf "x"');
    expect(container.innerHTML).not.toContain('dangerouslySetInnerHTML');
    expect(parseSafeMarkdown('```bash\nincomplete')).toBeNull();
  });
});
