import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtifactDetails, type ArtifactDetailsModel } from '../src/artifacts/ArtifactDetails.js';
import { ArtifactHeader } from '../src/artifacts/ArtifactHeader.js';
import { PreviewControls } from '../src/artifacts/PreviewControls.js';

const MODEL: ArtifactDetailsModel = {
  displayName: 'Redacted capture',
  mediaType: 'image/png',
  width: 640,
  height: 360,
  thumbnailBytes: 256,
  fullBytes: 1024,
  revision: 'revision_accessibility',
  processing: 'complete',
  redaction: 'applied',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fullscreen viewer accessibility seams', () => {
  it('keeps image actions keyboard-operable and labels directional alternatives', () => {
    const onPan = vi.fn();
    const onZoomOut = vi.fn();
    const onZoomIn = vi.fn();
    const onFit = vi.fn();
    render(
      <PreviewControls
        kind="image"
        zoom={2}
        onPan={onPan}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        onFit={onFit}
        onDetails={() => undefined}
        detailsOpen={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fit' })).toHaveAttribute('aria-pressed', 'false');
    for (const direction of ['up', 'left', 'right', 'down']) {
      fireEvent.click(screen.getByRole('button', { name: `Pan ${direction}` }));
    }
    expect(onPan).toHaveBeenCalledTimes(4);
    expect(screen.getByRole('button', { name: 'Details' })).toHaveAttribute(
      'aria-controls',
      'artifact-details',
    );
  });

  it('connects the details disclosure to a labelled region', () => {
    render(<ArtifactDetails model={MODEL} open id="phase-details" />);
    expect(screen.getByRole('region', { name: 'Image details' })).toHaveAttribute(
      'id',
      'phase-details',
    );
    expect(screen.getByText('640 × 360')).toBeVisible();
  });

  it('provides a safe heading and a labelled close control', () => {
    const headingRef = createRef<HTMLHeadingElement>();
    const onClose = vi.fn();
    render(
      <ArtifactHeader
        headingRef={headingRef}
        onClose={onClose}
        title="Redacted capture"
        kindLabel="Redacted image"
        revision="revision_accessibility"
      />,
    );
    expect(screen.getByRole('heading', { name: 'Redacted capture' })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close redacted capture viewer' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
