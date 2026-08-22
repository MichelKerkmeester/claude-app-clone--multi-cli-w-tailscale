<script module lang="ts">
  import type { ReadOnlyCache } from '../../shared/data/cache.js';
  import {
    transcriptReducer,
    type ConnectionAction,
    type ConnectionPhase,
    type TranscriptState,
    type TodoProjectionAction,
    type TodoProjectionState,
  } from '../../shared/data/state.js';
  import type { RuntimeMediaCapabilityDto, SessionCardDto } from '@pi-remote/pi-rpc-protocol';
  import type { RuntimeUiState } from '../../shared/data/runtime.js';
  import type { SlashSubmitFailureCode } from '../../shared/data/submitSlashDraft.js';

  export interface SessionProps {
    readonly connection: ConnectionPhase;
    readonly sessionId: string;
    readonly initialCache: ReadOnlyCache | null;
    readonly transcript: TranscriptState;
    readonly todoProjection?: TodoProjectionState;
    readonly dispatchConnection: (a: ConnectionAction) => void;
    readonly dispatchTranscript: (a: Parameters<typeof transcriptReducer>[1]) => void;
    readonly dispatchTodoProjection?: (a: TodoProjectionAction) => void;
    readonly status: SessionCardDto['status'];
    readonly onBack: () => void;
    readonly onInbox: () => void;
    readonly onReview: () => void;
    readonly theme: 'system' | 'light' | 'dark';
    readonly onThemeChange: (theme: 'system' | 'light' | 'dark') => void;
    readonly mediaCapability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
    readonly askQuestionPrincipal?: string | undefined;
  }

  const ignoreTodoAction: (a: TodoProjectionAction) => void = () => undefined;

  function runtimeModelCanViewPhotos(runtime: RuntimeUiState): boolean {
    const current = runtime.state?.model;
    if (current === null || current === undefined) return true;
    const catalogModel = runtime.models.find(
      (model) => model.provider === current.provider && model.id === current.id,
    );
    const input = catalogModel?.input ?? current.input;
    return input === undefined || input.includes('image');
  }

  function slashFailureMessage(code: SlashSubmitFailureCode): string {
    switch (code) {
      case 'invalid-draft':
        return 'Choose a command from the list, then send it.';
      case 'not-live':
        return 'Reconnect, then choose a command again.';
      case 'no-running-authority':
        return 'Pi is not reachable right now. Reconnect to send a command.';
      case 'running':
        return 'Pi is running. Commands can be sent after this turn ends.';
      case 'stale':
        return 'Commands changed on the host. Choose the command again.';
      case 'denied':
        return 'That command is not available right now. Choose it again to retry.';
      case 'forbidden':
        return 'Commands are not available for this device.';
      case 'unavailable':
        return 'Pi is not responding. Your draft is saved.';
      case 'incompatible':
        return 'The phone and host versions do not agree. Your draft is saved.';
      case 'delivery-unknown':
        return 'The command may have reached Pi; nothing was retried. Choose it again to resend.';
    }
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte';

  import { messageFrom, relativeTime, sessionStatusLabel } from '../../shared/data/view-helpers.js';
  import { installCacheRevalidation } from '../../shared/data/cache.js';
  import { abortPrompt, submitPrompt } from '../../shared/data/relay.js';
  import { submitSlashDraft } from '../../shared/data/submitSlashDraft.js';
  import { bindingMatchesSnapshot, type SelectedCommandBinding } from '../../shared/data/commands.js';
  import { bindingAfterDraftChange } from '../../shared/data/insertSlashCommand.js';
  import { modeAuthority } from '../../shared/data/runtime.js';
  import { DEFAULT_MEDIA_CAPABILITY_OFF, EMPTY_TODO_PROJECTION_STATE } from '../../shared/data/state.js';
  import { useRuntime } from '../../shared/data/useRuntime.svelte.js';
  import { useHostCommandCatalog } from '../../shared/data/hostCommandCatalog.svelte.js';
  import { useSyncSocket } from '../../shared/data/useSyncSocket.svelte.js';
  import type { EffortSheetSection } from './chrome/ModelEffortSheet.svelte';

  import RuntimeStatusRegion from './transcript/RuntimeStatusRegion.svelte';
  import RuntimeModeAnnouncer from './chrome/RuntimeModeAnnouncer.svelte';
  import SessionHeader from './chrome/SessionHeader.svelte';
  import RuntimeStrip from './chrome/RuntimeStrip.svelte';
  import PlanReadyCard from './chrome/PlanReadyCard.svelte';
  import TranscriptList from './transcript/TranscriptList.svelte';
  import SessionComposer from './chrome/SessionComposer.svelte';
  import PlanReviewSheet from './chrome/PlanReviewSheet.svelte';
  import LeavePlanSheet from './chrome/LeavePlanSheet.svelte';
  import ModelEffortSheet from './chrome/ModelEffortSheet.svelte';
  import SessionStateIcon from '../../shared/chrome/SessionStateIcon.svelte';
  import ArtifactViewerProvider from './artifacts/ArtifactViewerProvider.svelte';
  import AttachmentDraftProvider from './attachments/AttachmentDraftProvider.svelte';

  let {
    connection,
    sessionId,
    initialCache: cache,
    transcript,
    todoProjection = EMPTY_TODO_PROJECTION_STATE,
    dispatchConnection,
    dispatchTranscript,
    dispatchTodoProjection = ignoreTodoAction,
    status,
    onBack,
    onInbox,
    onReview,
    theme,
    onThemeChange,
    mediaCapability = DEFAULT_MEDIA_CAPABILITY_OFF,
    askQuestionPrincipal,
  }: SessionProps = $props();

  let prompt = $state('');
  let sendingPrompt = $state(false);
  let promptError = $state<string | null>(null);
  let retrySubmissionId = $state<string | null>(null);
  let stopping = $state(false);
  let binding = $state<SelectedCommandBinding | null>(null);
  let slashSubmitting = $state(false);
  let cacheResumeGeneration = $state(0);
  let todoRefreshGeneration = $state(0);
  let leavePlanReadyOpen = $state(false);
  let sheetOpen = $state(false);
  let sheetSection = $state<EffortSheetSection>('model');

  let headerTrigger = $state<HTMLButtonElement | null>(null);
  let stripTrigger = $state<HTMLButtonElement | null>(null);
  let planReviewTrigger = $state<HTMLButtonElement | null>(null);
  let activeSheetTrigger = $state<HTMLButtonElement | null>(null);

  const runtimeControls = useRuntime(() => sessionId);
  const commandCatalog = useHostCommandCatalog(() => sessionId, () => connection);

  useSyncSocket({
    getSessionId: () => sessionId,
    getCache: () => cache,
    getCacheResumeGeneration: () => cacheResumeGeneration,
    getTodoRefreshGeneration: () => todoRefreshGeneration,
    dispatchConnection,
    dispatchTranscript,
    dispatchTodoProjection,
    runtimeControls,
  });

  const modelCanViewPhotos = $derived(runtimeModelCanViewPhotos(runtimeControls.runtime));
  const isStale = $derived(
    connection !== 'live' || transcript.source === 'cache' || transcript.awaitingSnapshot,
  );
  const runtimeState = $derived(runtimeControls.runtime.state);
  const runtimeAuthority = $derived(
    runtimeState !== null &&
      (runtimeControls.runtime.status === 'ready' || runtimeControls.runtime.status === 'pending'),
  );
  const runtimeRunning = $derived(runtimeState !== null && runtimeState.streaming === true);
  const canSubmit = $derived(
    connection === 'live' &&
      !transcript.awaitingSnapshot &&
      prompt.trim().length > 0 &&
      !sendingPrompt &&
      !slashSubmitting,
  );

  // Visibility/online listeners: reconcile runtime + catalog when the tab
  // returns to the foreground or the network comes back online. The refresh
  // handles are stable plain closures, so this effect runs once on mount.
  $effect(() => {
    const reconcileRuntime = () => {
      if (document.visibilityState === 'visible') void runtimeControls.refresh('foreground');
    };
    const reconcileCatalog = () => {
      if (document.visibilityState === 'visible') void commandCatalog.refresh('foreground');
    };
    document.addEventListener('visibilitychange', reconcileRuntime);
    document.addEventListener('visibilitychange', reconcileCatalog);
    const onOnline = () => {
      void runtimeControls.refresh('online');
      void commandCatalog.refresh('online');
    };
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', reconcileRuntime);
      document.removeEventListener('visibilitychange', reconcileCatalog);
      window.removeEventListener('online', onOnline);
    };
  });

  // A binding is only valid for the exact scope it was created in; any
  // session, host-epoch, or revision change clears it so Send must
  // re-resolve. The session guard runs on the same commit as the switch so
  // another session can never retain this session's binding, even for one
  // render. Tracks snapshot + sessionId ONLY; the binding self-read is
  // untracked (reproduces React setBinding(current => …) which reads current
  // without a dep — failing to untrack causes an infinite effect loop).
  $effect(() => {
    const snapshot = commandCatalog.snapshot;
    const sid = sessionId;
    binding = untrack(() => {
      const current = binding;
      if (current === null) return null;
      if (current.sessionId !== sid) return null;
      return bindingMatchesSnapshot(current, snapshot) ? current : null;
    });
  });

  // The sync stream reaching live is read-only refresh authority. While the
  // initial hydrate is still checking, that hydrate already covers the moment.
  // Tracks connection ONLY; runtime.phase is untracked (React dep array is
  // [connection, refresh], NOT runtime.phase — tracking phase would re-hydrate
  // on every sync message, a regression).
  $effect(() => {
    const c = connection;
    if (c === 'live' && untrack(() => runtimeControls.runtime.phase) !== 'checking') {
      void runtimeControls.refresh('live');
    }
  });

  // Bounded revalidation progress for one explicit slash Send; the flag is
  // local state only and never carries command content.
  $effect(() =>
    installCacheRevalidation(() => {
      cacheResumeGeneration += 1;
    }),
  );

  // One shared sheet per session view: the header opens the model section,
  // RuntimeStrip the effort section, and focus returns to whichever trigger
  // opened it. The sheet holds no committed runtime state itself.
  function openSheet(section: EffortSheetSection, triggerEl: HTMLButtonElement | null) {
    activeSheetTrigger = triggerEl;
    sheetSection = section;
    sheetOpen = true;
  }

  // Draft edits re-evaluate the binding: token edits clear it, argument edits
  // retain it. The OLD draft is captured before the write so
  // bindingAfterDraftChange sees the same previousDraft React did.
  function handleDraftChange(value: string) {
    const previousDraft = prompt;
    prompt = value;
    binding = bindingAfterDraftChange({ previousDraft, nextDraft: value, binding });
  }

  function insertCommand(name: string, inserted: SelectedCommandBinding) {
    binding = inserted;
  }

  function stopRun() {
    if (stopping) return;
    stopping = true;
    // Interrupt the running turn. Delivery-unknown is surfaced, never auto-retried.
    void abortPrompt()
      .then((result) => {
        if (result.outcome.status !== 'aborted') {
          promptError = `Stop was not confirmed (${result.outcome.status}).`;
        }
      })
      .catch((cause: unknown) => (promptError = messageFrom(cause)))
      .finally(() => (stopping = false));
  }

  function sendPrompt(behavior?: 'steer' | 'followUp') {
    const message = prompt.trim();
    if (!canSubmit || message.length === 0) return;
    const submissionId = retrySubmissionId ?? `prompt_${crypto.randomUUID().replaceAll('-', '_')}`;
    const optimisticId = `optimistic_${submissionId}`;
    const occurredAt = new Date().toISOString();
    dispatchTranscript({
      type: 'promptOptimistic',
      sessionId,
      block: {
        id: optimisticId,
        kind: 'text',
        role: 'user',
        text: message,
        revision: 1,
        seq: transcript.coversThrough + 1,
        occurredAt,
      },
    });
    prompt = '';
    promptError = null;
    retrySubmissionId = null;
    sendingPrompt = true;
    void submitPrompt(sessionId, submissionId, message, behavior)
      .then((block) => {
        dispatchTranscript({
          type: 'promptAccepted',
          sessionId,
          optimisticId,
          block,
          at: new Date().toISOString(),
        });
      })
      .catch((cause: unknown) => {
        dispatchTranscript({ type: 'promptRejected', sessionId, optimisticId });
        prompt = message;
        retrySubmissionId = submissionId;
        promptError = messageFrom(cause);
      })
      .finally(() => (sendingPrompt = false));
  }

  // One explicit slash Send: revalidate the current binding, spend one
  // fresh ticket and one expected-revision envelope, and reconcile without
  // retry. Every failure preserves the drafted message, clears the unsafe
  // binding (so the next Send requires reselection), and maps to bounded
  // local copy; a stale race additionally refreshes the catalog.
  function sendSlashDraft() {
    const message = prompt.trim();
    if (binding === null || slashSubmitting || message.length === 0 || !canSubmit) return;
    slashSubmitting = true;
    promptError = null;
    void submitSlashDraft({
      sessionId,
      draft: message,
      binding,
      snapshot: commandCatalog.snapshot,
      connection,
      awaitingSnapshot: transcript.awaitingSnapshot,
      runtimeAuthority,
      running: runtimeRunning,
    })
      .then((outcome) => {
        if (outcome.status === 'accepted') {
          // Optimistic transcript behavior applies only after the host
          // accepted the explicit submission; the authoritative block lands
          // directly.
          dispatchTranscript({
            type: 'promptAccepted',
            sessionId,
            optimisticId: outcome.block.id,
            block: outcome.block,
            at: new Date().toISOString(),
          });
          prompt = '';
          binding = null;
          return;
        }
        // Fail closed: keep the draft, drop the unsafe binding, and never
        // retry. A stale race also refreshes the catalog for reselection.
        binding = null;
        if (outcome.code === 'stale') void commandCatalog.refresh('manual');
        promptError = slashFailureMessage(outcome.code);
      })
      .finally(() => (slashSubmitting = false));
  }

  // SessionComposer types setPrompt as a FUNCTIONAL updater; pass a wrapper
  // that applies the updater to the local prompt state.
  const setPromptComposer = (updater: (current: string) => string) => {
    prompt = updater(prompt);
  };
</script>

<!-- @ds surface: session-view — in-session composition root (header · statusline · transcript · composer). -->
<!-- @ds guardrail: connection / transcript / sync / composer logic — not designer-editable. -->
<main class="session-view">
  <RuntimeStatusRegion runtime={runtimeControls.runtime} />
  <RuntimeModeAnnouncer runtime={runtimeControls.runtime} {connection} />
  <SessionHeader
    {onBack}
    {onInbox}
    {onReview}
    {theme}
    {onThemeChange}
    {runtimeControls}
    {sheetOpen}
    onOpenModelSheet={() => openSheet('model', headerTrigger)}
    bind:modelTriggerRef={headerTrigger}
  />
  <div class="session-statusline" role="status" aria-live="polite">
    <span class={`agent-dot agent-${status}`} aria-hidden="true">
      <SessionStateIcon {status} />
    </span>
    <span class="session-status-label">{sessionStatusLabel(status)}</span>
    {#if transcript.updatedAt !== null}
      <span class="session-status-time">
        · {isStale ? 'reconnecting' : relativeTime(transcript.updatedAt)}
      </span>
    {/if}
  </div>
  {#if transcript.error !== null}
    <div class="inline-alert">{transcript.error}</div>
  {/if}
  {#if transcript.awaitingSnapshot}
    <div class="barrier-note">
      Reconciliation barrier active. Waiting for a fresh snapshot.
    </div>
  {/if}
  <PlanReadyCard
    artifact={runtimeControls.runtime.planArtifact}
    isLive={
      modeAuthority(runtimeControls.runtime).confirmedMode === 'plan' &&
      runtimeControls.runtime.planLive === true
    }
    canReview={
      runtimeControls.runtime.planToken !== null &&
      runtimeControls.runtime.planToken !== undefined &&
      runtimeControls.runtime.executePending !== true
    }
    bind:reviewButtonRef={planReviewTrigger}
    onReview={() => {
      runtimeControls.openPlanReview?.();
    }}
  />
  <ArtifactViewerProvider>
    <TranscriptList
      {sessionId}
      blocks={transcript.blocks}
      running={status === 'running'}
      canAnswer={connection === 'live' && !transcript.awaitingSnapshot}
      {askQuestionPrincipal}
      {todoProjection}
      onRefreshTodos={() => {
        dispatchTodoProjection({ type: 'refreshRequested' });
        todoRefreshGeneration += 1;
      }}
      onClearTodoAnnouncement={() => dispatchTodoProjection({ type: 'clearAnnouncement' })}
    />
  </ArtifactViewerProvider>
  <RuntimeStrip
    controls={runtimeControls}
    {sheetOpen}
    onOpenEffortSheet={() => openSheet('effort', stripTrigger)}
    bind:effortTriggerRef={stripTrigger}
  />
  <AttachmentDraftProvider {sessionId} capability={mediaCapability} {modelCanViewPhotos}>
    <SessionComposer
      {prompt}
      {sessionId}
      sessionEpoch={transcript.epoch}
      expectedPromptRevision={runtimeState?.revision ?? null}
      setPrompt={setPromptComposer}
      onDraftChange={handleDraftChange}
      {sendPrompt}
      {sendSlashDraft}
      {stopRun}
      {canSubmit}
      {status}
      {connection}
      awaitingSnapshot={transcript.awaitingSnapshot}
      {sendingPrompt}
      {stopping}
      {promptError}
      {runtimeControls}
      catalog={commandCatalog}
      {binding}
      {slashSubmitting}
      {runtimeAuthority}
      {runtimeRunning}
      onInsertCommand={insertCommand}
      externalOverlayOpen={sheetOpen}
      {mediaCapability}
      onAttachmentSubmitted={() => {
        promptError = null;
        retrySubmissionId = null;
        binding = null;
      }}
    />
  </AttachmentDraftProvider>
  <PlanReviewSheet
    isOpen={runtimeControls.runtime.reviewOpen === true}
    onOpenChange={(open) => {
      if (!open) runtimeControls.dismissPlanReview?.();
    }}
    artifact={
      runtimeControls.runtime.reviewedPlan?.artifact ?? runtimeControls.runtime.planArtifact
    }
    isExecuting={runtimeControls.runtime.executePending === true}
    onKeepPlanning={() => runtimeControls.dismissPlanReview?.()}
    onRevisePlan={() => {
      runtimeControls.dismissPlanReview?.();
      window.setTimeout(() => document.getElementById('session-prompt')?.focus(), 0);
    }}
    onLeaveWithoutRunning={() => {
      runtimeControls.dismissPlanReview?.();
      leavePlanReadyOpen = true;
    }}
    onExecuteReviewedPlan={() => {
      void runtimeControls.executePlan?.();
    }}
    triggerRef={planReviewTrigger}
  />
  <LeavePlanSheet
    isOpen={leavePlanReadyOpen}
    onOpenChange={(v) => (leavePlanReadyOpen = v)}
    variant="plan-ready"
    onSwitchToBuild={() => {
      leavePlanReadyOpen = false;
      void runtimeControls.setMode('build');
    }}
    onLeaveWithoutRunning={() => {
      leavePlanReadyOpen = false;
      void runtimeControls.setMode('build');
    }}
    triggerRef={planReviewTrigger}
  />
  <ModelEffortSheet
    isOpen={sheetOpen}
    onOpenChange={(v) => (sheetOpen = v)}
    initialSection={sheetSection}
    {runtimeControls}
    triggerRef={activeSheetTrigger}
  />
</main>

<!-- @ds surface: session-view — in-session composition root (header · statusline · transcript · composer).
     Decomposed into this scoped block; session-statusline / session-status-label / agent-dot and the
     agent-dot.agent-running variant are owned solely by this component (rendered directly) so they
     move with it. session-view stays global (shared grouped routed-frame selector with home/review/inbox);
     inline-alert / barrier-note stay global (shared by 2+ surfaces: enrollment/review/inbox/push/composer);
     the .agent-running .state-icon pulsing group stays global (shared with the agent-row surface).
     Values unchanged. -->
<style>
  /* @ds surface: session-view — in-session composition root (header · statusline · transcript · composer). */
  /* @ds state: active · stale — reconnecting readout; error via inline-alert. */
  .session-statusline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding-block: var(--space-2) var(--space-1);
    color: var(--ink-muted);
    font-size: 0.75rem;
  }

  /* @ds slot: label — session status text. */
  .session-status-label {
    font-weight: 600;
  }

  /* @ds slot: dot — session-agent status glyph. */
  .agent-dot {
    display: inline-grid;
    place-items: center;
    width: 0.95rem;
    height: 0.95rem;
    color: var(--ink-muted);
  }

  /* @ds state: running */
  .agent-dot.agent-running {
    color: var(--accent);
  }
  /* @ds end surface: session-view */
</style>
