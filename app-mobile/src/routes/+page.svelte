<script lang="ts">
  // @ds route: / — home (session roster).
  // Home route — the session roster. State + actions come from the shell via
  // context; this page only wires them into the ported Home view.
  import { getAppState, getAppActions } from '$shared/data/app-state.svelte.js';
  import Home from '../pages/home/Home.svelte';

  const app = getAppState();
  const actions = getAppActions();
</script>

<Home
  sessions={app.sessions}
  connection={app.connection.phase}
  cache={app.initialCache}
  device={app.device}
  onSelect={actions.navigate}
  onRevoke={actions.onRevoke}
  onLogout={actions.onLogout}
/>
