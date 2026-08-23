// ───────────────────────────────────────────────────────────────────
// MODULE: PDF PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import PdfPreview from './pdf-preview.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/fixtures/demo.js';

// Reuse the frozen PDF fixtures so readiness and withholding exercise guarded bytes.
// Safety attestation stays tied to those fixtures rather than invented payloads.
const SAFE_BLOCK = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.id === 'blk-pdf-safe');
if (SAFE_BLOCK === undefined) {
  throw new Error('No safe PDF fixture found in DEMO_IMAGE_PDF_BLOCKS.');
}
const UNSAFE_BLOCK = DEMO_IMAGE_PDF_BLOCKS.find((block) => block.id === 'blk-pdf-unsafe');
if (UNSAFE_BLOCK === undefined) {
  throw new Error('No unsafe PDF fixture found in DEMO_IMAGE_PDF_BLOCKS.');
}

const meta = {
  title: 'Artifacts/PdfPreview',
  component: PdfPreview,
  tags: ['autodocs'],
} satisfies Meta<typeof PdfPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    block: SAFE_BLOCK,
    bytes: demoArtifactBytes(SAFE_BLOCK),
    findTerm: '',
    onFindTermChange: () => {},
    onStateChange: () => {},
  },
};
export const WithoutSafeBytes: Story = {
  args: {
    block: UNSAFE_BLOCK,
    bytes: demoArtifactBytes(UNSAFE_BLOCK),
    onStateChange: () => {},
  },
};
