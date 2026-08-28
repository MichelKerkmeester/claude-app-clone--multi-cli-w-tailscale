// ───────────────────────────────────────────────────────────────────
// MODULE: Read-Only Sync Socket Lifecycle (Svelte runes)
// ───────────────────────────────────────────────────────────────────
// Runes port of the session sync-socket effect; imperative trackers stay off `$state`.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { untrack } from 'svelte';

import type { SyncCursor, SyncMessage } from '@pi-remote/pi-rpc-protocol';

import { fetchTranscript, noteRelayHeartbeat, openSyncSocket } from './relay.js';
import { AUTH_REJECTION_LATCH_THRESHOLD, clearAuthRejectionStrikes, recordAuthRejectionStrike } from './auth-rejection-latch.js';
import { raceWithTimeout } from '../state/race-timeout.js';
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

// Refresh before the relay's session timer can close the current socket.
const SESSION_REFRESH_FRACTION = 0.8;
// Keep an expired or near-expired session from creating a zero-delay loop.
const MIN_SESSION_REFRESH_DELAY_MS = 1_000;
// Avoid browser timeout overflow turning a far-future demo deadline into an immediate timer.
const MAX_SESSION_REFRESH_DELAY_MS = 2_147_483_647;

type ConnectMode = 'initial' | 'retry' | 'expired' | 'preemptive';

function sessionRefreshDelay(expiresAt: string | undefined): number | null {
  if (expiresAt === undefined) return null;
  const remainingMs = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(remainingMs)) return null;
  return Math.max(
    MIN_SESSION_REFRESH_DELAY_MS,
    Math.min(
      MAX_SESSION_REFRESH_DELAY_MS,
      Math.floor(remainingMs * SESSION_REFRESH_FRACTION),
    ),
  );
}

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
  // Imperative trackers — never `$state` (React ref.current → bare closure `let`).
  let cursor: SyncCursor | null = null;
  let frame: number | null = null;
  let pendingMessages: Array<{ readonly message: SyncMessage; readonly at: string }> = [];

  $effect(() => {
    // Four reactive deps; generation getters are touch-only like React's dep bump.
    const sessionId = deps.getSessionId();
    const cache = deps.getCache();
    deps.getCacheResumeGeneration();
    deps.getTodoRefreshGeneration();

    const { dispatchConnection, dispatchTranscript, dispatchTodoProjection, runtimeControls } =
      deps;

    // untrack dispatch* to avoid effect_update_depth_exceeded on own writes.
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

    let socket: (WebSocket & { readonly sessionExpiresAt?: string }) | null = null;
    let retryTimer: number | null = null;
    let sessionRefreshTimer: number | null = null;
    let retryCount = 0;
    let stopped = false;
    let connectionAttempt = 0;

    const clearRetryTimer = (): void => {
      if (retryTimer === null) return;
      window.clearTimeout(retryTimer);
      retryTimer = null;
    };

    const clearSessionRefreshTimer = (): void => {
      if (sessionRefreshTimer === null) return;
      window.clearTimeout(sessionRefreshTimer);
      sessionRefreshTimer = null;
    };

    const stopForRevocation = (): void => {
      stopped = true;
      clearRetryTimer();
      clearSessionRefreshTimer();
      dispatchConnection({ type: 'unenrolled' });
    };

    let connect: (mode: ConnectMode) => void;

    connect = (mode: ConnectMode) => {
      if (stopped || !navigator.onLine) {
        dispatchConnection({ type: 'offline' });
        return;
      }
      if (mode !== 'preemptive') {
        dispatchConnection({
          type: 'connecting',
          reconnect: mode !== 'initial' || retryCount > 0,
        });
      }
      const attempt = ++connectionAttempt;
      void raceWithTimeout(
        openSyncSocket(
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
              // A live stream is the only proof the device key is healthy end
              // to end. Re-authenticating is not: every reconnect completes a
              // challenge before the socket opens, so clearing on that would
              // reset the count before a rejection could ever accumulate.
              clearAuthRejectionStrikes();
              const invalidation = planInvalidationFromSync(message);
              if (invalidation !== null) runtimeControls.invalidatePlan?.(invalidation);
              void runtimeControls.refresh('live');
            }
          },
          controller.signal,
        ),
        {
          signal: controller.signal,
          dispose: () => {
            // Close any half-open socket on timeout/abort.
            if (socket !== null) {
              socket.close();
              socket = null;
            }
          },
        },
      )
        .then((openedSocket) => {
          if (stopped || attempt !== connectionAttempt) {
            openedSocket.close();
            return;
          }
          clearRetryTimer();
          clearSessionRefreshTimer();
          const previousSocket = socket;
          socket = openedSocket;
          noteRelayHeartbeat();
          openedSocket.addEventListener('close', (event) => {
            if (stopped) return;
            if (openedSocket !== socket) return;
            socket = null;
            clearSessionRefreshTimer();
            // 4003: the relay rejected this device's E2EE auth. A single blip
            // must not eject the device into re-pairing: rejections ride out
            // through the ordinary reconnect path below, and only the third
            // consecutive rejection stops reconnecting. Only a successful
            // full auth clears the count — it never decays.
            if (event.code === 4003) {
              if (recordAuthRejectionStrike() >= AUTH_REJECTION_LATCH_THRESHOLD) {
                stopForRevocation();
                return;
              }
            }
            // 4001: session timer expired — reconnect now, not after backoff.
            if (event.code === 4001) {
              connect('expired');
              return;
            }
            retryCount += 1;
            dispatchConnection({
              type: navigator.onLine ? 'connecting' : 'offline',
              ...(navigator.onLine ? { reconnect: true } : {}),
            } as ConnectionAction);
            retryTimer = window.setTimeout(() => {
              retryTimer = null;
              connect('retry');
            }, Math.min(1_000 * 2 ** retryCount, 15_000));
          });
          openedSocket.addEventListener('error', () => {
            if (openedSocket === socket) openedSocket.close();
          });
          const refreshDelay = sessionRefreshDelay(openedSocket.sessionExpiresAt);
          if (refreshDelay !== null) {
            sessionRefreshTimer = window.setTimeout(() => {
              sessionRefreshTimer = null;
              connect('preemptive');
            }, refreshDelay);
          }
          if (previousSocket !== null && previousSocket !== openedSocket) previousSocket.close();
        })
        .catch(() => {
          if (stopped || attempt !== connectionAttempt) return;
          if (mode === 'preemptive' && socket !== null) {
            retryTimer = window.setTimeout(() => {
              retryTimer = null;
              connect('preemptive');
            }, MIN_SESSION_REFRESH_DELAY_MS);
            return;
          }
          retryCount += 1;
          dispatchConnection({ type: 'connecting', reconnect: true });
          retryTimer = window.setTimeout(() => {
            retryTimer = null;
            connect('retry');
          }, Math.min(1_000 * 2 ** retryCount, 15_000));
        });
    };
    // untrack initial connect so `connection` is not an effect dep.
    untrack(() => connect('initial'));

    // ───────────────────────────────────────────────────────────────────
    // 5. TEARDOWN
    // ───────────────────────────────────────────────────────────────────

    return () => {
      stopped = true;
      controller.abort();
      if (frame !== null) window.cancelAnimationFrame(frame);
      pendingMessages = [];
      clearRetryTimer();
      clearSessionRefreshTimer();
      socket?.close();
    };
  });
}
