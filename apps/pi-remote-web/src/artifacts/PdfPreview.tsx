/// <reference types="vite/client" />

import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export const PDF_PREVIEW_MAX_BYTES = 50 * 1024 * 1024;
export const PDF_PREVIEW_MAX_PAGES = 500;
export const PDF_PREVIEW_MAX_CANVASES = 3;
export const PDF_PREVIEW_MAX_CANVAS_PIXELS = 12_000_000;
export const PDF_PREVIEW_MAX_CANVAS_DIMENSION = 4_096;
export const PDF_PREVIEW_MIN_ZOOM = 0.5;
export const PDF_PREVIEW_MAX_ZOOM = 4;

export type PdfPreviewState = 'loading' | 'ready' | 'corrupt' | 'too-large' | 'withheld';

export interface PdfPreviewProps {
  readonly block: FilePreviewBlock;
  readonly bytes: Uint8Array | null;
  readonly findTerm?: string;
  readonly onFindTermChange?: (term: string) => void;
  readonly onStateChange?: (state: PdfPreviewState) => void;
}

interface PdfJsModule {
  readonly getDocument: typeof import('pdfjs-dist').getDocument;
  readonly GlobalWorkerOptions: typeof import('pdfjs-dist').GlobalWorkerOptions;
}

interface TextSpan {
  readonly text: string;
  readonly key: string;
}

let pdfJsPromise: Promise<PdfJsModule> | null = null;
let liveWorkerCount = 0;
let liveCanvasCount = 0;

export function getPdfPreviewRuntimeMetrics(): {
  readonly liveWorkers: number;
  readonly liveCanvases: number;
} {
  return { liveWorkers: liveWorkerCount, liveCanvases: liveCanvasCount };
}

function loadPdfJs(): Promise<PdfJsModule> {
  if (pdfJsPromise === null) {
    pdfJsPromise = import('pdfjs-dist').then((module) => {
      module.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return module;
    });
  }
  return pdfJsPromise;
}

function clampZoom(value: number): number {
  return Math.min(PDF_PREVIEW_MAX_ZOOM, Math.max(PDF_PREVIEW_MIN_ZOOM, value));
}

function stateMessage(state: PdfPreviewState): string | null {
  switch (state) {
    case 'corrupt':
      return 'The PDF could not be verified.';
    case 'too-large':
      return 'The PDF is too large to preview safely.';
    case 'withheld':
      return 'Text selection is unavailable because this PDF could not be attested safe.';
    default:
      return null;
  }
}

function isBoundedPageCount(pageCount: number): boolean {
  return Number.isInteger(pageCount) && pageCount > 0 && pageCount <= PDF_PREVIEW_MAX_PAGES;
}

export function pagesAround(current: number, total: number): number[] {
  return Array.from(
    new Set([Math.max(1, current - 1), current, Math.min(total, current + 1)]),
  );
}

function safeCanvasScale(
  width: number,
  height: number,
  requestedScale: number,
): number | null {
  if (width <= 0 || height <= 0) return null;
  const maxScale = Math.min(
    PDF_PREVIEW_MAX_CANVAS_DIMENSION / width,
    PDF_PREVIEW_MAX_CANVAS_DIMENSION / height,
    Math.sqrt(PDF_PREVIEW_MAX_CANVAS_PIXELS / (width * height)),
  );
  const scale = Math.min(requestedScale, maxScale);
  return scale >= PDF_PREVIEW_MIN_ZOOM ? scale : null;
}

function textSpans(
  items: readonly unknown[],
  findTerm: string,
  pageNumber: number,
): TextSpan[] {
  const needle = findTerm.trim().toLocaleLowerCase();
  return items
    .map((item, index) => {
      const text =
        typeof item === 'object' &&
        item !== null &&
        'str' in item &&
        typeof item.str === 'string'
          ? item.str
          : '';
      return { text, key: `${pageNumber}-${index}` };
    })
    .filter((item) => item.text.length > 0)
    .map((item) => ({
      ...item,
      text:
        needle.length > 0 && item.text.toLocaleLowerCase().includes(needle)
          ? item.text
          : item.text,
    }));
}

function PdfPage({
  document,
  pageNumber,
  scale,
  textLayerSafe,
  findTerm,
  onStateChange,
}: {
  readonly document: import('pdfjs-dist').PDFDocumentProxy;
  readonly pageNumber: number;
  readonly scale: number;
  readonly textLayerSafe: boolean;
  readonly findTerm: string;
  readonly onStateChange: (state: PdfPreviewState) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [spans, setSpans] = useState<readonly TextSpan[]>([]);

  useEffect(() => {
    let active = true;
    let renderTask: import('pdfjs-dist').RenderTask | null = null;
    let page: import('pdfjs-dist').PDFPageProxy | null = null;
    const canvas = canvasRef.current;
    if (canvas === null) return undefined;
    liveCanvasCount += 1;
    const context = canvas.getContext('2d', { alpha: false });
    if (context === null) {
      onStateChange('corrupt');
      liveCanvasCount -= 1;
      return undefined;
    }

    void document
      .getPage(pageNumber)
      .then(async (nextPage) => {
        if (!active) {
          nextPage.cleanup();
          return;
        }
        page = nextPage;
        const baseViewport = nextPage.getViewport({ scale: 1 });
        const renderScale = safeCanvasScale(baseViewport.width, baseViewport.height, scale);
        if (renderScale === null) {
          onStateChange('too-large');
          return;
        }
        const viewport = nextPage.getViewport({ scale: renderScale });
        const ratio = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
        const pixelWidth = Math.ceil(viewport.width * ratio);
        const pixelHeight = Math.ceil(viewport.height * ratio);
        if (
          pixelWidth <= 0 ||
          pixelHeight <= 0 ||
          pixelWidth > PDF_PREVIEW_MAX_CANVAS_DIMENSION * 2 ||
          pixelHeight > PDF_PREVIEW_MAX_CANVAS_DIMENSION * 2 ||
          pixelWidth * pixelHeight > PDF_PREVIEW_MAX_CANVAS_PIXELS
        ) {
          onStateChange('too-large');
          return;
        }
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        setViewportSize({ width: viewport.width, height: viewport.height });
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        renderTask = nextPage.render({
          canvasContext: context,
          canvas,
          viewport,
          annotationMode: 0,
        });
        await renderTask.promise;
        if (!active) return;
        if (textLayerSafe) {
          const textContent = await nextPage.getTextContent({
            includeMarkedContent: false,
            disableNormalization: true,
          });
          if (active) {
            setSpans(textSpans(textContent.items, findTerm, pageNumber));
          }
        }
      })
      .catch(() => {
        if (active) onStateChange('corrupt');
      });

    return () => {
      active = false;
      renderTask?.cancel();
      if (page !== null) page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
      canvas.replaceChildren();
      liveCanvasCount = Math.max(0, liveCanvasCount - 1);
    };
  }, [document, findTerm, onStateChange, pageNumber, scale, textLayerSafe]);

  return (
    <article
      className="pdf-preview-page"
      data-pdf-page={pageNumber}
      aria-label={`Page ${pageNumber}`}
      style={{ minHeight: viewportSize.height > 0 ? viewportSize.height : undefined }}
    >
      <div className="pdf-preview-canvas-wrap" style={{ width: viewportSize.width || undefined }}>
        <canvas ref={canvasRef} aria-label={`Rendered PDF page ${pageNumber}`} />
        {textLayerSafe && spans.length > 0 && (
          <div className="pdf-text-layer" aria-label={`Selectable text for page ${pageNumber}`}>
            {spans.map((span) => (
              <span
                key={span.key}
                className={
                  findTerm.trim().length > 0 &&
                  span.text.toLocaleLowerCase().includes(findTerm.trim().toLocaleLowerCase())
                    ? 'pdf-text-match'
                    : undefined
                }
              >
                {span.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function PdfPreview({
  block,
  bytes,
  findTerm = '',
  onFindTermChange,
  onStateChange,
}: PdfPreviewProps) {
  const [state, setState] = useState<PdfPreviewState>('loading');
  const [document, setDocument] = useState<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let loadingTask: import('pdfjs-dist').PDFDocumentLoadingTask | null = null;
    let loadedDocument: import('pdfjs-dist').PDFDocumentProxy | null = null;
    setState('loading');
    setDocument(null);
    setPageCount(0);
    setCurrentPage(1);
    if (
      bytes === null ||
      bytes.byteLength === 0 ||
      bytes.byteLength > PDF_PREVIEW_MAX_BYTES ||
      (block.byteLength !== null && bytes.byteLength !== block.byteLength)
    ) {
      setState('too-large');
      return () => {
        active = false;
      };
    }
    if (block.textLayerSafe !== true) {
      setState('withheld');
      return () => {
        active = false;
      };
    }

    liveWorkerCount += 1;
    void loadPdfJs()
      .then(({ getDocument }) => {
        if (!active) return null;
        loadingTask = getDocument({
          data: bytes.slice(),
          disableAutoFetch: true,
          disableStream: true,
          enableXfa: false,
          stopAtErrors: true,
        });
        return loadingTask.promise;
      })
      .then(async (nextDocument) => {
        if (nextDocument === null || !active) {
          if (nextDocument !== null) {
            await nextDocument.cleanup();
            await nextDocument.loadingTask.destroy();
          }
          return;
        }
        loadedDocument = nextDocument;
        if (!isBoundedPageCount(nextDocument.numPages)) {
          setState('too-large');
          await nextDocument.cleanup();
          await nextDocument.loadingTask.destroy();
          return;
        }
        const firstPage = await nextDocument.getPage(1);
        if (!active) {
          firstPage.cleanup();
          return;
        }
        setPageWidth(firstPage.getViewport({ scale: 1 }).width);
        firstPage.cleanup();
        setPageCount(nextDocument.numPages);
        setState('ready');
        setDocument(nextDocument);
      })
      .catch(() => {
        if (active) setState('corrupt');
      });

    return () => {
      active = false;
      liveWorkerCount = Math.max(0, liveWorkerCount - 1);
      if (loadingTask !== null) void loadingTask.destroy();
      if (loadedDocument !== null) {
        void loadedDocument.cleanup();
        void loadedDocument.loadingTask.destroy();
      }
      setDocument(null);
    };
  }, [block.byteLength, block.digest, block.textLayerSafe, bytes]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => setContainerWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [document]);

  const scale = useMemo(() => {
    if (!fitWidth || containerWidth <= 0 || pageWidth <= 0) return clampZoom(zoom);
    return clampZoom(containerWidth / pageWidth);
  }, [containerWidth, fitWidth, pageWidth, zoom]);

  const visiblePages = useMemo(
    () => (document === null ? [] : pagesAround(currentPage, pageCount)),
    [currentPage, document, pageCount],
  );

  const onPageState = useCallback((nextState: PdfPreviewState) => {
    if (nextState !== 'ready') setState(nextState);
  }, []);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const containerTop = container.getBoundingClientRect().top;
    let nearestPage = currentPage;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const page of Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-page]'))) {
      const pageNumber = Number(page.dataset.pdfPage);
      const distance = Math.abs(page.getBoundingClientRect().top - containerTop);
      if (Number.isFinite(pageNumber) && distance < nearestDistance) {
        nearestPage = pageNumber;
        nearestDistance = distance;
      }
    }
    if (nearestPage !== currentPage) setCurrentPage(nearestPage);
  };

  const message = stateMessage(state);
  return (
    <section className="pdf-preview" aria-label="Sanitized PDF preview" data-pdf-state={state}>
      <div className="pdf-preview-controls" role="group" aria-label="PDF controls">
        <button
          type="button"
          className="artifact-control-button"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={currentPage <= 1 || pageCount === 0}
        >
          Previous
        </button>
        <span className="pdf-page-indicator" aria-live="polite">
          {pageCount === 0 ? 'Page —' : `Page ${currentPage} of ${pageCount}`}
        </span>
        <button
          type="button"
          className="artifact-control-button"
          onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
          disabled={pageCount === 0 || currentPage >= pageCount}
        >
          Next
        </button>
        <button
          type="button"
          className="artifact-control-button"
          onClick={() => {
            setFitWidth(true);
            setZoom(1);
          }}
        >
          Fit width
        </button>
        <button
          type="button"
          className="artifact-control-button"
          onClick={() => {
            setFitWidth(false);
            setZoom((value) => clampZoom(value - 0.25));
          }}
          disabled={zoom <= PDF_PREVIEW_MIN_ZOOM && !fitWidth}
        >
          Zoom out
        </button>
        <button
          type="button"
          className="artifact-control-button"
          onClick={() => {
            setFitWidth(false);
            setZoom((value) => clampZoom(value + 0.25));
          }}
          disabled={zoom >= PDF_PREVIEW_MAX_ZOOM}
        >
          Zoom in
        </button>
        {block.textLayerSafe === true && (
          <label className="artifact-find-control">
            <span>Search</span>
            <input
              type="search"
              value={findTerm}
              onChange={(event) => onFindTermChange?.(event.currentTarget.value)}
              aria-label="Search verified PDF text"
            />
          </label>
        )}
      </div>
      {message !== null && (
        <p className="artifact-preview-message" role="alert">
          {message}
        </p>
      )}
      {state === 'loading' && (
        <p className="artifact-preview-message" role="status">
          Loading controlled PDF pages.
        </p>
      )}
      <div
        ref={scrollRef}
        className="pdf-preview-scroll"
        onScroll={onScroll}
        data-pdf-rendered-pages={visiblePages.length}
      >
        {state === 'ready' &&
          document !== null &&
          visiblePages.map((pageNumber) => (
            <PdfPage
              key={`${block.revision}-${pageNumber}-${scale}`}
              document={document}
              pageNumber={pageNumber}
              scale={scale}
              textLayerSafe={block.textLayerSafe === true}
              findTerm={findTerm}
              onStateChange={onPageState}
            />
          ))}
      </div>
    </section>
  );
}

