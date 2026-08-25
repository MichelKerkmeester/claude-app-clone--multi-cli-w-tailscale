// ───────────────────────────────────────────────────────────────────
// MODULE: ATTACHMENT TILE STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import AttachmentTile from './attachment-tile.svelte';
import type { AttachmentDraftItem } from './attachment-state.js';

// Each tile status in isolation — 1x1 image is UI scaffolding, not app data.
const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const noop = () => {};
const onOpen = (_id: string, _trigger: HTMLElement | null) => {};
const onRemove = (_id: string) => {};

const meta = {
  title: 'Attachments/AttachmentTile',
  component: AttachmentTile,
  tags: ['autodocs'],
} satisfies Meta<typeof AttachmentTile>;

export default meta;
type Story = StoryObj<typeof meta>;

const validatingItem: AttachmentDraftItem = {
  id: 'att-validating',
  ordinal: 1,
  label: 'Photo 1',
  status: 'local-validating',
  preview: 'unavailable',
  rejection: null,
};

const readyItem: AttachmentDraftItem = {
  id: 'att-ready',
  ordinal: 2,
  label: 'Photo 2',
  status: 'local-ready',
  preview: 'available',
  rejection: null,
};

const rejectedItem: AttachmentDraftItem = {
  id: 'att-rejected',
  ordinal: 3,
  label: 'Photo 3',
  status: 'local-rejected',
  preview: 'unavailable',
  rejection: 'unsupported-type',
};

const modelBlockedItem: AttachmentDraftItem = {
  id: 'att-blocked',
  ordinal: 1,
  label: 'Photo 1',
  status: 'model-blocked',
  preview: 'available',
  rejection: null,
};

export const Validating: Story = {
  args: {
    item: validatingItem,
    previewUrl: null,
    onOpen,
    onRemove,
    position: 1,
    total: 3,
  },
};

export const Ready: Story = {
  args: {
    item: readyItem,
    previewUrl: TRANSPARENT_PIXEL,
    onOpen,
    onRemove,
    position: 2,
    total: 3,
  },
};

export const Rejected: Story = {
  args: {
    item: rejectedItem,
    previewUrl: null,
    onOpen,
    onRemove,
    position: 3,
    total: 3,
  },
};

export const ModelBlocked: Story = {
  args: {
    item: modelBlockedItem,
    previewUrl: TRANSPARENT_PIXEL,
    onOpen,
    onRemove,
    position: 1,
    total: 1,
  },
};
