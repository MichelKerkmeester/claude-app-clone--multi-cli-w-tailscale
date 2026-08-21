<script lang="ts">
  // The app shell: it owns the cross-route state (via the app-state store),
  // runs the connection/auth/theme/push lifecycle, and renders the auth gate
  // and the Review/Inbox overlays above the routed page. Ported from React's
  // `App` component; the selected session id now comes from the SvelteKit route
  // rather than a hand-rolled history listener, so the router owns the URL.

  import { onMount, untrack, type Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // The frozen global stylesheet: foundation (@theme, @font-face, the three
  // data-theme token blocks, resets) plus the not-yet-decomposed component
  // rules. It shrinks toward the pure foundation as surfaces move to scoped
  // <style> blocks.
  import '../style.css';

  import {
    createAppState,
    setAppState,
    setAppActions,
    type AppActions,
  } from '../lib/app-state.svelte.js';
  import { establishSession, revokeDevice, logoutDevice, type DeviceIdentity } from '../auth.js';
  import { fetchSessions } from '../relay.js';
  import { setPushForeground, unsubscribeFromPush } from '../attention.js';
  import { saveCache } from '../cache.js';
  import { messageFrom } from '../lib/views/view-helpers.js';
  import type { ConnectionAction } from '../state.js';
  import type { AttentionResolutionDto } from '@pi-remote/pi-rpc-protocol';

  import Enrollment from '../lib/views/Enrollment.svelte';
  import Header from '../lib/views/Header.svelte';
  import Review from '../lib/views/Review.svelte';
  import AttentionInbox from '../lib/views/AttentionInbox.svelte';

  let { children }: { children: Snippet } = $props();

  const app = setAppState(createAppState());

  // The selected session lives in the URL: `/session/<id>` → that id, anything
  // else → none. This replaces React's selectedSessionId useState + popstate.
  const selectedSessionId = $derived($page.params.id ?? null);

  // The global bar yields to the quiet SessionHeader once a live session shows.
  const inSession = $derived(
    app.authReady && !app.reviewOpen && !app.inboxOpen && selectedSessionId !== null,
  );

  function dispatchArtifactLifecycleEvent(name: string): void {
    window.dispatchEvent(new Event(name));
  }

  // Every session switch (navigate, back/forward, or a resolved deep-link)
  // announces once so artifact viewers can tear down. Seeded with the mount
  // value so it never fires on first paint.
  let previousSessionId = untrack(() => selectedSessionId);
  $effect(() => {
    const next = selectedSessionId;
    if (next !== previousSessionId) {
      dispatchArtifactLifecycleEvent('pi-remote:session-switch');
      previousSessionId = next;
    }
  });

  // ── Shell actions (routing + async auth combined with state) ──────────────
  function navigate(sessionId: string | null): void {
    void goto(sessionId === null ? '/' : `/session/${encodeURIComponent(sessionId)}`);
  }
  function onHome(): void {
    app.reviewOpen = false;
    navigate(null);
  }
  function openReview(): void {
    app.reviewOpen = true;
    app.inboxOpen = false;
  }
  function openInbox(): void {
    app.reviewOpen = false;
    app.inboxOpen = true;
  }
  function handleEnrolled(identity: DeviceIdentity): void {
    app.device = identity;
    app.authReady = true;
    app.dispatchConnection({ type: 'connecting', reconnect: false });
  }
  function handleInboxOpen(resolution: AttentionResolutionDto): void {
    app.inboxOpen = false;
    if (resolution.target === 'review') {
      app.reviewFocusId = resolution.focusId;
      app.reviewOpen = true;
    } else {
      navigate(resolution.sessionId);
    }
  }
  function onRevoke(): void {
    dispatchArtifactLifecycleEvent('pi-remote:app-lock');
    dispatchArtifactLifecycleEvent('pi-remote:artifact-revoked');
    void revokeDevice().finally(() => {
      app.authReady = false;
      app.device = null;
      app.dispatchConnection({ type: 'unenrolled' });
    });
  }
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

  // Theme: data-theme on <html>, the theme-color meta, persistence, and a
  // prefers-color-scheme listener that repaints theme-color while on 'system'.
  $effect(() => {
    const theme = app.theme;
    const root = document.documentElement;
    document
      .querySelector('meta[name="viewport"]')
      ?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
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
    app.dispatchConnection({ type: 'authenticating' });
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
    app.dispatchSessions({ type: 'loading' });
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

    // Deep-link resolution: a cold load on /attention/<id> is handled by that
    // route, but the app-lock / revoked lifecycle events still flow through here.
    // Service worker only in production; the shell path is served by the build.
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
