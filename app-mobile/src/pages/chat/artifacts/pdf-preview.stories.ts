// ───────────────────────────────────────────────────────────────────
// MODULE: PDF PREVIEW STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import PdfPreview from './pdf-preview.svelte';
import { DEMO_IMAGE_PDF_BLOCKS, demoArtifactBytes } from '$shared/fixtures/demo.js';

// Frozen PDF fixtures — guarded bytes and safety attestation provenance.
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
