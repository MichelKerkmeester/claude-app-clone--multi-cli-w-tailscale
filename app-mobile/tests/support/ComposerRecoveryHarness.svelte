<script module lang="ts">
  export interface ComposerRecoveryHarnessProps {
    readonly sessionId: string;
    readonly initialPrompt: string;
  }
</script>

<script lang="ts">
  import SessionComposer from '../../src/pages/chat/chrome/SessionComposer.svelte';
  import { getAttachmentDraft } from '../../src/pages/chat/attachments/AttachmentDraftProvider.svelte';
  import { INITIAL_RUNTIME_STATE, type RuntimeControls } from '../../src/shared/state/runtime.js';
  import type { HostCommandCatalogState } from '../../src/shared/commands/commands.js';
  import { vi } from 'vitest';

  let { sessionId, initialPrompt }: ComposerRecoveryHarnessProps = $props();

  // svelte-ignore state_referenced_locally
  let prompt = $state(initialPrompt);
  const setPrompt = (updater: (current: string) => string): void => {
    prompt = updater(prompt);
  };
  const onDraftChange = (value: string): void => {
    prompt = value;
  };

  const draft = getAttachmentDraft();

  function selectPhoto(): void {
    draft.selectFiles([new File(['local image bytes'], 'photo.jpg', { type: 'image/jpeg' })]);
  }

  function runtimeControls(): RuntimeControls {
    return {
      runtime: INITIAL_RUNTIME_STATE,
      refresh: vi.fn(),
      setModel: vi.fn(),
      setThinkingLevel: vi.fn(),
      setMode: vi.fn(),
    };
  }

  function catalogFixture(): HostCommandCatalogState {
    return {
      status: 'ready',
      snapshot: {
        hostEpoch: 'epoch_web_fixture',
        sessionId: 'session_web_fixture',
        sessionRevision: 1,
        catalogRevision: 1,
        commands: [],
        fetchedAt: Date.now(),
      },
      commands: [],
      refresh: vi.fn(),
    };
  }
</script>

<button type="button" onclick={selectPhoto}>select photo</button>
<output data-testid="composer-attachment-count">{draft.state.items.length}</output>
<SessionComposer
  {sessionId}
  sessionEpoch="epoch_web_fixture"
  expectedPromptRevision={1}
  {prompt}
  {setPrompt}
  {onDraftChange}
  sendPrompt={vi.fn()}
  sendSlashDraft={vi.fn()}
  stopRun={vi.fn()}
  canSubmit={prompt.trim().length > 0}
  status="idle"
  connection="live"
  awaitingSnapshot={false}
  sendingPrompt={false}
  stopping={false}
  promptError={null}
  runtimeControls={runtimeControls()}
  catalog={catalogFixture()}
  binding={null}
  slashSubmitting={false}
  runtimeAuthority
  runtimeRunning={false}
  onInsertCommand={vi.fn()}
  mediaCapability={{ enabled: true, imageIn: true }}
/>
