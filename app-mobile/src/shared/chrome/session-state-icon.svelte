<script module lang="ts">
  // This module holds the shared Session State Icon types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SESSION STATE ICON
  // ───────────────────────────────────────────────────────────────────

  import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

  // Known host tools get a compact visual mark; unknown names remain readable text.
  export const TOOL_GLYPHS: Readonly<Record<string, string>> = Object.freeze({
    apply_patch: '✎',
    bash: '⌘',
    edit: '✎',
    find: '⌕',
    grep: '⌕',
    read: '◌',
    search: '⌕',
    shell: '⌘',
    terminal: '⌘',
    web_search: '↗',
    write: '✎',
  });

  export function toolGlyphFor(tool: string): string | null {
    return TOOL_GLYPHS[tool] ?? null;
  }

  export interface SessionStateIconProps {
    readonly status: SessionCardDto['status'];
  }
</script>

<script lang="ts">
  let { status }: SessionStateIconProps = $props();
</script>

<!-- Component content -->
<!-- Session state icon -->
<!-- This surface: session-state-icon — per-session status glyph. -->
<span class="state--icon" aria-hidden="true">
  <!-- Do not edit — aria-hidden + glyph mapping — not designer-editable. -->
  <span class="state--icon-glyph">{status === 'idle' ? '✓' : status === 'running' ? '•' : status === 'interrupted' ? '!' : '?'}</span>
</span>

<!-- Session state icon -->
<!-- This surface: session-state-icon — per-session status glyph. Decomposed into this scoped block; the
     .state--icon slot is owned solely by this component (it renders the status disc and glyph) so they
     move together. The pulsing group (.state--running .state--icon and .agent--running .state--icon, joined
     with .status--authenticating/connecting/reconnecting i) and the .state--running / .state--idle /
     .state--interrupted state colors are owned by the session--card / agent-row surfaces that render
     the state-X wrapper — those grouped selectors stay GLOBAL in app.css (unchanged) so their
     byte-for-byte structure is preserved and the global ancestor rules still reach this scoped
     .state--icon at runtime. Values unchanged. -->
<style>
  /* This slot: icon — the disc uses the inherited state color while its glyph stays legible. */
  .state--icon {
    display: inline-grid;
    width: 1.25rem;
    height: 1.25rem;
    place-items: center;
    border-radius: 50%;
    background: currentColor;
    font-size: 0.72rem;
    line-height: 1;
  }

  /* Keeps the glyph readable against the status-colored disc. */
  .state--icon-glyph {
    color: var(--surface);
  }
  /* End of surface: session-state-icon */
</style>
