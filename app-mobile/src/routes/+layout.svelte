<script lang="ts">
  // This route: +layout — app shell: owns cross-route state and the connection/auth/theme/push lifecycle.
  // Cross-route state, auth/theme/push lifecycle, overlays; session id comes from the router URL.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount, untrack, type Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  // Global foundation + not-yet-decomposed rules; shrinks as surfaces move to scoped styles.
  import '../app.css';

  import {
    createAppState,
    setAppState,
    setAppActions,
    type AppActions,
  } from '$shared/state/app-state.svelte.js';
  import {
    deferredSendErrorToast,
    dismissDeferredSendErrorToast,
    DEFERRED_SEND_ERROR_TOAST_MS,
  } from '$shared/state/deferred-send-error.svelte.js';
  import { establishSession, revokeDevice, logoutDevice, type DeviceIdentity } from '$shared/transport/auth.js';
  import { fetchSessions } from '$shared/transport/relay.js';
  import { setPushForeground, unsubscribeFromPush } from '$shared/format/attention.js';
  import { saveCache } from '$shared/transport/cache.js';
  import { countAttentionSessions } from '$shared/format/card-projection.js';
  import { messageFrom } from '$shared/format/view-helpers.js';
  import { readUnreadIds } from '$shared/state/unread-overlay.js';
  import { updateAppBadge } from '$shared/state/app-badge.js';
  import type { ConnectionAction } from '$shared/state/state.js';
  import type { AttentionResolutionDto } from '@pi-remote/pi-rpc-protocol';
  import {
    bindSessionStackRouter,
    dismissSessionToHome,
    navigateSessionStack,
    resetSessionStackNavigation,
    type SessionStackRouter,
  } from '$shared/state/session-stack-navigation.js';
  import {
    createForegroundPoller,
    isNavigatorReconnectEdge,
    ROSTER_POLL_MS,
    type ForegroundPoller,
  } from '$shared/state/foreground-polling.js';

  import RootErrorBoundary from '$shared/chrome/root-error-boundary.svelte';
  import Enrollment from '../pages/enrollment/screen-enrollment.svelte';
  import Header from '$shared/chrome/header.svelte';
  import Review from '../pages/review/screen-review.svelte';
  import AttentionInbox from '../pages/inbox/screen-attention-inbox.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { children }: { children: Snippet } = $props();

  const app = setAppState(createAppState());

  // ───────────────────────────────────────────────────────────────────
  // 3. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Selection precedence: three named states with distinct roles.
  // - "selected" (URL / selectedSessionId): the user's current choice, presentation only.
  // - "host-active": what the host reports as the live session (roster).
  // - "navigation-requested": a pending supersede (host follow, inbox resolution).
  // Only user-initiated navigation supersedes "selected" today. A roster refresh
  // (fetchSessions) must never call navigate — it keeps the user's session.
  // Retries are confined to idempotent activation (roster fetch, runtime refresh);
  // message-send and Stop are never auto-retried.
  const selectedSessionId = $derived($page.params.id ?? null);

  // Hide the global bar once a live session owns the chrome.
  const inSession = $derived(
    app.authReady && !app.reviewOpen && !app.inboxOpen && selectedSessionId !== null,
  );

  // The shell's transient send-error toast; null means the strip renders nothing.
  const sendErrorToast = $derived(deferredSendErrorToast());

  // ───────────────────────────────────────────────────────────────────
  // 4. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep dispatch artifact lifecycle event focused on its single responsibility.
  function dispatchArtifactLifecycleEvent(name: string): void {
    window.dispatchEvent(new Event(name));
  }

  // Announce session switches so artifact viewers tear down; seeded to skip first paint.
  let previousSessionId = untrack(() => selectedSessionId);

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    const next = selectedSessionId;
    if (next !== previousSessionId) {
      dispatchArtifactLifecycleEvent('pi-remote:session-switch');
      previousSessionId = next;
    }
  });

  // ── Shell actions (routing + async auth combined with state) ──────────────
  function gotoSessionStackHref(href: string, replaceState = false): ReturnType<typeof goto> {
    const opts = replaceState ? { replaceState: true } : undefined;
    if (href === '/') {
      return goto(resolve('/'), opts);
    }
    if (href.startsWith('/session/')) {
      const id = decodeURIComponent(href.slice('/session/'.length));
      return goto(resolve('/session/[id]', { id }), opts);
    }
    throw new Error('Session stack navigation received an unsupported href.');
  }

  const sessionRouter: SessionStackRouter = {
    push: (href) => gotoSessionStackHref(href),
    replace: (href) => gotoSessionStackHref(href, true),
    pop: () => {
      history.back();
    },
  };
  bindSessionStackRouter(sessionRouter);

  let rosterPoller: ForegroundPoller | null = null;
  let navigatorWasOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  function navigate(sessionId: string | null): void {
    if (sessionId === null) {
      dismissSessionToHome(sessionRouter);
      return;
    }
    navigateSessionStack({ pathname: $page.url.pathname }, { kind: 'session', sessionId });
  }
  function onHome(): void {
    app.reviewOpen = false;
    navigate(null);
  }
  // Keep open review focused on its single responsibility.
  function openReview(): void {
    app.reviewOpen = true;
    app.inboxOpen = false;
  }
  // Keep open inbox focused on its single responsibility.
  function openInbox(): void {
    app.reviewOpen = false;
    app.inboxOpen = true;
  }
  // Keep handle enrolled focused on its single responsibility.
  function handleEnrolled(identity: DeviceIdentity): void {
    app.device = identity;
    app.authReady = true;
    app.dispatchConnection({ type: 'connecting', reconnect: false });
  }
  // Keep handle inbox open focused on its single responsibility.
  function handleInboxOpen(resolution: AttentionResolutionDto): void {
    app.inboxOpen = false;
    if (resolution.target === 'review') {
      app.reviewFocusId = resolution.focusId;
      app.reviewOpen = true;
    } else {
      navigate(resolution.sessionId);
    }
  }
  // Keep on revoke focused on its single responsibility.
  function onRevoke(): void {
    dispatchArtifactLifecycleEvent('pi-remote:app-lock');
    dispatchArtifactLifecycleEvent('pi-remote:artifact-revoked');
    void revokeDevice().finally(() => {
      app.authReady = false;
      app.device = null;
      app.dispatchConnection({ type: 'unenrolled' });
    });
  }
  // Keep on logout focused on its single responsibility.
  function onLogout(): void {
    dispatchArtifactLifecycleEvent('pi-remote:logout');
    void unsubscribeFromPush()
      .catch(() => undefined)
      .then(logoutDevice)
      .finally(() => {
        resetSessionStackNavigation();
        app.authReady = false;
        app.dispatchConnection({ type: 'authenticating' });
        app.bumpAuthAttempt();
      });
  }

  const actions: AppActions = { navigate, openReview, openInbox, onRevoke, onLogout };
  setAppActions(actions);

  // ── Lifecycle effects (ported from App's useEffects) ──────────────────────

  // Keep the OS badge derived from the current host roster and local unread overlay.
  function syncAppBadge(items = app.sessions.items): void {
    const count = countAttentionSessions(items, readUnreadIds());
    untrack(() => updateAppBadge(count));
  }

  $effect(() => {
    const items = app.sessions.items;
    syncAppBadge(items);
  });

  // Theme on <html>, theme-color meta, persistence, and system-scheme listener.
  $effect(() => {
    const theme = app.theme;
    const root = document.documentElement;
    document
      .querySelector('meta[name="viewport"]')
      ?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    // Keep apply theme focused on its single responsibility.
    const applyTheme = () => {
      root.dataset.theme = theme;
      const dark = theme === 'dark' || (theme === 'system' && scheme.matches);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#24221f' : '#f8f8f6');
    };
    applyTheme();
    try {
      localStorage.setItem('pi-remote.theme', theme);
    } catch {
      // Theme selection still applies when persistent browser storage is unavailable.
    }
    scheme.addEventListener('change', applyTheme);
    return () => scheme.removeEventListener('change', applyTheme);
  });

  // Enrollment / session bootstrap: re-runs on each auth attempt (online, logout).
  $effect(() => {
    // Re-run when logout or coming online requests a new auth attempt.
    void app.authAttempt;
    let stopped = false;
    if (!navigator.onLine) return;
    // untrack dispatchConnection: tracking `connection` would cancel establishSession mid-flight.
    untrack(() => app.dispatchConnection({ type: 'authenticating' }));
    void establishSession()
      .then((identity) => {
        if (stopped) return;
        app.device = identity;
        app.authReady = identity !== null;
        app.dispatchConnection(
          identity === null ? { type: 'unenrolled' } : { type: 'connecting', reconnect: false },
        );
      })
      .catch(() => {
        if (stopped) return;
        app.authReady = false;
        app.dispatchConnection({ type: 'error', detail: 'Device authentication failed.' });
      });
    return () => {
      stopped = true;
    };
  });

  // Push foreground reporting, gated on auth; cleared on teardown.
  $effect(() => {
    if (!app.authReady) return;
    // Keep report focused on its single responsibility.
    const report = () => {
      void setPushForeground(document.visibilityState === 'visible').catch(() => undefined);
    };
    report();
    document.addEventListener('visibilitychange', report);
    return () => {
      document.removeEventListener('visibilitychange', report);
      void setPushForeground(false).catch(() => undefined);
    };
  });

  // The toast strip auto-dismisses after a fixed reading window. The timer
  // re-arms on every effect re-run (a fresh toast or an unmount), the same
  // deadline-preserving discipline the composer's settle window uses; writes
  // inside the timer run after the effect scope closes, so they cannot
  // self-invalidate.
  $effect(() => {
    let timer: number | undefined;
    if (sendErrorToast !== null) {
      timer = window.setTimeout(dismissDeferredSendErrorToast, DEFERRED_SEND_ERROR_TOAST_MS);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  });

  // Roster reads only while this tab is visible: one catch-up on show/reconnect,
  // then a timer. Hidden tabs drop the timer so a backgrounded phone does not
  // keep hitting the relay.
  $effect(() => {
    if (!app.authReady) return;
    const currentSessionId = selectedSessionId;
    let tickController: AbortController | null = null;
    const poller = createForegroundPoller({
      intervalMs: ROSTER_POLL_MS,
      getVisibility: () => document.visibilityState,
      read: () => {
        tickController?.abort();
        const controller = new AbortController();
        tickController = controller;
        // untrack dispatchSessions: tracking `sessions` would loop fetch abort/restart.
        untrack(() => app.dispatchSessions({ type: 'loading' }));
        void fetchSessions(controller.signal)
          .then((items) => {
            const at = new Date().toISOString();
            app.dispatchSessions({ type: 'loaded', items, at });
            if (currentSessionId === null) app.dispatchConnection({ type: 'live', at });
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return;
            app.dispatchSessions({ type: 'error', error: messageFrom(error) });
            app.dispatchConnection({
              type: navigator.onLine ? 'error' : 'offline',
              ...(navigator.onLine ? { detail: 'Relay unavailable.' } : {}),
            } as ConnectionAction);
          });
      },
    });
    rosterPoller = poller;
    poller.start();
    return () => {
      poller.stop();
      tickController?.abort();
      if (rosterPoller === poller) rosterPoller = null;
    };
  });

  // Persist only relay-sourced roster + transcript.
  $effect(() => {
    if (app.sessions.source === 'relay') saveCache(app.sessions.items, app.transcript);
  });

  onMount(() => {
    const onOnline = () => {
      const reconnect = isNavigatorReconnectEdge(navigatorWasOnline, true);
      navigatorWasOnline = true;
      app.bumpAuthAttempt();
      if (reconnect) rosterPoller?.notifyReconnect();
    };
    const onOffline = () => {
      navigatorWasOnline = false;
      app.dispatchConnection({ type: 'offline' });
    };
    const onVisibility = () => {
      rosterPoller?.notifyVisibility(document.visibilityState);
      if (document.visibilityState === 'visible') syncAppBadge();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);

    // /attention/<id> resolves on its route; app-lock/revoke events still land here.
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });
      });
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
</script>

<!-- Component content -->
<RootErrorBoundary>
  {#if !app.authReady}
    <Enrollment phase={app.connection.phase} onEnrolled={handleEnrolled} />
  {:else if app.reviewOpen}
    <Review
      sessions={app.sessions.items}
      onBack={() => (app.reviewOpen = false)}
      focusId={app.reviewFocusId}
    />
  {:else if app.inboxOpen}
    <AttentionInbox onBack={() => (app.inboxOpen = false)} onOpen={handleInboxOpen} />
  {:else}
    {#if !inSession}
      <Header
        connection={app.connection.phase}
        {onHome}
        onReview={openReview}
        onInbox={openInbox}
        reviewAvailable={app.authReady}
        theme={app.theme}
        onThemeChange={(value) => (app.theme = value)}
      />
    {/if}
    {@render children()}
  {/if}
  <!-- Toast strip: the shell's one transient error surface. A deferred send
       failure that resolves after its chat screen unmounted lands here — the
       in-composer banner stays primary while the chat is open because the
       on-screen keyboard covers this strip. -->
  {#if sendErrorToast !== null}
    <div class="toast--strip inline-alert" role="alert">
      {sendErrorToast.message}
    </div>
  {/if}
</RootErrorBoundary>

<style>
  /* The strip floats above every route surface, including the plan overlay,
     and clears the device safe area; its error skin comes from the shared
     inline-alert class. */
  .toast--strip {
    position: fixed;
    inset-inline: var(--page-gutter);
    bottom: max(var(--space-4), env(safe-area-inset-bottom));
    z-index: 120;
  }
</style>
