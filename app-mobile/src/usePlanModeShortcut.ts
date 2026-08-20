// ───────────────────────────────────────────────────────────────────
// MODULE: Composer-Scoped Plan Mode Keyboard Shortcuts
// ───────────────────────────────────────────────────────────────────
// `Shift+Tab` toggles mode only while the composer textarea is focused,
// the CLI-style preference is on, no overlay is open, and the runtime is
// connected, ready, idle, and settled. Bare `Tab` and outside-composer
// `Shift+Tab` are never touched, and `⌘⇧M` opens the mode menu without
// changing mode. The returned handler reports whether it consumed the
// key; the caller runs it before its own key handling.

import { useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

import { modeAuthority, type RuntimeUiState } from './runtime.js';

export interface PlanModeShortcutOptions {
  /** The `CLI-style Shift+Tab in composer` preference. */
  readonly enabled: boolean;
  /** True while any menu, sheet, dialog, autocomplete, or approval surface is open. */
  readonly overlayOpen: boolean;
  /** The composer textarea; the shortcut is inert unless it holds focus. */
  readonly composerRef: RefObject<HTMLTextAreaElement | null>;
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

export function usePlanModeShortcut(options: PlanModeShortcutOptions) {
  const {
    enabled,
    overlayOpen,
    composerRef,
    runtime,
    connection,
    onRequestPlan,
    onRequestBuildExit,
    onOpenMenu,
    onAnnounce,
  } = options;

  return useCallback(
    (event: ReactKeyboardEvent): boolean => {
      if (event.nativeEvent.isComposing || event.repeat || event.defaultPrevented) return false;
      if (event.altKey) return false;
      // Composer scope: the textarea must hold real focus. This keeps the
      // guard self-contained no matter where the handler is attached.
      if (document.activeElement !== composerRef.current) return false;

      const isShiftTab = event.key === 'Tab' && event.shiftKey && !event.metaKey && !event.ctrlKey;
      const isMetaShiftM =
        event.key.toLowerCase() === 'm' &&
        event.shiftKey &&
        (event.metaKey || event.ctrlKey) &&
        !(event.metaKey && event.ctrlKey);

      if (!isShiftTab && !isMetaShiftM) return false;

      const authority = modeAuthority(runtime);

      if (isMetaShiftM) {
        // Opening the menu is read-only, so it only needs the overlay guard;
        // a disabled control cannot be opened this way either.
        if (overlayOpen || runtime.status !== 'ready' || runtime.deliveryUnknown) return false;
        onOpenMenu();
        return true;
      }

      // Shift+Tab: the full fail-closed guard chain. Any guard failing means
      // the key keeps its ordinary browser reverse-tab behavior.
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
          // No host-confirmed mode: leave browser reverse-tab alone.
          return false;
      }
    },
    [
      enabled,
      overlayOpen,
      composerRef,
      runtime,
      connection,
      onRequestPlan,
      onRequestBuildExit,
      onOpenMenu,
      onAnnounce,
    ],
  );
}
