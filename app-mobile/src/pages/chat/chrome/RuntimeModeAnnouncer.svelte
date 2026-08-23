<script module lang="ts">
  import { planModePresentation, type ModePresentationKind } from './planModePresentation.js';
  import type { RuntimeUiState } from '$shared/state/runtime.js';

  // @ds state: alert — conflicts · permission loss · delivery uncertainty route to the alert region.
  const ALERT_KINDS: ReadonlySet<ModePresentationKind> = new Set([
    'stale',
    'forbidden',
    'extension-error',
    'delivery-unknown',
  ]);

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

  export interface RuntimeModeAnnouncerProps {
    readonly runtime: RuntimeUiState;
    readonly connection: string;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { runtime, connection }: RuntimeModeAnnouncerProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 2. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // @ds surface: runtime-mode-announcer — dual polite/alert live regions for mode transitions.
  // @ds guardrail: do-not-edit — the announce-once settle-key effect (primed/announcedKey) and the
  // ALERT_KINDS routing; the regions are inert text nodes that never move focus. Not designer-editable.
  let polite = $state('');
  let alert = $state('');
  // The last announced settle key; the first settle is recorded without an
  // announcement so only actual transitions are spoken.
  let announcedKey: string | null = null;
  let primed = false;

  // ───────────────────────────────────────────────────────────────────
  // 3. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const presentation = $derived(planModePresentation(runtime, connection));

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

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

<!-- @ds state: polite — settled transitions (build · plan · executing).
     @ds guardrail: do-not-edit — role="status" + aria-live="polite" + aria-atomic region. -->
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true">{polite}</div>
<!-- @ds state: alert — conflicts · permission loss · delivery uncertainty.
     @ds guardrail: do-not-edit — role="alert" region. -->
<div class="sr-only" role="alert">{alert}</div>
