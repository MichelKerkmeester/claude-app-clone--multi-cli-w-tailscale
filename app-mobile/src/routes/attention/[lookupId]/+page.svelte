<script lang="ts">
  // @ds route: /attention/[lookupId] — attention deep-link resolver (no view of its own; resolves then redirects).

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  // Resolves attention hints after auth, then redirects (Review overlay or session).
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  import { getAppState } from '$shared/state/app-state.svelte.js';
  import { openAttentionHint } from '$shared/format/attention.js';

  const app = getAppState();

  // ───────────────────────────────────────────────────────────────────
  // 2. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const lookupId = $derived($page.params.lookupId!);

  // ───────────────────────────────────────────────────────────────────
  // 3. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    if (!app.authReady) return;
    app.inboxOpen = true;
    const controller = new AbortController();
    void openAttentionHint(lookupId, controller.signal)
      .then((resolution) => {
        if (resolution.target === 'review') {
          app.reviewFocusId = resolution.focusId;
          app.reviewOpen = true;
          app.inboxOpen = false;
          void goto('/', { replaceState: true });
        } else {
          app.inboxOpen = false;
          void goto(`/session/${encodeURIComponent(resolution.sessionId)}`, {
            replaceState: true,
          });
        }
      })
      .catch(() => {
        app.inboxOpen = true;
      });
    return () => controller.abort();
  });
</script>
