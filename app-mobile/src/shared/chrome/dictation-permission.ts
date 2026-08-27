// ───────────────────────────────────────────────────────────────────
// MODULE: Dictation Permission Gate
// ───────────────────────────────────────────────────────────────────
// Gates the microphone permission BEFORE the first record. Checks
// secure context, navigator.permissions, and getUserMedia. Returns
// a structured result so the UI can surface actionable denial or
// a failed-start message without a dead mic.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type DictationPermissionResult =
  | { readonly ok: true; readonly stream: MediaStream }
  | { readonly ok: false; readonly reason: 'insecure-context' | 'permission-denied' | 'not-supported' | 'failed-start'; readonly message: string };

// ───────────────────────────────────────────────────────────────────
// 2. PERMISSION GATE
// ───────────────────────────────────────────────────────────────────

/**
 * Check whether the microphone is available and request permission.
 *
 * - Secure context (HTTPS) is required.
 * - `navigator.permissions` is queried first; if denied, returns an
 *   actionable denial message with a Settings deep-link hint.
 * - If the permission state is unknown, `getUserMedia` triggers the prompt.
 * - A failed start tears the track down immediately.
 * - When Web Speech API is absent, returns a not-supported reason.
 *
 * Returns a `DictationPermissionResult` with either a usable MediaStream
 * or a failure reason.
 */
export async function requestDictationPermission(): Promise<DictationPermissionResult> {
  // 1. Secure context
  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: 'insecure-context',
      message: 'Dictation requires a secure connection (HTTPS).',
    };
  }

  // 2. Web Speech API support
  const SpeechRecognition =
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  if (typeof SpeechRecognition !== 'function') {
    return {
      ok: false,
      reason: 'not-supported',
      message: 'Dictation is not supported in this browser.',
    };
  }

  // 3. Check navigator.permissions
  try {
    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (permission.state === 'denied') {
      return {
        ok: false,
        reason: 'permission-denied',
        message: 'Microphone access denied. Open Settings to enable it.',
      };
    }
  } catch {
    // navigator.permissions.query may not support 'microphone' on all browsers.
    // Fall through to getUserMedia.
  }

  // 4. Request the mic via getUserMedia
  if (!navigator.mediaDevices) {
    return {
      ok: false,
      reason: 'not-supported',
      message: 'Dictation is not supported in this browser.',
    };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { ok: true, stream };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone access denied. Open Settings to enable it.'
        : 'Failed to start the microphone.';
    return {
      ok: false,
      reason: 'failed-start',
      message,
    };
  }
}

/**
 * Stop all tracks in a MediaStream and release the mic indicator.
 */
export function stopMediaStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}