// ───────────────────────────────────────────────────────────────────
// MODULE: MEDIA PLAYER STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import MediaPlayer from './media-player.svelte';
import type { PlayableMediaSource } from './media-player.js';

const SILENT_WAV_DATA_URL =
  'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function bytesFromDataUrl(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(',')[1];
  if (encoded === undefined) throw new Error('The inline media fixture is missing its payload.');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

const AUDIO_SOURCE = {
  kind: 'audio',
  mediaType: 'audio/wav',
  bytes: bytesFromDataUrl(SILENT_WAV_DATA_URL),
  label: 'Short build-check recording',
} satisfies PlayableMediaSource;

const meta = {
  title: 'Artifacts/MediaPlayer',
  component: MediaPlayer,
  tags: ['autodocs'],
} satisfies Meta<typeof MediaPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AudioPreview: Story = {
  args: { source: AUDIO_SOURCE },
};
