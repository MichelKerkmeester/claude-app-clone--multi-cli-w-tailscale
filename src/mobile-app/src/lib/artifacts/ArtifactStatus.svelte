<script module lang="ts">
  import type { ArtifactResourceStatus } from './useArtifactResource.svelte.js';
  import type { ArtifactViewerPhase } from './types.js';

  export interface ArtifactStatusProps {
    readonly phase: ArtifactViewerPhase;
    readonly status?: ArtifactResourceStatus | null;
    readonly subject?: string;
    readonly announcement?: string | null;
    readonly terminalMessage?: string | null;
  }

  function statusMessage(
    phase: ArtifactViewerPhase,
    status: ArtifactResourceStatus | null | undefined,
    subject: string,
  ): string {
    // @ds state: ArtifactResourceStatus — one exact copy line per status (idle · loading ·
    //   stalled · ready · empty · whitespace · offline · stale · denied · expired · missing ·
    //   revoked · conflict · corrupt · too-large · rate-limited · relay-error · aborted · closed)
    //   plus the opening/exiting phases. @ds guardrail: do-not-edit — this is the a11y status
    //   vocabulary; the messages are the exact announced copy.
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

  $effect(() => {
    const nextMessage = message;
    const timer = window.setTimeout(() => {
      announcedMessage = nextMessage;
    }, 0);
    return () => window.clearTimeout(timer);
  });
</script>

<!-- @ds surface: artifact-status — the polite status + assertive terminal-alert live regions. -->
<!-- @ds guardrail: do-not-edit — role=status/aria-live=polite and role=alert/aria-live=assertive
     with aria-atomic are the announcement contract; do not change. -->
<div class="artifact-viewer-status" role="status" aria-live="polite" aria-atomic="true">{announcedMessage}</div>
{#if terminalMessage !== null}
  <div class="artifact-viewer-terminal-alert" role="alert" aria-live="assertive" aria-atomic="true">{terminalMessage}</div>
{/if}
