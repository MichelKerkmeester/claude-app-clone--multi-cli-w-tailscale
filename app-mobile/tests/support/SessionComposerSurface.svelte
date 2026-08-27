<script module lang="ts">
  // Provider wrapper for SessionComposer.svelte.test.ts — mirrors the React
  // oracle's AttachmentDraftProvider + Harness composition. SessionComposer
  // reads the AttachmentDraft context, so the harness must be its child.
  import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';
  import type { HostCommandCatalogState, SelectedCommandBinding } from '../../src/shared/commands/commands.js';

  export interface SessionComposerSurfaceProps {
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
    readonly modelCanViewPhotos: boolean;
    readonly localFiles: readonly File[] | undefined;
    readonly promptError?: string | null;
    readonly connection?: 'live' | 'reconnecting' | 'offline';
    readonly awaitingSnapshot?: boolean;
    readonly sendingPrompt?: boolean;
  }
</script>

<script lang="ts">
  import AttachmentDraftProvider from '../../src/pages/chat/attachments/attachment-draft-provider.svelte';
  import SessionComposerHarness from './SessionComposerHarness.svelte';

  let {
    catalog,
    sendPrompt,
    sendSlashDraft,
    onInsertCommand,
    status,
    canSubmit,
    binding,
    slashSubmitting,
    runtimeAuthority,
    runtimeRunning,
    initialPrompt,
    mediaCapability,
    modelCanViewPhotos,
    localFiles,
    promptError = null,
    connection = 'live',
    awaitingSnapshot = false,
    sendingPrompt = false,
  }: SessionComposerSurfaceProps = $props();
</script>

<AttachmentDraftProvider capability={mediaCapability} {modelCanViewPhotos}>
  <SessionComposerHarness
    {catalog}
    {sendPrompt}
    {sendSlashDraft}
    {onInsertCommand}
    {status}
    {canSubmit}
    {binding}
    {slashSubmitting}
    {runtimeAuthority}
    {runtimeRunning}
    {initialPrompt}
    {mediaCapability}
    {localFiles}
    {promptError}
    {connection}
    {awaitingSnapshot}
    {sendingPrompt}
  />
</AttachmentDraftProvider>
