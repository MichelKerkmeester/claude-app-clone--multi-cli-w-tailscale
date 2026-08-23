import type { Meta, StoryObj } from '@storybook/sveltekit';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import PdfPage from './PdfPage.svelte';
import { loadPdfJs } from './pdf-preview-shared.js';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/data/demo.js';

// Re-host the frozen DEMO_IMAGE_PDF_BLOCKS safe-PDF entry so every story arg is
// sourced from the demo data — nothing is invented. PdfPage's own type demands
// a loaded PDFDocumentProxy (no demo fixture exports one), so a CSF loader
// builds it through the component family's own pinned loadPdfJs() seam over the
// fixture's real PDF bytes, mirroring the exact getDocument wiring PdfPreview
// uses. PdfPage is prop-only (no context read), so no decorator; onStateChange
// is a no-op.
const SAFE_BLOCK = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.id === 'blk-pdf-safe');
if (SAFE_BLOCK === undefined) {
  throw new Error('No safe PDF fixture found in DEMO_IMAGE_PDF_BLOCKS.');
}
const PDF_BYTES = demoArtifactBytes(SAFE_BLOCK);

const meta = {
  title: 'Artifacts/PdfPage',
  component: PdfPage,
  tags: ['autodocs'],
} satisfies Meta<typeof PdfPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pageNumber: 1,
    scale: 1,
    textLayerSafe: SAFE_BLOCK.textLayerSafe === true,
    findTerm: '',
    onStateChange: () => {},
  },
  loaders: [
    async (): Promise<{ pdfDocument: PDFDocumentProxy }> => {
      const { getDocument } = await loadPdfJs();
      const loadingTask = getDocument({
        data: PDF_BYTES.slice(),
        disableAutoFetch: true,
        disableStream: true,
        enableXfa: false,
        stopAtErrors: true,
      });
      return { pdfDocument: await loadingTask.promise };
    },
  ],
  render: (args, { loaded }) => ({
    Component: PdfPage,
    props: { ...args, pdfDocument: loaded.pdfDocument },
  }),
};
