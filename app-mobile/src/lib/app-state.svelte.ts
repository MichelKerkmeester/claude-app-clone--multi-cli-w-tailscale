// ───────────────────────────────────────────────────────────────────
// MODULE: App-shell state (Svelte runes) — the four reducer stores plus
// the shell's own UI state, shared across routes via context.
// ───────────────────────────────────────────────────────────────────
// Runes port of the state React's `App` owned directly: the connection,
// session-list, transcript, and todo-projection reducers, plus the auth
// gate, overlay flags, and theme preference. Route-owned state
// (the selected session id) is NOT held here — it is derived from the
// SvelteKit route so the router stays the single source of truth for the
// URL. The dispatch functions are defined once so their identity is
// stable: the Session view's socket effect captures them a single time.

import { browser } from '$app/environment';
import { getContext, setContext } from 'svelte';

import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';

import type { DeviceIdentity } from '../auth.js';
import { loadCache, type ReadOnlyCache } from '../cache.js';
import {
  DEFAULT_MEDIA_CAPABILITY_OFF,
  EMPTY_TRANSCRIPT,
  EMPTY_TODO_PROJECTION_STATE,
  connectionReducer,
  sessionListReducer,
  transcriptReducer,
  todoProjectionReducer,
  type ConnectionState,
  type SessionListState,
  type TranscriptState,
  type TodoProjectionState,
} from '../state.js';
import { readThemePreference, type ThemePreference } from './views/view-helpers.js';

const APP_STATE_KEY = Symbol('pi-remote:app-state');
const APP_ACTIONS_KEY = Symbol('pi-remote:app-actions');

/** Fixture-injection config, mirroring React's `AppProps`; both default to off/none. */
export interface AppConfig {
  readonly mediaCapability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
  readonly askQuestionPrincipal?: string | undefined;
}

export function createAppState({
  mediaCapability = DEFAULT_MEDIA_CAPABILITY_OFF,
  askQuestionPrincipal,
}: AppConfig = {}) {
  // The persisted roster/transcript snapshot seeds the first paint; storage
  // is browser-only, so guard it for any non-browser module evaluation.
  const initialCache: ReadOnlyCache | null = browser ? loadCache() : null;

  let connection = $state<ConnectionState>({
    phase: browser && navigator.onLine ? 'authenticating' : 'offline',
    changedAt: new Date().toISOString(),
    lastMessageAt: null,
    detail: null,
  });
  let sessions = $state<SessionListState>({
    items: initialCache?.sessions ?? [],
    phase: initialCache === null ? 'idle' : 'ready',
    source: initialCache === null ? 'none' : 'cache',
    updatedAt: initialCache?.savedAt ?? null,
    error: null,
  });
  let transcript = $state<TranscriptState>(EMPTY_TRANSCRIPT);
  let todoProjection = $state<TodoProjectionState>(EMPTY_TODO_PROJECTION_STATE);

  let device = $state<DeviceIdentity | null>(null);
  let authReady = $state(false);
  let authAttempt = $state(0);
  let reviewOpen = $state(false);
  let reviewFocusId = $state<string | null>(null);
  let inboxOpen = $state(false);
  let theme = $state<ThemePreference>(browser ? readThemePreference() : 'system');

  // Stable dispatchers: reassigning the reducer output is a synchronous
  // $state write, and the function identities never change across the
  // shell's life — the socket effect that captures them stays valid.
  function dispatchConnection(action: Parameters<typeof connectionReducer>[1]): void {
    connection = connectionReducer(connection, action);
  }
  function dispatchSessions(action: Parameters<typeof sessionListReducer>[1]): void {
    sessions = sessionListReducer(sessions, action);
  }
  function dispatchTranscript(action: Parameters<typeof transcriptReducer>[1]): void {
    transcript = transcriptReducer(transcript, action);
  }
  function dispatchTodoProjection(action: Parameters<typeof todoProjectionReducer>[1]): void {
    todoProjection = todoProjectionReducer(todoProjection, action);
  }

  return {
    initialCache,
    mediaCapability,
    askQuestionPrincipal,
    get connection() {
      return connection;
    },
    get sessions() {
      return sessions;
    },
    get transcript() {
      return transcript;
    },
    get todoProjection() {
      return todoProjection;
    },
    get device() {
      return device;
    },
    set device(value: DeviceIdentity | null) {
      device = value;
    },
    get authReady() {
      return authReady;
    },
    set authReady(value: boolean) {
      authReady = value;
    },
    get authAttempt() {
      return authAttempt;
    },
    bumpAuthAttempt(): void {
      authAttempt += 1;
    },
    get reviewOpen() {
      return reviewOpen;
    },
    set reviewOpen(value: boolean) {
      reviewOpen = value;
    },
    get reviewFocusId() {
      return reviewFocusId;
    },
    set reviewFocusId(value: string | null) {
      reviewFocusId = value;
    },
    get inboxOpen() {
      return inboxOpen;
    },
    set inboxOpen(value: boolean) {
      inboxOpen = value;
    },
    get theme() {
      return theme;
    },
    set theme(value: ThemePreference) {
      theme = value;
    },
    dispatchConnection,
    dispatchSessions,
    dispatchTranscript,
    dispatchTodoProjection,
  };
}

export type AppState = ReturnType<typeof createAppState>;

export function setAppState(state: AppState): AppState {
  setContext(APP_STATE_KEY, state);
  return state;
}

export function getAppState(): AppState {
  return getContext(APP_STATE_KEY) as AppState;
}

// Shell actions that combine routing (`goto`) and async auth with state
// mutation. Implemented in `+layout.svelte` (which holds the SvelteKit
// navigation + effect context) and consumed by the route pages.
export interface AppActions {
  navigate(sessionId: string | null): void;
  openReview(): void;
  openInbox(): void;
  onRevoke(): void;
  onLogout(): void;
}

export function setAppActions(actions: AppActions): AppActions {
  setContext(APP_ACTIONS_KEY, actions);
  return actions;
}

export function getAppActions(): AppActions {
  return getContext(APP_ACTIONS_KEY) as AppActions;
}
