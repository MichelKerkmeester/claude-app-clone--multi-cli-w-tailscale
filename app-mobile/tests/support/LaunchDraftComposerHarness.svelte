<script module lang="ts">
  // This harness supplies the existing attachment context while exposing the
  // optional host launch draft to the real SessionComposer component.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Launch Draft Composer Harness
  // ───────────────────────────────────────────────────────────────────

  import type { HostCommandCatalogState, SelectedCommandBinding } from '../../src/shared/commands/commands.js';

  export interface LaunchDraftComposerHarnessProps {
    readonly catalog: HostCommandCatalogState;
    readonly sendPrompt: (behavior?: 'steer' | 'followUp') => void;
    readonly sendSlashDraft: () => void;
    readonly onInsertCommand: (name: string, binding: SelectedCommandBinding) => void;
    readonly initialPrompt?: string;
    readonly launchDraft?: string | null;
    readonly sessionId?: string;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import AttachmentDraftProvider from '../../src/pages/chat/attachments/attachment-draft-provider.svelte';
  import SessionComposer from '../../src/pages/chat/chrome/session-composer.svelte';
  import { inputLockReason } from '../../src/shared/state/streaming-derivations.js';
  import { INITIAL_RUNTIME_STATE, type RuntimeControls } from '../../src/shared/state/runtime.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    catalog,
    sendPrompt,
    sendSlashDraft,
    onInsertCommand,
    initialPrompt = '',
    launchDraft = null,
    sessionId = 'session-launch-draft',
  }: LaunchDraftComposerHarnessProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // svelte-ignore state_referenced_locally
  let prompt = $state(initialPrompt);

  const setPrompt = (updater: (current: string) => string): void => {
    prompt = updater(prompt);
  };

  const onDraftChange = (value: string): void => {
    prompt = value;
  };

  const runtimeControls: RuntimeControls = {
    runtime: INITIAL_RUNTIME_STATE,
    refresh: () => undefined,
    setModel: () => undefined,
    setThinkingLevel: () => undefined,
    setMode: () => undefined,
  };

  const inputLock = $derived(inputLockReason('live', false));
</script>

<AttachmentDraftProvider capability={null}>
  <SessionComposer
    {sessionId}
    {prompt}
    {setPrompt}
    {onDraftChange}
    {sendPrompt}
    {sendSlashDraft}
    stopRun={() => undefined}
    canSubmit={true}
    status="idle"
    connection="live"
    {inputLock}
    awaitingSnapshot={false}
    sendingPrompt={false}
    stopping={false}
    promptError={null}
    {runtimeControls}
    {catalog}
    binding={null}
    slashSubmitting={false}
    runtimeAuthority={true}
    runtimeRunning={false}
    {onInsertCommand}
    {launchDraft}
  />
</AttachmentDraftProvider>
