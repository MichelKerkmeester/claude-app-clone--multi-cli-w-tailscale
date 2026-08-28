// ───────────────────────────────────────────────────────────────────
// MODULE: Media Player Helpers
// ───────────────────────────────────────────────────────────────────
// Validates explicit artifact bytes before the media player creates a local playback URL.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type PlayableMediaKind = 'audio' | 'video';

export interface MediaPreviewInput {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly label?: string;
}

export interface PlayableMediaSource extends MediaPreviewInput {
  readonly kind: PlayableMediaKind;
}

// ───────────────────────────────────────────────────────────────────
// 2. MEDIA RESOLUTION
// ───────────────────────────────────────────────────────────────────

const PLAYABLE_MEDIA_TYPES: ReadonlyMap<string, PlayableMediaKind> = new Map([
  ['audio/aac', 'audio'],
  ['audio/flac', 'audio'],
  ['audio/mp4', 'audio'],
  ['audio/mpeg', 'audio'],
  ['audio/ogg', 'audio'],
  ['audio/wav', 'audio'],
  ['audio/wave', 'audio'],
  ['audio/webm', 'audio'],
  ['audio/x-m4a', 'audio'],
  ['audio/x-wav', 'audio'],
  ['video/mp4', 'video'],
  ['video/mpeg', 'video'],
  ['video/ogg', 'video'],
  ['video/quicktime', 'video'],
  ['video/webm', 'video'],
]);

// Keeps unknown renderers on the notice path instead of creating a blank player.
export function resolvePlayableMedia(
  input: MediaPreviewInput | null | undefined,
): PlayableMediaSource | null {
  if (input === null || input === undefined || !(input.bytes instanceof Uint8Array)) return null;
  if (input.bytes.byteLength === 0) return null;
  const mediaType = input.mediaType.trim().toLowerCase();
  const kind = PLAYABLE_MEDIA_TYPES.get(mediaType);
  if (kind === undefined) return null;
  return { ...input, mediaType, kind };
}

// Creates a URL for this player instance; its component owns revocation.
export function createScopedMediaObjectUrl(source: PlayableMediaSource): string | null {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  if (typeof URL.revokeObjectURL !== 'function') return null;
  try {
    return URL.createObjectURL(new Blob([source.bytes.slice()], { type: source.mediaType }));
  } catch {
    return null;
  }
}
