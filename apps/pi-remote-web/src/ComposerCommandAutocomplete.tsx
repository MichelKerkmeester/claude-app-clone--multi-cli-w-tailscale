// ───────────────────────────────────────────────────────────────────
// MODULE: Inline Slash Command Autocomplete Surface
// ───────────────────────────────────────────────────────────────────
// The nonmodal completion card above the composer. The textarea remains the
// only editing field and keeps DOM focus; rows carry virtual focus through
// aria-activedescendant and are never in the tab order. The panel derives
// one explicit state from the trigger predicate and the session-scoped
// catalog lifecycle, renders only that state's presentation, and every
// open state is fail-closed: rows are insertable only when the catalog
// authority is usable, and no panel interaction ever submits, tickets, or
// touches the host execution path. The panel is an overlay, so opening and
// closing displace nothing.

import { useEffect, useMemo } from 'react';
import { Button, Popover } from 'react-aria-components';
import type { RefObject } from 'react';

import type { HostCommandCatalogState, HostCommandCatalogStatus } from './commands.js';
import type { RankedHostCommand } from './rankHostCommands.js';
import { CommandOption } from './CommandOption.js';
import { useVisualViewportAnchor } from './useVisualViewportAnchor.js';

/** The listbox the composer's aria-controls references while rows exist. */
export const SLASH_LISTBOX_ID = 'slash-command-list';

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

/** Row-bearing states: the listbox is rendered and enabled rows may insert. */
const ROW_BEARING_STATES: ReadonlySet<SlashPanelOpenState> = new Set([
  'ready.unfiltered',
  'ready.filtered',
  'refreshing.current',
  'ready.staleOffline',
  'session.running',
]);

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

const CLOSED: SlashPanelDerivation = {
  surfaceState: 'closed',
  panelOpen: false,
  panelState: null,
  canInsert: false,
  canRetry: false,
  message: null,
};

/** The explicit open-state machine and its fail-closed actions are frozen: no state
 *  can ever enable submission; insertion is the only action, and it exists only in
 *  row-bearing states with usable authority. Restyle only the presentation it selects.
 *  @ds guardrail: state-machine — catalog/lifecycle explicit-state derivation. */
/**
 * The one state machine for the inline surface. Every catalog/lifecycle
 * combination maps to exactly one explicit state with fail-closed actions:
 * no state here can ever enable submission — insertion is the only action,
 * and it exists only in row-bearing states with usable authority.
 */
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
      // A committed same-scope snapshot survives a refresh; without one the
      // card shows the bounded skeleton state.
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
  readonly anchorRef: RefObject<HTMLElement | null>;
  /** The panel root, used by the composer's outside-press dismissal. */
  readonly panelRef: RefObject<HTMLDivElement | null>;
  /** Completed-press insertion request for an enabled row. */
  readonly onInsert: (name: string) => void;
  /** Announce a disabled row's disclosed reason after its press. */
  readonly onDisabledPress: (reason: string) => void;
  readonly onRetry: () => void;
  readonly onAnnounce: (message: string) => void;
}

/** The tallest the card may be: 280px, 40% of the visual viewport, or the space above the composer. */
const MAX_PANEL_HEIGHT_PX = 280;
const PANEL_VIEWPORT_FRACTION = 0.4;
const ANCHOR_GAP_PX = 8;
const MIN_PANEL_HEIGHT_PX = 56;
const COUNT_ANNOUNCEMENT_DEBOUNCE_MS = 250;

export function ComposerCommandAutocomplete({
  prompt,
  open,
  derivation,
  activeName,
  items,
  catalog,
  running,
  anchorRef,
  panelRef,
  onInsert,
  onDisabledPress,
  onRetry,
  onAnnounce,
}: ComposerCommandAutocompleteProps) {
  const { viewportHeightPx, anchorTopPx } = useVisualViewportAnchor(anchorRef);
  // The popover anchors to the composer tray; this visual-viewport input drives only
  // the panel's max height and is frozen wiring.
  // @ds guardrail: anchor — visual-viewport anchor for the popover max height.

  const showRows =
    open && derivation.panelState !== null && ROW_BEARING_STATES.has(derivation.panelState);
  const surfaceState = open
    ? (derivation.panelState ?? 'closed')
    : prompt.startsWith('/')
      ? 'drafted'
      : 'closed';
  // The leading-slash trigger predicate and this closed/drafted/panel-state mapping are
  // frozen; restyling never changes which surface state renders.
  // @ds guardrail: trigger-predicate — leading-slash open condition and state mapping.

  // Keep the active row visible: virtual focus must follow arrows without
  // scrolling the page.
  // @ds guardrail: virtual-focus — keep the active row in view on arrow nav.
  useEffect(() => {
    if (!open || activeName === null) return undefined;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(`slash-option-${activeName}`);
      if (element !== null && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ block: 'nearest' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, activeName]);

  // State transitions announce through the composer's single atomic status
  // region; row-bearing states announce their result count after the
  // debounce so typing does not interrupt the screen reader.
  // @ds guardrail: announcement — atomic status-region wiring and debounce.
  useEffect(() => {
    if (!open || derivation.panelState === null) return undefined;
    if (derivation.message !== null) {
      onAnnounce(derivation.message);
      return undefined;
    }
    if (!ROW_BEARING_STATES.has(derivation.panelState)) return undefined;
    const timer = window.setTimeout(() => {
      onAnnounce(items.length === 1 ? '1 command available' : `${items.length} commands available`);
    }, COUNT_ANNOUNCEMENT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, derivation.panelState, derivation.message, items.length, onAnnounce]);

  const maxHeight = useMemo(() => {
    if (viewportHeightPx === null) return undefined;
    const spaceAbove =
      anchorTopPx === null
        ? viewportHeightPx
        : Math.max(MIN_PANEL_HEIGHT_PX, anchorTopPx - ANCHOR_GAP_PX);
    return Math.min(MAX_PANEL_HEIGHT_PX, viewportHeightPx * PANEL_VIEWPORT_FRACTION, spaceAbove);
  }, [viewportHeightPx, anchorTopPx]);

  const hasError = derivation.panelState !== null && derivation.panelState.startsWith('error.');
  const runningNote =
    running &&
    showRows &&
    derivation.panelState !== null &&
    derivation.panelState !== 'session.running';

  return (
    // The popover lifecycle, outside-press dismissal, and aria/role wiring are frozen;
    // this surface only restyles the presentation the state machine selects.
    // @ds surface: slash-autocomplete
    // @ds guardrail: react-aria wiring — popover lifecycle, aria/role, virtual focus.
    <div className="slash-surface" data-state={surfaceState}>
      {open && derivation.panelOpen && (
        <Popover
          isOpen
          onOpenChange={() => {
            // Outside-press dismissal is owned by the composer's document
            // listener; the popover itself never decides to close.
          }}
          triggerRef={anchorRef}
          placement="top start"
          shouldFlip={false}
          offset={ANCHOR_GAP_PX}
          isNonModal
          shouldCloseOnInteractOutside={() => false}
          isKeyboardDismissDisabled
        >
          <div
            ref={panelRef}
            className="slash-panel"
            style={maxHeight === undefined ? undefined : { maxBlockSize: maxHeight }}
          >
            {derivation.message !== null && (
              // @ds slot: header — the panel's status / error / empty-catalog copy line.
              <div className={hasError ? 'slash-status is-error' : 'slash-status'}>
                {derivation.message}
              </div>
            )}
            {showRows && (
              // @ds slot: option-list — the scrollable listbox of command rows.
              <div
                role="listbox"
                id={SLASH_LISTBOX_ID}
                aria-label="Available host commands"
                className="slash-list"
              >
                {items.map((item) => (
                  <CommandOption
                    key={item.name}
                    command={item}
                    active={item.name === activeName}
                    onInsert={onInsert}
                    onDisabledPress={onDisabledPress}
                  />
                ))}
              </div>
            )}
            {derivation.panelState === 'loading.initial' && (
              // @ds state: loading.initial — bounded skeleton rows.
              <div className="slash-skeletons" aria-hidden="true">
                <div className="slash-skeleton" />
                <div className="slash-skeleton" />
                <div className="slash-skeleton" />
              </div>
            )}
            <div className="slash-footer">
              {/* @ds slot: footer-hint — the running hint and retry affordance. */}
              {runningNote && (
                <span className="slash-running-note">
                  Pi is running — insertion stays local, nothing is sent.
                </span>
              )}
              {derivation.canRetry && (
                <Button
                  type="button"
                  className="slash-retry"
                  isDisabled={catalog.status === 'refreshing'}
                  onPointerDown={(event) => event.preventDefault()}
                  onPress={onRetry}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}
