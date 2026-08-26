// ───────────────────────────────────────────────────────────────────
// MODULE: Screenshot Paste Naming Utility
// ───────────────────────────────────────────────────────────────────
// Pure helpers for clipboard image paste naming: MIME→extension map
// and filename generation.

// ───────────────────────────────────────────────────────────────────
// 1. MIME TO EXTENSION MAP
// ───────────────────────────────────────────────────────────────────

/** MIME type → file extension mapping for clipboard image pastes. */
export const SCREENSHOT_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
};

// ───────────────────────────────────────────────────────────────────
// 2. FILENAME GENERATION
// ───────────────────────────────────────────────────────────────────

/**
 * Generate a pasted-image filename from a MIME type.
 * Format: `pasted-<timestamp>.<ext>`
 */
export function pastedImageFilename(mimeType: string): string {
  const ext = SCREENSHOT_MIME_EXT[mimeType] ?? 'png';
  return `pasted-${Date.now()}.${ext}`;
}

/**
 * Create a File from a clipboard blob with a proper pasted-<ts> name.
 */
export function fileFromClipboardBlob(blob: Blob, mimeType: string): File {
  const filename = pastedImageFilename(mimeType);
  return new File([blob], filename, { type: mimeType });
}

/**
 * Test-safe version of the paste naming for non-Date-dependent tests.
 * Accepts a custom timestamp for deterministic testing.
 */
export function pastedImageFilenameForTest(mimeType: string, timestamp: number): string {
  const ext = SCREENSHOT_MIME_EXT[mimeType] ?? 'png';
  return `pasted-${timestamp}.${ext}`;
}