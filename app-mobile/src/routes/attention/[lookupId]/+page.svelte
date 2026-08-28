<script lang="ts">
  // This route: /attention/[lookupId] — attention deep-link resolver (no view of its own; resolves then redirects).

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  // Resolves attention hints after auth, then redirects (Review overlay or session).
  import { page } from '$app/stores';
  import { untrack } from 'svelte';

  import { getAppState } from '$shared/state/app-state.svelte.js';
  import { openAttentionHint } from '$shared/format/attention.js';
  import {
    completeAttentionNavigation,
    dismissSessionToHome,
    navigateSessionStack,
  } from '$shared/state/session-stack-navigation.js';

  const app = getAppState();

  // ───────────────────────────────────────────────────────────────────
  // 2. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const lookupId = $derived($page.params.lookupId!);

  // ───────────────────────────────────────────────────────────────────
  // 3. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Occupy the session stack slot before the hint returns so a racing card
  // tap can retarget or cancel this resolver instead of pushing a blank route.
  $effect(() => {
    if (!app.authReady) return;
    const id = lookupId;
    const location = { pathname: $page.url.pathname };
    untrack(() => {
      app.inboxOpen = true;
      navigateSessionStack(location, { kind: 'attention', lookupId: id });
    });
    const controller = new AbortController();
    void openAttentionHint(id, controller.signal)
      .then((resolution) => {
        if (controller.signal.aborted) return;
        if (resolution.target === 'review') {
          app.reviewFocusId = resolution.focusId;
          app.reviewOpen = true;
          app.inboxOpen = false;
          dismissSessionToHome();
          return;
        }
        app.inboxOpen = false;
        completeAttentionNavigation(id, {
          kind: 'session',
          sessionId: resolution.sessionId,
        });
      })
      .catch(() => {
        // An aborted lookup means the person already navigated away, and the
        // rejection it raises is that departure rather than a real failure.
        // Reopening the inbox here would drop an overlay on top of wherever
        // they went, so only a genuine failure restores it.
        if (controller.signal.aborted) return;
        untrack(() => {
          app.inboxOpen = true;
        });
      });
    return () => controller.abort();
  });
</script>
