// ───────────────────────────────────────────────────────────────────
// MODULE: Local Attachment Draft Tests
// ───────────────────────────────────────────────────────────────────

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AttachmentDraftProvider,
  useAttachmentDraft,
} from '../src/attachments/AttachmentDraftProvider.js';
import {
  attachmentDraftReducer,
  EMPTY_ATTACHMENT_DRAFT,
} from '../src/attachments/attachment-state.js';

afterEach(() => {
  cleanup();
  for (const restore of objectUrlRestorers.splice(0)) restore();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const objectUrlRestorers: Array<() => void> = [];

function photo(name: string, type = 'image/jpeg'): File {
  return new File(['local image bytes'], name, { type });
}

function DraftHarness({ files }: { readonly files: readonly File[] }) {
  const draft = useAttachmentDraft();
  return (
    <div>
      <button type="button" onClick={() => draft.selectFiles(files)}>
        select fixtures
      </button>
      <button
        type="button"
        onClick={() => {
          const first = draft.state.items[0];
          if (first !== undefined) draft.removeAttachment(first.id);
        }}
      >
        remove first
      </button>
      <button type="button" onClick={draft.acknowledge}>
        acknowledge
      </button>
      <output data-testid="state">{JSON.stringify(draft.state)}</output>
      <output data-testid="count">{draft.state.items.length}</output>
      <output data-testid="message">{draft.blockingMessage ?? ''}</output>
    </div>
  );
}

function renderDraft({
  files,
  capability = { enabled: true, imageIn: true },
  sessionId = 'session-one',
  modelCanViewPhotos = true,
}: {
  readonly files: readonly File[];
  readonly capability?: { readonly enabled: boolean; readonly imageIn: boolean };
  readonly sessionId?: string;
  readonly modelCanViewPhotos?: boolean;
}) {
  return render(
    <AttachmentDraftProvider
      capability={capability}
      sessionId={sessionId}
      modelCanViewPhotos={modelCanViewPhotos}
    >
      <DraftHarness files={files} />
    </AttachmentDraftProvider>,
  );
}

function installObjectUrlStubs() {
  const createObjectURL = vi.fn((file: Blob) => `blob:local-${file.size}-${Math.random()}`);
  const revokeObjectURL = vi.fn();
  const urlObject = URL as typeof URL & {
    createObjectURL?: (file: Blob) => string;
    revokeObjectURL?: (url: string) => void;
  };
  const createDescriptor = Object.getOwnPropertyDescriptor(urlObject, 'createObjectURL');
  const revokeDescriptor = Object.getOwnPropertyDescriptor(urlObject, 'revokeObjectURL');
  Object.defineProperty(urlObject, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectURL,
  });
  Object.defineProperty(urlObject, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  });
  const restore = () => {
    if (createDescriptor === undefined) delete urlObject.createObjectURL;
    else Object.defineProperty(urlObject, 'createObjectURL', createDescriptor);
    if (revokeDescriptor === undefined) delete urlObject.revokeObjectURL;
    else Object.defineProperty(urlObject, 'revokeObjectURL', revokeDescriptor);
  };
  objectUrlRestorers.push(restore);
  return {
    createObjectURL,
    revokeObjectURL,
    restore,
  };
}

describe('attachment draft reducer', () => {
  it('stores only generic metadata and keeps lifecycle transitions serializable', () => {
    const state = attachmentDraftReducer(EMPTY_ATTACHMENT_DRAFT, {
      type: 'configure',
      capabilityAvailable: true,
      modelCanViewPhotos: true,
    });
    const next = attachmentDraftReducer(state, {
      type: 'select',
      candidates: [
        {
          id: 'attachment-1',
          accepted: true,
          preview: 'available',
          reason: null,
        },
      ],
      limitReached: false,
    });
    const ready = attachmentDraftReducer(next, { type: 'validate' });
    expect(ready.items[0]).toEqual({
      id: 'attachment-1',
      ordinal: 1,
      label: 'Photo 1',
      status: 'local-ready',
      preview: 'available',
      rejection: null,
    });
    expect(JSON.stringify(ready)).not.toContain('filename');
    expect(JSON.stringify(ready)).not.toContain('blob:');
    expect(JSON.stringify(ready)).not.toContain('bytes');
  });
});

describe('AttachmentDraftProvider', () => {
  it('enforces the four-photo limit and rejects a fifth without changing the draft', async () => {
    const urls = installObjectUrlStubs();
    const files = [1, 2, 3, 4, 5].map((index) => photo(`fixture-${index}.jpg`));
    renderDraft({ files });

    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('4'));
    expect(screen.getByTestId('message')).toHaveTextContent('You can add up to four photos.');
    expect(urls.createObjectURL).toHaveBeenCalledTimes(4);

    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('4'));
    expect(urls.createObjectURL).toHaveBeenCalledTimes(4);
  });

  it('keeps HEIC valid locally while exposing only a generic unavailable preview', async () => {
    const urls = installObjectUrlStubs();
    renderDraft({ files: [photo('camera.heic', 'image/heic')] });

    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(screen.getByTestId('state')).toHaveTextContent('preview":"unavailable');
    expect(urls.createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByTestId('state')).not.toHaveTextContent('camera.heic');
  });

  it('revokes the local URL on removal and acknowledgement', async () => {
    const urls = installObjectUrlStubs();
    renderDraft({ files: [photo('one.jpg'), photo('two.jpg')] });
    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByRole('button', { name: 'remove first' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'acknowledge' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['session switch', 'rerender'],
    ['logout', 'logout'],
    ['app lock', 'app-lock'],
  ])('revokes every URL on %s', async (_label, lifecycle) => {
    const urls = installObjectUrlStubs();
    const view = renderDraft({ files: [photo('one.jpg'), photo('two.jpg')] });
    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));

    if (lifecycle === 'rerender') {
      view.rerender(
        <AttachmentDraftProvider
          capability={{ enabled: true, imageIn: true }}
          sessionId="session-two"
        >
          <DraftHarness files={[]} />
        </AttachmentDraftProvider>,
      );
    } else {
      act(() => window.dispatchEvent(new Event(`pi-remote:${lifecycle}`)));
    }
    await waitFor(() => expect(urls.revokeObjectURL).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('clears the draft and revokes URLs when image capability is lost', async () => {
    const urls = installObjectUrlStubs();
    const view = renderDraft({ files: [photo('one.jpg')] });
    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    view.rerender(
      <AttachmentDraftProvider
        capability={{ enabled: false, imageIn: false }}
        sessionId="session-one"
      >
        <DraftHarness files={[]} />
      </AttachmentDraftProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('clears and revokes the draft when the selected model loses image input', async () => {
    const urls = installObjectUrlStubs();
    const view = renderDraft({ files: [photo('one.jpg')] });
    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    view.rerender(
      <AttachmentDraftProvider
        capability={{ enabled: true, imageIn: true }}
        sessionId="session-one"
        modelCanViewPhotos={false}
      >
        <DraftHarness files={[]} />
      </AttachmentDraftProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(screen.getByTestId('message')).toHaveTextContent('Current model cannot view photos.');
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('does not retain a file or create a URL when host capability is off', async () => {
    const urls = installObjectUrlStubs();
    renderDraft({
      files: [photo('one.jpg')],
      capability: { enabled: false, imageIn: false },
    });
    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(urls.createObjectURL).not.toHaveBeenCalled();
  });

  it('revokes all URLs on unmount without a second revoke during Strict-style cleanup', async () => {
    const urls = installObjectUrlStubs();
    const view = renderDraft({ files: [photo('one.jpg')] });
    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    view.unmount();
    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('does not leak URL, timer, fetch, or XHR work under Strict Mode double invocation', async () => {
    const urls = installObjectUrlStubs();
    const fetchSpy = vi.fn();
    const xhrSpy = vi.fn();
    const timerSpy = vi.spyOn(window, 'setTimeout');
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('XMLHttpRequest', xhrSpy);
    const view = render(
      <StrictMode>
        <AttachmentDraftProvider capability={{ enabled: true, imageIn: true }}>
          <DraftHarness files={[photo('strict.jpg')]} />
        </AttachmentDraftProvider>
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'select fixtures' }));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    const timersBeforeUnmount = timerSpy.mock.calls.length;
    view.unmount();

    expect(urls.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(timerSpy.mock.calls.length).toBe(timersBeforeUnmount);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });
});
