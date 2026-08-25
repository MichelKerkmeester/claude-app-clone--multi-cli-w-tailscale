<script module lang="ts">
  // This module holds the shared Artifact Status types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ARTIFACT STATUS
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. STATUS MESSAGE
  // ───────────────────────────────────────────────────────────────────

  import type { ArtifactResourceStatus } from './use-artifact-resource.svelte.js';
  import type { ArtifactViewerPhase } from './types.js';

  export interface ArtifactStatusProps {
    readonly phase: ArtifactViewerPhase;
    readonly status?: ArtifactResourceStatus | null;
    readonly subject?: string;
    readonly announcement?: string | null;
    readonly terminalMessage?: string | null;
  }

  // Keep status message focused on its single responsibility.
  function statusMessage(
    phase: ArtifactViewerPhase,
    status: ArtifactResourceStatus | null | undefined,
    subject: string,
  ): string {
    // This state: ArtifactResourceStatus — One exact copy line covers each resource status plus the opening and exiting phases. Do not edit — This is the a11y status vocabulary; the messages are the exact announced copy.
    if (phase === 'opening') return `Opening ${subject}.`;
    if (phase === 'exiting') return `Closing ${subject}.`;
    if (status === undefined || status === null) return `${subject} ready.`;
    switch (status) {
      case 'idle':
        return `${subject} is waiting to load.`;
      case 'loading':
        return `Loading ${subject}.`;
      case 'stalled':
        return `${subject} is taking longer than expected.`;
      case 'ready':
        return `${subject} ready.`;
      case 'empty':
        return `${subject} is empty.`;
      case 'whitespace':
        return `${subject} contains whitespace only.`;
      case 'offline':
        return `${subject} is unavailable while the relay is offline.`;
      case 'stale':
        return `${subject} is stale. Choose View latest to request the same exact revision again.`;
      case 'denied':
        return `${subject} access was denied.`;
      case 'expired':
        return `${subject} has expired.`;
      case 'missing':
        return `${subject} is missing.`;
      case 'revoked':
        return `${subject} was revoked.`;
      case 'conflict':
        return `${subject} has a revision conflict.`;
      case 'corrupt':
        return `${subject} failed verification.`;
      case 'too-large':
        return `${subject} is too large to preview.`;
      case 'rate-limited':
        return `${subject} is temporarily rate limited.`;
      case 'relay-error':
        return `The relay could not provide ${subject}.`;
      case 'aborted':
        return `${subject} loading was cancelled.`;
      case 'closed':
        return `${subject} is closed.`;
    }
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 2. LIVE REGION STATE
  // ───────────────────────────────────────────────────────────────────

  let {
    phase,
    status,
    subject = 'Redacted file diff',
    announcement = null,
    terminalMessage = null,
  }: ArtifactStatusProps = $props();

  const message = $derived(announcement ?? statusMessage(phase, status, subject));
  // svelte-ignore state_referenced_locally
  let announcedMessage = $state(message);

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    const nextMessage = message;
    const timer = window.setTimeout(() => {
      announcedMessage = nextMessage;
    }, 0);
    return () => window.clearTimeout(timer);
  });
</script>

<!-- Component content -->
<!-- Artifact status -->
<!-- This surface: artifact-status — the polite status + assertive terminal-alert live regions. -->
<!-- Do not edit — The status and alert live regions use fixed roles, live settings, and atomic announcements as the accessibility contract. -->
<div class="artifact-viewer--status" role="status" aria-live="polite" aria-atomic="true">{announcedMessage}</div>
{#if terminalMessage !== null}
  <div class="artifact-viewer--terminal-alert" role="alert" aria-live="assertive" aria-atomic="true">{terminalMessage}</div>
{/if}

<!-- Artifact status -->
<!-- This surface: artifact-status — the polite status + assertive terminal-alert live regions.
     Decomposed into this scoped block; both are single-component. terminal-alert is the visually-hidden
     (sr-only) pattern. Values unchanged. -->
<style>
  /* This slot: status — the polite status live region. */
  .artifact-viewer--status {
    min-block-size: 2.75rem;
    padding-block: var(--space-3);
    color: var(--ink-muted);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  /* This slot: terminal-alert — the visually-hidden assertive alert live region. */
  /* Do not edit — Visually hidden but present for assistive tech; this is the announcement contract. */
  .artifact-viewer--terminal-alert {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
</style>
