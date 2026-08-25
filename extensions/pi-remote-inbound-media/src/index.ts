// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Inbound Media Host Boundary
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type InboundMediaSource = 'tool_result' | 'assistant_output' | 'extension';
export type InboundMediaClass = 'screenshot' | 'raster' | 'generated';

export interface ApprovedImageOutput {
  readonly source: InboundMediaSource;
  readonly mediaClass: InboundMediaClass;
  readonly capabilityHandle: string;
  readonly bytes?: Uint8Array;
}

export interface InboundMediaBinaryPublisher {
  publish(input: {
    readonly source: InboundMediaSource;
    readonly mediaClass: InboundMediaClass;
    readonly capabilityHandle: string;
    readonly bytes?: Uint8Array;
  }): unknown | Promise<unknown>;
}

export interface PreStdoutInterceptionSeam {
  readonly available: boolean;
  subscribe(handler: (output: unknown) => void): () => void;
}

export interface InboundMediaTransportSpy {
  write(...args: unknown[]): unknown;
}

export interface InboundMediaAdapterOptions {
  readonly interception?: PreStdoutInterceptionSeam;
  readonly runtimeSnapshot?: InboundMediaRuntimeSnapshot | null;
  readonly onApprovedImage?: (output: ApprovedImageOutput) => void;
  readonly stdout?: InboundMediaTransportSpy;
  readonly session?: InboundMediaTransportSpy;
}

export interface InboundMediaRuntimeSnapshot {
  readonly media?: {
    readonly enabled: boolean;
    readonly imageIn: boolean;
  };
}

export interface InboundMediaCapability {
  readonly enabled: true;
  readonly imageIn: true;
}

export interface InboundMediaHostAdapter {
  readonly capability: InboundMediaCapability | undefined;
  readonly interceptionAvailable: boolean;
  start(): void;
  stop(): void;
}

export interface PiInboundMediaExtensionContext {
  readonly preStdoutInterception?: PreStdoutInterceptionSeam;
  readonly runtimeSnapshot?: InboundMediaRuntimeSnapshot | null;
}

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const INBOUND_MEDIA_CAPABILITY: InboundMediaCapability = Object.freeze({
  enabled: true,
  imageIn: true,
});

export const ALLOWLISTED_INBOUND_MEDIA_SOURCES = [
  'tool_result',
  'assistant_output',
  'extension',
] as const satisfies readonly InboundMediaSource[];
const INBOUND_MEDIA_SOURCES = new Set<InboundMediaSource>(ALLOWLISTED_INBOUND_MEDIA_SOURCES);
const INBOUND_MEDIA_CLASSES = new Set<InboundMediaClass>(['screenshot', 'raster', 'generated']);

/** Callback receives only an opaque handle; transport writers stay outside this boundary. */
// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

export function createInboundMediaHostAdapter(
  options: InboundMediaAdapterOptions = {},
): InboundMediaHostAdapter {
  const interception = options.interception;
  const interceptionAvailable = interception?.available === true;
  const capability =
    interceptionAvailable && isRuntimeMediaCapabilityEnabled(options.runtimeSnapshot)
      ? INBOUND_MEDIA_CAPABILITY
      : undefined;
  let unsubscribe: (() => void) | undefined;

  const start = (): void => {
    if (capability === undefined || unsubscribe !== undefined || interception === undefined) return;
    unsubscribe = interception.subscribe((output) => {
      if (isApprovedImageOutput(output)) options.onApprovedImage?.(output);
    });
  };

  const stop = (): void => {
    unsubscribe?.();
    unsubscribe = undefined;
  };

  return { capability, interceptionAvailable, start, stop };
}

/** Register the seam only when the host exposes the pre-stdout interception API. */
export function installPiRemoteInboundMedia(
  pi: PiInboundMediaExtensionContext,
  options: Omit<InboundMediaAdapterOptions, 'interception'> = {},
): InboundMediaHostAdapter {
  const interception = pi.preStdoutInterception;
  const adapter = createInboundMediaHostAdapter({
    ...options,
    ...(interception === undefined ? {} : { interception }),
    ...(pi.runtimeSnapshot === undefined ? {} : { runtimeSnapshot: pi.runtimeSnapshot }),
  });
  adapter.start();
  return adapter;
}

/** Forward only an approved handle or already-captured bytes to the ticketed transport. */
export async function publishApprovedImage(
  output: unknown,
  publisher: InboundMediaBinaryPublisher,
): Promise<unknown> {
  if (!isApprovedImageOutput(output)) throw new Error('Inbound image output was not approved.');
  return publisher.publish({
    source: output.source,
    mediaClass: output.mediaClass,
    capabilityHandle: output.capabilityHandle,
    ...(output.bytes === undefined ? {} : { bytes: Uint8Array.from(output.bytes) }),
  });
}

export default function piRemoteInboundMedia(
  pi: PiInboundMediaExtensionContext,
): InboundMediaHostAdapter {
  return installPiRemoteInboundMedia(pi);
}

export function isAllowlistedInboundMediaSource(value: unknown): value is InboundMediaSource {
  return typeof value === 'string' && INBOUND_MEDIA_SOURCES.has(value as InboundMediaSource);
}

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRuntimeMediaCapabilityEnabled(
  snapshot: InboundMediaRuntimeSnapshot | null | undefined,
): boolean {
  return snapshot?.media?.enabled === true && snapshot.media.imageIn === true;
}

function isApprovedImageOutput(value: unknown): value is ApprovedImageOutput {
  if (!isRecord(value) || !hasOnlyKeys(value, ['source', 'mediaClass', 'capabilityHandle'], ['bytes'])) {
    return false;
  }
  if (
    value.bytes !== undefined &&
    (!(value.bytes instanceof Uint8Array) || value.bytes.byteLength === 0 || value.bytes.byteLength > 15 * 1024 * 1024)
  ) {
    return false;
  }
  return (
    typeof value.source === 'string' &&
    isAllowlistedInboundMediaSource(value.source) &&
    typeof value.mediaClass === 'string' &&
    INBOUND_MEDIA_CLASSES.has(value.mediaClass as InboundMediaClass) &&
    isOpaqueCapabilityHandle(value.capabilityHandle)
  );
}

function isOpaqueCapabilityHandle(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{21,255}$/u.test(value) &&
    !/^[a-f0-9]{43}$|^[a-f0-9]{64}$/u.test(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = [...required, ...optional];
  return Object.keys(value).every((key) => allowed.includes(key)) && required.every((key) => key in value);
}
