// ───────────────────────────────────────────────────────────────────
// MODULE: Read-Only Sync Socket Lifecycle (Svelte runes)
// ───────────────────────────────────────────────────────────────────
// Runes port of the React Session view's big sync-socket `useEffect`
// (App.tsx 1142-1283). The three persistent refs (cursor / frame /
// `pendingMessages`) become factory-scope plain closure `let` trackers.
// They are imperative and must never trigger reactivity, exactly like
// `useRuntime` control handles. The effect registers exactly the four
// The truly-reactive deps from React's dep array (sessionId, cache,
// The cacheResumeGeneration and todoRefreshGeneration values are read at the
// Top of the effect body. Dispatch fns and runtimeControls are plain
// Non-reactive inputs. Numeric literals, navigator.onLine guards, event
// Names, reducer action types, and the `as ConnectionAction` cast remain
// Verbatim; all effects flow through the dispatch* reducers.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { untrack } from 'svelte';

import type { SyncCursor, SyncMessage } from '@pi-remote/pi-rpc-protocol';

import { fetchTranscript, noteRelayHeartbeat, openSyncSocket } from './relay.js';
import type { ReadOnlyCache } from './cache.js';
import {
  transcriptReducer,
  type ConnectionAction,
  type TodoProjectionAction,
} from '../state/state.js';
import { messageFrom } from '../format/view-helpers.js';

// ───────────────────────────────────────────────────────────────────
// 2. SYNC MESSAGE HELPERS
// ───────────────────────────────────────────────────────────────────

const ignoreTodoAction: (action: TodoProjectionAction) => void = () => undefined;

function dispatchArtifactLifecycleEvent(name: string): void {
  window.dispatchEvent(new Event(name));
}

function applySyncMessage(
  message: SyncMessage,
  at: string,
  dispatch: (action: Parameters<typeof transcriptReducer>[1]) => void,
  dispatchTodo: (action: TodoProjectionAction) => void = ignoreTodoAction,
): void {
  switch (message.kind) {
    case 'sync.snapshot':
      dispatch({ type: 'snapshot', message, at });
      dispatchTodo({ type: 'snapshot', message });
      break;
    case 'sync.delta':
      dispatch({ type: 'delta', message, at });
      dispatchTodo({ type: 'delta', message });
      break;
    case 'sync.gap':
      dispatch({ type: 'gap', message });
      dispatchTodo({ type: 'gap', message });
      break;
  }
}

function planInvalidationFromSync(message: SyncMessage): 'superseded' | 'invalid' | null {
  if (message.kind === 'sync.gap') return null;
  for (const envelope of message.envelopes) {
    const payload = envelope.payload;
    if (!isRecordValue(payload) || payload.type !== 'extension_ui_request') continue;
    if (payload.method !== 'setPlan' || payload.statusKey !== 'pi-remote-plan-artifact') continue;
    if (!isRecordValue(payload.plan)) continue;
    if (payload.plan.validity === 'superseded' || payload.plan.validity === 'invalid') {
      return payload.plan.validity;
    }
  }
  return null;
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ───────────────────────────────────────────────────────────────────
// 3. HOOK ENTRY AND INITIAL LOAD
// ───────────────────────────────────────────────────────────────────

/** Read-only sync-socket lifecycle for one session view. Returns nothing. */
export function useSyncSocket(deps: {
  getSessionId: () => string;
  getCache: () => ReadOnlyCache | null;
  getCacheResumeGeneration: () => number;
  getTodoRefreshGeneration: () => number;
  dispatchConnection: (action: ConnectionAction) => void;
  dispatchTranscript: (action: Parameters<typeof transcriptReducer>[1]) => void;
  dispatchTodoProjection: (action: TodoProjectionAction) => void;
  runtimeControls: {
    refresh: (reason: 'live') => unknown;
    invalidatePlan?: (validity: 'superseded' | 'invalid') => void;
  };
}): void {
  // Imperative trackers — plain closure `let`, never `$state`: they must
  // Not trigger reactivity. React `xRef.current` → bare `x`.
  let cursor: SyncCursor | null = null;
  let frame: number | null = null;
  let pendingMessages: Array<{ readonly message: SyncMessage; readonly at: string }> = [];

  $effect(() => {
    // Register the four truly-reactive deps (React dep array: cache,
    // CacheResumeGeneration, sessionId, todoRefreshGeneration). The two
    // Generation getters are touch-only — their values are unused, same
    // As React re-running on a state bump.
    const sessionId = deps.getSessionId();
    const cache = deps.getCache();
    deps.getCacheResumeGeneration();
    deps.getTodoRefreshGeneration();

    const { dispatchConnection, dispatchTranscript, dispatchTodoProjection, runtimeControls } =
      deps;

    // Dispatch* reduce their $state (read + write). The header comment intends only the four deps
    // Above to be reactive, but tracking these sync dispatch calls leaks transcript/todo state in
    // As deps, so the effect re-runs on its own writes → effect_update_depth_exceeded. Untrack them.
    untrack(() => {
      dispatchTranscript({ type: 'select', sessionId });
      dispatchTodoProjection({ type: 'select', sessionId });
    });
    const cached = cache?.transcripts.find((item) => item.sessionId === sessionId);
    if (cached !== undefined) {
      untrack(() =>
        dispatchTranscript({
          type: 'hydrate',
          sessionId,
          epoch: cached.epoch,
          coversThrough: cached.coversThrough,
          blocks: cached.blocks,
          savedAt: cached.savedAt,
        }),
      );
      cursor = cached.epoch === null ? null : { epoch: cached.epoch, seq: cached.coversThrough };
    } else {
      cursor = null;
    }

    const controller = new AbortController();
    void fetchTranscript(sessionId, controller.signal)
      .then((page) => {
        dispatchTranscript({
          type: 'page',
          sessionId,
          coversThrough: page.coversThrough,
          blocks: page.items,
          at: new Date().toISOString(),
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          dispatchTranscript({ type: 'error', error: messageFrom(error) });
        }
      });

    // ───────────────────────────────────────────────────────────────────
    // 4. SOCKET CONNECT AND RETRY
    // ───────────────────────────────────────────────────────────────────

    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let retryCount = 0;
    let stopped = false;

    const connect = () => {
      if (stopped || !navigator.onLine) {
        dispatchConnection({ type: 'offline' });
        return;
      }
      dispatchConnection({ type: 'connecting', reconnect: retryCount > 0 });
      void openSyncSocket(
        sessionId,
        cursor,
        (message) => {
          noteRelayHeartbeat();
          const at = new Date().toISOString();
          if (
            message.kind === 'sync.delta' &&
            cursor !== null &&
            cursor.epoch !== message.epoch
          ) {
            dispatchArtifactLifecycleEvent('pi-remote:transcript-superseded');
            cursor = null;
            applySyncMessage(message, at, dispatchTranscript, dispatchTodoProjection);
            socket?.close();
            return;
          }
          if (
            message.kind === 'sync.snapshot' &&
            cursor !== null &&
            cursor.epoch !== message.epoch
          ) {
            dispatchArtifactLifecycleEvent('pi-remote:transcript-superseded');
          }
          pendingMessages.push({ message, at });
          if (frame === null) {
            frame = window.requestAnimationFrame(() => {
              for (const pending of pendingMessages) {
                applySyncMessage(
                  pending.message,
                  pending.at,
                  dispatchTranscript,
                  dispatchTodoProjection,
                );
              }
              pendingMessages = [];
              frame = null;
            });
          }
          if (message.kind !== 'sync.gap') {
            cursor = { epoch: message.epoch, seq: message.coversThrough };
            dispatchConnection({ type: 'live', at });
            retryCount = 0;
            const invalidation = planInvalidationFromSync(message);
            if (invalidation !== null) runtimeControls.invalidatePlan?.(invalidation);
            void runtimeControls.refresh('live');
          }
        },
        controller.signal,
      )
        .then((openedSocket) => {
          if (stopped) {
            openedSocket.close();
            return;
          }
          socket = openedSocket;
          noteRelayHeartbeat();
          openedSocket.addEventListener('close', () => {
            if (stopped) return;
            retryCount += 1;
            dispatchConnection({
              type: navigator.onLine ? 'connecting' : 'offline',
              ...(navigator.onLine ? { reconnect: true } : {}),
            } as ConnectionAction);
            retryTimer = window.setTimeout(connect, Math.min(1_000 * 2 ** retryCount, 15_000));
          });
          openedSocket.addEventListener('error', () => openedSocket.close());
        })
        .catch(() => {
          if (stopped) return;
          retryCount += 1;
          dispatchConnection({ type: 'connecting', reconnect: true });
          retryTimer = window.setTimeout(connect, Math.min(1_000 * 2 ** retryCount, 15_000));
        });
    };
    // Connect() synchronously dispatchConnection({connecting}) — untrack so the effect does not
    // Take `connection` as a dep and re-fire on the status it just wrote (async retries via
    // SetTimeout already runs outside tracking).
    untrack(() => connect());

    // ───────────────────────────────────────────────────────────────────
    // 5. TEARDOWN
    // ───────────────────────────────────────────────────────────────────

    return () => {
      stopped = true;
      controller.abort();
      if (frame !== null) window.cancelAnimationFrame(frame);
      pendingMessages = [];
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      socket?.close();
    };
  });
}
