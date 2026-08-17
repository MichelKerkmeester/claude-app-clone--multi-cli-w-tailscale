import { useEffect, useRef, useState } from 'react';
import { isFilePreviewBlock, sha256, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

import {
  artifactReadDisplayCode,
  getRelayHeartbeat,
  readArtifact,
  type ArtifactReadErrorCode,
  type ArtifactResource,
} from '../relay.js';

export const ARTIFACT_RESOURCE_STALL_MS = 15_000;
export const MAX_ARTIFACT_RESOURCE_BYTES = 50 * 1024 * 1024;

export type ArtifactResourceStatus =
  | 'idle'
  | 'loading'
  | 'stalled'
  | 'ready'
  | 'empty'
  | 'whitespace'
  | 'offline'
  | 'stale'
  | 'denied'
  | 'expired'
  | 'missing'
  | 'revoked'
  | 'conflict'
  | 'corrupt'
  | 'too-large'
  | 'rate-limited'
  | 'relay-error'
  | 'aborted'
  | 'closed';

export interface ArtifactResourceSnapshot {
  readonly status: ArtifactResourceStatus;
  readonly identityKey: string;
  readonly artifactId: string | null;
  readonly revision: string | null;
  readonly etag: string | null;
  readonly contentType: string | null;
  readonly text: string | null;
  /** Alias used by export controls. It is always the displayed, verified text. */
  readonly buffer: string | null;
  /** Verified, displayed binary bytes. This is purged with the request lifecycle. */
  readonly bytes: Uint8Array | null;
  readonly errorCode: ArtifactReadErrorCode | null;
  readonly reload: () => void;
  readonly close: () => void;
}

export interface UseArtifactResourceOptions {
  readonly enabled?: boolean;
  readonly stallMs?: number;
  readonly read?: (
    sessionId: string,
    block: FilePreviewBlock,
    signal: AbortSignal,
  ) => Promise<ArtifactResource>;
}

interface ActiveRequest {
  readonly generation: number;
  readonly controller: AbortController;
  timer: number | null;
  bytes: Uint8Array | null;
  objectUrl: string | null;
  worker: Worker | null;
}

const EMPTY_IDENTITY = 'none';

function identityKey(block: FilePreviewBlock | null): string {
  if (block === null) return EMPTY_IDENTITY;
  return `${block.artifactId}\u0000${block.revision}\u0000${block.digest}`;
}

function snapshotFor(
  key: string,
  block: FilePreviewBlock | null,
  status: ArtifactResourceStatus,
  text: string | null = null,
  resource: ArtifactResource | null = null,
  errorCode: ArtifactReadErrorCode | null = null,
  bytes: Uint8Array | null = null,
): ArtifactResourceSnapshot {
  return {
    status,
    identityKey: key,
    artifactId: block?.artifactId ?? null,
    revision: block?.revision ?? null,
    etag: resource?.etag ?? null,
    contentType: resource?.contentType ?? null,
    text,
    buffer: text,
    bytes,
    errorCode,
    reload: () => undefined,
    close: () => undefined,
  };
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { readonly name?: unknown }).name === 'AbortError'
  );
}

function stripEtagQuotes(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

async function digestBytes(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle !== undefined) {
    const digest = await subtle.digest('SHA-256', bytes.slice());
    return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
  }
  return sha256(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function decodeBytes(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function cleanupRequest(request: ActiveRequest): void {
  if (request.timer !== null) window.clearTimeout(request.timer);
  request.timer = null;
  request.controller.abort();
  request.worker?.terminate();
  request.worker = null;
  if (request.objectUrl !== null) URL.revokeObjectURL(request.objectUrl);
  request.objectUrl = null;
  request.bytes?.fill(0);
  request.bytes = null;
}

function mapReadError(error: unknown): {
  readonly status: ArtifactResourceStatus;
  readonly code: ArtifactReadErrorCode | null;
} {
  if (isAbortError(error)) return { status: 'aborted', code: null };
  const code = artifactReadDisplayCode(error);
  if (code !== null) {
    return {
      status:
        code === 'revision-conflict'
          ? 'stale'
          : code === 'digest-mismatch' || code === 'invalid-response'
            ? 'corrupt'
            : code === 'unavailable'
              ? 'relay-error'
              : code,
      code,
    };
  }
  const heartbeat = getRelayHeartbeat();
  return {
    status:
      heartbeat.state === 'stale' || (typeof navigator !== 'undefined' && !navigator.onLine)
        ? 'offline'
        : 'relay-error',
    code: null,
  };
}

async function loadVerifiedResource(
  sessionId: string | null,
  block: FilePreviewBlock,
  signal: AbortSignal,
  read: NonNullable<UseArtifactResourceOptions['read']>,
): Promise<ArtifactResource> {
  const resource =
    block.content.kind === 'inline-text'
      ? {
          bytes: new TextEncoder().encode(block.content.text),
          contentType: block.mimeType,
          revision: block.revision,
          etag: `"${block.digest}"`,
          digest: block.digest,
        }
      : sessionId === null
        ? await Promise.reject(new Error('Artifact session is unavailable.'))
        : await read(sessionId, block, signal);

  if (signal.aborted) throw new DOMException('The artifact request was aborted.', 'AbortError');
  if (resource.revision !== block.revision || stripEtagQuotes(resource.etag) !== block.digest) {
    const conflict = new Error('Artifact revision conflict.');
    Object.assign(conflict, { code: 'revision-conflict' as const });
    throw conflict;
  }
  if (resource.bytes.byteLength > MAX_ARTIFACT_RESOURCE_BYTES) {
    const tooLarge = new Error('Artifact is too large.');
    Object.assign(tooLarge, { code: 'too-large' as const });
    throw tooLarge;
  }
  if (block.byteLength !== null && resource.bytes.byteLength !== block.byteLength) {
    const conflict = new Error('Artifact byte length conflict.');
    Object.assign(conflict, { code: 'revision-conflict' as const });
    throw conflict;
  }
  const digest = await digestBytes(resource.bytes);
  if (digest !== block.digest || resource.digest !== block.digest) {
    const mismatch = new Error('Artifact digest mismatch.');
    Object.assign(mismatch, { code: 'digest-mismatch' as const });
    throw mismatch;
  }
  return resource;
}

export function useArtifactResource(
  sessionId: string | null,
  block: FilePreviewBlock | null,
  options: UseArtifactResourceOptions = {},
): ArtifactResourceSnapshot {
  const enabled = options.enabled ?? true;
  const key = identityKey(block);
  const [requestNumber, setRequestNumber] = useState(0);
  const [state, setState] = useState<ArtifactResourceSnapshot>(() =>
    snapshotFor(key, block, block === null || !enabled ? 'idle' : 'loading'),
  );
  const generationRef = useRef(0);
  const activeRef = useRef<ActiveRequest | null>(null);
  const closedRef = useRef(false);

  const reload = () => {
    closedRef.current = false;
    setRequestNumber((current) => current + 1);
  };

  const close = () => {
    closedRef.current = true;
    generationRef.current += 1;
    const active = activeRef.current;
    if (active !== null) {
      cleanupRequest(active);
      activeRef.current = null;
    }
    setState(snapshotFor(key, block, 'closed'));
  };

  useEffect(() => {
    closedRef.current = false;
    const currentBlock = block;
    if (!enabled || currentBlock === null) {
      generationRef.current += 1;
      const previous = activeRef.current;
      if (previous !== null) cleanupRequest(previous);
      activeRef.current = null;
      setState(snapshotFor(key, currentBlock, 'idle'));
      return undefined;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const controller = new AbortController();
    const request: ActiveRequest = {
      generation,
      controller,
      timer: null,
      bytes: null,
      objectUrl: null,
      worker: null,
    };
    const previous = activeRef.current;
    if (previous !== null) cleanupRequest(previous);
    activeRef.current = request;
    setState(snapshotFor(key, currentBlock, 'loading'));
    const stallMs = options.stallMs ?? ARTIFACT_RESOURCE_STALL_MS;
    request.timer = window.setTimeout(() => {
      if (
        activeRef.current?.generation !== generation ||
        controller.signal.aborted ||
        closedRef.current
      ) {
        return;
      }
      setState((current) =>
        current.identityKey === key && current.status === 'loading'
          ? snapshotFor(key, currentBlock, 'stalled')
          : current,
      );
    }, stallMs);

    const isCurrent = () =>
      activeRef.current?.generation === generation &&
      generationRef.current === generation &&
      !controller.signal.aborted &&
      !closedRef.current;

    void loadVerifiedResource(
      sessionId,
      currentBlock,
      controller.signal,
      options.read ?? readArtifact,
    )
      .then(async (resource) => {
        if (!isCurrent()) return;
        const digest = await digestBytes(resource.bytes);
        if (!isCurrent() || digest !== currentBlock.digest) return;
        const binary = currentBlock.renderer === 'image' || currentBlock.renderer === 'pdf';
        const text = binary ? null : decodeBytes(resource.bytes);
        if (!isCurrent()) return;
        request.bytes = resource.bytes;
        if (request.timer !== null) window.clearTimeout(request.timer);
        request.timer = null;
        const status: ArtifactResourceStatus = binary
          ? 'ready'
          : text === null || text.length === 0
            ? 'empty'
            : text.trim().length === 0
              ? 'whitespace'
              : 'ready';
        setState(snapshotFor(key, currentBlock, status, text, resource, null, binary ? resource.bytes : null));
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return;
        if (request.timer !== null) window.clearTimeout(request.timer);
        request.timer = null;
        const mapped = mapReadError(error);
        setState(snapshotFor(key, currentBlock, mapped.status, null, null, mapped.code));
      });

    return () => {
      if (activeRef.current?.generation === generation) {
        generationRef.current += 1;
        cleanupRequest(request);
        activeRef.current = null;
      }
    };
  }, [block, enabled, key, options.read, options.stallMs, requestNumber, sessionId]);

  const current =
    state.identityKey === key ? state : snapshotFor(key, block, enabled ? 'loading' : 'idle');
  return { ...current, reload, close };
}

export function isArtifactResourceBlock(value: unknown): value is FilePreviewBlock {
  return isFilePreviewBlock(value);
}
