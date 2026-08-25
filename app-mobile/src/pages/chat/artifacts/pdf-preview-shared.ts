/// <reference types="vite/client" />

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// ───────────────────────────────────────────────────────────────────
// 2. PREVIEW BOUNDS AND STATE TYPES
// ───────────────────────────────────────────────────────────────────

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

export interface TextSpan {
  readonly text: string;
  readonly key: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. PDF.JS LOADING AND RUNTIME METRICS
// ───────────────────────────────────────────────────────────────────

let pdfJsPromise: Promise<PdfJsModule> | null = null;

// Shared counters let PdfPage and PdfPreview mutate one leak-detector object.
export const pdfPreviewMetrics = { liveWorkers: 0, liveCanvases: 0 };

export function getPdfPreviewRuntimeMetrics(): {
  readonly liveWorkers: number;
  readonly liveCanvases: number;
} {
  return { liveWorkers: pdfPreviewMetrics.liveWorkers, liveCanvases: pdfPreviewMetrics.liveCanvases };
}

export function loadPdfJs(): Promise<PdfJsModule> {
  // @ds guardrail: do-not-edit — The pinned PDF.js module loads one bounded worker with annotations/XFA disabled and bounded pages/canvases. Do not re-point it.
  if (pdfJsPromise === null) {
    pdfJsPromise = import('pdfjs-dist').then((module) => {
      module.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return module;
    });
  }
  return pdfJsPromise;
}

// ───────────────────────────────────────────────────────────────────
// 4. ZOOM, PAGE AND TEXT HELPERS
// ───────────────────────────────────────────────────────────────────

export function clampZoom(value: number): number {
  return Math.min(PDF_PREVIEW_MAX_ZOOM, Math.max(PDF_PREVIEW_MIN_ZOOM, value));
}

export function stateMessage(state: PdfPreviewState): string | null {
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

export function isBoundedPageCount(pageCount: number): boolean {
  return Number.isInteger(pageCount) && pageCount > 0 && pageCount <= PDF_PREVIEW_MAX_PAGES;
}

export function pagesAround(current: number, total: number): number[] {
  return Array.from(
    new Set([Math.max(1, current - 1), current, Math.min(total, current + 1)]),
  );
}

export function safeCanvasScale(
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

export function textSpans(
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
