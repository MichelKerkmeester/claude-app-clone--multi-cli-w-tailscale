// ───────────────────────────────────────────────────────────────────
// MODULE: Composer-Scoped Plan Mode Keyboard Shortcuts
// ───────────────────────────────────────────────────────────────────
// Shift+Tab toggles mode only in focused composer when preference, overlay, and runtime gates pass.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { modeAuthority, type RuntimeUiState } from '../state/runtime.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface PlanModeShortcutOptions {
  /** The `CLI-style Shift+Tab in composer` preference. */
  readonly enabled: boolean;
  /** True while any menu, sheet, dialog, autocomplete, or approval surface is open. */
  readonly overlayOpen: boolean;
  /** The composer textarea; the shortcut is inert unless it holds focus. */
  readonly getComposer: () => HTMLTextAreaElement | null;
  readonly runtime: RuntimeUiState;
  readonly connection: string;
  /** Build → Plan request; the caller routes it through the guarded mutation lane. */
  readonly onRequestPlan: () => void;
  /** Plan → Build request; the caller opens the leave confirmation instead of mutating. */
  readonly onRequestBuildExit: () => void;
  /** Opens the mode menu (⌘⇧M); opening never changes mode. */
  readonly onOpenMenu: () => void;
  /** Bounded local copy for guarded no-ops (e.g. executing-plan). */
  readonly onAnnounce: (message: string) => void;
}

// ───────────────────────────────────────────────────────────────────
// 3. PLAN MODE SHORTCUT HANDLER
// ───────────────────────────────────────────────────────────────────

export function createPlanModeShortcut(
  options: PlanModeShortcutOptions,
): (event: KeyboardEvent) => boolean {
  const {
    enabled,
    overlayOpen,
    runtime,
    connection,
    onRequestPlan,
    onRequestBuildExit,
    onOpenMenu,
    onAnnounce,
  } = options;

  return (event: KeyboardEvent): boolean => {
    if (event.isComposing || event.repeat || event.defaultPrevented) return false;
    if (event.altKey) return false;
    // Composer must hold focus so the guard stays self-contained.
    if (document.activeElement !== options.getComposer()) return false;

    const isShiftTab = event.key === 'Tab' && event.shiftKey && !event.metaKey && !event.ctrlKey;
    const isMetaShiftM =
      event.key.toLowerCase() === 'm' &&
      event.shiftKey &&
      (event.metaKey || event.ctrlKey) &&
      !(event.metaKey && event.ctrlKey);

    if (!isShiftTab && !isMetaShiftM) return false;

    const authority = modeAuthority(runtime);

    if (isMetaShiftM) {
      // Menu open is read-only; overlay and delivery gates still apply.
      if (overlayOpen || runtime.status !== 'ready' || runtime.deliveryUnknown) return false;
      onOpenMenu();
      return true;
    }

    // Any failed guard leaves normal reverse-tab behavior.
    if (!enabled) return false;
    if (overlayOpen) return false;
    if (connection !== 'live') return false;
    if (runtime.status !== 'ready' || runtime.deliveryUnknown) return false;
    if (authority.turnState !== 'idle') return false;

    switch (authority.confirmedMode) {
      case 'build':
        event.preventDefault();
        onRequestPlan();
        return true;
      case 'plan':
        event.preventDefault();
        onRequestBuildExit();
        return true;
      case 'executing-plan':
        event.preventDefault();
        onAnnounce('Plan execution is in progress.');
        return true;
      default:
        // No confirmed mode: do not intercept reverse-tab.
        return false;
    }
  };
}
