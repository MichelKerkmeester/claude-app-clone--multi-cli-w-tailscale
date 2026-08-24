<script module lang="ts">
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

  import './screen-enrollment.css';

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

  const submit = () => {
    busy = true;
    error = null;
    void enrollDevice(qrData.trim())
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

<!-- @ds surface: enrollment-view — first-run device binding. States: idle · busy · error · authenticating. -->
<!-- @ds guardrail: enrollment/auth wiring (enrollDevice · establishSession · scanQrImage · submit · onChange) — Not designer-editable. -->
<main class="enrollment-view">
  <section class="enrollment-card">
    <div class="surface-symbol" aria-hidden="true">
      π
    </div>
    <p class="surface-kicker">Private device enrollment</p>
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
    <div class="enrollment-actions">
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

<!-- @ds surface: enrollment-view — first-run device binding. Decomposed into this co-located CSS file;
     enrollment-view / enrollment-card / surface-symbol / scan-button / enrollment-actions are owned
     solely by this component so they move with it. The .enrollment-actions button child-primitive
     selectors and their shared grouped/state overrides (composer/approval/push)
     stay global in app.css — the shared overrides change the effective background/color, so moving
     only the enrollment-specific button rules would diverge from the original cascade. .surface-kicker
     (shared by review/home/inbox/plan surfaces), .barrier-note (shared by the session surface), and
     .inline-alert (shared by the composer) are shared by 2+ components and stay global. Values unchanged. -->
