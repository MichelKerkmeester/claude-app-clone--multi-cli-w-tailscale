<script lang="ts">
  // This route: +layout — app shell: owns cross-route state and the connection/auth/theme/push lifecycle.
  // Cross-route state, auth/theme/push lifecycle, overlays; session id comes from the router URL.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount, untrack, type Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // Global foundation + not-yet-decomposed rules; shrinks as surfaces move to scoped styles.
  import '../app.css';

  import {
    createAppState,
    setAppState,
    setAppActions,
    type AppActions,
  } from '$shared/state/app-state.svelte.js';
  import { establishSession, revokeDevice, logoutDevice, type DeviceIdentity } from '$shared/transport/auth.js';
  import { fetchSessions } from '$shared/transport/relay.js';
  import { setPushForeground, unsubscribeFromPush } from '$shared/format/attention.js';
  import { saveCache } from '$shared/transport/cache.js';
  import { messageFrom } from '$shared/format/view-helpers.js';
  import type { ConnectionAction } from '$shared/state/state.js';
  import type { AttentionResolutionDto } from '@pi-remote/pi-rpc-protocol';

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
  // Keep navigate focused on its single responsibility.
  function navigate(sessionId: string | null): void {
    void goto(sessionId === null ? '/' : `/session/${encodeURIComponent(sessionId)}`);
  }
  // Keep on home focused on its single responsibility.
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
        app.authReady = false;
        app.dispatchConnection({ type: 'authenticating' });
        app.bumpAuthAttempt();
      });
  }

  const actions: AppActions = { navigate, openReview, openInbox, onRevoke, onLogout };
  setAppActions(actions);

  // ── Lifecycle effects (ported from App's useEffects) ──────────────────────

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
    app.authAttempt;
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

  // Sessions roster fetch, keyed on auth + the current route session.
  $effect(() => {
    if (!app.authReady) return;
    const currentSessionId = selectedSessionId;
    const controller = new AbortController();
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
    return () => controller.abort();
  });

  // Persist only relay-sourced roster + transcript.
  $effect(() => {
    if (app.sessions.source === 'relay') saveCache(app.sessions.items, app.transcript);
  });

  onMount(() => {
    const onOnline = () => app.bumpAuthAttempt();
    const onOffline = () => app.dispatchConnection({ type: 'offline' });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // /attention/<id> resolves on its route; app-lock/revoke events still land here.
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });
      });
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
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
</RootErrorBoundary>
