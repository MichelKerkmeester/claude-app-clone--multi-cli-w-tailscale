// ───────────────────────────────────────────────────────────────────
// MODULE: Attachment Transfer Hash Worker
// ───────────────────────────────────────────────────────────────────

export interface AttachmentHashRequest {
  readonly requestId: string;
  readonly bytes: ArrayBuffer;
}

export interface AttachmentHashResponse {
  readonly requestId: string;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface AttachmentHashFailure {
  readonly requestId: string;
  readonly error: 'hash-failed';
}

interface HashWorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage: (message: AttachmentHashResponse | AttachmentHashFailure) => void;
}

function isRequest(value: unknown): value is AttachmentHashRequest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AttachmentHashRequest>;
  return (
    typeof candidate.requestId === 'string' &&
    candidate.requestId.length > 0 &&
    candidate.bytes instanceof ArrayBuffer
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

const workerScope = globalThis as unknown as HashWorkerScope;
workerScope.onmessage = (event) => {
  if (!isRequest(event.data)) return;
  const request = event.data;
  void crypto.subtle
    .digest('SHA-256', request.bytes)
    .then((digest) => {
      workerScope.postMessage({
        requestId: request.requestId,
        byteLength: request.bytes.byteLength,
        sha256: toBase64Url(new Uint8Array(digest)),
      });
    })
    .catch(() => {
      workerScope.postMessage({ requestId: request.requestId, error: 'hash-failed' });
    });
};
