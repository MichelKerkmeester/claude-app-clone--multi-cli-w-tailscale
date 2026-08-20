// ───────────────────────────────────────────────────────────────────
// MODULE: Explicit Attachment Submission Tests
// ───────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionComposer } from '../src/SessionComposer.js';
import {
  AttachmentDraftProvider,
  useAttachmentDraft,
} from '../src/attachments/AttachmentDraftProvider.js';
import { useAttachmentSubmission } from '../src/attachments/useAttachmentSubmission.js';
import { INITIAL_RUNTIME_STATE, type RuntimeControls } from '../src/runtime.js';

const client = vi.hoisted(() => {
  class MockAttachmentClientError extends Error {
    public constructor(readonly code: 'retryable' | 'stale' | 'expired' | 'canceled' | 'unknown') {
      super(code);
      this.name = 'AttachmentClientError';
    }
  }

  return {
    AttachmentClientError: MockAttachmentClientError,
    cancelAttachmentReservation: vi.fn(async () => undefined),
    classifyAttachmentError: vi.fn((error: unknown) =>
      error instanceof MockAttachmentClientError
        ? error
        : new MockAttachmentClientError('retryable'),
    ),
    commitAttachmentSubmission: vi.fn(async () => undefined),
    createAttachmentReservation: vi.fn(async () => reservationFixture()),
    createAttachmentSubmissionId: vi.fn(() => 'submission_web_fixture'),
    prepareAttachmentTransfers: vi.fn(async () => preparedFixture()),
    reconcileAttachmentSet: vi.fn(async () => statusFixture()),
    uploadPreparedAttachments: vi.fn(async () => undefined),
  };
});

vi.mock('../src/attachments/attachment-client.js', () => client);

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

beforeEach(() => {
  client.prepareAttachmentTransfers.mockResolvedValue(preparedFixture());
  client.createAttachmentReservation.mockResolvedValue(reservationFixture());
  client.uploadPreparedAttachments.mockResolvedValue(undefined);
  client.reconcileAttachmentSet.mockResolvedValue(statusFixture());
  client.commitAttachmentSubmission.mockResolvedValue(undefined);
  client.cancelAttachmentReservation.mockResolvedValue(undefined);
});

describe('explicit attachment submission', () => {
  it('does not read or request attachment bytes before an explicit Send', async () => {
    const fetchSpy = vi.fn();
    const xhrSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('XMLHttpRequest', xhrSpy);
    renderSubmissionHarness();
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));

    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));
    expect(client.prepareAttachmentTransfers).not.toHaveBeenCalled();
    expect(client.createAttachmentReservation).not.toHaveBeenCalled();
    expect(client.uploadPreparedAttachments).not.toHaveBeenCalled();
    expect(client.commitAttachmentSubmission).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('submits a HEIC item without a preview URL through a converted JPEG', async () => {
    const actualClient = await vi.importActual<
      typeof import('../src/attachments/attachment-client.js')
    >('../src/attachments/attachment-client.js');
    const file = photo('camera.heic', 'image/heic');
    const convertedBytes = new Blob(['converted jpeg bytes'], { type: 'image/jpeg' });
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 2, height: 2, close }) as unknown as ImageBitmap),
    );
    vi.stubGlobal(
      'Worker',
      class HashWorker {
        onmessage: ((event: MessageEvent<unknown>) => void) | null = null;

        postMessage(message: { readonly requestId: string; readonly bytes: ArrayBuffer }): void {
          queueMicrotask(() =>
            this.onmessage?.({
              data: {
                requestId: message.requestId,
                byteLength: message.bytes.byteLength,
                sha256: 'b'.repeat(43),
              },
            } as MessageEvent<unknown>),
          );
        }

        terminate(): void {}
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(convertedBytes);
    });

    let submittedSource:
      (typeof client.prepareAttachmentTransfers)['mock']['calls'][number][0][number] | undefined;
    client.prepareAttachmentTransfers.mockImplementation((sources, signal) => {
      submittedSource = sources[0];
      return actualClient.prepareAttachmentTransfers(sources, signal);
    });
    client.uploadPreparedAttachments.mockImplementation(async (_reservation, transfers) => {
      const transfer = transfers[0];
      expect(transfer?.declaredType).toBe('image/jpeg');
      expect(transfer?.bytes.type).toBe('image/jpeg');
      expect(await transfer?.bytes.text()).toBe('converted jpeg bytes');
    });

    renderSubmissionHarness({ file });
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));

    await waitFor(() => expect(client.commitAttachmentSubmission).toHaveBeenCalledTimes(1));
    expect(submittedSource?.file).toBe(file);
    expect(submittedSource).not.toHaveProperty('objectUrl');
    expect(client.uploadPreparedAttachments).toHaveBeenCalledTimes(1);
  });

  it('suppresses a duplicate Send while the first generation is in flight', async () => {
    const deferred = defer<readonly ReturnType<typeof preparedFixture>>();
    client.prepareAttachmentTransfers.mockReturnValueOnce(deferred.promise);
    renderSubmissionHarness();
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));
    expect(client.prepareAttachmentTransfers).toHaveBeenCalledTimes(1);

    deferred.resolve(preparedFixture());
    await waitFor(() => expect(client.commitAttachmentSubmission).toHaveBeenCalledTimes(1));
    expect(client.createAttachmentReservation).toHaveBeenCalledTimes(1);
  });

  it('invalidates a submission when the expected revision changes', async () => {
    const deferred = defer<readonly ReturnType<typeof preparedFixture>>();
    client.prepareAttachmentTransfers.mockReturnValueOnce(deferred.promise);
    const view = renderSubmissionHarness({ expectedPromptRevision: 7 });
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));

    view.rerender(
      <AttachmentDraftProvider capability={{ enabled: true, imageIn: true }}>
        <SubmissionHarness expectedPromptRevision={8} />
      </AttachmentDraftProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('attachment-phase')).toHaveTextContent('failed-stale'),
    );
    deferred.resolve(preparedFixture());
    await Promise.resolve();
    expect(client.commitAttachmentSubmission).not.toHaveBeenCalled();
  });

  it('fails closed on a model switch and a cancel race', async () => {
    const deferred = defer<readonly ReturnType<typeof preparedFixture>>();
    client.prepareAttachmentTransfers.mockReturnValueOnce(deferred.promise);
    const view = renderSubmissionHarness();
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));

    view.rerender(
      <AttachmentDraftProvider
        capability={{ enabled: true, imageIn: true }}
        modelCanViewPhotos={false}
      >
        <SubmissionHarness modelCanViewPhotos={false} />
      </AttachmentDraftProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('attachment-phase')).toHaveTextContent('failed-stale'),
    );
    deferred.resolve(preparedFixture());
    await Promise.resolve();
    expect(client.commitAttachmentSubmission).not.toHaveBeenCalled();

    cleanup();
    client.prepareAttachmentTransfers.mockReturnValueOnce(
      defer<readonly ReturnType<typeof preparedFixture>>().promise,
    );
    renderSubmissionHarness();
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel photo send' }));
    expect(screen.getByTestId('attachment-phase')).toHaveTextContent('canceled');
    expect(client.commitAttachmentSubmission).not.toHaveBeenCalled();
  });

  it('reconciles status before commit and blocks resend after an ambiguous commit', async () => {
    renderSubmissionHarness();
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));
    await waitFor(() => expect(client.commitAttachmentSubmission).toHaveBeenCalledTimes(1));
    expect(client.reconcileAttachmentSet).toHaveBeenCalledTimes(1);

    cleanup();
    const prepareCallsBeforeAmbiguousSend = client.prepareAttachmentTransfers.mock.calls.length;
    client.commitAttachmentSubmission.mockRejectedValueOnce(
      new client.AttachmentClientError('unknown'),
    );
    renderSubmissionHarness();
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));
    await waitFor(() =>
      expect(screen.getByTestId('attachment-phase')).toHaveTextContent('delivery-unknown'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));
    expect(client.prepareAttachmentTransfers).toHaveBeenCalledTimes(
      prepareCallsBeforeAmbiguousSend + 1,
    );
  });

  it('turns a lifecycle interruption during commit into delivery-unknown', async () => {
    const commit = defer<void>();
    client.commitAttachmentSubmission.mockReturnValueOnce(commit.promise);
    renderSubmissionHarness();
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() => expect(screen.getByTestId('attachment-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send photos' }));
    await waitFor(() =>
      expect(screen.getByTestId('attachment-phase')).toHaveTextContent('committing'),
    );

    fireEvent(window, new Event('pagehide'));
    expect(screen.getByTestId('attachment-phase')).toHaveTextContent('delivery-unknown');
    commit.resolve();
    await Promise.resolve();
    expect(client.commitAttachmentSubmission).toHaveBeenCalledTimes(1);
  });
});

describe('text-only process-death recovery', () => {
  it('restores text and explicitly asks for photos again without restoring media bytes', async () => {
    const sessionId = 'session_recovery_fixture';
    renderComposerRecovery({ sessionId, initialPrompt: 'caption' });
    fireEvent.click(screen.getByRole('button', { name: 'select photo' }));
    await waitFor(() =>
      expect(screen.getByTestId('composer-attachment-count')).toHaveTextContent('1'),
    );
    fireEvent(window, new Event('pagehide'));
    expect(sessionStorage.getItem(`pi-remote.attachment-text-recovery.${sessionId}`)).toBe(
      'caption',
    );

    cleanup();
    renderComposerRecovery({ sessionId, initialPrompt: '' });
    await waitFor(() => expect(screen.getByLabelText('Message Pi')).toHaveValue('caption'));
    expect(
      screen.getByText('Draft restored. Photos need to be attached again.'),
    ).toBeInTheDocument();
  });
});

function renderSubmissionHarness(options: Partial<SubmissionHarnessProps> = {}) {
  return render(
    <AttachmentDraftProvider
      capability={{ enabled: true, imageIn: true }}
      modelCanViewPhotos={options.modelCanViewPhotos ?? true}
    >
      <SubmissionHarness {...options} />
    </AttachmentDraftProvider>,
  );
}

interface SubmissionHarnessProps {
  readonly expectedPromptRevision?: number;
  readonly modelCanViewPhotos?: boolean;
  readonly connection?: string;
  readonly file?: File;
}

function SubmissionHarness({
  expectedPromptRevision = 1,
  modelCanViewPhotos = true,
  connection = 'live',
  file = photo(),
}: SubmissionHarnessProps) {
  const draft = useAttachmentDraft();
  const submission = useAttachmentSubmission({
    sessionId: 'session_web_fixture',
    sessionEpoch: 'epoch_web_fixture',
    expectedPromptRevision,
    prompt: 'caption',
    connection,
    mediaEnabled: true,
    modelCanViewPhotos,
    runtimeAuthority: true,
  });
  return (
    <div>
      <button type="button" onClick={() => draft.selectFiles([file])}>
        select photo
      </button>
      <button type="button" onClick={() => submission.submit()}>
        Send photos
      </button>
      <button type="button" onClick={submission.cancel}>
        Cancel photo send
      </button>
      <output data-testid="attachment-count">{draft.state.items.length}</output>
      <output data-testid="attachment-phase">{submission.state.phase}</output>
    </div>
  );
}

function renderComposerRecovery({
  sessionId,
  initialPrompt,
}: {
  readonly sessionId: string;
  readonly initialPrompt: string;
}) {
  return render(
    <AttachmentDraftProvider capability={{ enabled: true, imageIn: true }} sessionId={sessionId}>
      <ComposerRecoveryHarness sessionId={sessionId} initialPrompt={initialPrompt} />
    </AttachmentDraftProvider>,
  );
}

function ComposerRecoveryHarness({
  sessionId,
  initialPrompt,
}: {
  readonly sessionId: string;
  readonly initialPrompt: string;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const draft = useAttachmentDraft();
  return (
    <div>
      <button type="button" onClick={() => draft.selectFiles([photo()])}>
        select photo
      </button>
      <output data-testid="composer-attachment-count">{draft.state.items.length}</output>
      <SessionComposer
        sessionId={sessionId}
        sessionEpoch="epoch_web_fixture"
        expectedPromptRevision={1}
        prompt={prompt}
        setPrompt={(updater) => setPrompt((current) => updater(current))}
        onDraftChange={setPrompt}
        sendPrompt={vi.fn()}
        sendSlashDraft={vi.fn()}
        stopRun={vi.fn()}
        canSubmit={prompt.trim().length > 0}
        status="idle"
        connection="live"
        awaitingSnapshot={false}
        sendingPrompt={false}
        stopping={false}
        promptError={null}
        runtimeControls={runtimeControls()}
        catalog={catalogFixture()}
        binding={null}
        slashSubmitting={false}
        runtimeAuthority
        runtimeRunning={false}
        onInsertCommand={vi.fn()}
        mediaCapability={{ enabled: true, imageIn: true }}
      />
    </div>
  );
}

function runtimeControls(): RuntimeControls {
  return {
    runtime: INITIAL_RUNTIME_STATE,
    refresh: vi.fn(),
    setModel: vi.fn(),
    setThinkingLevel: vi.fn(),
    setMode: vi.fn(),
  };
}

function catalogFixture() {
  return {
    status: 'ready' as const,
    snapshot: {
      hostEpoch: 'epoch_web_fixture',
      sessionId: 'session_web_fixture',
      sessionRevision: 1,
      catalogRevision: 1,
      commands: [],
      fetchedAt: Date.now(),
    },
    commands: [],
    refresh: vi.fn(),
  };
}

function photo(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['local image bytes'], name, { type });
}

function preparedFixture() {
  return [
    {
      item: {
        id: 'attachment-1',
        ordinal: 1,
        accepted: true,
        preview: 'available' as const,
        reason: null,
        status: 'local-ready' as const,
      },
      declaredType: 'image/jpeg' as const,
      bytes: new Blob(['prepared image'], { type: 'image/jpeg' }),
      sha256: 'a'.repeat(43),
      byteLength: 14,
    },
  ] as const;
}

function reservationFixture() {
  return {
    manifest: {
      submissionId: 'submission_web_fixture',
      sessionId: 'session_web_fixture',
      sessionEpoch: 'epoch_web_fixture',
      expectedPromptRevision: 1,
      items: [
        {
          clientId: 'attachment-1',
          ordinal: 1,
          declaredType: 'image/jpeg',
          byteLength: 14,
          sha256: 'a'.repeat(43),
        },
      ],
    },
    binding: {
      operation: 'reserve' as const,
      sessionId: 'session_web_fixture',
      sessionEpoch: 'epoch_web_fixture',
      expectedPromptRevision: 1,
      submissionId: 'submission_web_fixture',
    },
    reservation: {
      attachmentSetId: 'set_web_fixture',
      revision: 1,
      expiresAt: '2026-01-01T00:10:00.000Z',
      parts: [
        {
          attachmentSetId: 'set_web_fixture',
          attachmentId: 'attachment_ref_1',
          partId: 'part_1',
          ordinal: 1,
          ticket: 'ticket_upload_1',
          expiresAt: '2026-01-01T00:01:00.000Z',
        },
      ],
      statusTicket: { ticket: 'ticket_status', expiresAt: '2026-01-01T00:01:00.000Z' },
      cancelTicket: { ticket: 'ticket_cancel', expiresAt: '2026-01-01T00:01:00.000Z' },
    },
  };
}

function statusFixture() {
  return {
    attachmentSetId: 'set_web_fixture',
    revision: 1,
    status: 'ready' as const,
    expiresAt: '2026-01-01T00:10:00.000Z',
    parts: [
      {
        attachmentSetId: 'set_web_fixture',
        attachmentId: 'attachment_ref_1',
        partId: 'part_1',
        ordinal: 1,
        status: 'ready' as const,
      },
    ],
  };
}

function defer<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
