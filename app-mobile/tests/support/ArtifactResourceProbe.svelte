<script lang="ts">
  // Svelte equivalent of the React renderHook(useArtifactResource) probe.
  // useArtifactResource is a runes factory ($state/$derived/$effect) that must
  // run inside a component <script>, so this probe mounts it with reactive
  // getter thunks over the sessionId/block/options props and renders the
  // snapshot fields into the DOM for the test to read. Reload/Close buttons
  // expose the snapshot's reload()/close() actions, and rerender({ block })
  // drives the block-prop change path the React hook.rerender exercised.
  import { useArtifactResource, type ArtifactResourceSnapshot } from '../../src/lib/artifacts/useArtifactResource.svelte.js';
  import type {
    ArtifactResource,
    ArtifactResourceBlock,
    ArtifactReadVariant,
  } from '../../relay.js';

  let {
    sessionId,
    block,
    read,
    variant = 'full',
    requireImageDecode = false,
    onSnapshot,
  }: {
    sessionId: string;
    block: ArtifactResourceBlock;
    read: (
      sessionId: string,
      block: ArtifactResourceBlock,
      signal: AbortSignal,
      variant?: ArtifactReadVariant,
    ) => Promise<ArtifactResource>;
    variant?: ArtifactReadVariant;
    requireImageDecode?: boolean;
    onSnapshot?: (snapshot: ArtifactResourceSnapshot) => void;
  } = $props();

  const resource = useArtifactResource(
    () => sessionId,
    () => block,
    () => ({ read, variant, requireImageDecode }),
  );

  const snapshot = $derived(resource.current);

  // Mirrors the React renderHook `hook.result.current` access: hands the live
  // snapshot (with real bytes/buffer/objectUrl, not just their DOM projections)
  // to the test on every state change so artifact-memory can assert on the
  // verified binary bytes and the text buffer exactly as the React oracle did.
  $effect(() => {
    onSnapshot?.(snapshot);
  });
</script>

<div data-testid="status">{snapshot.status}</div>
<div data-testid="object-url">{snapshot.objectUrl ?? ''}</div>
<div data-testid="identity-key">{snapshot.identityKey}</div>
<div data-testid="bytes-length">{snapshot.bytes?.byteLength ?? ''}</div>
<button type="button" data-testid="reload" onclick={() => snapshot.reload()}>Reload</button>
<button type="button" data-testid="close" onclick={() => snapshot.close()}>Close</button>
