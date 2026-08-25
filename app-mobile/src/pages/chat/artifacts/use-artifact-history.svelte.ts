// ───────────────────────────────────────────────────────────────────
// MODULE: Artifact Viewer History
// ───────────────────────────────────────────────────────────────────

// Framework-agnostic controller; the Svelte wrapper creates once and disposes via effect cleanup.

// ───────────────────────────────────────────────────────────────────
// 1. HISTORY KEY AND CONTROLLER TYPES
// ───────────────────────────────────────────────────────────────────

const HISTORY_KEY = '__piRemoteArtifactViewer';

interface ArtifactHistoryEntry {
  readonly token: string;
  readonly previousState: unknown;
  readonly previousUrl: string;
}

export interface ArtifactHistoryController {
  readonly open: () => void;
  readonly close: () => void;
  readonly dispose: () => void;
}

type HistoryWindow = Pick<
  Window,
  'addEventListener' | 'removeEventListener' | 'history' | 'location'
>;

// ───────────────────────────────────────────────────────────────────
// 2. TOKEN STATE AND HELPERS
// ───────────────────────────────────────────────────────────────────

let historyToken = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createHistoryToken(): string {
  historyToken += 1;
  return `artifact-viewer-${historyToken}`;
}

// ───────────────────────────────────────────────────────────────────
// 3. CREATE ARTIFACT HISTORY
// ───────────────────────────────────────────────────────────────────

export function createArtifactHistory(
  onBack: () => void,
  targetWindow: HistoryWindow = window,
): ArtifactHistoryController {
  let entry: ArtifactHistoryEntry | null = null;
  let listenerAttached = false;

  const onPopState = () => {
    const current = entry;
    if (current === null) return;
    entry = null;
    const state = targetWindow.history.state;
    if (isRecord(state) && state[HISTORY_KEY] === current.token) {
      targetWindow.history.replaceState(current.previousState, '', current.previousUrl);
    }
    detach();
    onBack();
  };

  const attach = () => {
    if (listenerAttached) return;
    targetWindow.addEventListener('popstate', onPopState);
    listenerAttached = true;
  };

  const detach = () => {
    if (!listenerAttached) return;
    targetWindow.removeEventListener('popstate', onPopState);
    listenerAttached = false;
  };

  return {
    open() {
      if (entry !== null) return;
      attach();
      const token = createHistoryToken();
      const previousState = targetWindow.history.state;
      const baseState = isRecord(previousState) ? previousState : {};
      entry = {
        token,
        previousState,
        previousUrl: targetWindow.location.href,
      };
      targetWindow.history.pushState(
        { ...baseState, [HISTORY_KEY]: token },
        '',
        targetWindow.location.href,
      );
    },
    close() {
      const current = entry;
      if (current === null) return;
      entry = null;
      const state = targetWindow.history.state;
      if (isRecord(state) && state[HISTORY_KEY] === current.token) {
        targetWindow.history.replaceState(current.previousState, '', current.previousUrl);
        targetWindow.history.back();
      }
      detach();
    },
    dispose() {
      const current = entry;
      entry = null;
      if (current !== null) {
        const state = targetWindow.history.state;
        if (isRecord(state) && state[HISTORY_KEY] === current.token) {
          targetWindow.history.replaceState(current.previousState, '', current.previousUrl);
        }
      }
      detach();
    },
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. SVELTE RUNES BINDING
// ───────────────────────────────────────────────────────────────────

export function useArtifactHistory(onBack: () => void): ArtifactHistoryController {
  const controller = createArtifactHistory(onBack);
  $effect(() => () => controller.dispose());
  return controller;
}
