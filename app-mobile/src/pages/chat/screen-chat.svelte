<script module lang="ts">
  // Shared by every instance of this screen: the props it accepts, plus two pure
  // helpers that need no component state — whether the current model can see an
  // attached photo, and the friendly message shown for each slash-command failure.

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

  // A model can see an attached photo unless its catalog entry says it takes no
  // image input. When the model is unknown, assume it can (fail open on capability).
  function runtimeModelCanViewPhotos(runtime: RuntimeUiState): boolean {
    const current = runtime.state?.model;
    if (current === null || current === undefined) return true;
    const catalogModel = runtime.models.find(
      (model) => model.provider === current.provider && model.id === current.id,
    );
    const input = catalogModel?.input ?? current.input;
    return input === undefined || input.includes('image');
  }

  // Turn each slash-command failure code into a short line the person can act on.
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

  import { untrack, onDestroy } from 'svelte';

  import { messageFrom, relativeTime, sessionStatusLabel } from '$shared/format/view-helpers.js';
  import { installCacheRevalidation } from '$shared/transport/cache.js';
  import { abortPrompt, submitPrompt, PromptDeliveryError } from '$shared/transport/relay.js';
  import { parkDraftText, readParkedDraftText } from '$shared/state/chat-draft-cache.js';
  import {
    raiseDeferredSendError,
    type ScopedSendError,
  } from '$shared/state/deferred-send-error.svelte.js';
  import {
    deliveryHoldAction,
    PROMPT_DELIVERY_HOLD_MS,
    type DeliveryHold,
  } from '$shared/state/prompt-delivery-hold.js';
  import { submitSlashDraft } from '$shared/commands/submit-slash-draft.js';
  import { bindingMatchesSnapshot, bindingFor, type SelectedCommandBinding } from '$shared/commands/commands.js';
  import { bindingAfterDraftChange } from '$shared/commands/insert-slash-command.js';
  import { modeAuthority } from '$shared/state/runtime.js';
  import { DEFAULT_MEDIA_CAPABILITY_OFF, EMPTY_TODO_PROJECTION_STATE } from '$shared/state/state.js';
  import type { DisplayTranscriptBlock } from '$shared/state/state.js';
  import { useRuntime } from '$shared/state/use-runtime.svelte.js';
  import { useHostCommandCatalog } from '$shared/commands/host-command-catalog.svelte.js';
  import { useSyncSocket } from '$shared/transport/use-sync-socket.svelte.js';
  import { readViewModePreference } from '$shared/state/view-mode.js';
  import { createForegroundPoller } from '$shared/state/foreground-polling.js';
  import type { EffortSheetSection } from './chrome/sheet-model-effort.svelte';

  import {
    hasTranscriptEpochAdvanced,
    inputLockReason,
    inputLockReasonWithSettle,
    holdOffLateRunning,
    HoldOffResult,
    INPUT_LOCK_SETTLE_MS,
  } from '$shared/state/streaming-derivations.js';
  import type { InputLockReason } from '$shared/state/streaming-derivations.js';

  import RuntimeStatusRegion from './transcript/runtime-status-region.svelte';
  import RuntimeModeAnnouncer from './chrome/runtime-mode-announcer.svelte';
  import SessionHeader from './chrome/session-header.svelte';
  import RuntimeStrip from './chrome/runtime-strip.svelte';
  import DockRecentSessions from './chrome/dock-recent-sessions.svelte';
  import PlanReadyCard from './chrome/card-plan-ready.svelte';
  import TranscriptList from './transcript/transcript-list.svelte';
  import TranscriptLoadPanel from './transcript/transcript-load-panel.svelte';
  import {
    deriveTranscriptLoadState,
    nextHeldTranscriptBlocks,
  } from './transcript/transcript-load-state.js';
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
  let promptError = $state<ScopedSendError | null>(null);
  // The retry affordance for a failed send belongs to the session that failed:
  // reusing its submissionId from another chat would make the host dedupe a
  // brand-new send against one that chat never made.
  let failedSendRetry = $state<{ scopeKey: string; submissionId: string } | null>(null);
  let stopping = $state(false);
  let locallyInterrupted = $state(false);
  let elapsedLabel = $state<string | null>(null);
  let observedTranscriptEpoch: string | null = null;
  let hasObservedTranscriptEpoch = false;
  let binding = $state<SelectedCommandBinding | null>(null);
  let slashSubmitting = $state(false);
  let cacheResumeGeneration = $state(0);
  let todoRefreshGeneration = $state(0);
  let leavePlanReadyOpen = $state(false);
  let sheetOpen = $state(false);
  let sheetSection = $state<EffortSheetSection>('model');

  // Turn-end tracking for the done-holdoff: a late re-reported running
  // signal inside the ~3 s window does not resurrect a finished turn.
  let lastEffectiveStatus = $state<SessionProps['status']>('idle');
  let turnEndedAt = $state(0);
  let turnEndedEpoch = $state<string | null>(null);

  // Transient-state tracking for the 600 ms input-lock settle, so a
  // dying socket never flashes send-enabled.
  let lastTransientAt = $state(0);

  // Reactive ticker that the inputLock derived reads so the settle
  // release timer can re-evaluate the lock without any other signal.
  let settleTick = $state(0);

  // Previous raw input-lock value, used by the edge-detection effect
  // to stamp lastTransientAt at the moment a transient→cleared edge
  // fires (not at reconnect-start). Written only inside untrack.
  let previousInputLockRaw: InputLockReason = 'none';

  // Set at teardown. Late async send resolutions read it to stop writing
  // state that no longer renders and to route their outcome to the toast
  // strip instead. A plain closure flag: nothing renders from it.
  let unmounted = false;

  // Which button opened each overlay, so focus can return to it on close.
  let headerTrigger = $state<HTMLButtonElement | null>(null);
  let stripTrigger = $state<HTMLButtonElement | null>(null);
  let planReviewTrigger = $state<HTMLButtonElement | null>(null);
  let activeSheetTrigger = $state<HTMLButtonElement | null>(null);
  let heldBlocks = $state<readonly DisplayTranscriptBlock[] | null>(null);

  // One unresolved send watching for its echoed turn, plus a tick the
  // watcher effect reads so a deadline timer can re-arm it. The hold
  // object itself is plain — the effect only reads it inside untrack.
  let deliveryHolds: DeliveryHold[] = [];
  let deliveryHoldTick = $state(0);

  const SESSION_SLASH_NAMES = ['rename', 'archive', 'new', 'fork'] as const;
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
  // Per-session view-mode preference, fail-closed on storage failure.
  const viewMode = $derived(readViewModePreference(sessionId));
  const runtimeState = $derived(runtimeControls.runtime.state);
  const runtimeAuthority = $derived(
    runtimeState !== null &&
      (runtimeControls.runtime.status === 'ready' || runtimeControls.runtime.status === 'pending'),
  );
  const runtimeRunning = $derived(runtimeState !== null && runtimeState.streaming === true);
  // Streaming derivations: inputLock with settle.
  const inputLock = $derived.by(() => {
    // Reading settleTick makes the derived re-evaluate when the
    // settle timer fires, so the lock releases on its own.
    void settleTick;
    return inputLockReasonWithSettle(
      connection,
      transcript.awaitingSnapshot,
      lastTransientAt,
      Date.now(),
    );
  });
  const canSubmit = $derived(
    inputLock === 'none' &&
      prompt.trim().length > 0 &&
      !sendingPrompt &&
      !slashSubmitting,
  );
  const canDispatchSlash = $derived(
    inputLock === 'none' && !sendingPrompt && !slashSubmitting,
  );
  // The live-scope paint guard: an error stamped for another session is never
  // rendered into this chat's announcer or composer banner.
  const paintedPromptError = $derived(
    promptError !== null && promptError.scopeKey === sessionId ? promptError : null,
  );
  const slashCommandNames = $derived(
    SESSION_SLASH_NAMES.filter((name) => bindingFor(commandCatalog.snapshot, name) !== null),
  );
  const transcriptLoadView = $derived(
    deriveTranscriptLoadState({
      transcript,
      connection,
      heldBlocks,
    }),
  );

  // The raw running signal with the done-holdoff applied: a running
  // re-reported within ~3 s of an idle/interrupted end is held off
  // unless the epoch changed (new turn).
  const runningRaw = $derived(status === 'running');
  const running = $derived.by(() => {
    if (!runningRaw || locallyInterrupted) return false;
    if (lastEffectiveStatus === 'running') return true;
    const held = holdOffLateRunning({
      currentStatus: status,
      previousStatus: lastEffectiveStatus,
      previousEpoch: turnEndedEpoch,
      currentEpoch: transcript.epoch,
      turnEndedAt,
      now: Date.now(),
    });
    return held !== HoldOffResult.HOLD;
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Secondary re-arm: a relay generation change invalidates local presentation
  // state. The primary re-arm is the person sending again — an epoch marks a
  // relay generation, not a turn, so it can go a whole session without moving.
  //
  // Session identity is tracked alongside it because this component instance is
  // reused across chats (the route has no keyed remount). Without this, a stop
  // in one chat would follow the person into the next one: selecting a session
  // empties the transcript to a null epoch, and a null on either side is not an
  // advance, so the hidden state would never clear and a perfectly live turn in
  // the new chat would render as if the host had stopped.
  let observedSessionId: string | null = null;
  $effect(() => {
    const currentEpoch = transcript.epoch;
    const currentSession = sessionId;
    untrack(() => {
      if (observedSessionId !== currentSession) {
        observedSessionId = currentSession;
        locallyInterrupted = false;
        observedTranscriptEpoch = currentEpoch;
        hasObservedTranscriptEpoch = currentEpoch !== null;
        return;
      }
      if (
        hasObservedTranscriptEpoch &&
        hasTranscriptEpochAdvanced(observedTranscriptEpoch, currentEpoch)
      ) {
        locallyInterrupted = false;
      }
      observedTranscriptEpoch = currentEpoch;
      hasObservedTranscriptEpoch = true;
    });
  });

  // On foreground or reconnect, refresh the runtime and command catalog once.
  // The poller drops its timer while hidden and coalesces refocus plus the
  // online edge into a single catch-up so both listeners cannot burst.
  $effect(() => {
    const catchUp = () => {
      void runtimeControls.refresh('foreground');
      void commandCatalog.refresh('foreground');
    };
    const poller = createForegroundPoller({
      intervalMs: 0,
      catchUpOnStart: false,
      getVisibility: () => document.visibilityState,
      read: catchUp,
    });
    const onVisibility = () => poller.notifyVisibility(document.visibilityState);
    const onOnline = () => poller.notifyReconnect();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    poller.start();
    return () => {
      poller.stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  });

  // Drop the slash binding when the session, host epoch, or revision drifts.
  // untrack keeps reading `binding` here from re-triggering the effect.
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

  // On a live connection, refresh the runtime once — untrack the phase so sync
  // messages don't re-hydrate it on every tick.
  $effect(() => {
    const c = connection;
    if (c === 'live' && untrack(() => runtimeControls.runtime.phase) !== 'checking') {
      void runtimeControls.refresh('live');
    }
  });

  // Local progress flag for one slash Send's bounded cache revalidation.
  $effect(() =>
    installCacheRevalidation(() => {
      cacheResumeGeneration += 1;
    }),
  );

  // Keep a rendered thread across snapshot refreshes; drop it only when the host says so.
  $effect(() => {
    const current = transcript;
    untrack(() => {
      heldBlocks = nextHeldTranscriptBlocks(current, heldBlocks);
    });
  });

  // Turn-end tracking for the done-holdoff: record when a running
  // signal transitions to idle/interrupted, and the epoch at that
  // moment. untrack the writes so the effect never re-triggers on
  // its own output.
  $effect(() => {
    const current = status;
    const epoch = transcript.epoch;
    untrack(() => {
      if (lastEffectiveStatus === 'running' && (current === 'idle' || current === 'interrupted')) {
        turnEndedAt = Date.now();
        turnEndedEpoch = epoch;
      }
      lastEffectiveStatus = current;
    });
  });

  // Transient-edge tracking for the 600 ms input-lock settle: stamp
  // lastTransientAt at the moment the lock clears (transient→none),
  // not at the moment it appeared.  The release timer is re-armed on
  // every effect re-run inside the settle window so that unrelated
  // signal changes cannot cancel the pending release.
  $effect(() => {
    const raw = inputLockReason(connection, transcript.awaitingSnapshot);
    let timer: ReturnType<typeof setTimeout> | undefined;

    untrack(() => {
      const previous = previousInputLockRaw;

      if (raw === 'none' && previous !== 'none') {
        // Edge: the lock just cleared — start the settle window at
        // the clear moment, not the reconnect-start moment.
        lastTransientAt = Date.now();
      }

      previousInputLockRaw = raw;

      // Re-arm the release timer whenever we are inside the settle
      // window, so a mid-window effect re-run preserves the deadline.
      if (raw === 'none' && lastTransientAt > 0) {
        const elapsed = Date.now() - lastTransientAt;
        if (elapsed < INPUT_LOCK_SETTLE_MS) {
          timer = setTimeout(() => {
            settleTick += 1;
          }, INPUT_LOCK_SETTLE_MS - elapsed);
        }
      }
    });

    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  });

  // Park the raw composer draft under the outgoing session and restore
  // whatever that session parked when it returns, so navigation never
  // loses an unsent draft. Only sessionId is read reactively; the write
  // to prompt happens inside untrack so this effect can never depend on
  // the state it restores (the self-invalidation rule).
  $effect(() => {
    const sid = sessionId;
    untrack(() => {
      prompt = readParkedDraftText(sid);
    });
    return () => {
      parkDraftText(sid, untrack(() => prompt));
    };
  });

  // Delivery-unknown holds: while a thrown send's fate is unresolved,
  // watch the transcript for the echoed turn. The optimistic block stays
  // visible during the hold; if the echo lands before the deadline the
  // ack was lost but the turn arrived — the draft stays cleared and no
  // resend is invited. Only a deadline expiry with no echo is treated as
  // a true failure and hands the exact raw draft back. The deadline timer
  // re-arms on every re-run inside the window (same discipline as the
  // settle window above), and every write happens inside untrack — the
  // effect reads transcript blocks reactively but must never depend on
  // the hold state it settles.
  $effect(() => {
    void deliveryHoldTick;
    const sid = sessionId;
    const blocks = transcript.blocks;
    let timer: ReturnType<typeof setTimeout> | undefined;

    untrack(() => {
      if (deliveryHolds.length === 0) return;
      const now = Date.now();
      const keep: DeliveryHold[] = [];
      let soonest = Number.POSITIVE_INFINITY;

      for (const hold of deliveryHolds) {
        if (hold.sessionId !== sid) {
          // The person navigated away while this send was unresolved. The
          // watch cannot follow them, so hand the text back to the session
          // that owns it rather than dropping it: returning restores it.
          surrenderHold(hold);
          continue;
        }
        const action = deliveryHoldAction(hold, blocks, now);
        if (action === 'watch') {
          keep.push(hold);
          soonest = Math.min(soonest, hold.deadlineAt - now);
          continue;
        }
        dispatchTranscript({
          type: 'promptRejected',
          sessionId: hold.sessionId,
          optimisticId: hold.optimisticId,
        });
        if (action === 'restore') restoreFailedDraft(hold);
      }

      deliveryHolds = keep;
      if (soonest !== Number.POSITIVE_INFINITY && soonest > 0) {
        timer = setTimeout(() => {
          deliveryHoldTick += 1;
        }, soonest);
      }
    });

    return () => {
      // Only the timer is per-run: this cleanup also fires before every
      // re-run, so surrendering holds here would discard them the moment
      // one is registered. Teardown belongs to onDestroy.
      if (timer !== undefined) clearTimeout(timer);
    };
  });


  // Unmounting ends every watch. Park whatever is still unresolved so the
  // draft comes back with its session instead of vanishing. The unmount flag
  // also routes late async send failures to the toast strip.
  onDestroy(() => {
    unmounted = true;
    for (const hold of deliveryHolds) surrenderHold(hold);
    deliveryHolds = [];
  });

  // A held send whose watch is ending without a verdict. The text is parked
  // under its own session so re-entering that chat brings it back; parking
  // beats restoring inline, which would drop it into whichever session the
  // person is looking at now.
  function surrenderHold(hold: DeliveryHold): void {
    const parked = readParkedDraftText(hold.sessionId);
    if (parked.trim().length === 0) parkDraftText(hold.sessionId, hold.rawDraft);
  }

  // A send that truly failed. Hand the exact raw draft back inline when the
  // composer is free; if the person has already started a new message, park
  // it instead so neither draft is destroyed.
  function restoreFailedDraft(hold: DeliveryHold): void {
    if (prompt.trim().length === 0) {
      prompt = hold.rawDraft;
      failedSendRetry = { scopeKey: hold.sessionId, submissionId: hold.submissionId };
      paintSendError(hold.sessionId, hold.errorText);
      return;
    }
    surrenderHold(hold);
    paintSendError(hold.sessionId, hold.errorText);
  }

  // A send failure paints its own session's banner while that screen is alive.
  // Once the person has moved on — another chat, or this screen unmounted —
  // the banner they could read is gone, so the shell's toast strip carries
  // the message instead.
  function paintSendError(scopeKey: string, message: string): void {
    if (unmounted || scopeKey !== sessionId) {
      raiseDeferredSendError({ scopeKey, message });
      return;
    }
    promptError = { scopeKey, message };
  }

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Open the model or effort sheet, remembering which button to refocus on close.
  function openSheet(section: EffortSheetSection, triggerEl: HTMLButtonElement | null) {
    activeSheetTrigger = triggerEl;
    sheetSection = section;
    sheetOpen = true;
  }

  // Capture the previous draft before writing the new one, so the binding update
  // sees the same before/after ordering React relied on.
  function handleDraftChange(value: string) {
    const previousDraft = prompt;
    prompt = value;
    binding = bindingAfterDraftChange({ previousDraft, nextDraft: value, binding });
  }

  // A command picked from the list becomes the active slash binding.
  function insertCommand(name: string, inserted: SelectedCommandBinding) {
    binding = inserted;
  }

  // Stop the running turn. A delivery-unknown outcome is surfaced, never retried.
  // No command issues before the authoritative epoch is confirmed.
  function stopRun() {
    if (stopping) return;
    if (transcript.awaitingSnapshot) return;
    stopping = true;
    locallyInterrupted = true;
    const scopeKey = sessionId;
    void abortPrompt()
      .then((result) => {
        if (result.outcome.status !== 'aborted') {
          paintSendError(scopeKey, `Stop was not confirmed (${result.outcome.status}).`);
        }
      })
      .catch((cause: unknown) => paintSendError(scopeKey, messageFrom(cause)))
      .finally(() => (stopping = false));
  }

  // Send a normal prompt: show it optimistically, submit, and decide the
  // failure lane by delivery outcome. A definite refusal restores the
  // exact raw draft right away; an unresolved send holds and watches the
  // transcript for the echoed turn before restoring (see the hold effect).
  function sendPrompt(behavior?: 'steer' | 'followUp') {
    // The raw draft is captured before trimming so a restored draft is
    // byte-identical to what the person typed.
    const rawDraft = prompt;
    const message = rawDraft.trim();
    if (!canSubmit || message.length === 0) return;
    if (transcript.awaitingSnapshot) return;
    // Sending again is the person starting a new turn, so the locally hidden
    // running state must come back. The relay epoch cannot carry this: it
    // marks a relay generation, not a turn, so waiting on it would leave the
    // working indicator dark for every turn after the first Stop.
    locallyInterrupted = false;
    // Every async settlement of this send is checked against the scope it
    // started in, never against the session the person is reading when it
    // lands.
    const scopeKey = sessionId;
    const submissionId =
      failedSendRetry !== null && failedSendRetry.scopeKey === scopeKey
        ? failedSendRetry.submissionId
        : `prompt_${crypto.randomUUID().replaceAll('-', '_')}`;
    const optimisticId = `optimistic_${submissionId}`;
    // The echo must be a turn beyond what the transcript already covers.
    const coversThroughAtSubmit = transcript.coversThrough;
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
    failedSendRetry = null;
    sendingPrompt = true;
    void submitPrompt(scopeKey, submissionId, message, behavior)
      .then((block) => {
        // Dispatching with the send's own scope lets the transcript reducer
        // ignore a settlement that lands after the person moved on, instead
        // of splicing the echoed turn into another session's rows.
        dispatchTranscript({
          type: 'promptAccepted',
          sessionId: scopeKey,
          optimisticId,
          block,
          at: new Date().toISOString(),
        });
      })
      .catch((cause: unknown) => {
        const status =
          cause instanceof PromptDeliveryError ? cause.outcome.status : 'delivery-unknown';
        if (status === 'rejected') {
          // Definite refusal — the host never received the prompt.
          dispatchTranscript({ type: 'promptRejected', sessionId: scopeKey, optimisticId });
          if (unmounted || sessionId !== scopeKey) {
            // The person moved on before the refusal landed: the draft waits
            // with its own session, and the failure reaches them via the toast
            // strip instead of painting the chat they are reading now.
            parkDraftText(scopeKey, rawDraft);
            paintSendError(scopeKey, messageFrom(cause));
            return;
          }
          prompt = rawDraft;
          failedSendRetry = { scopeKey, submissionId };
          paintSendError(scopeKey, messageFrom(cause));
          return;
        }
        // The ack was lost; the turn may still land. Reusing the same
        // submissionId keeps a later retry idempotent on the host.
        deliveryHolds = [
          ...deliveryHolds,
          {
            sessionId: scopeKey,
            optimisticId,
            submissionId,
            message,
            rawDraft,
            sinceSeq: coversThroughAtSubmit,
            deadlineAt: Date.now() + PROMPT_DELIVERY_HOLD_MS,
            errorText: messageFrom(cause),
          },
        ];
        deliveryHoldTick += 1;
      })
      .finally(() => (sendingPrompt = false));
  }

  // Send a slash command: revalidate the binding, spend the ticket and revision,
  // and fail closed with no retry.
  function dispatchSlashDraft(draft: string, selected: SelectedCommandBinding) {
    if (slashSubmitting || !canDispatchSlash) return;
    // A slash submission is a new turn on the same footing as a prompt.
    locallyInterrupted = false;
    slashSubmitting = true;
    promptError = null;
    const scopeKey = sessionId;
    void submitSlashDraft({
      sessionId,
      draft,
      binding: selected,
      snapshot: commandCatalog.snapshot,
      connection,
      awaitingSnapshot: transcript.awaitingSnapshot,
      runtimeAuthority,
      running: runtimeRunning,
    })
      .then((outcome) => {
        if (outcome.status === 'accepted') {
          // The send's own scope keeps a settlement that lands after a session
          // switch out of the transcript the person is reading now.
          dispatchTranscript({
            type: 'promptAccepted',
            sessionId: scopeKey,
            optimisticId: outcome.block.id,
            block: outcome.block,
            at: new Date().toISOString(),
          });
          if (sessionId === scopeKey) {
            prompt = '';
            binding = null;
          }
          return;
        }
        // Failed: keep the draft, drop the binding; a stale result also refreshes the catalog.
        binding = null;
        if (outcome.code === 'stale') void commandCatalog.refresh('manual');
        paintSendError(scopeKey, slashFailureMessage(outcome.code));
      })
      .finally(() => (slashSubmitting = false));
  }

  function sendSlashDraft() {
    const message = prompt.trim();
    if (binding === null || message.length === 0) return;
    dispatchSlashDraft(message, binding);
  }

  function forwardSlash(name: string) {
    const selected = bindingFor(commandCatalog.snapshot, name);
    if (selected === null) return;
    dispatchSlashDraft(`/${name}`, selected);
  }

  function refreshSession() {
    cacheResumeGeneration += 1;
    void runtimeControls.refresh();
    void commandCatalog.refresh('manual');
  }

  function openTranscript() {
    const frame = document.querySelector<HTMLElement>('.transcript--frame');
    frame?.focus();
  }

  // SessionComposer expects a functional-updater wrapper around the local prompt.
  const setPromptComposer = (updater: (current: string) => string) => {
    prompt = updater(prompt);
  };

  function updateElapsedLabel(label: string | null): void {
    elapsedLabel = label;
  }

  // The shell owns pop-versus-replace; chat back is that same dismiss path
  // so a card-entered stack pops and a deep-link root replaces.
  function handleBack(): void {
    onBack();
  }
</script>

<!-- The in-session view: header, status line, transcript, composer, and the overlay sheets. -->
<!-- Do not edit the connection / transcript / sync / composer wiring below — it is app logic, not styling. -->
<main class="session--view">
  <!-- Screen-reader-only live regions for runtime status and mode changes -->
  <RuntimeStatusRegion runtime={runtimeControls.runtime} {elapsedLabel} />
  <RuntimeModeAnnouncer runtime={runtimeControls.runtime} {connection} />
  <!-- data-view-mode carries the fail-closed per-session preference for future CSS targeting. -->
  <div hidden data-view-mode={viewMode.value} data-view-mode-resolved={viewMode.resolved}></div>

  <!-- Header: back / inbox / review, the theme toggle, and the model picker -->
  <SessionHeader
    onBack={handleBack}
    {onInbox}
    {onReview}
    {theme}
    {onThemeChange}
    {runtimeControls}
    {sheetOpen}
    onOpenModelSheet={() => openSheet('model', headerTrigger)}
    bind:modelTriggerRef={headerTrigger}
    {sessionId}
    slashCommandNames={slashCommandNames}
    onRefreshSession={refreshSession}
    onOpenTranscript={openTranscript}
    onForwardSlash={forwardSlash}
  />

  <!-- Status line: agent dot, status label, and the updated (or "reconnecting") time -->
  <div class="session--statusline" role="status" aria-live="polite">
    <span class={`agent--dot agent--${status}`} aria-hidden="true">
      <SessionStateIcon {status} />
    </span>
    <span class="session--status-label">{sessionStatusLabel(status)}</span>
    {#if transcript.updatedAt !== null}
      <span class="session-status-time">
        · {isStale ? 'reconnecting' : relativeTime(transcript.updatedAt)}
      </span>
    {/if}
  </div>

  <!-- A transcript error stays visible beside a held thread; named load states own empty reads. -->
  {#if transcriptLoadView.showThread && transcript.error !== null}
    <div class="inline-alert">{transcript.error}</div>
  {/if}
  {#if transcriptLoadView.showThread && transcript.awaitingSnapshot}
    <div class="barrier-note">
      Reconciliation barrier active. Waiting for a fresh snapshot.
    </div>
  {/if}
  {#if transcriptLoadView.showThread && transcript.source === 'cache' && connection !== 'live'}
    <div class="barrier-note">
      Showing saved messages / reconnecting…
    </div>
  {/if}

  <!-- Plan-ready card: shown when a plan is live and reviewable -->
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

  <!-- Transcript: the message stream, a held thread across reload, or a named load state -->
  <ArtifactViewerProvider>
    {#if transcriptLoadView.showThread}
      <TranscriptList
        {sessionId}
        blocks={transcriptLoadView.blocks}
        running={running}
        canAnswer={connection === 'live' && !transcript.awaitingSnapshot}
        {askQuestionPrincipal}
        {todoProjection}
        onRefreshTodos={() => {
          dispatchTodoProjection({ type: 'refreshRequested' });
          todoRefreshGeneration += 1;
        }}
        onClearTodoAnnouncement={() => dispatchTodoProjection({ type: 'clearAnnouncement' })}
        onElapsedLabelChange={updateElapsedLabel}
      />
    {:else}
      <TranscriptLoadPanel
        view={transcriptLoadView}
        {...(transcriptLoadView.retryable ? { onRetry: refreshSession } : {})}
      />
    {/if}
  </ArtifactViewerProvider>

  <!-- Runtime strip: model and effort controls, just above the composer -->
  <RuntimeStrip
    controls={runtimeControls}
    {sheetOpen}
    onOpenEffortSheet={() => openSheet('effort', stripTrigger)}
    bind:effortTriggerRef={stripTrigger}
  />

  <!-- Recent sessions: the local quick-switcher stays between the transcript and composer. -->
  <DockRecentSessions {sessionId} />

  <!-- Composer: the prompt input with its send / stop / slash actions -->
  <!-- Assertive a11y channel for send failures, cleared on the next accepted write. -->
  {#if paintedPromptError !== null}
    <div
      aria-live="assertive"
      aria-atomic="true"
      class="sr-only"
      data-send-error-announcer="true"
    >{paintedPromptError.message}</div>
  {/if}
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
      {inputLock}
      awaitingSnapshot={transcript.awaitingSnapshot}
      {sendingPrompt}
      {stopping}
      promptError={paintedPromptError?.message ?? null}
      {runtimeControls}
      catalog={commandCatalog}
      {binding}
      {slashSubmitting}
      {runtimeAuthority}
      {runtimeRunning}
      onInsertCommand={insertCommand}
      externalOverlayOpen={sheetOpen}
      {mediaCapability}
      onOpenModelEffort={(section) => {
        sheetSection = section;
        sheetOpen = true;
      }}
      onAttachmentSubmitted={() => {
        promptError = null;
        failedSendRetry = null;
        binding = null;
      }}
    />
  </AttachmentDraftProvider>

  <!-- Overlay sheets: review a plan, leave plan mode, and pick model / effort -->
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

<style>
  /* Only the status line, its label, and the agent dot live here — this component
     renders them directly, so they move with it. The page frame (.session--view),
     the shared alerts (.inline-alert / .barrier-note), and the pulsing running-dot
     group are shared with other screens, so they stay in app.css. Values unchanged. */

  /* Page frame: gutter + safe bottom inset, shared by the routed screens. */
  .session--view {
    padding: var(--space-8) var(--page-gutter) max(var(--space-16), env(safe-area-inset-bottom));
  }

  @media (max-width: 39rem) {
    .session--view {
      padding-top: var(--space-6);
    }
  }

  /* Safe inline gutters for notched displays. */
  .session--view {
    padding-inline-start: max(var(--page-gutter), env(safe-area-inset-left, 0px));
    padding-inline-end: max(var(--page-gutter), env(safe-area-inset-right, 0px));
  }

  /* Status line — active or reconnecting; errors show via .inline-alert instead. */
  .session--statusline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding-block: var(--space-2) var(--space-1);
    color: var(--ink-muted);
    font-size: 0.75rem;
  }

  /* Status text. */
  .session--status-label {
    font-weight: 600;
  }

  /* Agent status dot. */
  .agent--dot {
    display: inline-grid;
    place-items: center;
    width: 0.95rem;
    height: 0.95rem;
    color: var(--ink-muted);
  }

  /* Running: tint the dot with the accent colour. */
  .agent--dot.agent--running {
    color: var(--accent);
  }
</style>
