// ───────────────────────────────────────────────────────────────────
// MODULE: Safe Markdown Host Artifact Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import type { HostResolvedProsePath } from '../src/pages/chat/rich-content/prose-link.js';
import SafeMarkdown from '../src/pages/chat/rich-content/safe-markdown.svelte';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const RESOLVED_PATH: HostResolvedProsePath = {
  path: './README.md',
  exists: true,
  isDirectory: false,
  openTarget: 'artifact-host-42',
  line: 12,
  column: 7,
};

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('SafeMarkdown host-resolved file paths', () => {
  it('keeps a detected path inert when the host resolution capability is absent', () => {
    const onOpenArtifact = vi.fn();
    const { container } = render(SafeMarkdown, {
      props: {
        source: 'See ./README.md for details.',
        ariaLabel: 'Unresolved path',
        onOpenArtifact,
      },
    });

    expect(container.querySelector('button.safe-markdown--file-path-button')).toBeNull();
    expect(container.querySelector('span.safe-markdown--file-path')).toHaveTextContent('./README.md');
    expect(onOpenArtifact).not.toHaveBeenCalled();
  });

  it('keeps a host-declined path inert instead of making a guessed open target', () => {
    const onOpenArtifact = vi.fn();
    const { container } = render(SafeMarkdown, {
      props: {
        source: 'See ./README.md for details.',
        hostResolvedPaths: [
          {
            ...RESOLVED_PATH,
            path: './other.md',
          },
        ],
        onOpenArtifact,
      },
    });

    expect(container.querySelector('button.safe-markdown--file-path-button')).toBeNull();
    expect(container.querySelector('span.safe-markdown--file-path')).toHaveTextContent('./README.md');
    expect(onOpenArtifact).not.toHaveBeenCalled();
  });

  it('opens a host-resolved path with the exact host artifact and line location', async () => {
    const onOpenArtifact = vi.fn();
    const { container } = render(SafeMarkdown, {
      props: {
        source: 'See ./README.md for details.',
        hostResolvedPaths: [RESOLVED_PATH],
        onOpenArtifact,
      },
    });
    const button = container.querySelector('button.safe-markdown--file-path-button');

    expect(button).not.toBeNull();
    await fireEvent.click(button as HTMLButtonElement);

    expect(onOpenArtifact).toHaveBeenCalledTimes(1);
    expect(onOpenArtifact).toHaveBeenCalledWith(RESOLVED_PATH, button);
  });

  it('keeps a host response without an artifact target inert', () => {
    const onOpenArtifact = vi.fn();
    const { container } = render(SafeMarkdown, {
      props: {
        source: 'See ./README.md for details.',
        hostResolvedPaths: [
          {
            ...RESOLVED_PATH,
            openTarget: '',
          },
        ],
        onOpenArtifact,
      },
    });

    expect(container.querySelector('button.safe-markdown--file-path-button')).toBeNull();
    expect(container.querySelector('span.safe-markdown--file-path')).toHaveTextContent('./README.md');
    expect(onOpenArtifact).not.toHaveBeenCalled();
  });

  it('keeps a resolved path inert when the artifact opener capability is absent', () => {
    const { container } = render(SafeMarkdown, {
      props: {
        source: 'See ./README.md for details.',
        hostResolvedPaths: [RESOLVED_PATH],
      },
    });

    expect(container.querySelector('button.safe-markdown--file-path-button')).toBeNull();
    expect(container.querySelector('span.safe-markdown--file-path')).toHaveTextContent('./README.md');
  });
});
