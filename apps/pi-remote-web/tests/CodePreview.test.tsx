import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:code-worker'),
      revokeObjectURL,
    });
    const source = 'function safe() { return true; }';
    const view = render(<CodePreview text={source} />);
    await waitFor(() =>
      expect(screen.getByLabelText('Code preview').textContent).toContain(source),
    );
    expect(screen.getByLabelText('Code preview').textContent).toBe('1' + source);
    view.unmount();
    expect(terminate).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:code-worker');
  });

  it('marks Find matches without changing the copied text content', () => {
    const source = 'return value;\nreturn next;';
    render(<CodePreview text={source} findTerm="return" enableHighlighting={false} />);
    const preview = screen.getByLabelText('Code preview');
    expect(preview.textContent).toBe('12' + source);
    expect(preview.querySelectorAll('.artifact-find-match')).toHaveLength(2);
  });
});
