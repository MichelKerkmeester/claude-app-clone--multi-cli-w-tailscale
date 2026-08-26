<script lang="ts">
  // This route: / — home (session roster).
  import { getAppState, getAppActions } from '$shared/state/app-state.svelte.js';
  import { fetchSessions } from '$shared/transport/relay.js';
  import Home from '../pages/home/screen-home.svelte';

  const app = getAppState();
  const actions = getAppActions();

  // Re-request the catalog without clearing last-good rows on failure.
  // A failed HTTP refresh is not a WebSocket drop, so connection.phase stays
  // on the last-good relay state and Stale is list-local.
  async function onRefresh(): Promise<void> {
    const items = await fetchSessions();
    const at = new Date().toISOString();
    app.dispatchSessions({ type: 'loaded', items, at });
  }
</script>

<!-- Component content -->
<Home
  sessions={app.sessions}
  connection={app.connection.phase}
  cache={app.initialCache}
  device={app.device}
  onSelect={actions.navigate}
  onRevoke={actions.onRevoke}
  onLogout={actions.onLogout}
  {onRefresh}
/>
