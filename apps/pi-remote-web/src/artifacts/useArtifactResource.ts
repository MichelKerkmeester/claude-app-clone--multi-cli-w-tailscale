import { useEffect, useRef, useState } from 'react';
import {
  isFilePreviewBlock,
  isInboundImageReadyBlock,
  sha256,
  type FilePreviewBlock,
  type InboundImageReadyBlock,
} from '@pi-remote/pi-rpc-protocol';

import {
  artifactReadDisplayCode,
  getRelayHeartbeat,
  readArtifact,
  type ArtifactReadErrorCode,
  type ArtifactReadVariant,
  type ArtifactResource,
  type ArtifactResourceBlock,
} from '../relay.js';
import { demoInboundArtifactResource, isDemoMode } from '../demo.js';

export const ARTIFACT_RESOURCE_STALL_MS = 15_000;
export const MAX_ARTIFACT_RESOURCE_BYTES = 50 * 1024 * 1024;
export const MAX_ARTIFACT_THUMBNAILS = 20;
export const MAX_ARTIFACT_FULL_RESOURCES = 1;

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
  /** Alias used by existing text-preview controls. */
  readonly buffer: string | null;
  /** Verified binary bytes. The request lifecycle clears this view on release. */
  readonly bytes: Uint8Array | null;
  /** Created only after length, digest, local hash, and image decode pass. */
  readonly objectUrl: string | null;
  readonly errorCode: ArtifactReadErrorCode | null;
  readonly reload: () => void;
  readonly close: () => void;
}

export interface UseArtifactResourceOptions {
  readonly enabled?: boolean;
  readonly stallMs?: number;
  readonly variant?: ArtifactReadVariant;
  readonly requireImageDecode?: boolean;
  readonly read?: (
    sessionId: string,
    block: ArtifactResourceBlock,
    signal: AbortSignal,
    variant?: ArtifactReadVariant,
  ) => Promise<ArtifactResource>;
}

interface ActiveRequest {
  readonly generation: number;
  readonly controller: AbortController;
  timer: number | null;
  bytes: Uint8Array | null;
  storeKey: string | null;
  storeVariant: ArtifactReadVariant | null;
  worker: Worker | null;
}

interface StoredArtifactResource {
  readonly key: string;
  readonly variant: ArtifactReadVariant;
  readonly blob: Blob;
  refs: number;
  objectUrl: string | null;
  lastUsed: number;
}

const EMPTY_IDENTITY = 'none';
const thumbnailStore = new Map<string, StoredArtifactResource>();
const fullStore = new Map<string, StoredArtifactResource>();
let resourceUseClock = 0;

const ARTIFACT_LIFECYCLE_EVENTS = [
  'pi-remote:privacy-cover',
  'pi-remote:logout',
  'pi-remote:session-switch',
  'pi-remote:artifact-revoked',
  'privacy-cover',
  'logout',
  'session-switch',
  'artifact-revoked',
] as const;

function storeFor(variant: ArtifactReadVariant): Map<string, StoredArtifactResource> {
  return variant === 'thumbnail' ? thumbnailStore : fullStore;
}

function revokeStoredUrl(entry: StoredArtifactResource): void {
  if (entry.objectUrl === null) return;
  URL.revokeObjectURL(entry.objectUrl);
  entry.objectUrl = null;
}

function pruneStore(variant: ArtifactReadVariant): void {
  const store = storeFor(variant);
  const maximum = variant === 'thumbnail' ? MAX_ARTIFACT_THUMBNAILS : MAX_ARTIFACT_FULL_RESOURCES;
  while (store.size > maximum) {
    const candidate = [...store.values()]
      .filter((entry) => entry.refs === 0)
      .sort((left, right) => left.lastUsed - right.lastUsed)[0];
    if (candidate === undefined) return;
    revokeStoredUrl(candidate);
    store.delete(candidate.key);
  }
}

function acquireObjectUrl(
  key: string,
  variant: ArtifactReadVariant,
  bytes: Uint8Array,
  contentType: string,
): string {
  const store = storeFor(variant);
  let entry = store.get(key);
  if (entry === undefined) {
    entry = {
      key,
      variant,
      blob: new Blob([bytes.slice()], { type: contentType }),
      refs: 0,
      objectUrl: null,
      lastUsed: 0,
    };
    store.set(key, entry);
  }
  entry.refs += 1;
  entry.lastUsed = ++resourceUseClock;
  if (entry.objectUrl === null) {
    if (typeof URL.createObjectURL !== 'function') {
      entry.refs -= 1;
      throw new Error('Object URLs are unavailable.');
    }
    entry.objectUrl = URL.createObjectURL(entry.blob);
  }
  pruneStore(variant);
  return entry.objectUrl;
}

function releaseObjectUrl(key: string, variant: ArtifactReadVariant): void {
  const entry = storeFor(variant).get(key);
  if (entry === undefined) return;
  entry.refs = Math.max(0, entry.refs - 1);
  entry.lastUsed = ++resourceUseClock;
  if (entry.refs === 0) {
    revokeStoredUrl(entry);
    pruneStore(variant);
  }
}

/** Clears every memory-only artifact blob and URL owned by the viewer layer. */
export function clearArtifactResourceStore(): void {
  for (const store of [thumbnailStore, fullStore]) {
    for (const entry of store.values()) revokeStoredUrl(entry);
    store.clear();
  }
}

function blockIdentity(
  block: ArtifactResourceBlock | null,
  variant: ArtifactReadVariant,
): {
  readonly artifactId: string;
  readonly revision: string;
  readonly digest: string;
  readonly byteLength: number | null;
  readonly contentType: string;
  readonly renderer: 'image' | 'pdf' | 'text' | 'code' | 'diff' | 'unsupported';
} | null {
  if (block === null) return null;
  if (isInboundImageReadyBlock(block)) {
    const selected = block.artifact[variant];
    return {
      artifactId: block.artifact.id,
      revision: block.artifact.revision,
      digest: selected.digest,
      byteLength: selected.byteLength,
      contentType: selected.mediaType,
      renderer: 'image',
    };
  }
  return {
    artifactId: block.artifactId,
    revision: block.revision,
    digest: block.digest,
    byteLength: block.byteLength,
    contentType: block.mimeType,
    renderer: block.renderer,
  };
}

function identityKey(block: ArtifactResourceBlock | null, variant: ArtifactReadVariant): string {
  const identity = blockIdentity(block, variant);
  if (identity === null) return EMPTY_IDENTITY;
  return `${identity.artifactId}\u0000${identity.revision}\u0000${variant}\u0000${identity.digest}`;
}

function snapshotFor(
  key: string,
  block: ArtifactResourceBlock | null,
  variant: ArtifactReadVariant,
  status: ArtifactResourceStatus,
  text: string | null = null,
  resource: ArtifactResource | null = null,
  errorCode: ArtifactReadErrorCode | null = null,
  bytes: Uint8Array | null = null,
  objectUrl: string | null = null,
): ArtifactResourceSnapshot {
  const identity = blockIdentity(block, variant);
  return {
    status,
    identityKey: key,
    artifactId: identity?.artifactId ?? null,
    revision: identity?.revision ?? null,
    etag: resource?.etag ?? null,
    contentType: resource?.contentType ?? identity?.contentType ?? null,
    text,
    buffer: text,
    bytes,
    objectUrl,
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

async function requireImageDecode(
  bytes: Uint8Array,
  contentType: string,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) throw new DOMException('The artifact request was aborted.', 'AbortError');
  const imageBlob = new Blob([bytes.slice()], { type: contentType });
  if (typeof globalThis.createImageBitmap === 'function') {
    const bitmap = await globalThis.createImageBitmap(imageBlob);
    bitmap.close();
    if (signal.aborted) throw new DOMException('The artifact request was aborted.', 'AbortError');
    return;
  }
  const ImageConstructor = globalThis.Image;
  if (typeof ImageConstructor !== 'function') throw new Error('Image decoding is unavailable.');
  const image = new ImageConstructor();
  if (typeof image.decode !== 'function') throw new Error('Image decoding is unavailable.');
  if (typeof FileReader === 'function') {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const abort = () => {
        reader.abort();
        reject(new DOMException('The artifact request was aborted.', 'AbortError'));
      };
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Image bytes could not be read.'));
      reader.onabort = abort;
      signal.addEventListener('abort', abort, { once: true });
      reader.readAsDataURL(imageBlob);
    });
    image.src = dataUrl;
  }
  await image.decode();
  if (signal.aborted) throw new DOMException('The artifact request was aborted.', 'AbortError');
}

function readVerifiedArtifact(
  sessionId: string,
  block: ArtifactResourceBlock,
  signal: AbortSignal,
  variant?: ArtifactReadVariant,
): Promise<ArtifactResource> {
  if (isDemoMode() && isInboundImageReadyBlock(block)) {
    return demoInboundArtifactResource(sessionId, block, signal, variant ?? 'full');
  }
  return readArtifact(sessionId, block, signal, variant);
}

function cleanupRequest(request: ActiveRequest): void {
  if (request.timer !== null) window.clearTimeout(request.timer);
  request.timer = null;
  request.controller.abort();
  request.worker?.terminate();
  request.worker = null;
  if (request.storeKey !== null) {
    if (request.storeVariant !== null) releaseObjectUrl(request.storeKey, request.storeVariant);
  }
  request.storeKey = null;
  request.storeVariant = null;
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
  block: ArtifactResourceBlock,
  variant: ArtifactReadVariant,
  signal: AbortSignal,
  read: NonNullable<UseArtifactResourceOptions['read']>,
): Promise<ArtifactResource> {
  const identity = blockIdentity(block, variant);
  if (identity === null) throw new Error('Artifact identity is unavailable.');
  const resource =
    isFilePreviewBlock(block) && block.content.kind === 'inline-text'
      ? {
          bytes: new TextEncoder().encode(block.content.text),
          contentType: block.mimeType,
          revision: block.revision,
          etag: `"${block.digest}"`,
          digest: block.digest,
        }
      : sessionId === null
        ? await Promise.reject(new Error('Artifact session is unavailable.'))
        : await read(sessionId, block, signal, variant);

  if (signal.aborted) throw new DOMException('The artifact request was aborted.', 'AbortError');
  if (
    resource.revision !== identity.revision ||
    stripEtagQuotes(resource.etag).toLowerCase() !== identity.digest.toLowerCase()
  ) {
    const conflict = new Error('Artifact revision conflict.');
    Object.assign(conflict, { code: 'revision-conflict' as const });
    throw conflict;
  }
  if (resource.bytes.byteLength > MAX_ARTIFACT_RESOURCE_BYTES) {
    const tooLarge = new Error('Artifact is too large.');
    Object.assign(tooLarge, { code: 'too-large' as const });
    throw tooLarge;
  }
  if (identity.byteLength !== null && resource.bytes.byteLength !== identity.byteLength) {
    const conflict = new Error('Artifact byte length conflict.');
    Object.assign(conflict, { code: 'revision-conflict' as const });
    throw conflict;
  }
  if (
    resource.contentDigest !== undefined &&
    resource.contentDigest.toLowerCase() !== identity.digest.toLowerCase()
  ) {
    const mismatch = new Error('Artifact content digest mismatch.');
    Object.assign(mismatch, { code: 'digest-mismatch' as const });
    throw mismatch;
  }
  const digest = await digestBytes(resource.bytes);
  if (
    digest.toLowerCase() !== identity.digest.toLowerCase() ||
    resource.digest.toLowerCase() !== identity.digest.toLowerCase()
  ) {
    const mismatch = new Error('Artifact digest mismatch.');
    Object.assign(mismatch, { code: 'digest-mismatch' as const });
    throw mismatch;
  }
  return resource;
}

function isImageResource(block: ArtifactResourceBlock, variant: ArtifactReadVariant): boolean {
  return blockIdentity(block, variant)?.renderer === 'image';
}

function releaseRequestResource(request: ActiveRequest): void {
  if (request.storeKey === null || request.storeVariant === null) return;
  releaseObjectUrl(request.storeKey, request.storeVariant);
  request.storeKey = null;
  request.storeVariant = null;
}

export function useArtifactResource(
  sessionId: string | null,
  block: ArtifactResourceBlock | null,
  options: UseArtifactResourceOptions = {},
): ArtifactResourceSnapshot {
  const enabled = options.enabled ?? true;
  const variant = options.variant ?? 'full';
  const key = identityKey(block, variant);
  const [requestNumber, setRequestNumber] = useState(0);
  const [state, setState] = useState<ArtifactResourceSnapshot>(() =>
    snapshotFor(key, block, variant, block === null || !enabled ? 'idle' : 'loading'),
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
    setState(snapshotFor(key, block, variant, 'closed'));
  };

  useEffect(() => {
    const invalidate = () => {
      clearArtifactResourceStore();
      closedRef.current = true;
      generationRef.current += 1;
      const active = activeRef.current;
      if (active !== null) {
        cleanupRequest(active);
        activeRef.current = null;
      }
      setState(snapshotFor(key, block, variant, 'closed'));
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') invalidate();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', invalidate);
    for (const eventName of ARTIFACT_LIFECYCLE_EVENTS) {
      window.addEventListener(eventName, invalidate);
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', invalidate);
      for (const eventName of ARTIFACT_LIFECYCLE_EVENTS) {
        window.removeEventListener(eventName, invalidate);
      }
    };
  }, [block, key, variant]);

  useEffect(() => {
    closedRef.current = false;
    const currentBlock = block;
    if (!enabled || currentBlock === null) {
      generationRef.current += 1;
      const previous = activeRef.current;
      if (previous !== null) cleanupRequest(previous);
      activeRef.current = null;
      setState(snapshotFor(key, currentBlock, variant, 'idle'));
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
      storeKey: null,
      storeVariant: null,
      worker: null,
    };
    const previous = activeRef.current;
    if (previous !== null) cleanupRequest(previous);
    activeRef.current = request;
    setState(snapshotFor(key, currentBlock, variant, 'loading'));
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
          ? snapshotFor(key, currentBlock, variant, 'stalled')
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
      variant,
      controller.signal,
      options.read ?? readVerifiedArtifact,
    )
      .then(async (resource) => {
        if (!isCurrent()) return;
        const identity = blockIdentity(currentBlock, variant);
        if (identity === null) throw new Error('Artifact identity is unavailable.');
        const digest = await digestBytes(resource.bytes);
        if (
          !isCurrent() ||
          digest.toLowerCase() !== identity.digest.toLowerCase() ||
          (resource.contentDigest !== undefined &&
            resource.contentDigest.toLowerCase() !== identity.digest.toLowerCase())
        ) {
          const mismatch = new Error('Artifact digest mismatch.');
          Object.assign(mismatch, { code: 'digest-mismatch' as const });
          throw mismatch;
        }
        const image = isImageResource(currentBlock, variant);
        const secureImage =
          image && (options.requireImageDecode ?? isInboundImageReadyBlock(currentBlock));
        if (secureImage) {
          await requireImageDecode(resource.bytes, resource.contentType, controller.signal);
        }
        if (!isCurrent()) return;
        const binary = image || identity.renderer === 'pdf';
        const text = binary ? null : decodeBytes(resource.bytes);
        let objectUrl: string | null = null;
        if (secureImage) {
          objectUrl = acquireObjectUrl(key, variant, resource.bytes, resource.contentType);
          request.storeKey = key;
          request.storeVariant = variant;
        }
        if (!isCurrent()) {
          releaseRequestResource(request);
          return;
        }
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
        setState(
          snapshotFor(
            key,
            currentBlock,
            variant,
            status,
            text,
            resource,
            null,
            binary ? resource.bytes : null,
            objectUrl,
          ),
        );
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return;
        if (request.timer !== null) window.clearTimeout(request.timer);
        request.timer = null;
        releaseRequestResource(request);
        request.bytes?.fill(0);
        request.bytes = null;
        const mapped = mapReadError(error);
        setState(snapshotFor(key, currentBlock, variant, mapped.status, null, null, mapped.code));
      });

    return () => {
      if (activeRef.current?.generation === generation) {
        generationRef.current += 1;
        cleanupRequest(request);
        activeRef.current = null;
      }
    };
  }, [
    block,
    enabled,
    key,
    options.read,
    options.requireImageDecode,
    options.stallMs,
    requestNumber,
    sessionId,
    variant,
  ]);

  const current =
    state.identityKey === key
      ? state
      : snapshotFor(key, block, variant, enabled ? 'loading' : 'idle');
  return { ...current, reload, close };
}

export function isArtifactResourceBlock(value: unknown): value is ArtifactResourceBlock {
  return isFilePreviewBlock(value) || isInboundImageReadyBlock(value);
}
