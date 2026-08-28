<script module lang="ts">
  // This module holds the shared Screen Enrollment types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ENROLLMENT SCREEN
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { ConnectionPhase } from '$shared/state/state.js';
  import type { OnboardingGate } from '$shared/state/onboarding-gates.js';
  import type { DeviceIdentity } from '$shared/transport/auth.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export const FIRST_PAIR_TIMEOUT_MS = 25_000;

  export interface EnrollmentProps {
    readonly phase: ConnectionPhase;
    readonly onEnrolled: (device: DeviceIdentity) => void;
    readonly onboardingGates?: readonly OnboardingGate[];
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onDestroy, onMount } from 'svelte';
  import { enrollDevice, establishSession, scanQrImage } from '$shared/transport/auth.js';
  import {
    appendConnectionEvent,
    readConnectionLog,
    type ConnectionLogCode,
    type ConnectionLogEvent,
  } from '$shared/transport/connection-log.js';
  import {
    DEFAULT_ONBOARDING_GATES,
    readOnboardingGateState,
  } from '$shared/state/onboarding-gates.js';
  import { messageFrom } from '$shared/format/view-helpers.js';
  import Button from '$shared/primitives/button/button.svelte';
  import OnboardingWizard from './onboarding-wizard.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { phase, onEnrolled, onboardingGates = DEFAULT_ONBOARDING_GATES }: EnrollmentProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let qrData = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);
  let connectionEvents = $state<readonly ConnectionLogEvent[]>(readConnectionLog());
  let pairingGuidance = $state<string | null>(
    readOnboardingGateState().decisions['pairing-guidance'] ?? null,
  );

  // ───────────────────────────────────────────────────────────────────
  // 6. CONNECTION LOG
  // ───────────────────────────────────────────────────────────────────

  // Refresh the device-local log while this auth surface is visible.
  function refreshConnectionEvents(): void {
    connectionEvents = readConnectionLog();
  }

  // Keep connection codes understandable without reflecting free-form errors.
  function connectionCode(cause: unknown): ConnectionLogCode {
    return cause instanceof PairingTimeoutError ? 'timeout' : 'unknown';
  }

  function connectionStatusLabel(status: ConnectionLogEvent['status']): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function connectionKindLabel(kind: ConnectionLogEvent['kind']): string {
    return kind.charAt(0).toUpperCase() + kind.slice(1);
  }

  function connectionCodeLabel(code: ConnectionLogCode): string {
    return code.replaceAll('-', ' ');
  }

  // ───────────────────────────────────────────────────────────────────
  // 7. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  class PairingTimeoutError extends Error {
    constructor() {
      super('Pairing was not confirmed within 25 seconds.');
      this.name = 'PairingTimeoutError';
    }
  }

  let abortController = new AbortController();
  let pairingTimeoutId: number | null = null;
  let pairingTimedOut = false;

  // Keep session confirmation behind the timeout so a late response never reaches the shell.
  async function enrollAndAuthenticate(serializedQr: string, signal: AbortSignal): Promise<DeviceIdentity> {
    const identity = await enrollDevice(serializedQr, signal);
    if (signal.aborted) throw new PairingTimeoutError();
    const authenticated = await establishSession();
    if (authenticated === null) throw new Error('Enrollment did not produce a device session.');
    return identity;
  }

  // Keep submit focused on one confirmed enrollment attempt.
  const submit = () => {
    if (busy) return;
    busy = true;
    error = null;
    abortController = new AbortController();
    pairingTimedOut = false;
    const attemptStartedAt = Date.now();
    appendConnectionEvent({ kind: 'connection', status: 'started' });
    refreshConnectionEvents();

    const pairing = enrollAndAuthenticate(qrData.trim(), abortController.signal);
    const timeout = new Promise<never>((_, reject) => {
      pairingTimeoutId = window.setTimeout(() => {
        pairingTimedOut = true;
        abortController.abort();
        reject(new PairingTimeoutError());
      }, FIRST_PAIR_TIMEOUT_MS);
    });

    void Promise.race([pairing, timeout])
      .then((identity) => {
        appendConnectionEvent({
          kind: 'connection',
          status: 'succeeded',
          durationMs: Date.now() - attemptStartedAt,
        });
        refreshConnectionEvents();
        onEnrolled(identity);
      })
      .catch((cause: unknown) => {
        const failure = pairingTimedOut ? new PairingTimeoutError() : cause;
        appendConnectionEvent({
          kind: 'connection',
          status: 'failed',
          durationMs: Date.now() - attemptStartedAt,
          code: connectionCode(failure),
        });
        error =
          failure instanceof PairingTimeoutError
            ? 'Pairing timed out after 25 seconds. Check the connection log and try again.'
            : messageFrom(failure);
        refreshConnectionEvents();
      })
      .finally(() => {
        if (pairingTimeoutId !== null) {
          window.clearTimeout(pairingTimeoutId);
          pairingTimeoutId = null;
        }
        busy = false;
      });
  };

  function handleOnboardingDecision(gateId: string, decision: string): void {
    if (gateId === 'pairing-guidance') pairingGuidance = decision;
  }

  onMount(() => {
    refreshConnectionEvents();
    const refreshTimer = window.setInterval(refreshConnectionEvents, 500);
    return () => window.clearInterval(refreshTimer);
  });

  onDestroy(() => {
    abortController.abort();
    if (pairingTimeoutId !== null) window.clearTimeout(pairingTimeoutId);
  });
</script>

<!-- Component content -->
<!-- Enrollment view -->
<!-- This surface: enrollment--view — first-run device binding. States: idle · busy · error · authenticating. -->
<!-- Do not edit — enrollment/auth wiring (enrollDevice · establishSession · scanQrImage · submit · onChange) — Not designer-editable. -->
<main class="enrollment--view">
  <section class="enrollment--card">
    <OnboardingWizard gates={onboardingGates} onDecision={handleOnboardingDecision} />
    <div class="surface--symbol" aria-hidden="true">
      π
    </div>
    <p class="surface--eyebrow">Private device enrollment</p>
    <h1>Bind this phone once</h1>
    <p>
      Scan or paste the relay's short-lived QR data. This device creates its own key and starts
      in read-only mode.
    </p>
    {#if pairingGuidance === 'guided'}
      <p class="pairing--guidance" role="status">
        Guided pairing: use a fresh QR code from the relay, then wait for this device session to be
        confirmed.
      </p>
    {/if}
    <label for="qr-data">Enrollment data</label>
    <textarea
      id="qr-data"
      bind:value={qrData}
      autocomplete="off"
      spellcheck="false"
      placeholder="Paste QR data"
    ></textarea>
    <div class="enrollment--actions">
      <label class="scan-button">
        Scan image
        <input
          type="file"
          accept="image/*"
          onchange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file === undefined) return;
            void scanQrImage(file)
              .then((v) => (qrData = v))
              .catch((cause: unknown) => {
                error = messageFrom(cause);
              });
          }}
        />
      </label>
      <Button onclick={submit} disabled={busy || qrData.trim().length === 0}>
        {busy ? 'Binding device' : 'Enroll device'}
      </Button>
    </div>
    {#if error !== null}
      <div class="inline-alert" role="alert">{error}</div>
    {/if}
    {#if phase === 'authenticating'}
      <div class="barrier-note">Checking this device</div>
    {/if}
    <section class="connection--log" aria-labelledby="connection-log-heading">
      <div>
        <h2 id="connection-log-heading">Connection log</h2>
        <p>Recent device-local connection events stay available while pairing is in progress.</p>
      </div>
      {#if connectionEvents.length === 0}
        <p class="connection--empty">No connection events yet.</p>
      {:else}
        <ol aria-label="Recent connection events">
          {#each connectionEvents as event, index (`${event.at}-${index}`)}
            <li data-connection-event={`${event.kind}-${index}`}>
              <span>{connectionKindLabel(event.kind)} · {connectionStatusLabel(event.status)}</span>
              {#if event.code !== undefined}
                <span>{connectionCodeLabel(event.code)}</span>
              {/if}
              <time datetime={event.at}>{event.at}</time>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  </section>
</main>

<!-- Enrollment view -->
<!-- This surface: enrollment--view — first-run device binding. Decomposed into this scoped block;
     enrollment--view / enrollment--card / surface--symbol / scan-button / enrollment--actions are owned
     solely by this component so they move with it. The .enrollment--actions button child-primitive
     selectors and their shared grouped/state overrides (composer/approval/push)
     stay global in app.css — the shared overrides change the effective background/color, so moving
     only the enrollment-specific button rules would diverge from the original cascade. .surface--eyebrow
     (shared by review/home/inbox/plan surfaces), .barrier-note (shared by the session surface), and
     .inline-alert (shared by the composer) are shared by 2+ components and stay global. Values unchanged. -->
<style>
  /* This surface: enrollment--view — first-run device binding. */
  /* Editable seam: layout — full-frame centring + safe gutters. */
  /* This state: idle · busy · error · authenticating — binding lifecycle. */
  .enrollment--view {
    display: grid;
    min-height: calc(100dvh - 4.25rem);
    padding: clamp(1rem, 6vw, 4rem) var(--page-gutter);
    place-items: center;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .enrollment--card {
    width: min(100%, 42rem);
    padding: clamp(1.5rem, 5vw, 3.5rem);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
    box-shadow: var(--shadow-raised);
  }

  /* Keeps the optional local pairing path visible without changing auth state. */
  .pairing--guidance {
    padding: var(--space-3) var(--space-4);
    border-inline-start: 3px solid var(--accent);
    background: var(--accent-soft);
    color: var(--ink-secondary);
    font-size: 0.82rem;
  }

  /* Keeps bounded local diagnostics readable while a pairing attempt is active. */
  .connection--log {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-8);
    padding-top: var(--space-6);
    border-top: 1px solid var(--line);
  }

  /* Gives the diagnostics section a distinct heading without competing with enrollment. */
  .connection--log h2 {
    margin: 0;
    color: var(--ink);
    font-size: 1rem;
    font-weight: 680;
  }

  /* Explains that the log is local evidence rather than a host status claim. */
  .connection--log p {
    margin: var(--space-1) 0 0;
    color: var(--ink-muted);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  /* Keeps a long reload-surviving log from pushing pairing controls away. */
  .connection--log ol {
    display: grid;
    max-height: 12rem;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    overflow: auto;
    list-style: none;
  }

  /* Presents status, safe code and timestamp as one scannable event. */
  .connection--log li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0 var(--space-3);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--line);
    color: var(--ink-secondary);
    font-size: 0.75rem;
  }

  /* Keeps timestamps subordinate to the event status. */
  .connection--log time {
    grid-column: 1 / -1;
    color: var(--ink-muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
  }

  /* Makes an empty log explicit without implying a successful pairing. */
  .connection--empty {
    color: var(--ink-muted);
  }

  /* This slot: symbol — the π mark. */
  .surface--symbol {
    display: grid;
    width: 3rem;
    height: 3rem;
    margin-bottom: var(--space-8);
    place-items: center;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-size: 1.4rem;
    font-weight: 700;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .enrollment--card h1 {
    max-width: 11ch;
    margin: 0;
    color: var(--ink);
    font-size: clamp(2.7rem, 8vw, 4.8rem);
    font-weight: 620;
    letter-spacing: -0.04em;
    line-height: 0.98;
    text-wrap: balance;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .enrollment--card > p:not(.surface--eyebrow) {
    max-width: 34rem;
    margin: var(--space-6) 0;
    color: var(--ink-secondary);
    line-height: 1.65;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .enrollment--card > label {
    display: block;
    margin-bottom: var(--space-2);
    font-size: 0.78rem;
    font-weight: 680;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .enrollment--card textarea {
    width: 100%;
    min-height: 8rem;
    resize: vertical;
    padding: var(--space-4);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--canvas);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    line-height: 1.55;
  }

  /* This slot: actions — scan + enroll controls. */
  .enrollment--actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }

  /* Scan button scoped here; shared button primitive rules stay global. */
  .scan-button {
    display: inline-flex;
    min-height: 2.9rem;
    align-items: center;
    justify-content: center;
    padding-inline: var(--space-4);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .scan-button input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  @media (max-width: 39rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .enrollment--actions {
      align-items: stretch;
      flex-direction: column;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .scan-button {
      width: 100%;
    }
  }

  @media (pointer: coarse) {
    /* Keep this rule aligned with its surrounding surface. */
    .scan-button {
      min-height: 44px;
    }
  }
  /* End of surface: enrollment--view */
</style>
