import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

vi.mock('pdfjs-dist', () => {
  const page = {
    getViewport: vi.fn(() => ({ width: 100, height: 140 })),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
    getTextContent: vi.fn(async () => ({ items: [{ str: 'Verified safe PDF text' }] })),
    cleanup: vi.fn(),
  };
  const loadingTask = {
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn(async () => page),
      cleanup: vi.fn(async () => undefined),
      loadingTask: { destroy: vi.fn(async () => undefined) },
    }),
    destroy: vi.fn(async () => undefined),
  };
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn(() => loadingTask),
  };
});

import {
  getPdfPreviewRuntimeMetrics,
  pagesAround,
  PdfPreview,
} from '../src/artifacts/PdfPreview.js';

function block(overrides: Partial<FilePreviewBlock> = {}): FilePreviewBlock {
  return {
    id: 'pdf-preview-block',
    revision: 'rev_pdf_preview',
    seq: 1,
    occurredAt: '2026-08-17T00:00:00.000Z',
    kind: 'file_preview',
    artifactId: 'artifact_pdf_preview',
    displayName: 'safe.pdf',
    renderer: 'pdf',
    mimeType: 'application/pdf',
    byteLength: 2,
    digest: 'b'.repeat(64),
    redaction: 'applied',
    completeness: 'complete',
    shareAllowed: true,
    textLayerSafe: true,
    pageCount: 2,
    availability: 'ready',
    content: { kind: 'artifact-ref' },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PdfPreview', () => {
  it('keeps page virtualization bounded and exposes verified text controls', async () => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({ setTransform: vi.fn() }),
    });
    const onFindTermChange = vi.fn();
    render(
      <PdfPreview
        block={block()}
        bytes={new Uint8Array([1, 2])}
        findTerm=""
        onFindTermChange={onFindTermChange}
      />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Sanitized PDF preview')).toHaveAttribute(
        'data-pdf-state',
        'ready',
      ),
    );
    await waitFor(() => expect(screen.getByLabelText('Selectable text for page 1')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Fit width' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search verified PDF text' }), {
      target: { value: 'safe' },
    });
    expect(onFindTermChange).toHaveBeenCalledWith('safe');
    expect(Number(document.querySelector('.pdf-preview-scroll')?.dataset.pdfRenderedPages)).toBeLessThanOrEqual(3);
    expect(pagesAround(1, 500)).toEqual([1, 2]);
  });

  it('withholds unverified PDFs before PDF.js loads and never creates a text layer', async () => {
    render(
      <PdfPreview
        block={block({ textLayerSafe: false })}
        bytes={new Uint8Array([1, 2])}
      />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Sanitized PDF preview')).toHaveAttribute(
        'data-pdf-state',
        'withheld',
      ),
    );
    expect(document.querySelector('.pdf-text-layer')).toBeNull();
    expect(screen.queryByText(/could not be attested safe/i)).toBeInTheDocument();
  });

  it('returns zero live worker/canvas counters after repeated unmounts', async () => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({ setTransform: vi.fn() }),
    });
    for (let iteration = 0; iteration < 4; iteration += 1) {
      const rendered = render(<PdfPreview block={block()} bytes={new Uint8Array([1, 2])} />);
      await waitFor(() =>
        expect(screen.getByLabelText('Sanitized PDF preview')).toHaveAttribute(
          'data-pdf-state',
          'ready',
        ),
      );
      rendered.unmount();
      await Promise.resolve();
      expect(getPdfPreviewRuntimeMetrics()).toEqual({ liveWorkers: 0, liveCanvases: 0 });
    }
  });
});

