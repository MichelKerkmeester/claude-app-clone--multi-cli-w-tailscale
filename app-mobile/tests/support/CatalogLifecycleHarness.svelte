<script lang="ts">
  // Svelte equivalent of the React renderHook(useHostCommandCatalog) probe.
  // useHostCommandCatalog is a runes factory ($state + $effect) that must run
  // inside a component <script>, so this harness mounts it with reactive
  // getter thunks over the sessionId/connection props and hands the live
  // HostCommandCatalogState to the test via onControls on every state change.
  // rerender({ sessionId, connection }) drives the prop-change path the
  // React hook.rerender exercised.
  import { useHostCommandCatalog } from '../../src/lib/hostCommandCatalog.svelte.js';
  import type { HostCommandCatalogState } from '../../src/commands.js';
  import type { ConnectionPhase } from '../../src/state.js';

  let {
    sessionId = 'session_a',
    connection = 'live',
    onControls,
  }: {
    sessionId?: string;
    connection?: ConnectionPhase;
    onControls?: (controls: HostCommandCatalogState) => void;
  } = $props();

  // Route the props through equality-checked $state so a rerender that leaves a
  // value unchanged does not re-fire that signal — matching React renderHook,
  // where rerender({ connection }) never re-runs the [sessionId] mount effect.
  // svelte-ignore state_referenced_locally
  let currentSessionId = $state(sessionId);
  // svelte-ignore state_referenced_locally
  let currentConnection = $state(connection);
  $effect(() => {
    currentSessionId = sessionId;
  });
  $effect(() => {
    currentConnection = connection;
  });

  const controls = useHostCommandCatalog(() => currentSessionId, () => currentConnection);

  $effect(() => {
    onControls?.(controls);
  });
</script>