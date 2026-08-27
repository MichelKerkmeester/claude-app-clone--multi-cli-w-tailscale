<script module lang="ts">
  // This module holds the shared Screen Enrollment types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ENROLLMENT SCREEN
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { ConnectionPhase } from '$shared/state/state.js';
  import type { DeviceIdentity } from '$shared/transport/auth.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface EnrollmentProps {
    readonly phase: ConnectionPhase;
    readonly onEnrolled: (device: DeviceIdentity) => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { enrollDevice, establishSession, scanQrImage } from '$shared/transport/auth.js';
  import { messageFrom } from '$shared/format/view-helpers.js';
  import Button from '$shared/primitives/button/button.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { phase, onEnrolled }: EnrollmentProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let qrData = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep submit focused on its single responsibility.
  let abortController = new AbortController();
  const submit = () => {
    busy = true;
    error = null;
    abortController = new AbortController();
    void enrollDevice(qrData.trim(), abortController.signal)
      .then(async (identity) => {
        const authenticated = await establishSession();
        if (authenticated === null) throw new Error('Enrollment did not produce a device session.');
        onEnrolled(identity);
      })
      .catch((cause: unknown) => {
        error = messageFrom(cause);
      })
      .finally(() => (busy = false));
  };
</script>

<!-- Component content -->
<!-- Enrollment view -->
<!-- This surface: enrollment--view — first-run device binding. States: idle · busy · error · authenticating. -->
<!-- Do not edit — enrollment/auth wiring (enrollDevice · establishSession · scanQrImage · submit · onChange) — Not designer-editable. -->
<main class="enrollment--view">
  <section class="enrollment--card">
    <div class="surface--symbol" aria-hidden="true">
      π
    </div>
    <p class="surface--eyebrow">Private device enrollment</p>
    <h1>Bind this phone once</h1>
    <p>
      Scan or paste the relay's short-lived QR data. This device creates its own key and starts
      in read-only mode.
    </p>
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
      <div class="inline-alert">{error}</div>
    {/if}
    {#if phase === 'authenticating'}
      <div class="barrier-note">Checking this device</div>
    {/if}
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
