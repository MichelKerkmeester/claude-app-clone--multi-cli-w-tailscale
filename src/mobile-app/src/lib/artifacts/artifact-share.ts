import type {
  FilePreviewCompleteness,
  FilePreviewRedaction,
  FilePreviewRenderer,
} from '@pi-remote/pi-rpc-protocol';

export interface DisplayedArtifactShareInput {
  readonly displayName: string;
  readonly renderer: FilePreviewRenderer | 'markdown';
  readonly displayedBuffer: string;
  readonly displayedBytes?: Uint8Array;
  readonly mimeType?: string;
  readonly shareAllowed: boolean;
  readonly redaction: FilePreviewRedaction;
  readonly completeness: FilePreviewCompleteness;
}

export type ArtifactShareResult = 'shared' | 'cancelled' | 'unavailable' | 'failed';

type ShareNavigator = Navigator;

function shareNavigator(): ShareNavigator | null {
  return typeof navigator === 'undefined' ? null : (navigator as ShareNavigator);
}

function shareData(input: DisplayedArtifactShareInput): ShareData {
  if (input.displayedBytes !== undefined) {
    const bytes = input.displayedBytes.slice();
    const file = new File([bytes], safeFileName(input.displayName, input.mimeType), {
      type: safeMimeType(input.mimeType),
    });
    bytes.fill(0);
    return { title: input.displayName, files: [file] };
  }
  return { title: input.displayName, text: input.displayedBuffer };
}

function needsDisclosureConfirmation(input: DisplayedArtifactShareInput): boolean {
  return input.redaction === 'applied' || input.completeness === 'excerpt';
}

export function canShareDisplayedArtifact(input: DisplayedArtifactShareInput): boolean {
  const currentNavigator = shareNavigator();
  if (!hasShareablePayload(input) || currentNavigator?.share === undefined) {
    return false;
  }
  if (typeof currentNavigator.canShare !== 'function') return input.displayedBytes === undefined;
  try {
    const data = shareData(input);
    return currentNavigator.canShare(data);
  } catch {
    return false;
  }
}

export function canCopyDisplayedArtifact(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
}

export async function copyDisplayedArtifact(displayedBuffer: string): Promise<boolean> {
  if (!canCopyDisplayedArtifact()) return false;
  try {
    await navigator.clipboard.writeText(displayedBuffer);
    return true;
  } catch {
    return false;
  }
}

/** Must be called from the press handler: no asynchronous preparation precedes navigator.share. */
export function shareDisplayedArtifact(
  input: DisplayedArtifactShareInput,
  confirmDisclosure: (message: string) => boolean = (message) => window.confirm(message),
): Promise<ArtifactShareResult> {
  const currentNavigator = shareNavigator();
  if (!hasShareablePayload(input) || currentNavigator?.share === undefined) {
    return Promise.resolve('unavailable');
  }
  if (
    needsDisclosureConfirmation(input) &&
    !confirmDisclosure('This preview is redacted or partial. Share the displayed text anyway?')
  ) {
    return Promise.resolve('cancelled');
  }
  if (!canShareDisplayedArtifact(input)) return Promise.resolve('unavailable');
  try {
    const result = currentNavigator.share(shareData(input));
    return result.then(
      () => 'shared' as const,
      (error: unknown) => {
        if (isAbortError(error)) return 'cancelled' as const;
        return 'failed' as const;
      },
    );
  } catch {
    return Promise.resolve('failed');
  }
}

function hasShareablePayload(input: DisplayedArtifactShareInput): boolean {
  return (
    input.shareAllowed &&
    (input.displayedBytes === undefined
      ? input.displayedBuffer.length > 0
      : input.displayedBytes.byteLength > 0)
  );
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { readonly name?: unknown }).name === 'AbortError'
  );
}

function safeFileName(displayName: string, mimeType = 'application/octet-stream'): string {
  const base = displayName
    .replaceAll(/[\\/:*?"<>|\u0000-\u001f]/gu, '_')
    .trim()
    .slice(0, 96);
  if (base.length > 0) return base;
  return mimeType === 'application/pdf' ? 'preview.pdf' : 'preview.bin';
}

function safeMimeType(value = 'application/octet-stream'): string {
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u.test(value)
    ? value
    : 'application/octet-stream';
}
