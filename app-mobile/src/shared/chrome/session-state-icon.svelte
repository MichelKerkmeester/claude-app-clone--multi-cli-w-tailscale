<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SESSION STATE ICON
  // ───────────────────────────────────────────────────────────────────

  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

  export interface SessionStateIconProps {
    readonly status: SessionCardDto['status'];
  }
</script>

<script lang="ts">
  import './session-state-icon.css';
  let { status }: SessionStateIconProps = $props();
</script>

<!-- @ds surface: session-state-icon — per-session status glyph. -->
<span class="state-icon" aria-hidden="true">
  <!-- @ds guardrail: aria-hidden + glyph mapping — not designer-editable. -->
  {status === 'idle' ? '✓' : status === 'running' ? '•' : status === 'interrupted' ? '!' : '?'}
</span>

<!-- @ds surface: session-state-icon — per-session status glyph. Decomposed into this co-located CSS file; the
     .state-icon slot is owned solely by this component (it renders the span directly) so it moves
     with it. The pulsing group (.state-running .state-icon and .agent-running .state-icon, joined
     with .status-authenticating/connecting/reconnecting i) and the .state-running / .state-idle /
     .state-interrupted state colors are owned by the session-card / agent-row surfaces that render
     the state-X wrapper — those grouped selectors stay GLOBAL in app.css (unchanged) so their
     byte-for-byte structure is preserved and the global ancestor rules still reach this scoped
     .state-icon at runtime. Values unchanged. -->
