<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Session Composer (Claude-style input tray)
  // ───────────────────────────────────────────────────────────────────
  // One bottom-anchored composer object. The four agent controls (model,
  // effort, Build/Plan, slash commands) live in a "+" tools popover instead
  // of stacked rows in the reading path, and the primary action is a single
  // circular button that morphs across send / steer / stop / sending —
  // never a full-width bar. Every affordance is capability-gated: there is
  // no voice/mic control because speech capture is not implemented, and no
  // decorative disabled actions. Runtime labels stay host-confirmed.
  //
  // The inline slash surface rides on top of the same tray. The textarea
  // stays the only editing field and keeps DOM focus; Enter and the primary
  // action route between local Insert (panel open) and native multiline/send
  // (panel closed), and no panel interaction can ever reach submission.

  import type { RuntimeControls } from '../../runtime.js';
  import type { HostCommandCatalogState, SelectedCommandBinding } from '../../commands.js';
  import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';

  export interface SessionComposerProps {
    readonly sessionId?: string;
    readonly sessionEpoch?: string | null;
    readonly expectedPromptRevision?: number | null;
    readonly prompt: string;
    readonly setPrompt: (updater: (current: string) => string) => void;
    readonly onDraftChange: (value: string) => void;
    readonly sendPrompt: (behavior?: 'steer' | 'followUp') => void;
    /** The explicit slash submission lane; Enter/Send routes here for slash drafts. */
    readonly sendSlashDraft: () => void;
    readonly stopRun: () => void;
    readonly canSubmit: boolean;
    readonly status: 'idle' | 'running' | 'interrupted' | 'unknown';
    readonly connection: string;
    readonly awaitingSnapshot: boolean;
    readonly sendingPrompt: boolean;
    readonly stopping: boolean;
    readonly promptError: string | null;
    readonly runtimeControls: RuntimeControls;
    readonly catalog: HostCommandCatalogState;
    /** The current draft's binding, or null while none exists for this draft. */
    readonly binding: SelectedCommandBinding | null;
    /** True while one explicit slash Send is revalidating at the relay. */
    readonly slashSubmitting: boolean;
    /** Host-confirmed running/plan snapshot present (never guessed). */
    readonly runtimeAuthority: boolean;
    /** Authoritative host running state from the runtime snapshot. */
    readonly runtimeRunning: boolean;
    readonly onInsertCommand: (name: string, binding: SelectedCommandBinding) => void;
    /** True while an outside overlay (the shared model/effort sheet) is open. */
    readonly externalOverlayOpen?: boolean;
    /** Host capability fixture; production callers keep this disabled until enablement. */
    readonly mediaCapability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
    readonly onAttachmentSubmitted?: () => void;
  }

  const MAX_TRAY_HEIGHT_PX = 140;
</script>

<script lang="ts">
  import { untrack } from 'svelte';

  import ComposerCommandAutocomplete, {
    SLASH_LISTBOX_ID,
    deriveSlashPanelState,
    hasRows,
    type SlashPanelDerivation,
  } from './ComposerCommandAutocomplete.svelte';
  import ComposerTools from './ComposerTools.svelte';
  import PlanModeButton from './PlanModeButton.svelte';
  import LeavePlanSheet from './LeavePlanSheet.svelte';
  import AttachmentRail from '../attachments/AttachmentRail.svelte';
  import AttachmentPreviewDialog from '../attachments/AttachmentPreviewDialog.svelte';
  import { getAttachmentDraft } from '../attachments/AttachmentDraftProvider.svelte';
  import { capabilityAllowsPhotos } from '../../attachments/attachment-state.js';
  import { useAttachmentSubmission } from '../attachments/useAttachmentSubmission.svelte.js';
  import { rankHostCommands } from '../../rankHostCommands.js';
  import { bindingFor } from '../../commands.js';
  import { insertSlashCommand } from '../../insertSlashCommand.js';
  import { deriveSlashTrigger, slashDismissalSignature } from '../../useSlashTrigger.js';
  import { modeAuthority } from '../../runtime.js';
  import { readComposerShiftTabPreference, writeComposerShiftTabPreference } from '../../state.js';
  import { createPlanModeShortcut } from '../planModeShortcut.js';
  import Button from '../primitives/Button.svelte';

  let {
    sessionId = 'session_local',
    sessionEpoch = null,
    expectedPromptRevision = null,
    prompt,
    setPrompt,
    onDraftChange,
    sendPrompt,
    sendSlashDraft,
    stopRun,
    canSubmit,
    status,
    connection,
    awaitingSnapshot,
    sendingPrompt,
    stopping,
    promptError,
    runtimeControls,
    catalog,
    binding,
    slashSubmitting,
    runtimeAuthority,
    runtimeRunning,
    onInsertCommand,
    externalOverlayOpen = false,
    mediaCapability = null,
    onAttachmentSubmitted,
  }: SessionComposerProps = $props();

  // The textarea is the ONLY editing field; the refs below own DOM nodes.
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let trayEl = $state<HTMLFormElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let modeButtonEl = $state<HTMLButtonElement | null>(null);
  // Non-DOM ref: a plain closure variable, never reactive.
  let pendingCaretRef: number | null = null;

  let announcement = $state('');
  // Editing facts the trigger predicate consumes. The textarea remains the
  // only editing field; everything below is derived, never a second editor.
  let selection = $state({ start: 0, end: 0 });
  let isFocused = $state(false);
  let isComposing = $state(false);
  let dismissedSignature = $state<string | null>(null);
  let toolsOpen = $state(false);
  let activeName = $state<string | null>(null);
  let commitPending = $state(false);
  // Outside-press dismissal without an Escape latch: any later draft,
  // caret, or textarea interaction re-arms the surface.
  let outsideDismissed = $state(false);

  // The persistent mode control: a controlled menu (the keyboard path opens
  // it) and the Plan → Build leave confirmation. Neither holds authority;
  // the leave sheet is the only path that can lead to a Build mutation.
  let modeMenuOpen = $state(false);
  let leavePlanOpen = $state(false);
  let shiftTabEnabled = $state(readComposerShiftTabPreference());

  // The attachment hooks are the ported context/factory; called at top level.
  const attachmentDraft = getAttachmentDraft();
  const attachmentSubmission = useAttachmentSubmission(() => ({
    sessionId,
    sessionEpoch,
    expectedPromptRevision,
    prompt,
    connection,
    mediaEnabled: mediaAvailable,
    modelCanViewPhotos: attachmentDraft.state.modelCanViewPhotos,
    runtimeAuthority: runtimeAuthority && runtimeControls.runtime.status === 'ready',
    onSubmitted: () => {
      setPrompt(() => '');
      onAttachmentSubmitted?.();
    },
  }));

  // A turn is running when either the relay session card or the host-
  // confirmed runtime snapshot says so; both are authoritative sources and
  // the OR is deliberately conservative for the slash gate.
  const running = $derived(status === 'running' || runtimeRunning);
  // A leading-slash draft is a command draft: it must never fall through to
  // the ordinary text lane, and never convert to steer/followUp.
  const slashDraft = $derived(prompt.trim().startsWith('/'));
  const mediaAvailable = $derived(capabilityAllowsPhotos(mediaCapability));
  const attachmentCanSubmit = $derived(!mediaAvailable || attachmentDraft.canSubmit);
  const hasText = $derived(prompt.trim().length > 0);
  const hasAttachments = $derived(attachmentDraft.hasAttachments);
  const slashSendable = $derived(
    slashDraft && binding !== null && runtimeAuthority && !running && canSubmit && !slashSubmitting,
  );
  const effectiveSlashSendable = $derived(slashSendable && attachmentCanSubmit);
  const attachmentSendable = $derived.by(
    () =>
      mediaAvailable &&
      hasAttachments &&
      attachmentCanSubmit &&
      !attachmentSubmission.busy &&
      attachmentSubmission.state.phase !== 'delivery-unknown' &&
      connection === 'live' &&
      !awaitingSnapshot,
  );
  const canSendMessage = $derived(hasAttachments ? attachmentSendable : canSubmit);

  // The leading-slash trigger predicate (pure); re-evaluated after every
  // committed input without side effects.
  const trigger = $derived.by(
    () =>
      deriveSlashTrigger({
        draft: prompt,
        selectionStart: selection.start,
        selectionEnd: selection.end,
        isFocused,
        isComposing,
        dismissedSignature,
      }),
  );
  const panelOpen = $derived(trigger.active && !toolsOpen);
  const effectivePanelOpen = $derived(panelOpen && !outsideDismissed);

  const ranked = $derived.by(() =>
    rankHostCommands(catalog.commands, trigger.query, { activeName }),
  );

  // The one panel state machine, shared with the presentation layer so the
  // composer's aria wiring and the panel render the same derived state.
  const panelDerivation: SlashPanelDerivation = $derived.by(
    () =>
      deriveSlashPanelState({
        triggerActive: trigger.active,
        query: trigger.query,
        draftStartsWithSlash: prompt.startsWith('/'),
        commitPending,
        catalogStatus: catalog.status,
        snapshotPresent: catalog.snapshot !== null,
        catalogCount: catalog.commands.length,
        matchCount: ranked.items.length,
        running,
      }),
  );
  const rowsVisible = $derived(
    effectivePanelOpen && hasRows(panelDerivation.panelState) && ranked.items.length > 0,
  );

  const activeRow = $derived(ranked.items.some((item) => item.name === activeName && item.enabled));

  // Stop is the primary action only when a turn is running and the draft is empty;
  // any draft makes the primary Send (idle) or Steer (running). With the inline
  // surface open, the disc becomes the local Insert action — never Send.
  const showStop = $derived(running && !hasText && !hasAttachments && !attachmentSubmission.busy);

  // Plan mode is conveyed redundantly: the dashed outline only ever comes
  // from the host-confirmed mode, never from a pending request.
  const confirmedMode = $derived(modeAuthority(runtimeControls.runtime).confirmedMode);
  const trayOutlineClass = $derived(
    confirmedMode === 'plan'
      ? ' is-plan-mode'
      : confirmedMode === 'executing-plan'
        ? ' is-executing-mode'
        : '',
  );

  const placeholder = $derived(
    connection !== 'live'
      ? 'Reconnect to send'
      : running
        ? 'Steer Pi, or send after this turn'
        : 'Reply to Pi',
  );

  // Bounded revalidation progress lives in the composer disclaimer; it is a
  // fixed local string and never carries command content.
  const disclaimer = $derived.by(() => {
    if (attachmentSubmission.statusMessage !== null) return attachmentSubmission.statusMessage;
    if (slashSubmitting) return 'Checking the command with the relay…';
    if (awaitingSnapshot) return 'Syncing with the relay…';
    if (slashDraft) {
      if (binding === null) return 'Choose a command from the list, then send it.';
      if (running) return 'Pi is running — commands can be sent after this turn ends.';
      if (runtimeAuthority) return 'Pi can make mistakes · actions stay read-only';
      return 'Reconnecting to check what can be sent.';
    }
    return 'Pi can make mistakes · actions stay read-only';
  });

  // Composer-scoped mode keyboard: Shift+Tab (preference-gated) and ⌘⇧M.
  // The overlay set covers every surface that must keep reverse-tab normal:
  // the slash panel, the tools popover, the leave sheet, and any sheet the
  // app opens above the composer. Rebuild the handler with current values so
  // the closure always sees live state (the factory reads them at creation).
  const planShortcut = $derived.by(() => {
    const enabled = shiftTabEnabled;
    const overlayOpen = effectivePanelOpen || toolsOpen || leavePlanOpen || externalOverlayOpen;
    const runtime = runtimeControls.runtime;
    const conn = connection;
    return createPlanModeShortcut({
      enabled,
      overlayOpen,
      getComposer: () => textareaEl,
      runtime,
      connection: conn,
      onRequestPlan: () => void runtimeControls.setMode('plan'),
      onRequestBuildExit: () => {
        leavePlanOpen = true;
      },
      onOpenMenu: () => {
        modeMenuOpen = true;
      },
      onAnnounce: (message) => {
        announcement = message;
      },
    });
  });

  // Draft recovery (sessionStorage); media bytes are never placed in storage.
  $effect(() => {
    if (prompt.length !== 0) return;
    const key = `pi-remote.attachment-text-recovery.${sessionId}`;
    try {
      const recovered = sessionStorage.getItem(key);
      if (recovered !== null) {
        sessionStorage.removeItem(key);
        setPrompt(() => recovered);
        announcement = 'Draft restored. Photos need to be attached again.';
      }
    } catch {
      // Draft recovery is optional; media bytes are never placed in storage.
    }
  });

  // Attachment-text-recovery: save the text on pagehide while photos are staged.
  $effect(() => {
    if (!hasAttachments || prompt.length === 0) return;
    const key = `pi-remote.attachment-text-recovery.${sessionId}`;
    const saveTextOnly = () => {
      try {
        sessionStorage.setItem(key, prompt);
      } catch {
        // The local draft remains in memory when session storage is unavailable.
      }
    };
    window.addEventListener('pagehide', saveTextOnly);
    return () => window.removeEventListener('pagehide', saveTextOnly);
  });

  $effect(() => {
    writeComposerShiftTabPreference(shiftTabEnabled);
  });

  // Adopt the ranked active row (first enabled, or the retained name when
  // still visible); virtual focus resets when the panel closes.
  $effect(() => {
    const open = panelOpen;
    const next = ranked.activeName;
    if (!open) {
      activeName = null;
      return;
    }
    untrack(() => {
      if (next !== activeName) activeName = next;
    });
  });

  // Outside-press dismissal: taps outside the panel, the textarea, and the
  // tray close the surface; the tapped target keeps its normal behavior.
  $effect(() => {
    if (!panelOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target === null) return;
      if (panelEl?.contains(target)) return;
      if (textareaEl?.contains(target)) {
        outsideDismissed = false;
        return;
      }
      if (trayEl?.contains(target)) return;
      outsideDismissed = true;
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  });

  // Any draft or caret change re-arms the surface after an outside dismissal.
  $effect(() => {
    void prompt;
    void selection.start;
    void selection.end;
    outsideDismissed = false;
  });

  // Caret placement runs after the controlled draft has rendered, so the
  // textarea DOM already contains the inserted token when the range is set.
  $effect(() => {
    void prompt;
    const offset = pendingCaretRef;
    if (offset === null) return;
    pendingCaretRef = null;
    const element = textareaEl;
    if (element === null) return;
    element.focus({ preventScroll: true });
    element.setSelectionRange(offset, offset);
  });

  // The committing state lasts one render after the draft update.
  $effect(() => {
    void prompt;
    commitPending = false;
  });

  function grow(): void {
    const element = textareaEl;
    if (element === null) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_TRAY_HEIGHT_PX)}px`;
  }

  // Explicit send routing: a slash draft goes through the ticketed slash
  // lane (or fails closed with a disclosed reason); ordinary drafts keep
  // the unchanged send/steer behavior. A slash draft is never converted to
  // steer/followUp and never falls back to the text lane.
  // @ds guardrail: mutation path — submit / steer / stop / snapshot / slash-draft / attachment
  // flow; presentation may not reach past here.
  function submit(): void {
    if (!attachmentCanSubmit) {
      announcement = attachmentDraft.blockingMessage ?? 'Finish checking the selected photos first.';
      return;
    }
    if (slashDraft) {
      if (!effectiveSlashSendable) {
        announcement =
          binding === null
            ? 'Choose a command from the list, then send it.'
            : running
              ? 'Pi is running — commands can be sent after this turn ends.'
              : 'Reconnecting to check what can be sent.';
        return;
      }
      announcement = 'Checking the command before sending…';
      sendSlashDraft();
      return;
    }
    if (hasAttachments) {
      if (!attachmentSubmission.submit(running ? 'steer' : undefined)) {
        announcement = attachmentSubmission.state.error ?? 'Photo sending is not ready.';
      }
      return;
    }
    sendPrompt(running ? 'steer' : undefined);
  }

  // The palette path appends at the draft end (shared insertion reducer).
  function insertCommand(name: string, commandBinding: SelectedCommandBinding): void {
    const result = insertSlashCommand({
      draft: prompt,
      selectionStart: 0,
      selectionEnd: 0,
      commandName: name,
      binding: commandBinding,
      replaceRange: { start: prompt.length, end: prompt.length },
    });
    pendingCaretRef = result.caretOffset;
    setPrompt(() => result.draft);
    announcement = result.announcement;
    onInsertCommand(name, commandBinding);
  }

  // The inline path replaces the complete leading token. Both routes run
  // through insertSlashCommand, record the revision binding, announce the
  // "Not sent" outcome, and perform zero network work.
  function insertCommandAtToken(name: string, commandBinding: SelectedCommandBinding): void {
    const result = insertSlashCommand({
      draft: prompt,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      commandName: name,
      binding: commandBinding,
      replaceRange: { start: trigger.tokenStart, end: trigger.tokenEnd },
    });
    pendingCaretRef = result.caretOffset;
    commitPending = true;
    setPrompt(() => result.draft);
    announcement = result.announcement;
    onInsertCommand(name, commandBinding);
    activeName = null;
  }

  function insertActiveRow(): void {
    if (activeName === null || !activeRow) {
      announcement = 'No command selected.';
      return;
    }
    // Bindings only exist inside the current scoped snapshot; anything else
    // fails closed without touching the draft.
    const rowBinding = bindingFor(catalog.snapshot, activeName);
    if (rowBinding === null) {
      announcement = 'No command selected.';
      return;
    }
    insertCommandAtToken(activeName, rowBinding);
  }

  function moveActive(direction: 1 | -1): void {
    const enabledNames = ranked.items.filter((item) => item.enabled).map((item) => item.name);
    if (enabledNames.length === 0) return;
    const current = activeName;
    const index = current === null ? -1 : enabledNames.indexOf(current);
    const next = index + direction;
    if (next < 0 || next >= enabledNames.length) return; // no wrap
    activeName = enabledNames[next] ?? null;
  }

  // @ds guardrail: react-aria + keyboard wiring — onKeyDown: IME early-return (isComposing),
  // planShortcut(event) consume, panel-open Arrow/Enter/Escape routing (Enter inserts the active
  // row + stopPropagation so it never submits; Shift+Enter native newline; Escape sets the
  // dismissal signature), and closed-panel Enter→submit. Byte-identical.
  function onKeyDown(event: KeyboardEvent): void {
    // IME composition owns every key: no filtering, insertion, or submit.
    if (isComposing) return;
    // The mode shortcut consumes Shift+Tab and ⌘⇧M only when every guard
    // passes; otherwise the key keeps its ordinary behavior below.
    if (planShortcut(event)) return;
    if (effectivePanelOpen) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveActive(1);
          return;
        case 'ArrowUp':
          event.preventDefault();
          moveActive(-1);
          return;
        case 'Enter':
          if (event.shiftKey) return; // native newline; the predicate closes the panel
          event.preventDefault();
          event.stopPropagation(); // never reaches form submission
          insertActiveRow();
          return;
        case 'Escape':
          event.preventDefault();
          dismissedSignature = slashDismissalSignature(prompt, selection.start);
          return;
        default:
          return; // typing filters locally; Left/Right and editing stay native
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }
</script>

<!-- @ds surface: composer — the presentational seam. The tray and its slots below stay
     presentation-only; the keyboard-anchor vars (--visual-viewport-height / --trigger-width)
     feed layout unchanged. -->
<!-- @ds guardrail: send / steer / stop / snapshot / prompt-submission and the keyboard
     anchoring hook stay fenced; presentation may not reach past them. -->
<div class="composer-region">
  {#if promptError !== null}<div class="inline-alert">{promptError}</div>{/if}
  <p class="composer-disclaimer">{disclaimer}</p>
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {announcement}
  </div>
  <form
    bind:this={trayEl}
    class={`composer-tray${trayOutlineClass}`}
    onsubmit={(event) => {
      event.preventDefault();
      if (showStop) return;
      submit();
    }}
  >
    {#if mediaAvailable}<AttachmentRail />{/if}
    {#if mediaAvailable && attachmentDraft.blockingMessage !== null}
      <p class="attachment-draft-message" aria-live="polite">
        {attachmentDraft.blockingMessage}
      </p>
    {/if}
    <ComposerCommandAutocomplete
      {prompt}
      open={effectivePanelOpen}
      derivation={panelDerivation}
      {activeName}
      items={ranked.items}
      {catalog}
      {running}
      getAnchor={() => trayEl}
      bind:panelRef={panelEl}
      onInsert={(name) => {
        const commandBinding = bindingFor(catalog.snapshot, name);
        if (commandBinding === null) {
          announcement = 'No command selected.';
          return;
        }
        insertCommandAtToken(name, commandBinding);
      }}
      onDisabledPress={(reason) => {
        announcement = reason;
      }}
      onRetry={() => void catalog.refresh('manual')}
      onAnnounce={(message) => {
        announcement = message;
      }}
    />
    <!-- @ds slot: input — the single editing field. -->
    <!-- svelte-ignore a11y_role_supports_aria_props_implicit -->
    <textarea
      bind:this={textareaEl}
      id="session-prompt"
      class="composer-input"
      aria-label="Message Pi"
      aria-autocomplete="list"
      aria-expanded={effectivePanelOpen ? true : undefined}
      aria-controls={effectivePanelOpen && rowsVisible ? SLASH_LISTBOX_ID : undefined}
      aria-activedescendant={
        effectivePanelOpen && activeRow ? `slash-option-${activeName}` : undefined
      }
      value={prompt}
      rows={1}
      oninput={(event) => {
        onDraftChange(event.currentTarget.value);
        grow();
      }}
      onselect={(event) =>
        (selection = {
          start: event.currentTarget.selectionStart,
          end: event.currentTarget.selectionEnd,
        })}
      onfocus={() => {
        isFocused = true;
        dismissedSignature = null;
      }}
      onblur={() => (isFocused = false)}
      oncompositionstart={() => (isComposing = true)}
      oncompositionend={() => {
        // Composition re-evaluation resumes on the next event-loop turn
        // so the committed value is what the predicate sees.
        window.setTimeout(() => (isComposing = false), 0);
      }}
      onkeydown={onKeyDown}
      disabled={
        connection !== 'live' ||
        awaitingSnapshot ||
        sendingPrompt ||
        slashSubmitting ||
        attachmentSubmission.busy
      }
      {placeholder}
    ></textarea>
    <div class="composer-bar">
      <div class="composer-left">
        <ComposerTools
          {runtimeControls}
          {catalog}
          onInsert={insertCommand}
          onOpenChange={(open) => (toolsOpen = open)}
          {mediaAvailable}
          onFilesSelected={(files) => {
            attachmentDraft.selectFiles(files);
            toolsOpen = false;
          }}
          {shiftTabEnabled}
          onShiftTabPreferenceChange={(enabled) => (shiftTabEnabled = enabled)}
        />
        <PlanModeButton
          runtime={runtimeControls.runtime}
          {connection}
          isOpen={modeMenuOpen}
          onOpenChange={(open) => (modeMenuOpen = open)}
          onSelectPlan={() => void runtimeControls.setMode('plan')}
          onSelectBuild={() => (leavePlanOpen = true)}
          bind:buttonRef={modeButtonEl}
        />
      </div>
      <div class="composer-right">
        <!-- @ds slot: primary-action — the single morphing disc (send/steer/stop/sending). -->
        {#if running && (hasText || hasAttachments) && !slashDraft}
          <Button
            type="button"
            class="composer-later"
            onclick={() => {
              if (hasAttachments) attachmentSubmission.submit('followUp');
              else sendPrompt('followUp');
            }}
            disabled={!canSendMessage || attachmentSubmission.busy}
          >
            Later
          </Button>
        {/if}
        {#if showStop}
          <Button
            type="button"
            class="composer-primary is-stop"
            aria-label="Stop the current turn"
            onclick={stopRun}
            disabled={stopping || connection !== 'live'}
          >
            {@render stopGlyph()}
          </Button>
        {:else if effectivePanelOpen}
          <Button
            type="button"
            class="composer-primary is-send"
            aria-label="Insert command"
            disabled={!activeRow}
            onpointerdown={(event) => event.preventDefault()}
            onclick={() => {
              if (activeRow) insertActiveRow();
            }}
          >
            {@render sendGlyph()}
          </Button>
        {:else if slashDraft}
          <Button
            type="submit"
            class="composer-primary is-send"
            aria-label="Send command"
            disabled={!effectiveSlashSendable}
          >
            {#if slashSubmitting}{@render spinnerGlyph()}{:else}{@render sendGlyph()}{/if}
          </Button>
        {:else}
          <Button
            type="submit"
            class="composer-primary is-send"
            aria-label={running ? 'Steer the current turn' : 'Send message'}
            disabled={!canSendMessage || attachmentSubmission.busy}
          >
            {#if sendingPrompt || attachmentSubmission.busy}
              {@render spinnerGlyph()}
            {:else}
              {@render sendGlyph()}
            {/if}
          </Button>
        {/if}
      </div>
    </div>
  </form>
  {#if mediaAvailable}<AttachmentPreviewDialog />{/if}
  <LeavePlanSheet
    isOpen={leavePlanOpen}
    onOpenChange={(open) => (leavePlanOpen = open)}
    onSwitchToBuild={() => {
      leavePlanOpen = false;
      void runtimeControls.setMode('build');
    }}
    triggerRef={modeButtonEl}
  />
</div>

{#snippet sendGlyph()}
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path
      d="M12 19V5M12 5l-6 6M12 5l6 6"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/snippet}

{#snippet stopGlyph()}
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
  </svg>
{/snippet}

{#snippet spinnerGlyph()}
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    aria-hidden="true"
    focusable="false"
    class="composer-spinner"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      opacity="0.25"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
    />
  </svg>
{/snippet}

<!-- @ds surface: composer — the input island. Decomposed from style.css; the composer-region /
     composer-disclaimer / composer-input / composer-bar / composer-left / composer-right /
     attachment-draft-message owned rules move with it. Child-primitive classes
     (composer-tray / composer-primary / composer-later / composer-spinner) and the shared 44px
     target / prefers-contrast / forced-colors / reduced-motion / clay-override / safe-area
     groups stay GLOBAL in style.css (they are shared grouped selectors — moving them into scope
     would reverse the cascade against those global overrides). Values unchanged. -->
<style>
  /* @ds state: promptError — inline-alert rendered above the tray (shared error surface). */
  /* @ds edit: layout — sticky bottom-anchor + canvas fade; the keyboard-anchor
     --visual-viewport-height var feeds the anchor and stays the layout input. */
  .composer-region {
    position: sticky;
    z-index: 5;
    bottom: 0;
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding-bottom: max(var(--space-3), env(safe-area-inset-bottom));
    padding-inline-start: max(var(--space-3), env(safe-area-inset-left, 0px));
    padding-inline-end: max(var(--space-3), env(safe-area-inset-right, 0px));
    background: linear-gradient(to top, var(--canvas) 66%, transparent);
  }

  /* @ds surface: composer — the input island. */
  /* @ds edit: layout — tray geometry; safe gutters are token-driven. */
  .composer-tray {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: 1.75rem;
    background: var(--surface);
    box-shadow: var(--shadow-raised);
  }

  /* Dashed Plan outline: host-confirmed only; execution is solid. */
  .composer-tray.is-plan-mode {
    border-style: dashed;
    border-color: var(--line-strong);
  }

  .composer-tray.is-executing-mode {
    border-color: var(--line-strong);
  }

  /* ── Installed-PWA safe-area hardening ───────────────────────────────
     With viewport-fit=cover the layout extends under the notch and rounded
     corners in landscape; interactive islands keep clear of the insets while
     portrait (all-zero insets) renders exactly as before. */
  .composer-tray {
    margin-inline: max(0px, env(safe-area-inset-left)) max(0px, env(safe-area-inset-right));
  }

  .composer-tray {
    min-inline-size: 0;
    margin-inline-start: max(0px, env(safe-area-inset-left, 0px));
    margin-inline-end: max(0px, env(safe-area-inset-right, 0px));
  }

  .composer-disclaimer {
    margin: 0;
    padding-inline: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.75rem;
    text-align: center;
  }

  /* @ds slot: input — the single editing field; colour/type stay token-driven. */
  .composer-input {
    width: 100%;
    min-height: 1.75rem;
    max-height: 140px;
    padding: var(--space-2) var(--space-2) var(--space-1);
    border: 0;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 1.0625rem;
    line-height: 1.5;
    resize: none;
  }

  .composer-input:focus {
    outline: none;
  }

  /* @ds state: awaitingSnapshot · sendingPrompt · slashSubmitting — the input is
     disabled while the composer is busy or syncing (plus a non-live connection). */
  .composer-input:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .composer-input::placeholder {
    color: var(--ink-muted);
  }

  .composer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .composer-left,
  .composer-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .attachment-draft-message {
    margin: 0;
    padding-inline: var(--space-2);
    color: var(--ink-muted);
    font-family: var(--font-display);
    font-size: 0.84rem;
    line-height: 1.35;
  }

  /* @ds slot: primary-action — the single circular morphing disc (send/steer/stop/sending).
     The class is passed to the Button primitive, so Svelte cannot hash it → :global. */
  :global(.composer-primary) {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    transition:
      background var(--duration-state, 120ms) var(--ease-out, ease),
      opacity var(--duration-state, 120ms) var(--ease-out, ease);
  }

  /* @ds state: send · steer — the morphing primary disc; steer shares this form. */
  :global(.composer-primary.is-send) {
    background: var(--accent);
    color: #fff;
  }

  :global(.composer-primary.is-send[data-hovered]) {
    background: var(--accent-strong);
  }

  /* @ds state: stop — the primary disc on the stop form (running, empty draft). */
  :global(.composer-primary.is-stop) {
    background: var(--action-bg);
    color: var(--action-fg);
  }

  /* @ds state: stopping · sending-inhibit — the disc's disabled affordance. */
  :global(.composer-primary[data-disabled]) {
    cursor: not-allowed;
    opacity: 0.4;
  }

  :global(.composer-primary[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* @ds state: later — the secondary "send after this turn" affordance (Button primitive → :global). */
  :global(.composer-later) {
    min-height: 2.25rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-secondary);
    font-size: 0.85rem;
    font-weight: 550;
    cursor: pointer;
  }

  :global(.composer-later[data-disabled]) {
    cursor: not-allowed;
    opacity: 0.4;
  }

  /* @ds surface: spinner — shared inline pending/busy indicator. */
  /* @ds state: sending · slashSubmitting — the disc's busy form.
     The SpinnerGlyph <svg> is rendered by this component → normally scoped. */
  .composer-spinner {
    animation: composer-spin 0.8s linear infinite;
  }

  /* @ds guardrail: reduced-motion keeps the shared spinner static — never remove. */
  @media (prefers-reduced-motion: reduce) {
    .composer-spinner {
      animation: none;
    }
  }

  /* Narrow widths give the mode control its own toolbar row above the
     textarea: the left group wraps so the label never truncates Plan ·
     read-only and the primary action stays on the first row. */
  @media (max-width: 400px) {
    .composer-bar {
      flex-wrap: wrap;
      row-gap: var(--space-1);
    }

    .composer-left {
      flex-wrap: wrap;
      row-gap: var(--space-1);
    }
  }

  /* @ds edit: layout — narrow reflow of the composer bar + ready/review card + sheets. */
  @media (max-width: 27rem) {
    .composer-bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }

    .composer-left {
      min-inline-size: 0;
      flex-wrap: wrap;
    }
  }
</style>
