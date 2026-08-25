<script module lang="ts">
  // This module holds the shared Runtime Mode Announcer types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { planModePresentation, type ModePresentationKind } from './plan-mode-presentation.js';
  import type { RuntimeUiState } from '$shared/state/runtime.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // This state: alert — conflicts · permission loss · delivery uncertainty route to the alert region.
  const ALERT_KINDS: ReadonlySet<ModePresentationKind> = new Set([
    'stale',
    'forbidden',
    'extension-error',
    'delivery-unknown',
  ]);

  // ───────────────────────────────────────────────────────────────────
  // 3. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface RuntimeModeAnnouncerProps {
    readonly runtime: RuntimeUiState;
    readonly connection: string;
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep polite copy for focused on its single responsibility.
  function politeCopyFor(kind: ModePresentationKind): string {
    switch (kind) {
      case 'build':
        return 'Build mode on. Changes still require approval.';
      case 'plan':
        return 'Plan mode on. Pi is read-only.';
      case 'executing':
        return 'Plan execution is in progress.';
      default:
        return '';
    }
  }

  // Keep alert copy for focused on its single responsibility.
  function alertCopyFor(kind: ModePresentationKind): string {
    switch (kind) {
      case 'stale':
        return 'Mode changed on another device.';
      case 'forbidden':
        return 'Device not authorized. Mode controls are disabled.';
      case 'extension-error':
        return 'Plan safety could not be verified. Mode controls are disabled.';
      case 'delivery-unknown':
        return 'Mode could not be verified. Controls disabled.';
      default:
        return '';
    }
  }

</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { runtime, connection }: RuntimeModeAnnouncerProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // This surface: runtime-mode-announcer — dual polite/alert live regions for mode transitions.
  // Do not edit — The announce-once settle-key effect and ALERT_KINDS routing keep these inert text regions from moving focus. Not designer-editable.
  let polite = $state('');
  let alert = $state('');
  // Skip announcing the first settle; only transitions are spoken.
  let announcedKey: string | null = null;
  let primed = false;

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const presentation = $derived(planModePresentation(runtime, connection));

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    const key = presentation.kind;
    if (!primed) {
      primed = true;
      announcedKey = key;
      return;
    }
    if (announcedKey === key) return;
    announcedKey = key;
    if (ALERT_KINDS.has(key)) {
      alert = alertCopyFor(key);
    } else if (key === 'build' || key === 'plan' || key === 'executing') {
      polite = politeCopyFor(key);
    }
  });
</script>

<!-- Component content -->
<!-- This state: polite — settled transitions (build · plan · executing).
     Do not edit — role="status" + aria-live="polite" + aria-atomic region. -->
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">{polite}</div>
<!-- This state: alert — conflicts · permission loss · delivery uncertainty.
     Do not edit — role="alert" region. -->
<div class="sr-only" role="alert">{alert}</div>
