// ───────────────────────────────────────────────────────────────────
// MODULE: Paste Naming Utility Tests
// ───────────────────────────────────────────────────────────────────

// Proves the screenshot MIME→extension map and filename generation
// produce correct names for clipboard image pastes.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import {
  SCREENSHOT_MIME_EXT,
  pastedImageFilenameForTest,
  fileFromClipboardBlob,
} from '../src/shared/commands/paste-utils.js';

// ───────────────────────────────────────────────────────────────────
// 2. TESTS
// ───────────────────────────────────────────────────────────────────

describe('SCREENSHOT_MIME_EXT', () => {
  it('maps image/png to png', () => {
    expect(SCREENSHOT_MIME_EXT['image/png']).toBe('png');
  });

  it('maps image/jpeg to jpg', () => {
    expect(SCREENSHOT_MIME_EXT['image/jpeg']).toBe('jpg');
  });

  it('maps image/webp to webp', () => {
    expect(SCREENSHOT_MIME_EXT['image/webp']).toBe('webp');
  });

  it('maps image/gif to gif', () => {
    expect(SCREENSHOT_MIME_EXT['image/gif']).toBe('gif');
  });

  it('maps image/bmp to bmp', () => {
    expect(SCREENSHOT_MIME_EXT['image/bmp']).toBe('bmp');
  });

  it('maps image/avif to avif', () => {
    expect(SCREENSHOT_MIME_EXT['image/avif']).toBe('avif');
  });

  it('maps image/tiff to tiff', () => {
    expect(SCREENSHOT_MIME_EXT['image/tiff']).toBe('tiff');
  });
});

describe('pastedImageFilenameForTest', () => {
  it('generates pasted-<ts>.png for image/png', () => {
    expect(pastedImageFilenameForTest('image/png', 1234567890)).toBe('pasted-1234567890.png');
  });

  it('generates pasted-<ts>.jpg for image/jpeg', () => {
    expect(pastedImageFilenameForTest('image/jpeg', 1234567890)).toBe('pasted-1234567890.jpg');
  });

  it('defaults to png for unknown MIME types', () => {
    expect(pastedImageFilenameForTest('image/svg+xml', 1234567890)).toBe('pasted-1234567890.png');
  });
});

describe('fileFromClipboardBlob', () => {
  it('creates a File with the correct name and type', () => {
    const blob = new Blob(['fake-image-data'], { type: 'image/png' });
    // Freeze Date.now for the test
    const originalNow = Date.now;
    Date.now = () => 1234567890;
    try {
      const file = fileFromClipboardBlob(blob, 'image/png');
      expect(file.name).toBe('pasted-1234567890.png');
      expect(file.type).toBe('image/png');
    } finally {
      Date.now = originalNow;
    }
  });

  it('creates a File with jpg extension for image/jpeg', () => {
    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    const originalNow = Date.now;
    Date.now = () => 1234567890;
    try {
      const file = fileFromClipboardBlob(blob, 'image/jpeg');
      expect(file.name).toBe('pasted-1234567890.jpg');
    } finally {
      Date.now = originalNow;
    }
  });
});