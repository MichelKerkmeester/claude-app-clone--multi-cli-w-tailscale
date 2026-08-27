<script module lang="ts">
  // Inner harness for SessionComposer.svelte.test.ts — the SessionComposer-
  // consuming child of SessionComposerSurface. Lives inside AttachmentDraftProvider
  // so getAttachmentDraft() resolves, mirroring the React oracle's Harness +
  // DraftTestControls (the "select local photos" button + controlled prompt/binding).
  import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';
  import type { HostCommandCatalogState, SelectedCommandBinding } from '../../src/shared/commands/commands.js';
  import type { RuntimeControls } from '../../src/shared/state/runtime.js';

  export interface SessionComposerHarnessProps {
    readonly catalog: HostCommandCatalogState;
    readonly sendPrompt: (behavior?: 'steer' | 'followUp') => void;
    readonly sendSlashDraft: () => void;
    readonly onInsertCommand: (name: string, binding: SelectedCommandBinding) => void;
    readonly status: 'idle' | 'running' | 'interrupted' | 'unknown';
    readonly canSubmit: boolean;
    readonly binding: SelectedCommandBinding | null;
    readonly slashSubmitting: boolean;
    readonly runtimeAuthority: boolean;
    readonly runtimeRunning: boolean;
    readonly initialPrompt: string;
    readonly mediaCapability: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
    readonly localFiles: readonly File[] | undefined;
    readonly promptError?: string | null;
    readonly connection?: 'live' | 'reconnecting' | 'offline';
    readonly awaitingSnapshot?: boolean;
    readonly sendingPrompt?: boolean;
  }
</script>

<script lang="ts">
  import SessionComposer from '../../src/pages/chat/chrome/session-composer.svelte';
  import { inputLockReason } from '../../src/shared/state/streaming-derivations.js';
  import { getAttachmentDraft } from '../../src/pages/chat/attachments/attachment-draft-provider.svelte';
  import { INITIAL_RUNTIME_STATE } from '../../src/shared/state/runtime.js';

  let {
    catalog,
    sendPrompt,
    sendSlashDraft,
    onInsertCommand,
    status,
    canSubmit,
    binding: initialBinding,
    slashSubmitting,
    runtimeAuthority,
    runtimeRunning,
    initialPrompt,
    mediaCapability,
    localFiles,
    promptError = null,
    connection = 'live',
    awaitingSnapshot = false,
    sendingPrompt = false,
  }: SessionComposerHarnessProps = $props();

  // svelte-ignore state_referenced_locally
  let prompt = $state(initialPrompt);
  // svelte-ignore state_referenced_locally
  let binding = $state<SelectedCommandBinding | null>(initialBinding);

  const setPrompt = (updater: (current: string) => string): void => {
    prompt = updater(prompt);
  };
  const onDraftChange = (value: string): void => {
    prompt = value;
  };

  const draft = getAttachmentDraft();

  function selectLocalPhotos(): void {
    if (localFiles !== undefined) draft.selectFiles(localFiles);
  }

  // Stable runtime controls (the SessionComposer tests never assert on these
  // methods; only catalog.refresh is checked, and that flows through the
  // catalog prop from the test).
  const runtimeControls: RuntimeControls = {
    runtime: INITIAL_RUNTIME_STATE,
    refresh: () => undefined,
    setModel: () => undefined,
    setThinkingLevel: () => undefined,
    setMode: () => undefined,
  };

  // Mirror the real screen: the parent owns the lock and forwards it.
  const inputLock = $derived(inputLockReason(connection, awaitingSnapshot));
</script>

{#if localFiles !== undefined}
  <button type="button" onclick={selectLocalPhotos}>select local photos</button>
{/if}
<SessionComposer
  {inputLock}
  {prompt}
  {setPrompt}
  {onDraftChange}
  {sendPrompt}
  {sendSlashDraft}
  stopRun={() => undefined}
  {canSubmit}
  {status}
  {connection}
  {awaitingSnapshot}
  {sendingPrompt}
  stopping={false}
  {promptError}
  {runtimeControls}
  {catalog}
  {binding}
  {slashSubmitting}
  {runtimeAuthority}
  {runtimeRunning}
  onInsertCommand={(name, inserted) => {
    binding = inserted;
    onInsertCommand(name, inserted);
  }}
  {mediaCapability}
/>
