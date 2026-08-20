<script module lang="ts">
  export {
    PDF_PREVIEW_MAX_BYTES,
    PDF_PREVIEW_MAX_PAGES,
    PDF_PREVIEW_MAX_CANVASES,
    PDF_PREVIEW_MAX_CANVAS_PIXELS,
    PDF_PREVIEW_MAX_CANVAS_DIMENSION,
    PDF_PREVIEW_MIN_ZOOM,
    PDF_PREVIEW_MAX_ZOOM,
    getPdfPreviewRuntimeMetrics,
    pagesAround,
  } from './pdf-preview-shared.js';
  export type { PdfPreviewState, PdfPreviewProps } from './pdf-preview-shared.js';
</script>

<script lang="ts">
  import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist';

  import PdfPage from './PdfPage.svelte';
  import {
    clampZoom,
    isBoundedPageCount,
    loadPdfJs,
    pagesAround,
    pdfPreviewMetrics,
    stateMessage,
    PDF_PREVIEW_MAX_BYTES,
    PDF_PREVIEW_MAX_ZOOM,
    PDF_PREVIEW_MIN_ZOOM,
    type PdfPreviewProps,
    type PdfPreviewState,
  } from './pdf-preview-shared.js';

  let { block, bytes, findTerm = '', onFindTermChange, onStateChange }: PdfPreviewProps = $props();

  let pdfState = $state<PdfPreviewState>('loading');
  let pdfDocument = $state<PDFDocumentProxy | null>(null);
  let pageCount = $state(0);
  let currentPage = $state(1);
  let zoom = $state(1);
  let fitWidth = $state(true);
  let containerWidth = $state(0);
  let pageWidth = $state(0);
  let scrollEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    void block.digest;
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let loadedDocument: PDFDocumentProxy | null = null;
    pdfState = 'loading';
    pdfDocument = null;
    pageCount = 0;
    currentPage = 1;
    const currentBytes = bytes;
    if (
      currentBytes === null ||
      currentBytes.byteLength === 0 ||
      currentBytes.byteLength > PDF_PREVIEW_MAX_BYTES ||
      (block.byteLength !== null && currentBytes.byteLength !== block.byteLength)
    ) {
      pdfState = 'too-large';
      return () => {
        active = false;
      };
    }
    if (block.textLayerSafe !== true) {
      pdfState = 'withheld';
      return () => {
        active = false;
      };
    }

    pdfPreviewMetrics.liveWorkers += 1;
    void loadPdfJs()
      .then(({ getDocument }) => {
        if (!active) return null;
        loadingTask = getDocument({
          data: currentBytes.slice(),
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
          pdfState = 'too-large';
          await nextDocument.cleanup();
          await nextDocument.loadingTask.destroy();
          return;
        }
        const firstPage = await nextDocument.getPage(1);
        if (!active) {
          firstPage.cleanup();
          return;
        }
        pageWidth = firstPage.getViewport({ scale: 1 }).width;
        firstPage.cleanup();
        pageCount = nextDocument.numPages;
        pdfState = 'ready';
        pdfDocument = nextDocument;
      })
      .catch(() => {
        if (active) pdfState = 'corrupt';
      });

    return () => {
      active = false;
      pdfPreviewMetrics.liveWorkers = Math.max(0, pdfPreviewMetrics.liveWorkers - 1);
      if (loadingTask !== null) void loadingTask.destroy();
      if (loadedDocument !== null) {
        void loadedDocument.cleanup();
        void loadedDocument.loadingTask.destroy();
      }
      pdfDocument = null;
    };
  });

  $effect(() => {
    onStateChange?.(pdfState);
  });

  $effect(() => {
    void pdfDocument;
    const element = scrollEl;
    if (element === null || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => {
      containerWidth = element.clientWidth;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  });

  const scale = $derived(
    !fitWidth || containerWidth <= 0 || pageWidth <= 0
      ? clampZoom(zoom)
      : clampZoom(containerWidth / pageWidth),
  );

  const visiblePages = $derived(pdfDocument === null ? [] : pagesAround(currentPage, pageCount));

  function onPageState(nextState: PdfPreviewState): void {
    if (nextState !== 'ready') pdfState = nextState;
  }

  function onScroll(): void {
    const container = scrollEl;
    if (container === null) return;
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
    if (nearestPage !== currentPage) currentPage = nearestPage;
  }

  const message = $derived(stateMessage(pdfState));
</script>

<!-- @ds surface: pdf-preview — the controlled PDF.js reader (bounded pages/canvases). -->
<!-- @ds state: loading · ready · corrupt · too-large · withheld — [data-pdf-state] each. -->
<!-- @ds guardrail: do-not-edit — the worker is configured with annotations/XFA disabled and
     bounded pages/canvases; the text layer renders only when the relay attested safety
     (textLayerSafe) and is otherwise withheld. Wiring is frozen. -->
<section class="pdf-preview" aria-label="Sanitized PDF preview" data-pdf-state={pdfState}>
  <div class="pdf-preview-controls" role="group" aria-label="PDF controls">
    <button type="button" class="artifact-control-button" onclick={() => (currentPage = Math.max(1, currentPage - 1))} disabled={currentPage <= 1 || pageCount === 0}>Previous</button>
    <span class="pdf-page-indicator" aria-live="polite">{pageCount === 0 ? 'Page —' : `Page ${currentPage} of ${pageCount}`}</span>
    <button type="button" class="artifact-control-button" onclick={() => (currentPage = Math.min(pageCount, currentPage + 1))} disabled={pageCount === 0 || currentPage >= pageCount}>Next</button>
    <button type="button" class="artifact-control-button" onclick={() => { fitWidth = true; zoom = 1; }}>Fit width</button>
    <button type="button" class="artifact-control-button" onclick={() => { fitWidth = false; zoom = clampZoom(zoom - 0.25); }} disabled={zoom <= PDF_PREVIEW_MIN_ZOOM && !fitWidth}>Zoom out</button>
    <button type="button" class="artifact-control-button" onclick={() => { fitWidth = false; zoom = clampZoom(zoom + 0.25); }} disabled={zoom >= PDF_PREVIEW_MAX_ZOOM}>Zoom in</button>
    {#if block.textLayerSafe === true}
      <label class="artifact-find-control">
        <span>Search</span>
        <input type="search" value={findTerm} oninput={(event) => onFindTermChange?.(event.currentTarget.value)} aria-label="Search verified PDF text" />
      </label>
    {/if}
  </div>
  {#if message !== null}<p class="artifact-preview-message" role="alert">{message}</p>{/if}
  {#if pdfState === 'loading'}<p class="artifact-preview-message" role="status">Loading controlled PDF pages.</p>{/if}
  <div bind:this={scrollEl} class="pdf-preview-scroll" onscroll={onScroll} data-pdf-rendered-pages={visiblePages.length}>{#if pdfState === 'ready' && pdfDocument !== null}{@const readyDocument = pdfDocument}{#each visiblePages as pageNumber (`${block.revision}-${pageNumber}-${scale}`)}<PdfPage pdfDocument={readyDocument} pageNumber={pageNumber} scale={scale} textLayerSafe={block.textLayerSafe === true} findTerm={findTerm} onStateChange={onPageState} />{/each}{/if}</div>
</section>

<!-- @ds surface: pdf-preview — the controlled PDF.js reader shell: controls, page indicator, and the
     page scroll column (individual pages are the PdfPage child). Decomposed from style.css; all
     single-component and static. .pdf-preview-controls was grouped with the different
     .image-preview-controls (ImagePreview) — only the pdf slice moves here. The shared .pdf-page /
     .pdf-preview-shared and the .artifact-control-button / .artifact-find-control on the toolbar stay
     global (→ app.css at cutover). Literal hex preserved. Values unchanged. -->
<style>
  /* @ds slot: pdf-preview — the reader shell. */
  .pdf-preview {
    display: grid;
    min-inline-size: 0;
    gap: var(--space-3);
  }

  /* @ds slot: pdf-controls — the PDF toolbar row. */
  .pdf-preview-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  /* @ds slot: page-indicator — the "Page N of M" read-out. */
  .pdf-page-indicator {
    min-block-size: 2.75rem;
    padding-inline: var(--space-2);
    color: var(--ink-secondary);
    font-variant-numeric: tabular-nums;
  }

  /* @ds slot: page-scroll — the bounded, contained page scroll column. */
  /* @ds guardrail: do-not-edit — bounded reading well; overscroll contained so panning never chains. */
  .pdf-preview-scroll {
    display: grid;
    min-block-size: 12rem;
    max-block-size: min(70vh, 48rem);
    min-inline-size: 0;
    gap: var(--space-3);
    overflow: auto;
    overscroll-behavior: contain;
    padding: var(--space-2);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: #24221f;
  }
</style>
