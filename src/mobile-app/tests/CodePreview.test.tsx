import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodePreview } from '../src/artifacts/CodePreview.js';
import '../src/style.css';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CodePreview', () => {
  it('keeps plain code readable before highlighting and excludes the gutter from selection', () => {
    const source = 'const answer = 42;\nreturn answer;';
    render(<CodePreview text={source} language="typescript" enableHighlighting={false} />);
    const preview = screen.getByLabelText('Code preview');
    const code = preview.querySelector('.artifact-code-source');
    const gutter = preview.querySelector('.artifact-code-gutter');
    expect(code?.textContent).toBe(source);
    expect(gutter?.textContent).toBe('12');
    expect(gutter).toHaveAttribute('aria-hidden', 'true');
    expect(getComputedStyle(gutter as Element).userSelect).toBe('none');
    expect(getComputedStyle(code as Element).userSelect).not.toBe('none');
  });

  it('leaves exact plain text available when the optional worker fails and cleans it up', async () => {
    const terminate = vi.fn();
    class FailingWorker {
      public onerror: ((event: ErrorEvent) => void) | null = null;
      public onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      public postMessage() {
        this.onerror?.(new ErrorEvent('error'));
      }
      public terminate = terminate;
    }
    vi.stubGlobal('Worker', FailingWorker);
    const source = 'function safe() { return true; }';
    const view = render(<CodePreview text={source} language="typescript" />);
    await waitFor(() =>
      expect(screen.getByLabelText('Code preview').textContent).toContain(source),
    );
    expect(screen.getByLabelText('Code preview').textContent).toBe('1' + source);
    view.unmount();
    expect(terminate).toHaveBeenCalled();
  });

  it('marks Find matches without changing the copied text content', () => {
    const source = 'return value;\nreturn next;';
    render(<CodePreview text={source} findTerm="return" enableHighlighting={false} />);
    const preview = screen.getByLabelText('Code preview');
    expect(preview.textContent).toBe('12' + source);
    expect(preview.querySelectorAll('.artifact-find-match')).toHaveLength(2);
  });

  it('stops following after upward scroll and exposes a jump-to-latest action', () => {
    const view = render(
      <CodePreview text={'line one\nline two'} language="typescript" followTail />,
    );
    const preview = screen.getByLabelText('Code preview') as HTMLDivElement;
    Object.defineProperties(preview, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    fireEvent.scroll(preview);
    expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();

    view.rerender(
      <CodePreview text={'line one\nline two\nline three'} language="typescript" followTail />,
    );
    expect(preview.scrollTop).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));
    expect(preview.scrollTop).toBe(1000);
  });
});
