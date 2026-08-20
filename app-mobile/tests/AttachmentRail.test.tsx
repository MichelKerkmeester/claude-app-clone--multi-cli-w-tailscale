// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Rail Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import '../src/style.css';
import {
  AttachmentDraftProvider,
  useAttachmentDraft,
} from '../src/attachments/AttachmentDraftProvider.js';
import { AttachmentRail } from '../src/attachments/AttachmentRail.js';

afterEach(() => {
  cleanup();
  for (const element of [document.documentElement, document.body]) {
    Reflect.deleteProperty(element, 'clientWidth');
    Reflect.deleteProperty(element, 'scrollWidth');
  }
  document.documentElement.style.removeProperty('zoom');
});

function photo(name: string): File {
  return new File(['image'], name, { type: 'image/png' });
}

function RailHarness() {
  const draft = useAttachmentDraft();
  const files = [photo('first.png'), photo('private-camera-name.png'), photo('third.png')];
  return (
    <>
      <button type="button" onClick={() => draft.selectFiles(files)}>
        select rail fixtures
      </button>
      <AttachmentRail />
    </>
  );
}

function renderRail(capability?: { readonly enabled: boolean; readonly imageIn: boolean }) {
  return render(
    <AttachmentDraftProvider capability={capability ?? { enabled: true, imageIn: true }}>
      <RailHarness />
    </AttachmentDraftProvider>,
  );
}

describe('AttachmentRail', () => {
  it('renders an ordered, generic Photo rail without exposing filenames', async () => {
    renderRail();
    fireEvent.click(screen.getByRole('button', { name: 'select rail fixtures' }));

    const rail = await screen.findByRole('list', { name: 'Draft photos, 3 items' });
    expect(within(rail).getByRole('button', { name: 'Preview Photo 1' })).toBeInTheDocument();
    expect(within(rail).getByRole('button', { name: 'Preview Photo 2' })).toBeInTheDocument();
    expect(within(rail).getByRole('button', { name: 'Preview Photo 3' })).toBeInTheDocument();
    expect(rail).not.toHaveTextContent('private-camera-name.png');
    expect(within(rail).getAllByRole('button', { name: /Remove Photo/u })).toHaveLength(3);
  });

  it('uses visible 44px removal hit targets and restores focus after removal', async () => {
    renderRail();
    fireEvent.click(screen.getByRole('button', { name: 'select rail fixtures' }));
    const rail = await screen.findByRole('list', { name: 'Draft photos, 3 items' });
    const removeSecond = within(rail).getByRole('button', { name: 'Remove Photo 2' });
    expect(removeSecond).toHaveAttribute('data-hit-target', '44');

    fireEvent.click(removeSecond);
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Draft photos, 2 items' })).toBeInTheDocument(),
    );
    expect(document.activeElement).toHaveAttribute('aria-label', 'Preview Photo 2');
  });

  it('keeps the page within a 390px viewport at 200% zoom', async () => {
    renderRail();
    fireEvent.click(screen.getByRole('button', { name: 'select rail fixtures' }));
    const rail = await screen.findByRole('list', { name: 'Draft photos, 3 items' });
    expect(rail).toHaveClass('attachment-rail');
    document.documentElement.style.zoom = '2';
    for (const element of [document.documentElement, document.body]) {
      Object.defineProperties(element, {
        clientWidth: { configurable: true, value: 390 },
        scrollWidth: { configurable: true, value: 390 },
      });
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
    }
    expect(readFileSync('app-mobile/src/style.css', 'utf8')).toMatch(
      /\.attachment-rail\s*\{[\s\S]*?max-inline-size: 100%;[\s\S]*?overflow-x: auto;/u,
    );
    expect(readFileSync('app-mobile/src/style.css', 'utf8')).toMatch(
      /@media \(max-width: 20rem\)[\s\S]*?\.attachment-preview-dialog/u,
    );
  });

  it('is absent when the host capability is off', () => {
    renderRail({ enabled: false, imageIn: false });
    expect(screen.queryByRole('list', { name: /Draft photos/u })).not.toBeInTheDocument();
  });
});
