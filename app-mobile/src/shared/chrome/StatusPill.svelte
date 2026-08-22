<script module lang="ts">
  import type { ConnectionPhase } from '../data/state.js';

  export interface StatusPillProps {
    readonly phase: ConnectionPhase;
  }

  const labels: Record<ConnectionPhase, string> = {
    unenrolled: 'Enrollment required',
    authenticating: 'Authenticating',
    offline: 'Offline cache',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    live: 'Relay live',
    error: 'Relay unavailable',
  };
</script>

<script lang="ts">
  let { phase }: StatusPillProps = $props();
</script>

<!-- @ds surface: status-pill — connection-phase status. -->
<span class={`status-pill status-${phase}`} role="status">
  <!-- @ds guardrail: role="status" live announce + phase label — not designer-editable. -->
  <i></i>
  {labels[phase]}
</span>

<!-- @ds surface: status-pill — connection-phase status. Decomposed into this scoped block; status-pill,
     status-pill i and status-live are owned solely by this component so they move with it. The
     pulsing group (.status-authenticating/connecting/reconnecting i joined with .state-running /
     .agent-running .state-icon) and the error group (.status-error joined with .state-interrupted)
     are shared with the session-state surface, and the @media (max-width: 52rem) .status-pill rule
     is grouped with .wordmark-copy — those grouped selectors stay GLOBAL in app.css (unchanged)
     so their byte-for-byte structure is preserved. Values unchanged. -->
<style>
  /* @ds surface: status-pill — connection-phase status. */
  .status-pill {
    display: flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.45rem;
    padding-inline: var(--space-3);
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 650;
    white-space: nowrap;
  }

  /* @ds slot: dot */
  .status-pill i {
    width: 0.48rem;
    height: 0.48rem;
    border-radius: 50%;
    background: currentColor;
  }

  /* @ds state: live */
  .status-live {
    color: var(--success);
  }
  /* @ds end surface: status-pill */
</style>
