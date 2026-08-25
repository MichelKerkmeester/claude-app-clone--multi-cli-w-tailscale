<script module lang="ts">
  // This module holds the shared Composer Command Autocomplete types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Inline Slash Command Autocomplete Surface
  // ───────────────────────────────────────────────────────────────────
  // Nonmodal slash card: textarea keeps DOM focus; virtual rows; fail-closed insert-only overlay.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { HostCommandCatalogState, HostCommandCatalogStatus } from '$shared/commands/commands.js';
  import type { RankedHostCommand } from '$shared/commands/rank-host-commands.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  /** The listbox the composer's aria-controls references while rows exist. */
  export const SLASH_LISTBOX_ID = 'slash-command-list';

  // ───────────────────────────────────────────────────────────────────
  // 3. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  /** Open-panel states with objective DOM presentation. */
  export type SlashPanelOpenState =
    | 'loading.initial'
    | 'ready.unfiltered'
    | 'ready.filtered'
    | 'refreshing.current'
    | 'ready.emptyCatalog'
    | 'ready.noMatches'
    | 'ready.staleOffline'
    | 'error.noSnapshot'
    | 'error.hostUnavailable'
    | 'error.forbidden'
    | 'error.incompatible'
    | 'committing'
    | 'session.running';

  /** Surface-level states, including the closed and drafted composer conditions. */
  export type SlashSurfaceState = SlashPanelOpenState | 'closed' | 'drafted';

  // ───────────────────────────────────────────────────────────────────
  // 4. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  /** Row-bearing states: the listbox is rendered and enabled rows may insert. */
  const ROW_BEARING_STATES: ReadonlySet<SlashPanelOpenState> = new Set([
    'ready.unfiltered',
    'ready.filtered',
    'refreshing.current',
    'ready.staleOffline',
    'session.running',
  ]);

  // ───────────────────────────────────────────────────────────────────
  // 5. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface SlashPanelDerivation {
    readonly surfaceState: SlashSurfaceState;
    readonly panelOpen: boolean;
    readonly panelState: SlashPanelOpenState | null;
    /** Whether an enabled row may be inserted in this state. */
    readonly canInsert: boolean;
    /** Whether a manual catalog revalidation is offered. */
    readonly canRetry: boolean;
    /** The state's announcement/status copy, or null when the state is silent. */
    readonly message: string | null;
  }

  export interface SlashPanelDerivationInput {
    readonly triggerActive: boolean;
    readonly query: string;
    readonly draftStartsWithSlash: boolean;
    /** True only for the single render after an insertion commits. */
    readonly commitPending: boolean;
    readonly catalogStatus: HostCommandCatalogStatus;
    readonly snapshotPresent: boolean;
    readonly catalogCount: number;
    readonly matchCount: number;
    readonly running: boolean;
  }

  // ───────────────────────────────────────────────────────────────────
  // 6. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const CLOSED: SlashPanelDerivation = {
    surfaceState: 'closed',
    panelOpen: false,
    panelState: null,
    canInsert: false,
    canRetry: false,
    message: null,
  };

  // ───────────────────────────────────────────────────────────────────
  // 7. HELPERS
  // ───────────────────────────────────────────────────────────────────

  /** The explicit open-state machine and its fail-closed actions are frozen: no state
   *  Can ever enable submission; insertion is the only action, and it exists only in
   *  Row-bearing states with usable authority. Restyle only the presentation it selects.
   *  Do not edit — state-machine — Catalog/lifecycle explicit-state derivation. */
  export function deriveSlashPanelState(input: SlashPanelDerivationInput): SlashPanelDerivation {
    const { triggerActive, draftStartsWithSlash, commitPending } = input;
    if (!triggerActive) {
      return {
        ...CLOSED,
        surfaceState: draftStartsWithSlash ? 'drafted' : 'closed',
      };
    }
    if (commitPending) return openState('committing', false, false, null);
    switch (input.catalogStatus) {
      case 'loading':
      case 'refreshing':
        // Refresh without a snapshot shows the skeleton state.
        return input.snapshotPresent
          ? openState('refreshing.current', true, false, 'Checking for command changes…')
          : openState('loading.initial', false, false, 'Loading available commands…');
      case 'ready': {
        if (input.catalogCount === 0) {
          return openState(
            'ready.emptyCatalog',
            false,
            true,
            'No commands are available in this session.',
          );
        }
        if (input.matchCount === 0) {
          return openState(
            'ready.noMatches',
            false,
            false,
            `No command matches “/${input.query}”.`,
          );
        }
        if (input.running) {
          return openState(
            'session.running',
            true,
            false,
            'Pi is running — insertion stays local, nothing is sent.',
          );
        }
        return openState(input.query === '' ? 'ready.unfiltered' : 'ready.filtered', true, false, null);
      }
      case 'stale':
        return input.snapshotPresent
          ? openState(
              'ready.staleOffline',
              true,
              false,
              'Last verified — reconnect before sending.',
            )
          : openState('error.noSnapshot', false, true, 'Reconnect to load commands.');
      case 'unavailable':
        return input.snapshotPresent
          ? openState('error.hostUnavailable', false, true, 'Pi is not responding.')
          : openState('error.noSnapshot', false, true, 'Reconnect to load commands.');
      case 'forbidden':
        return openState(
          'error.forbidden',
          false,
          true,
          'Commands aren’t available for this device.',
        );
      case 'incompatible':
        return openState(
          'error.incompatible',
          false,
          true,
          'The phone and host versions don’t agree.',
        );
    }
  }

  // Keep open state focused on its single responsibility.
  function openState(
    panelState: SlashPanelOpenState,
    canInsert: boolean,
    canRetry: boolean,
    message: string | null,
  ): SlashPanelDerivation {
    return {
      surfaceState: panelState,
      panelOpen: true,
      panelState,
      canInsert,
      canRetry,
      message,
    };
  }

  /** Whether a panel state renders the listbox (and thus enables insertion). */
  export function hasRows(state: SlashPanelOpenState | null): boolean {
    return state !== null && ROW_BEARING_STATES.has(state);
  }

  // ───────────────────────────────────────────────────────────────────
  // 8. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface ComposerCommandAutocompleteProps {
    readonly prompt: string;
    /** The effective open condition after the tools-browser exclusion. */
    readonly open: boolean;
    /** The state-machine result shared with the composer's aria wiring. */
    readonly derivation: SlashPanelDerivation;
    /** Virtual-focus row, or null while no enabled row is active. */
    readonly activeName: string | null;
    readonly items: readonly RankedHostCommand[];
    readonly catalog: HostCommandCatalogState;
    readonly running: boolean;
    /** The composer tray the panel anchors to. */
    readonly getAnchor: () => HTMLElement | null;
    /** The panel root, used by the composer's outside-press dismissal. */
    panelRef?: HTMLDivElement | null;
    /** Completed-press insertion request for an enabled row. */
    readonly onInsert: (name: string) => void;
    /** Announce a disabled row's disclosed reason after its press. */
    readonly onDisabledPress: (reason: string) => void;
    readonly onRetry: () => void;
    readonly onAnnounce: (message: string) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 9. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  /** The tallest the card may be: 280px, 40% of the visual viewport, or the space above the composer. */
  const MAX_PANEL_HEIGHT_PX = 280;
  const PANEL_VIEWPORT_FRACTION = 0.4;
  const ANCHOR_GAP_PX = 8;
  const MIN_PANEL_HEIGHT_PX = 56;
  const COUNT_ANNOUNCEMENT_DEBOUNCE_MS = 250;
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 10. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { useVisualViewportAnchor } from '$shared/viewport/use-visual-viewport-anchor.svelte.js';
  import Button from '$shared/primitives/button/button.svelte';
  import CommandOption from './command-option.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 11. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    prompt,
    open,
    derivation,
    activeName,
    items,
    catalog,
    running,
    getAnchor,
    panelRef = $bindable<HTMLDivElement | null>(null),
    onInsert,
    onDisabledPress,
    onRetry,
    onAnnounce,
  }: ComposerCommandAutocompleteProps = $props();

  const viewportAnchor = useVisualViewportAnchor(() => getAnchor());
  // Visual-viewport anchor drives panel max height only.
  // Do not edit — anchor — Visual-viewport anchor for the popover max height.

  // ───────────────────────────────────────────────────────────────────
  // 12. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  type PanelBox = { left: number; bottom: number; width: number };
  let panelBox = $state<PanelBox | null>(null);

  // ───────────────────────────────────────────────────────────────────
  // 13. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const viewportHeightPx = $derived(viewportAnchor.viewportHeightPx);
  const anchorTopPx = $derived(viewportAnchor.anchorTopPx);

  const showRows = $derived(
    open && derivation.panelState !== null && ROW_BEARING_STATES.has(derivation.panelState),
  );
  const surfaceState = $derived(
    open
      ? (derivation.panelState ?? 'closed')
      : prompt.startsWith('/')
        ? 'drafted'
        : 'closed',
  );
  // Trigger predicate and surface-state mapping are frozen.
  // Do not edit — trigger-predicate — Leading-slash open condition and state mapping.

  const maxHeight = $derived.by(() => {
    if (viewportHeightPx === null) return undefined;
    const spaceAbove =
      anchorTopPx === null
        ? viewportHeightPx
        : Math.max(MIN_PANEL_HEIGHT_PX, anchorTopPx - ANCHOR_GAP_PX);
    return Math.min(MAX_PANEL_HEIGHT_PX, viewportHeightPx * PANEL_VIEWPORT_FRACTION, spaceAbove);
  });

  const panelStyle = $derived.by(() => {
    const parts: string[] = ['position: fixed'];
    if (panelBox !== null) {
      parts.push(`left: ${panelBox.left}px`);
      parts.push(`bottom: ${panelBox.bottom}px`);
      parts.push(`--trigger-width: ${panelBox.width}px`);
    }
    if (maxHeight !== undefined) {
      parts.push(`max-block-size: ${maxHeight}px`);
    }
    return parts.join('; ');
  });

  const hasError = $derived(derivation.panelState !== null && derivation.panelState.startsWith('error.'));
  const runningNote = $derived(
    running &&
      showRows &&
      derivation.panelState !== null &&
      derivation.panelState !== 'session.running',
  );

  // ───────────────────────────────────────────────────────────────────
  // 14. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Scroll active row into view without moving page scroll.
  // Do not edit — virtual-focus — Keep the active row in view on arrow nav.
  $effect(() => {
    if (!open || activeName === null) return;
    const name = activeName;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(`slash-option-${name}`);
      if (element !== null && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ block: 'nearest' });
      }
    });
    return () => cancelAnimationFrame(frame);
  });

  // Status-region announcements; row counts debounced so typing does not interrupt SR.
  // Do not edit — announcement — Atomic status-region wiring and debounce.
  $effect(() => {
    if (!open || derivation.panelState === null) return;
    if (derivation.message !== null) {
      onAnnounce(derivation.message);
      return;
    }
    if (!ROW_BEARING_STATES.has(derivation.panelState)) return;
    const count = items.length;
    const timer = window.setTimeout(() => {
      onAnnounce(count === 1 ? '1 command available' : `${count} commands available`);
    }, COUNT_ANNOUNCEMENT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  });

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    void viewportHeightPx;
    void anchorTopPx;
    if (!open || !derivation.panelOpen) {
      panelBox = null;
      return;
    }
    const anchor = getAnchor();
    if (anchor === null) {
      panelBox = null;
      return;
    }
    const rect = anchor.getBoundingClientRect();
    panelBox = {
      left: rect.left,
      bottom: window.innerHeight - rect.top + ANCHOR_GAP_PX,
      width: rect.width,
    };
  });
</script>

<!-- Component content -->
<!-- Popover lifecycle, dismissal, and aria wiring are frozen. -->
<!-- Slash autocomplete > -->
<!-- This surface: slash-autocomplete -->
<!-- Do not edit — react-aria wiring — Popover lifecycle, aria/role, virtual focus. -->
<div class="slash--surface" data-state={surfaceState}>
  {#if open && derivation.panelOpen}
    <div class="slash--panel" bind:this={panelRef} style={panelStyle}>
      {#if derivation.message !== null}
        <!-- This slot: header — the panel's status / error / empty-catalog copy line. -->
        <div class={hasError ? 'slash--status is-error' : 'slash--status'}>
          {derivation.message}
        </div>
      {/if}
      {#if showRows}
        <!-- This slot: option-list — the scrollable listbox of command rows. -->
        <div
          role="listbox"
          id={SLASH_LISTBOX_ID}
          aria-label="Available host commands"
          class="slash--list"
        >
          {#each items as item (item.name)}
            <CommandOption
              command={item}
              active={item.name === activeName}
              onInsert={onInsert}
              onDisabledPress={onDisabledPress}
            />
          {/each}
        </div>
      {/if}
      {#if derivation.panelState === 'loading.initial'}
        <!-- This state: loading.initial — bounded skeleton rows. -->
        <div class="slash--skeletons" aria-hidden="true">
          <div class="slash--skeleton"></div>
          <div class="slash--skeleton"></div>
          <div class="slash--skeleton"></div>
        </div>
      {/if}
      <div class="slash--footer">
        <!-- This slot: footer-hint — the running hint and retry affordance. -->
        {#if runningNote}
          <span class="slash--running-note">
            Pi is running — insertion stays local, nothing is sent.
          </span>
        {/if}
        {#if derivation.canRetry}
          <Button
            type="button"
            class="slash--retry"
            disabled={catalog.status === 'refreshing'}
            onpointerdown={(event) => event.preventDefault()}
            onclick={onRetry}
          >
            Retry
          </Button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Slash autocomplete -->
<!-- This surface: slash-autocomplete — the inline autocomplete card. Decomposed into this scoped block;
     slash--surface / panel / list / status / skeleton / footer / retry are owned solely by this
     component so they move with it. Child-primitive retry classes use :global so Svelte scoping
     cannot drop them. Values unchanged. -->
<style>
  /* This state: closed · drafted — surface-level open conditions. The state
     attribute drives which presentation the surface renders. */
  .slash--surface {
    display: contents;
  }

  /* This surface: slash-autocomplete — the inline autocomplete card and the
     command palette share this surface name. */
  .slash--panel {
    /* Editable seam: tokens — component tokens. Each is a thin alias to a semantic role,
       so this surface retints by editing the role it points at (primitive → semantic
       → component). Edit them here instead of on :root. */
    --slash-raised: var(--surface);
    --slash-ink: var(--ink);
    --slash-muted: var(--ink-muted);
    --slash-accent: var(--accent-ink);
    --slash-ui-accent: var(--accent-strong);
    --slash-selection: var(--accent-soft);
    /* Editable seam: layout — popover anchoring, stacking, and max size. Keeps the
       visual-viewport anchor input and screen-margin bounds exact. */
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    inline-size: var(--trigger-width, min(calc(100vw - 24px), 40rem));
    min-inline-size: 0;
    max-inline-size: calc(100vw - 24px);
    max-block-size: min(280px, calc(var(--visual-viewport-height, 100dvh) * 0.4));
    padding: 4px;
    overflow: hidden;
    border: 1px solid var(--slash-ink);
    border-radius: var(--radius-panel);
    background: var(--slash-raised);
    color: var(--slash-ink);
    box-shadow: var(--shadow-raised);
    font-family: var(--font-sans);
  }

  /* Editable seam: tokens — theme remap, dark. The same component tokens resolve to their
     dark semantic roles here. The ui-accent points at --accent-ink, not --accent-strong,
     because --accent-strong carries no dark override and would not match the dark
     UI accent. */
  :global(:root[data-theme='dark']) .slash--panel {
    --slash-raised: var(--surface);
    --slash-ink: var(--ink);
    --slash-muted: var(--ink-muted);
    --slash-accent: var(--accent-ink);
    --slash-ui-accent: var(--accent-ink);
    --slash-selection: var(--accent-soft);
  }

  @media (prefers-color-scheme: dark) {
    /* Editable seam: tokens — theme remap, system-dark. Dark semantic roles again, driven
       by the OS-dark signal; ui-accent resolves to --accent-ink for the same reason
       as the explicit dark block. */
    :global(:root[data-theme='system']) .slash--panel {
      --slash-raised: var(--surface);
      --slash-ink: var(--ink);
      --slash-muted: var(--ink-muted);
      --slash-accent: var(--accent-ink);
      --slash-ui-accent: var(--accent-ink);
      --slash-selection: var(--accent-soft);
    }
  }

  /* End of surface: slash-autocomplete */

  /* This surface: status — slash--panel header states map loading · ready..empty · ready..stale--offline ·
     error..denied onto the shared families. */
  /* This slot: header — the panel's status / error / empty-catalog copy line. */
  /* This state: loading.initial · ready.emptyCatalog · ready.noMatches ·
     ready.staleOffline · session.running — copy-led panel states; the loading
     and empty/no-match guards render header copy before any rows. */
  .slash--status {
    padding: 8px 12px;
    color: var(--slash-muted);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  /* This state: error.noSnapshot · error.hostUnavailable · error.forbidden ·
     error.incompatible — fail-closed error copy, accent-tinted. */
  .slash--status.is-error {
    color: var(--slash-accent);
    font-weight: 600;
  }

  /* This state: committing — transient post-insertion panel frame: no rows and no
     copy, closed by the composer on the next commit resolution. */

  /* This slot: option-list — the scrollable listbox of command rows. */
  /* This state: ready.unfiltered · ready.filtered · refreshing.current ·
     ready.staleOffline · session.running — the row-bearing panel states. */
  .slash--list {
    flex: 0 1 auto;
    min-block-size: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    touch-action: pan-y;
    scrollbar-gutter: stable;
    scrollbar-color: var(--line-strong) transparent;
  }

  /* This state: loading.initial — bounded skeleton rows before the first snapshot. */
  .slash--skeletons {
    display: grid;
    gap: 4px;
    padding: 4px;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .slash--skeleton {
    block-size: 56px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--slash-ink) 7%, transparent);
  }

  /* This slot: footer-hint — the footer with the running hint and retry affordance. */
  .slash--footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 4px 0;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .slash--running-note {
    padding-inline: 8px;
    color: var(--slash-muted);
    font-size: 11px;
    line-height: 16px;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.slash--retry) {
    min-block-size: 44px;
    min-inline-size: 44px;
    padding-inline: 14px;
    border: 0;
    border-radius: 10px;
    background: var(--slash-selection);
    color: var(--slash-accent);
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
    transition:
      background-color 80ms linear,
      color 80ms linear;
  }

  /* This state: retry-hovered — the revalidate affordance's hover wash. */
  :global(.slash--retry[data-hovered]) {
    background: color-mix(in srgb, var(--slash-selection) 60%, var(--slash-raised));
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.slash--retry[data-disabled]) {
    cursor: not-allowed;
    opacity: 0.55;
  }

  /* Editable seam: layout — installed-PWA popover bounds clear the device insets. */
  .slash--panel {
    inline-size: var(
      --trigger-width,
      min(calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right)), 40rem)
    );
    max-inline-size: calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right));
  }

  /* Editable seam: contrast — system-wide forced-colors primitive: the scoped palettes yield to the user's
     system scheme (Canvas / CanvasText / Highlight). */
  /* Do not edit — Forced-colors yield is an accessibility guarantee; never restore a hard-coded surface/ink over the system scheme. */
  @media (forced-colors: active) {
    /* Keep this rule aligned with its surrounding surface. */
    :global(.slash--retry) {
      border: 1px solid CanvasText;
      background: Canvas;
      color: Highlight;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .slash--status.is-error,
    .slash--running-note {
      color: CanvasText;
    }
  }
</style>
