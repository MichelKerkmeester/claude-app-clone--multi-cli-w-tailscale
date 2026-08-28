<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: DICTATION OVERLAY
  // ───────────────────────────────────────────────────────────────────
  // A bottom-strip recording overlay that shows an RMS equalizer and
  // mm:ss elapsed clock. The transcript is written to the composer draft
  // via setPrompt and NEVER calls submit. STOP = transcribe+insert,
  // CANCEL (Esc/×) = discard. A generation guard ensures a newer instance
  // is never closed by an older take.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';
  import { rmsToBarHeight, POLL_INTERVAL_MS } from '$shared/chrome/dictation-audio-level.js';
  import {
    transitionCapture,
    type CaptureMode,
    type CaptureState,
  } from '$shared/chrome/dictation-capture.js';
  import { requestDictationPermission, stopMediaStream } from '$shared/chrome/dictation-permission.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
  }

  interface SpeechRecognitionEvent {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResult[];
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent {
    readonly error: string;
    readonly message: string;
  }

  export interface DictationOverlayProps {
    readonly isOpen: boolean;
    readonly mode: CaptureMode;
    readonly sessionId: string;
    readonly lang: string;
    readonly setPrompt: (updater: (current: string) => string) => void;
    readonly onClose: () => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let {
    isOpen,
    mode = 'toggle',
    sessionId,
    lang = 'auto',
    setPrompt,
    onClose,
  }: DictationOverlayProps = $props();

  // Reactive UI state — updated at ~20 Hz for the equalizer, 1 Hz for the clock.
  let barHeight = $state(0.04);
  let elapsedText = $state('00:00');
  let captureState = $state<CaptureState>('idle');
  let announcement = $state('');
  let errorMessage = $state<string | null>(null);
  let statusMessage = $state('');

  // Non-reactive refs — plain closures, never re-render.
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let recognition: SpeechRecognitionInstance | null = null;
  let rafHandle = 0;
  let tickHandle = 0;
  let openedAt = 0;
  let currentGeneration = 0;
  let activeGeneration = 0;
  let collectedText = '';
  let stopRequested = false;
  let finishTimeout = 0;
  let closeTimeout = 0;
  let dialogEl: HTMLElement | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const isRecording = $derived(captureState === 'recording');
  const isStopping = $derived(captureState === 'stopping');

  const equalizerBars = $derived.by(() => {
    const base = barHeight;
    // Static per-bar multipliers for a pleasant equalizer shape.
    const multipliers = [0.5, 0.7, 0.85, 1.0, 0.85, 0.7, 0.5];
    return multipliers.map((m) => Math.min(1, base * m));
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Mirror isOpen locally and start/stop recording.
  let previouslyOpen = false;
  $effect(() => {
    const currentlyOpen = isOpen;
    if (currentlyOpen && !previouslyOpen) {
      previouslyOpen = true;
      untrack(() => void startTake());
    }
    if (!currentlyOpen && previouslyOpen) {
      previouslyOpen = false;
      untrack(() => cancelTake());
    }
  });

  // Track session at take start; if sessionId changes mid-take, discard.
  let takeSessionId: string | null = null;
  $effect(() => {
    const sid = sessionId;
    if (isOpen && takeSessionId !== null && sid !== takeSessionId) {
      untrack(() => {
        cancelTake();
      });
    }
    if (isOpen && takeSessionId === null) {
      takeSessionId = sid;
    }
    if (!isOpen) {
      takeSessionId = null;
    }
  });

  // Window blur cancels the current take.
  $effect(() => {
    if (!isOpen) return;
    const onBlur = () => cancelTake();
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  });

  // Cleanup on unmount.
  $effect(() => {
    return () => {
      teardown();
    };
  });

  // Announce state changes.
  $effect(() => {
    const state = captureState;
    untrack(() => {
      switch (state) {
        case 'recording':
          announcement = 'Listening…';
          statusMessage = 'Listening… Tap the mic again to finish, or press Esc to cancel.';
          break;
        case 'stopping':
          announcement = 'Processing…';
          statusMessage = 'Processing the recording…';
          break;
        case 'cancelled':
          announcement = 'Cancelled.';
          statusMessage = '';
          break;
        default:
          break;
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. IMPERATIVE API (exposed via bind:this)
  // ───────────────────────────────────────────────────────────────────

  export function stopAndInsert(): void {
    if (activeGeneration !== currentGeneration) return;
    if (captureState !== 'recording') return;
    stopRequested = true;
    captureState = transitionCapture(captureState, { type: 'STOP' }, mode);

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Some browsers throw if already stopped.
      }

      if (finishTimeout) window.clearTimeout(finishTimeout);
      finishTimeout = window.setTimeout(() => {
        if (activeGeneration === currentGeneration && captureState === 'stopping') {
          void finishTake(currentGeneration);
        }
      }, 2000);
    } else {
      // Still in pending permission — invalidate and close immediately.
      ++currentGeneration;
      onClose();
    }
  }

  export function cancelTake(): void {
    if (activeGeneration !== currentGeneration) return;
    if (captureState === 'idle' || captureState === 'cancelled') return;
    // Invalidate this take so any pending permission promise becomes stale.
    ++currentGeneration;
    stopRequested = false;
    captureState = transitionCapture(captureState, { type: 'CANCEL' }, mode);

    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // Already stopped.
      }
    }

    void teardown();
    announcement = 'Cancelled.';
    onClose();
  }

  // ───────────────────────────────────────────────────────────────────
  // 7. RECORDING LIFECYCLE
  // ───────────────────────────────────────────────────────────────────

  async function startTake(): Promise<void> {
    const gen = ++currentGeneration;
    activeGeneration = gen;
    collectedText = '';
    stopRequested = false;
    errorMessage = null;
    announcement = 'Starting…';
    captureState = transitionCapture('idle', { type: 'START' }, mode);

    // 1. Request permission and get media stream.
    const result = await requestDictationPermission();
    if (gen !== currentGeneration) {
      if (result.ok) stopMediaStream(result.stream);
      return;
    }
    if (!result.ok) {
      errorMessage = result.message;
      announcement = result.message;
      captureState = transitionCapture(captureState, { type: 'CANCEL' }, mode);
      if (closeTimeout) window.clearTimeout(closeTimeout);
      closeTimeout = window.setTimeout(() => {
        if (activeGeneration === gen) onClose();
      }, 2500);
      return;
    }

    mediaStream = result.stream;

    // 2. Set up audio analyser for the equalizer.
    try {
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
    } catch {
      // AudioContext may fail in some environments; equalizer stays at idle.
      analyserNode = null;
    }

    // 3. Start Web Speech recognition.
    try {
      const SR = (
        window as unknown as Record<string, new () => SpeechRecognitionInstance>
      ).SpeechRecognition ?? (window as unknown as Record<string, new () => SpeechRecognitionInstance>).webkitSpeechRecognition;
      if (typeof SR !== 'function') {
        stopMediaStream(mediaStream);
        teardown();
        errorMessage = 'Dictation is not supported in this browser.';
        announcement = errorMessage;
        captureState = transitionCapture(captureState, { type: 'CANCEL' }, mode);
        if (activeGeneration === gen) onClose();
        return;
      }
      const instance = new SR();
      instance.continuous = true;
      instance.interimResults = false;
      if (lang !== 'auto') instance.lang = lang;

      instance.onresult = (event: SpeechRecognitionEvent) => {
        if (activeGeneration !== gen) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result.isFinal) {
            const alt = result[0];
            if (alt) {
              collectedText += (collectedText ? ' ' : '') + alt.transcript;
            }
          }
        }
      };

      instance.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (activeGeneration !== gen) return;
        if (event.error === 'aborted') return;
        if (event.error === 'no-speech') {
          // Always finish the take so collected text is not discarded.
          stopRequested = true;
          void finishTake(gen);
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMessage = 'Microphone not available.';
          announcement = errorMessage;
          captureState = transitionCapture(captureState, { type: 'CANCEL' }, mode);
          teardown();
          if (activeGeneration === gen) onClose();
          return;
        }
        errorMessage = 'Speech recognition failed.';
        announcement = errorMessage;
        captureState = transitionCapture(captureState, { type: 'CANCEL' }, mode);
        teardown();
        if (activeGeneration === gen) onClose();
      };

      instance.onend = () => {
        if (activeGeneration !== gen) return;
        if (stopRequested) {
          void finishTake(gen);
        } else if (captureState === 'recording' && !stopRequested) {
          if (mediaStream && mediaStream.active) {
            try {
              instance.start();
            } catch {
              void finishTake(gen);
            }
          }
        }
      };

      recognition = instance;
      instance.start();
      // captureState is already 'recording' from the initial transition.
      openedAt = performance.now();
      startClock();
      startPolling();
    } catch {
      stopMediaStream(mediaStream);
      teardown();
      errorMessage = 'Failed to start speech recognition.';
      announcement = errorMessage;
      captureState = transitionCapture(captureState, { type: 'CANCEL' }, mode);
      if (activeGeneration === gen) onClose();
    }
  }

  async function finishTake(gen: number): Promise<void> {
    if (activeGeneration !== gen) return;
    if (finishTimeout) {
      window.clearTimeout(finishTimeout);
      finishTimeout = 0;
    }

    teardown();

    if (!stopRequested || !collectedText.trim()) {
      announcement = collectedText.trim() ? 'Nothing heard. Try again.' : 'Cancelled.';
      if (activeGeneration === gen) onClose();
      return;
    }

    try {
      const text = collectedText.trim();
      setPrompt((current) => {
        const separator = current && !current.endsWith(' ') ? ' ' : '';
        return current + separator + text;
      });
      announcement = 'Inserted.';
      statusMessage = 'Transcript inserted.';
    } catch {
      announcement = 'Could not insert.';
      statusMessage = 'Could not insert the transcript.';
    }

    if (closeTimeout) window.clearTimeout(closeTimeout);
    closeTimeout = window.setTimeout(() => {
      if (activeGeneration === gen) onClose();
    }, 800);
  }

  // ───────────────────────────────────────────────────────────────────
  // 8. POLLING AND CLOCK
  // ───────────────────────────────────────────────────────────────────

  let lastPollTime = 0;
  let timeDomainData = new Uint8Array(0);

  function startPolling(): void {
    if (analyserNode === null) return;
    const bufferLength = analyserNode.frequencyBinCount;
    timeDomainData = new Uint8Array(bufferLength);
    lastPollTime = 0;

    function poll(now: number): void {
      if (analyserNode === null || mediaStream === null) return;
      const node = analyserNode;
      const data = timeDomainData;
      if (data.length === 0) return;
      node.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const raw = data[i];
        if (raw === undefined) continue;
        const n = (raw - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / data.length);

      if (now - lastPollTime >= POLL_INTERVAL_MS) {
        lastPollTime = now;
        barHeight = rmsToBarHeight(rms);
      }

      rafHandle = requestAnimationFrame(poll);
    }

    rafHandle = requestAnimationFrame(poll);
  }

  function startClock(): void {
    function tick(): void {
      if (openedAt === 0) return;
      const elapsed = performance.now() - openedAt;
      const mm = Math.floor(elapsed / 60000);
      const ss = Math.floor((elapsed % 60000) / 1000);
      elapsedText = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      tickHandle = window.setTimeout(tick, 1000);
    }
    tickHandle = window.setTimeout(tick, 1000);
  }

  // ───────────────────────────────────────────────────────────────────
  // 9. TEARDOWN
  // ───────────────────────────────────────────────────────────────────

  function teardown(): void {
    // Invalidate any pending take so its permission continuation is a no-op.
    ++currentGeneration;
    if (rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = 0;
    }
    if (tickHandle) {
      window.clearTimeout(tickHandle);
      tickHandle = 0;
    }
    if (finishTimeout) {
      window.clearTimeout(finishTimeout);
      finishTimeout = 0;
    }
    if (closeTimeout) {
      window.clearTimeout(closeTimeout);
      closeTimeout = 0;
    }
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // Already stopped.
      }
      recognition = null;
    }
    if (mediaStream) {
      stopMediaStream(mediaStream);
      mediaStream = null;
    }
    if (audioContext) {
      void audioContext.close();
      audioContext = null;
    }
    analyserNode = null;
  }

  // ───────────────────────────────────────────────────────────────────
  // 10. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelTake();
    }
  }

  function handleCancel(): void {
    cancelTake();
  }

  function handleStop(): void {
    stopAndInsert();
  }

  function attachDialog(node: HTMLElement): () => void {
    dialogEl = node;
    return () => {
      if (dialogEl === node) dialogEl = null;
    };
  }
</script>

<!-- Component content -->
{#if isOpen}
  <div
    class="dictation-overlay"
    data-tour-target="dictation-overlay"
    role="dialog"
    aria-label="Dictation"
    aria-describedby="dictation-status"
    tabindex="-1"
    {@attach attachDialog}
    onkeydown={onKeyDown}
  >
    <div class="dictation-overlay--strip">
      <!-- Equalizer bars -->
      <div class="dictation-overlay--equalizer" aria-hidden="true">
        {#each equalizerBars as height, i (i)}
          <div
            class="dictation-overlay--bar"
            style="height: {Math.max(4, height * 24)}px"
          ></div>
        {/each}
      </div>

      <!-- Clock -->
      <span class="dictation-overlay--clock" aria-hidden="true">{elapsedText}</span>

      <!-- Status message -->
      <span class="dictation-overlay--status" id="dictation-status">
        {errorMessage || statusMessage}
      </span>

      <!-- Actions -->
      <div class="dictation-overlay--actions">
        {#if isRecording}
          <button
            type="button"
            class="dictation-overlay--stop"
            aria-label="Stop and insert transcription"
            onclick={handleStop}
            style="min-block-size: 44px; min-inline-size: 44px"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          </button>
        {:else if isStopping}
          <span class="dictation-overlay--processing">Processing…</span>
        {/if}
        <button
          type="button"
          class="dictation-overlay--cancel"
          aria-label="Cancel dictation"
          onclick={handleCancel}
          style="min-block-size: 44px; min-inline-size: 44px"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
    <!-- Live region for announcements -->
    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  </div>
{/if}

<!-- Dictation overlay -->
<style>
  /* This surface: dictation-overlay — recording strip above the composer tray. */
  .dictation-overlay {
    position: relative;
    z-index: 6;
    padding-block: var(--space-2);
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: 1.25rem;
    background: var(--surface);
    box-shadow: var(--shadow-raised);
    margin-block-end: var(--space-2);
  }

  .dictation-overlay--strip {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-block-size: 44px;
  }

  .dictation-overlay--equalizer {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    block-size: 24px;
  }

  .dictation-overlay--bar {
    inline-size: 4px;
    border-radius: 2px;
    background: var(--accent);
    transition: height 50ms ease;
  }

  .dictation-overlay--clock {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
    min-inline-size: 3.5rem;
  }

  .dictation-overlay--status {
    flex: 1;
    font-size: 0.8125rem;
    color: var(--ink-muted);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dictation-overlay--actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .dictation-overlay--stop {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    cursor: pointer;
  }

  .dictation-overlay--cancel {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-secondary);
    cursor: pointer;
  }

  .dictation-overlay--processing {
    font-size: 0.8125rem;
    color: var(--ink-muted);
    font-style: italic;
  }
</style>