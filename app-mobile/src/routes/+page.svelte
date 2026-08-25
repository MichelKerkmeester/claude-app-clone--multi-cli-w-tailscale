<script lang="ts">
  // This route: / — home (session roster).
  import { getAppState, getAppActions } from '$shared/state/app-state.svelte.js';
  import Home from '../pages/home/screen-home.svelte';

  const app = getAppState();
  const actions = getAppActions();
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
/>
