<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

  import './pdf-page.css';

  import {
    PDF_PREVIEW_MAX_CANVAS_DIMENSION,
    PDF_PREVIEW_MAX_CANVAS_PIXELS,
    pdfPreviewMetrics,
    safeCanvasScale,
    textSpans,
    type PdfPreviewState,
    type TextSpan,
  } from './pdf-preview-shared.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  interface Props {
    pdfDocument: PDFDocumentProxy;
    pageNumber: number;
    scale: number;
    textLayerSafe: boolean;
    findTerm: string;
    onStateChange: (state: PdfPreviewState) => void;
  }

  let { pdfDocument, pageNumber, scale, textLayerSafe, findTerm, onStateChange }: Props = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let viewportSize = $state({ width: 0, height: 0 });
  let spans = $state<readonly TextSpan[]>([]);

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    // Svelte tracks only synchronous reads. The async `.then()` below performs the real reads.
    // This effect reads every dependency synchronously and matches the original rerun set.
    void pdfDocument;
    void pageNumber;
    void scale;
    void textLayerSafe;
    void findTerm;
    void onStateChange;
    let active = true;
    let renderTask: RenderTask | null = null;
    let page: PDFPageProxy | null = null;
    const canvas = canvasEl;
    if (canvas === null) return undefined;
    pdfPreviewMetrics.liveCanvases += 1;
    const context = canvas.getContext('2d', { alpha: false });
    if (context === null) {
      onStateChange('corrupt');
      pdfPreviewMetrics.liveCanvases -= 1;
      return undefined;
    }

    void pdfDocument
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
        viewportSize = { width: viewport.width, height: viewport.height };
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
            spans = textSpans(textContent.items, findTerm, pageNumber);
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
      pdfPreviewMetrics.liveCanvases = Math.max(0, pdfPreviewMetrics.liveCanvases - 1);
    };
  });
</script>

<article class="pdf-preview-page" data-pdf-page={pageNumber} aria-label={`Page ${pageNumber}`} style:min-height={viewportSize.height > 0 ? `${viewportSize.height}px` : undefined}>
  <div class="pdf-preview-canvas-wrap" style:width={viewportSize.width ? `${viewportSize.width}px` : undefined}>
    <canvas bind:this={canvasEl} aria-label={`Rendered PDF page ${pageNumber}`}></canvas>
    {#if textLayerSafe && spans.length > 0}
      <div class="pdf-text-layer" aria-label={`Selectable text for page ${pageNumber}`}>{#each spans as span (span.key)}<span class={findTerm.trim().length > 0 && span.text.toLocaleLowerCase().includes(findTerm.trim().toLocaleLowerCase()) ? 'pdf-text-match' : undefined}>{span.text}</span>{/each}</div>
    {/if}
  </div>
</article>

<!-- @ds surface: pdf-preview-page — one rendered PDF page: canvas + selectable text overlay.
     Decomposed into this co-located CSS file; single-component. The text layer is Svelte-rendered (literal spans),
     the canvas is a literal element, so the descendant selectors scope plainly. The shared .pdf-page /
     .pdf-preview-shared classes stay global (→ app.css at cutover). Values unchanged. -->
