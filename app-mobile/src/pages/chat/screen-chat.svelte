<script module lang="ts">
  import type { ReadOnlyCache } from '$shared/transport/cache.js';
  import {
    transcriptReducer,
    type ConnectionAction,
    type ConnectionPhase,
    type TranscriptState,
    type TodoProjectionAction,
    type TodoProjectionState,
  } from '$shared/state/state.js';
  import type { RuntimeMediaCapabilityDto, SessionCardDto } from '@pi-remote/pi-rpc-protocol';
  import type { RuntimeUiState } from '$shared/state/runtime.js';
  import type { SlashSubmitFailureCode } from '$shared/commands/submit-slash-draft.js';

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
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';

  import { messageFrom, relativeTime, sessionStatusLabel } from '$shared/format/view-helpers.js';
  import { installCacheRevalidation } from '$shared/transport/cache.js';
  import { abortPrompt, submitPrompt } from '$shared/transport/relay.js';
  import { submitSlashDraft } from '$shared/commands/submit-slash-draft.js';
  import { bindingMatchesSnapshot, type SelectedCommandBinding } from '$shared/commands/commands.js';
  import { bindingAfterDraftChange } from '$shared/commands/insert-slash-command.js';
  import { modeAuthority } from '$shared/state/runtime.js';
  import { DEFAULT_MEDIA_CAPABILITY_OFF, EMPTY_TODO_PROJECTION_STATE } from '$shared/state/state.js';
  import { useRuntime } from '$shared/state/use-runtime.svelte.js';
  import { useHostCommandCatalog } from '$shared/commands/host-command-catalog.svelte.js';
  import { useSyncSocket } from '$shared/transport/use-sync-socket.svelte.js';
  import type { EffortSheetSection } from './chrome/sheet-model-effort.svelte';

  import RuntimeStatusRegion from './transcript/runtime-status-region.svelte';
  import RuntimeModeAnnouncer from './chrome/runtime-mode-announcer.svelte';
  import SessionHeader from './chrome/session-header.svelte';
  import RuntimeStrip from './chrome/runtime-strip.svelte';
  import PlanReadyCard from './chrome/card-plan-ready.svelte';
  import TranscriptList from './transcript/transcript-list.svelte';
  import SessionComposer from './chrome/session-composer.svelte';
  import PlanReviewSheet from './chrome/sheet-plan-review.svelte';
  import LeavePlanSheet from './chrome/sheet-leave-plan.svelte';
  import ModelEffortSheet from './chrome/sheet-model-effort.svelte';
  import SessionStateIcon from '$shared/chrome/session-state-icon.svelte';
  import ArtifactViewerProvider from './artifacts/artifact-viewer-provider.svelte';
  import AttachmentDraftProvider from './attachments/attachment-draft-provider.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Foreground/online: refresh runtime + catalog once on mount (stable closure deps).
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

  // Clear binding when session, host epoch, or revision drifts; untrack avoids an infinite loop.
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

  // Refresh runtime on live; untrack phase so sync messages do not re-hydrate every tick.
  $effect(() => {
    const c = connection;
    if (c === 'live' && untrack(() => runtimeControls.runtime.phase) !== 'checking') {
      void runtimeControls.refresh('live');
    }
  });

  // Local flag only — bounded revalidation progress for one slash Send.
  $effect(() =>
    installCacheRevalidation(() => {
      cacheResumeGeneration += 1;
    }),
  );

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // One sheet; header opens model, RuntimeStrip opens effort; focus returns to the opener.
  function openSheet(section: EffortSheetSection, triggerEl: HTMLButtonElement | null) {
    activeSheetTrigger = triggerEl;
    sheetSection = section;
    sheetOpen = true;
  }

  // Capture previousDraft before write so bindingAfterDraftChange matches React semantics.
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

  // One slash Send: revalidate binding, spend ticket + revision; fail closed, no retry.
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
        // Fail closed: keep draft, drop binding; stale also refreshes catalog.
        binding = null;
        if (outcome.code === 'stale') void commandCatalog.refresh('manual');
        promptError = slashFailureMessage(outcome.code);
      })
      .finally(() => (slashSubmitting = false));
  }

  // SessionComposer expects a functional updater wrapper around local prompt state.
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
  /* @ds surface: routed-frame — shared page scaffold for home / session / review / inbox roots. */
  /* @ds edit: layout — page gutter + safe bottom inset shared by routed surfaces. */
  .session-view {
    padding: var(--space-8) var(--page-gutter) max(var(--space-16), env(safe-area-inset-bottom));
  }

  @media (max-width: 39rem) {
    .session-view {
      padding-top: var(--space-6);
    }
  }

  /* @ds edit: layout — safe inline gutters for the routed surfaces. */
  .session-view {
    padding-inline-start: max(var(--page-gutter), env(safe-area-inset-left, 0px));
    padding-inline-end: max(var(--page-gutter), env(safe-area-inset-right, 0px));
  }

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
