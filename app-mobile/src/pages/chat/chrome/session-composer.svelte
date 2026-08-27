<script module lang="ts">
  // This module holds the shared Session Composer types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Session Composer (Claude-style input tray)
  // ───────────────────────────────────────────────────────────────────
  // Bottom composer: tools in "+" popover; slash overlay; host-confirmed runtime labels.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { RuntimeControls } from '$shared/state/runtime.js';
  import type { HostCommandCatalogState, SelectedCommandBinding } from '$shared/commands/commands.js';
  import type { RuntimeMediaCapabilityDto } from '@pi-remote/pi-rpc-protocol';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

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
    /** Request to open the model/effort picker sheet with the given initial section. */
    readonly onOpenModelEffort?: (section: 'model' | 'effort') => void;
    /** Host capability fixture; production callers keep this disabled until enablement. */
    readonly mediaCapability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
    readonly onAttachmentSubmitted?: () => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  const MAX_TRAY_HEIGHT_PX = 140;
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { untrack } from 'svelte';

  import ComposerCommandAutocomplete, {
    SLASH_LISTBOX_ID,
    deriveSlashPanelState,
    hasRows,
    type SlashPanelDerivation,
  } from './composer-command-autocomplete.svelte';
  import ComposerTools from './composer-tools.svelte';
  import PlanModeButton from './button-plan-mode.svelte';
  import LeavePlanSheet from './sheet-leave-plan.svelte';
  import AttachmentRail from '../attachments/attachment-rail.svelte';
  import AttachmentPreviewDialog from '../attachments/dialog-attachment-preview.svelte';
  import { getAttachmentDraft } from '../attachments/attachment-draft-provider.svelte';
  import { capabilityAllowsPhotos } from '../attachments/attachment-state.js';
  import { useAttachmentSubmission } from '../attachments/use-attachment-submission.svelte.js';
  import { rankHostCommands } from '$shared/commands/rank-host-commands.js';
  import { bindingFor } from '$shared/commands/commands.js';
  import { insertSlashCommand } from '$shared/commands/insert-slash-command.js';
  import { deriveSlashTrigger, slashDismissalSignature } from '$shared/commands/use-slash-trigger.js';
  import { modeAuthority } from '$shared/state/runtime.js';
  import { readComposerShiftTabPreference, writeComposerShiftTabPreference, recordPromptHistory } from '$shared/state/state.js';
  import PromptHistorySheet from './sheet-prompt-history.svelte';
  import { fileFromClipboardBlob } from '$shared/commands/paste-utils.js';
  import { createPlanModeShortcut } from '$shared/commands/plan-mode-shortcut.js';
  import Button from '$shared/primitives/button/button.svelte';
  import DictationOverlay from './dictation-overlay.svelte';
  import DictationSheet from './sheet-dictation.svelte';
  import { ACCIDENTAL_TAP_MS } from '$shared/chrome/dictation-capture.js';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

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
    onOpenModelEffort = undefined,
    mediaCapability = null,
    onAttachmentSubmitted,
  }: SessionComposerProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // The textarea is the ONLY editing field; the refs below own DOM nodes.
  let textareaEl = $state<HTMLTextAreaElement | null>(null);
  let trayEl = $state<HTMLFormElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let modeButtonEl = $state<HTMLButtonElement | null>(null);
  // Non-DOM refs: plain closure variables, never reactive.
  let pendingCaretRef: number | null = null;
  let capturedDraftBeforeSend: string | null = null;

  let announcement = $state('');
  // Selection/caret facts for the slash trigger; textarea remains the only editor.
  let selection = $state({ start: 0, end: 0 });
  let isFocused = $state(false);
  let isComposing = $state(false);
  let dismissedSignature = $state<string | null>(null);
  let toolsOpen = $state(false);
  let recallHistoryOpen = $state(false);
  let activeName = $state<string | null>(null);
  let commitPending = $state(false);
  // Outside dismiss re-arms on the next draft/caret/textarea interaction.
  let outsideDismissed = $state(false);

  // Mode menu + leave sheet; only the sheet can lead to a Build mutation.
  let modeMenuOpen = $state(false);
  let leavePlanOpen = $state(false);
  let shiftTabEnabled = $state(readComposerShiftTabPreference());

  // ───────────────────────────────────────────────────────────────────
  // Dictation state
  // ───────────────────────────────────────────────────────────────────

  let dictationOpen = $state(false);
  let dictationSheetOpen = $state(false);
  let dictationMode = $state<'toggle' | 'hold-to-talk'>('toggle');
  let dictationLang = $state('auto');
  let dictationAvailable = $state(false);
  let dictationEnabled = $state(true);
  let dictationOverlayEl = $state<{
    stopAndInsert: () => void;
    cancelTake: () => void;
  } | null>(null);
  let dictationEngineMessage = $state('');

  // Derive engine status: unavailable when unsupported or user-disabled.
  const dictationEngineStatus = $derived(
    !dictationAvailable || !dictationEnabled ? 'unavailable' : 'available',
  );

  // Check Web Speech availability on mount.
  $effect(() => {
    const SR = (
      window as unknown as Record<string, unknown>
    ).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    const available = typeof SR === 'function' && window.isSecureContext;
    dictationAvailable = available;
    dictationEngineMessage = available
      ? 'On-device dictation ready.'
      : 'Dictation is not available in this browser.';
  });

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

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Conservative OR: session card or host runtime may report running.
  const running = $derived(status === 'running' || runtimeRunning);
  // Leading-slash drafts never use the ordinary text send lane.
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
  const dictationActive = $derived(dictationOpen);

  // Pure slash trigger; re-evaluated on every committed input.
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

  // Shared panel state machine for aria wiring and presentation.
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

  // Plan outline follows host-confirmed mode only.
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

  // Disclaimer copy is bounded local strings, never command content.
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

  // Shift+Tab / ⌘⇧M shortcuts; overlay set blocks reverse-tab steal; factory reads live state.
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

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

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
    // Keep save text only focused on its single responsibility.
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

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    writeComposerShiftTabPreference(shiftTabEnabled);
  });

  // Sync virtual focus to ranked active row; clear when panel closes.
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

  // Outside taps close the panel; target keeps normal behavior.
  $effect(() => {
    if (!panelOpen) return;
    // Keep on pointer down focused on its single responsibility.
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

  // Caret runs after render so the inserted token is already in the DOM.
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

  // Restore the captured draft when the host rejects the send.
  $effect(() => {
    if (promptError !== null && capturedDraftBeforeSend !== null) {
      const draft = capturedDraftBeforeSend;
      capturedDraftBeforeSend = null;
      setPrompt(() => draft);
    }
  });

  // Clear the captured draft when the user edits the prompt or a send succeeds.
  $effect(() => {
    void prompt;
    if (promptError !== null) {
      capturedDraftBeforeSend = null;
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // Dictation handlers
  // ───────────────────────────────────────────────────────────────────

  // Keep handle dictation tap focused on its single responsibility.
  async function handleDictationTap(): Promise<void> {
    if (!dictationAvailable || !dictationEnabled) {
      dictationSheetOpen = true;
      return;
    }
    if (dictationOpen) {
      dictationOverlayEl?.stopAndInsert();
      return;
    }
    // The overlay owns getUserMedia — no pre-check needed.
    dictationOpen = true;
  }

  // Keep handle dictation press focused on its single responsibility.
  function handleDictationPress(): void {
    if (!dictationAvailable || !dictationEnabled) {
      dictationSheetOpen = true;
      return;
    }
    if (dictationOpen) return;
    dictationOpen = true;
  }

  // Keep handle dictation release focused on its single responsibility.
  function handleDictationRelease(_event: PointerEvent, holdDurationMs: number): void {
    if (!dictationOpen) return;
    if (holdDurationMs < ACCIDENTAL_TAP_MS) {
      // Accidental tap — cancel quietly.
      dictationOverlayEl?.cancelTake();
    } else {
      dictationOverlayEl?.stopAndInsert();
    }
  }

  // Keep handle dictation close focused on its single responsibility.
  function handleDictationClose(): void {
    dictationOpen = false;
  }

  // Keep handle dictation toggle focused on its single responsibility.
  function handleDictationToggle(enabled: boolean): void {
    dictationEnabled = enabled;
    if (!enabled) {
      dictationEngineMessage = 'Dictation is off.';
    } else if (dictationAvailable) {
      dictationEngineMessage = 'On-device dictation ready.';
    }
  }

  // Keep handle dictation lang change focused on its single responsibility.
  function handleDictationLangChange(lang: string): void {
    dictationLang = lang;
  }

  // Slash drafts use the ticketed lane; ordinary drafts keep send/steer routing.
  // Do not edit — Mutation path — Submit / steer / stop / snapshot / slash-draft / attachment flow; presentation may not reach past here.
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
    capturedDraftBeforeSend = prompt;
    if (canSubmit) {
      recordPromptHistory(prompt);
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

  // Inline path replaces the leading token via insertSlashCommand (no network).
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

  // Keep insert active row focused on its single responsibility.
  function insertActiveRow(): void {
    if (activeName === null || !activeRow) {
      announcement = 'No command selected.';
      return;
    }
    // Binding must match the scoped snapshot.
    const rowBinding = bindingFor(catalog.snapshot, activeName);
    if (rowBinding === null) {
      announcement = 'No command selected.';
      return;
    }
    insertCommandAtToken(activeName, rowBinding);
  }

  // Keep move active focused on its single responsibility.
  function moveActive(direction: 1 | -1): void {
    const enabledNames = ranked.items.filter((item) => item.enabled).map((item) => item.name);
    if (enabledNames.length === 0) return;
    const current = activeName;
    const index = current === null ? -1 : enabledNames.indexOf(current);
    const next = index + direction;
    if (next < 0 || next >= enabledNames.length) return; // no wrap
    activeName = enabledNames[next] ?? null;
  }

  // Do not edit — React-aria + keyboard wiring — onKeyDown handles IME, shortcuts, panel routing, dismissal, and closed-panel submit without changing the interaction contract.
  function onKeyDown(event: KeyboardEvent): void {
    // IME composition owns every key: no filtering, insertion, or submit.
    if (isComposing) return;
    // Mode shortcut consumes the key only when every guard passes.
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

  // ───────────────────────────────────────────────────────────────────
  // 10. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Keep handle paste focused on its single responsibility.
  function handlePaste(event: ClipboardEvent): void {
    if (!mediaAvailable) return; // inert without media capability
    const items = event.clipboardData?.items;
    if (items === undefined || items.length === 0) return;
    const imageFiles: File[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (item === null || item === undefined || !item.type.startsWith('image/')) continue;
      const blob = item.getAsFile();
      if (blob === null) continue;
      const file = fileFromClipboardBlob(blob, item.type);
      imageFiles.push(file);
    }
    if (imageFiles.length === 0) return;
    event.preventDefault();
    attachmentDraft.selectFiles(imageFiles);
  }

  // Keep grow focused on its single responsibility.
  function grow(): void {
    const element = textareaEl;
    if (element === null) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_TRAY_HEIGHT_PX)}px`;
  }
</script>

<!-- Component content -->
<!-- Composer -->
<!-- This surface: composer — the presentational seam. The tray and its slots below stay
     presentation-only; the keyboard-anchor vars (--visual-viewport-height / --trigger-width)
     feed layout unchanged. -->
<!-- Do not edit — Send / steer / stop / snapshot / prompt-submission and the keyboard anchoring hook stay fenced; presentation may not reach past them. -->
<div class="composer--region">
  {#if promptError !== null}<div class="inline-alert">{promptError}</div>{/if}
  <p class="composer--disclaimer">{disclaimer}</p>
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {announcement}
  </div>
  <form
    bind:this={trayEl}
    class={`composer--tray${trayOutlineClass}`}
    onsubmit={(event) => {
      event.preventDefault();
      submit();
    }}
  >
    {#if mediaAvailable}<AttachmentRail />{/if}
    {#if mediaAvailable && attachmentDraft.blockingMessage !== null}
      <p class="attachment--draft-message" aria-live="polite">
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
    <!-- This slot: input — the single editing field. -->
    <!-- svelte-ignore a11y_role_supports_aria_props_implicit -->
    <textarea
      bind:this={textareaEl}
      id="session-prompt"
      class="composer--input"
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
        // Defer composition end so the predicate sees the committed value.
        window.setTimeout(() => (isComposing = false), 0);
      }}
      onkeydown={onKeyDown}
      onpaste={handlePaste}
      disabled={
        connection !== 'live' ||
        awaitingSnapshot
      }
      {placeholder}
    ></textarea>
    <div class="composer--bar">
      <div class="composer--left">
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
          composerEmpty={!hasText && !hasAttachments}
          onRecallHistory={() => { toolsOpen = false; recallHistoryOpen = true; }}
          onOpenModelEffort={(section) => { toolsOpen = false; onOpenModelEffort?.(section); }}
          {dictationActive}
          {dictationMode}
          {dictationAvailable}
          onDictationTap={handleDictationTap}
          onDictationPress={handleDictationPress}
          onDictationRelease={handleDictationRelease}
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
      <div class="composer--right">
        <!-- This slot: interrupt-action — the stop control stays available without replacing the draft action. -->
        {#if running && connection === 'live'}
          <Button
            type="button"
            class="composer--primary is-stop"
            aria-label="Stop the current turn"
            onclick={stopRun}
            disabled={stopping || connection !== 'live'}
          >
            {@render stopGlyph()}
          </Button>
        {/if}
        <!-- This slot: primary-action — the draft action remains send / steer / sending. -->
        {#if running && (hasText || hasAttachments) && !slashDraft}
          <Button
            type="button"
            class="composer--later"
            onclick={() => {
              if (hasAttachments) attachmentSubmission.submit('followUp');
              else sendPrompt('followUp');
            }}
            disabled={!canSendMessage || attachmentSubmission.busy}
          >
            Later
          </Button>
        {/if}
        {#if effectivePanelOpen}
          <Button
            type="button"
            class="composer--primary is-send"
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
            class="composer--primary is-send"
            aria-label="Send command"
            disabled={!effectiveSlashSendable}
          >
            {#if slashSubmitting}{@render spinnerGlyph()}{:else}{@render sendGlyph()}{/if}
          </Button>
        {:else if !running || hasText || hasAttachments}
          <Button
            type="submit"
            class="composer--primary is-send"
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

  {#if dictationOpen}
    <DictationOverlay
      bind:this={dictationOverlayEl}
      isOpen={dictationOpen}
      mode={dictationMode}
      sessionId={sessionId}
      lang={dictationLang}
      {setPrompt}
      onClose={handleDictationClose}
    />
  {/if}

  <DictationSheet
    isOpen={dictationSheetOpen}
    onOpenChange={(open) => (dictationSheetOpen = open)}
    engineStatus={dictationEngineStatus}
    dictationEnabled={dictationEnabled}
    onToggleEnabled={handleDictationToggle}
    lang={dictationLang}
    onLangChange={handleDictationLangChange}
    engineMessage={dictationEngineMessage}
  />

  <PromptHistorySheet
    isOpen={recallHistoryOpen}
    onOpenChange={(open) => (recallHistoryOpen = open)}
    onSelectHistory={(text) => setPrompt(() => text)}
  />
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
    class="composer--spinner"
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

<!-- Composer -->
<!-- This surface: composer — the input island. Decomposed into this scoped block; the composer--region /
     composer--disclaimer / composer--input / composer--bar / composer--left / composer--right /
     attachment--draft-message owned rules move with it. Child-primitive classes
     (composer--tray / composer--primary / composer--later / composer--spinner) and the shared 44px
     target / prefers-contrast / forced-colors / reduced-motion / clay-override / safe-area
     groups stay GLOBAL in app.css (they are shared grouped selectors — moving them into scope
     would reverse the cascade against those global overrides). Values unchanged. -->
<style>
  /* This state: promptError — inline-alert rendered above the tray (shared error surface). */
  /* Editable seam: layout — sticky bottom-anchor + canvas fade; the keyboard-anchor
     --visual-viewport-height var feeds the anchor and stays the layout input. */
  /* Do not edit — presentation of the viewer-open state; keep the blur/inert pair. */
  .composer--region {
    position: sticky;
    z-index: 5;
    bottom: 0;
    display: grid;
    gap: var(--space-1);
    margin-top: var(--space-3);
    padding-top: var(--space-2);
    padding-bottom: 0;
    padding-inline-start: env(safe-area-inset-left, 0px);
    padding-inline-end: env(safe-area-inset-right, 0px);
    background: linear-gradient(to top, var(--canvas) 50%, transparent);
  }

  /* This surface: composer — edge-to-edge full-width input container. */
  /* Editable seam: layout — tray geometry; safe gutters are token-driven. */
  .composer--tray {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3) max(var(--space-2), env(safe-area-inset-bottom)) var(--space-3);
    border: 0;
    border-top: 1px solid var(--line-strong);
    border-radius: 0;
    background: var(--surface);
    transition:
      background var(--duration-state, 220ms) var(--ease-out, ease),
      border-color var(--duration-state, 220ms) var(--ease-out, ease);
  }

  /* Dashed Plan outline: host-confirmed only; held-back muted drafting surface. */
  .composer--tray.is-plan-mode {
    border-style: dashed;
    border-color: var(--line-strong);
    background: var(--surface-muted);
  }

  /* Solid accent line: host-confirmed execution; live active state. */
  .composer--tray.is-executing-mode {
    border-style: solid;
    border-color: var(--accent);
  }

  /* ── Installed-PWA safe-area hardening ───────────────────────────────
     With viewport-fit=cover the layout extends under the notch and rounded
     corners in landscape; interactive content keeps clear of the insets while
     portrait (all-zero insets) renders edge-to-edge. */
  .composer--tray {
    padding-inline-start: max(var(--space-3), env(safe-area-inset-left, 0px));
    padding-inline-end: max(var(--space-3), env(safe-area-inset-right, 0px));
  }

  /* Keep this rule aligned with its surrounding surface. */
  .composer--tray {
    min-inline-size: 0;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .composer--disclaimer {
    margin: 0;
    padding-inline: var(--space-3);
    color: var(--ink-muted);
    font-size: 0.75rem;
    line-height: 1.35;
    text-align: center;
  }

  /* This slot: input — the single editing field; colour/type stay token-driven. */
  .composer--input {
    width: 100%;
    min-height: 1.625rem;
    max-height: 140px;
    padding: var(--space-2) var(--space-1) var(--space-1);
    border: 0;
    background: transparent;
    color: var(--ink);
    caret-color: var(--accent);
    font-family: var(--font-sans);
    font-size: 1.0625rem;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: -0.01em;
    resize: none;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--line-hairline) transparent;
    word-break: break-word;
    overflow-wrap: break-word;
    -webkit-tap-highlight-color: transparent;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .composer--input::selection {
    background: var(--accent-soft);
    color: var(--ink);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .composer--input:focus {
    outline: none;
    box-shadow: none;
  }

  /* This state: awaitingSnapshot · sendingPrompt · slashSubmitting — the input is
     disabled while the composer is busy or syncing (plus a non-live connection). */
  .composer--input:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .composer--input::placeholder {
    color: var(--ink-muted);
    opacity: 0.8;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .composer--bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-inline-size: 0;
    min-block-size: 44px;
    width: 100%;
    padding-top: var(--space-1);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .composer--left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-inline-size: 0;
    flex: 1 1 auto;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .composer--right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2);
    flex-shrink: 0;
    margin-inline-start: auto;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .attachment--draft-message {
    margin: 0;
    padding-inline: var(--space-1);
    color: var(--ink-muted);
    font-family: var(--font-display);
    font-size: 0.84rem;
    line-height: 1.35;
  }

  /* This slot: primary-action — the single circular morphing disc (send/steer/sending).
     The class is passed to the Button primitive, so Svelte cannot hash it → :global. */
  :global(.composer--primary) {
    display: grid;
    place-items: center;
    min-inline-size: 44px;
    min-block-size: 44px;
    inline-size: 44px;
    block-size: 44px;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 0;
    border-radius: 999px;
    flex-shrink: 0;
    cursor: pointer;
    transition:
      background var(--duration-state, 120ms) var(--ease-out, ease),
      opacity var(--duration-state, 120ms) var(--ease-out, ease);
  }

  /* This state: send · steer — the morphing primary disc; steer shares this form. */
  :global(.composer--primary.is-send) {
    background: var(--accent);
    color: var(--on-accent);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.composer--primary.is-send[data-hovered]) {
    background: var(--accent-strong);
  }

  /* This state: stop — the interrupt disc for a running turn. */
  :global(.composer--primary.is-stop) {
    background: var(--action-bg);
    color: var(--action-fg);
  }

  /* This state: stopping · sending-inhibit — the disc's disabled affordance. */
  :global(.composer--primary[data-disabled]) {
    cursor: not-allowed;
    opacity: 0.4;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.composer--primary[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* This state: later — the secondary "send after this turn" affordance (Button primitive → :global). */
  :global(.composer--later) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 44px;
    min-block-size: 44px;
    min-height: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-secondary);
    font-size: 0.85rem;
    font-weight: 550;
    flex-shrink: 0;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.composer--later[data-disabled]) {
    cursor: not-allowed;
    opacity: 0.4;
  }

  /* This surface: spinner — shared inline pending/busy indicator. */
  /* This state: sending · slashSubmitting — the disc's busy form.
     The SpinnerGlyph <svg> is rendered by this component → normally scoped. */
  .composer--spinner {
    animation: composer-spin 0.8s linear infinite;
  }

  /* Do not edit — reduced-motion keeps the shared spinner static — Never remove. */
  @media (prefers-reduced-motion: reduce) {
    /* Keep this rule aligned with its surrounding surface. */
    .composer--spinner {
      animation: none;
    }
  }

  /* Narrow widths give the mode control its own toolbar row above the
     textarea: the left group wraps so the label never truncates Plan ·
     read-only and the primary action stays on the first row. */
  @media (max-width: 400px) {
    /* Keep this rule aligned with its surrounding surface. */
    .composer--left {
      flex-wrap: wrap;
      row-gap: var(--space-1);
    }
  }

  /* Editable seam: layout — narrow reflow of the composer bar + ready/review card + sheets. */
  @media (max-width: 27rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .composer--bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-2);
    }

    /* Keep this rule aligned with its surrounding surface. */
    .composer--left {
      min-inline-size: 0;
      flex-wrap: wrap;
      row-gap: var(--space-1);
    }
  }
</style>
