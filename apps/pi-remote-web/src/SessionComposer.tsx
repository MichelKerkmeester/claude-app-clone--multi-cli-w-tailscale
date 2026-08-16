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

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-aria-components';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

import { CommandPalette } from './CommandPalette.js';
import {
  ComposerCommandAutocomplete,
  SLASH_LISTBOX_ID,
  deriveSlashPanelState,
  hasRows,
  type SlashPanelDerivation,
} from './ComposerCommandAutocomplete.js';
import type {
  HostCommandCatalogState,
  SelectedCommandBinding,
} from './commands.js';
import { bindingFor } from './commands.js';
import { insertSlashCommand } from './insertSlashCommand.js';
import { rankHostCommands } from './rankHostCommands.js';
import type { RuntimeControls } from './runtime.js';
import { slashDismissalSignature, useSlashTrigger } from './useSlashTrigger.js';

const MAX_TRAY_HEIGHT_PX = 140;

export interface SessionComposerProps {
  readonly prompt: string;
  readonly setPrompt: (updater: (current: string) => string) => void;
  readonly onDraftChange: (value: string) => void;
  readonly sendPrompt: (behavior?: 'steer' | 'followUp') => void;
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
  readonly onInsertCommand: (name: string, binding: SelectedCommandBinding) => void;
}

export function SessionComposer({
  prompt,
  setPrompt,
  onDraftChange,
  sendPrompt,
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
  onInsertCommand,
}: SessionComposerProps) {
  const running = status === 'running';
  const hasText = prompt.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trayRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const pendingCaretRef = useRef<number | null>(null);

  // Editing facts the trigger predicate consumes. The textarea remains the
  // only editing field; everything below is derived, never a second editor.
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [commitPending, setCommitPending] = useState(false);
  // Outside-press dismissal without an Escape latch: any later draft,
  // caret, or textarea interaction re-arms the surface.
  const [outsideDismissed, setOutsideDismissed] = useState(false);

  const trigger = useSlashTrigger({
    draft: prompt,
    selectionStart: selection.start,
    selectionEnd: selection.end,
    isFocused,
    isComposing,
    dismissedSignature,
  });
  const panelOpen = trigger.active && !toolsOpen;
  const effectivePanelOpen = panelOpen && !outsideDismissed;

  const ranked = useMemo(
    () => rankHostCommands(catalog.commands, trigger.query, { activeName }),
    [catalog.commands, trigger.query, activeName],
  );

  // The one panel state machine, shared with the presentation layer so the
  // composer's aria wiring and the panel render the same derived state.
  const panelDerivation: SlashPanelDerivation = deriveSlashPanelState({
    triggerActive: trigger.active,
    query: trigger.query,
    draftStartsWithSlash: prompt.startsWith('/'),
    commitPending,
    catalogStatus: catalog.status,
    snapshotPresent: catalog.snapshot !== null,
    catalogCount: catalog.commands.length,
    matchCount: ranked.items.length,
    running,
  });
  const rowsVisible =
    effectivePanelOpen && hasRows(panelDerivation.panelState) && ranked.items.length > 0;

  // Adopt the ranked active row (first enabled, or the retained name when
  // still visible); virtual focus resets when the panel closes.
  useEffect(() => {
    if (!panelOpen) {
      setActiveName(null);
      return;
    }
    setActiveName((current) => (ranked.activeName === current ? current : ranked.activeName));
  }, [panelOpen, ranked.activeName]);

  // Outside-press dismissal: taps outside the panel, the textarea, and the
  // tray close the surface; the tapped target keeps its normal behavior.
  useEffect(() => {
    if (!panelOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target === null) return;
      if (panelRef.current?.contains(target)) return;
      if (textareaRef.current?.contains(target)) {
        setOutsideDismissed(false);
        return;
      }
      if (trayRef.current?.contains(target)) return;
      setOutsideDismissed(true);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [panelOpen]);

  // Any draft or caret change re-arms the surface after an outside dismissal.
  useEffect(() => {
    setOutsideDismissed(false);
  }, [prompt, selection.start, selection.end]);

  // Caret placement runs after the controlled draft has rendered, so the
  // textarea DOM already contains the inserted token when the range is set.
  useEffect(() => {
    const offset = pendingCaretRef.current;
    if (offset === null) return;
    pendingCaretRef.current = null;
    const element = textareaRef.current;
    if (element === null) return;
    element.focus({ preventScroll: true });
    element.setSelectionRange(offset, offset);
  }, [prompt]);

  // The committing state lasts one render after the draft update.
  useEffect(() => {
    setCommitPending(false);
  }, [prompt]);

  const grow = () => {
    const element = textareaRef.current;
    if (element === null) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_TRAY_HEIGHT_PX)}px`;
  };

  const submit = () => sendPrompt(running ? 'steer' : undefined);

  // The palette path appends at the draft end (shared insertion reducer).
  const insertCommand = (name: string, binding: SelectedCommandBinding) => {
    const result = insertSlashCommand({
      draft: prompt,
      selectionStart: 0,
      selectionEnd: 0,
      commandName: name,
      binding,
      replaceRange: { start: prompt.length, end: prompt.length },
    });
    pendingCaretRef.current = result.caretOffset;
    setPrompt(() => result.draft);
    setAnnouncement(result.announcement);
    onInsertCommand(name, binding);
  };

  // The inline path replaces the complete leading token. Both routes run
  // through insertSlashCommand, record the revision binding, announce the
  // "Not sent" outcome, and perform zero network work.
  const insertCommandAtToken = (name: string, binding: SelectedCommandBinding) => {
    const result = insertSlashCommand({
      draft: prompt,
      selectionStart: selection.start,
      selectionEnd: selection.end,
      commandName: name,
      binding,
      replaceRange: { start: trigger.tokenStart, end: trigger.tokenEnd },
    });
    pendingCaretRef.current = result.caretOffset;
    setCommitPending(true);
    setPrompt(() => result.draft);
    setAnnouncement(result.announcement);
    onInsertCommand(name, binding);
    setActiveName(null);
  };

  const activeRow = ranked.items.some((item) => item.name === activeName && item.enabled);

  const insertActiveRow = () => {
    if (activeName === null || !activeRow) {
      setAnnouncement('No command selected.');
      return;
    }
    // Bindings only exist inside the current scoped snapshot; anything else
    // fails closed without touching the draft.
    const binding = bindingFor(catalog.snapshot, activeName);
    if (binding === null) {
      setAnnouncement('No command selected.');
      return;
    }
    insertCommandAtToken(activeName, binding);
  };

  const moveActive = (direction: 1 | -1) => {
    setActiveName((current) => {
      const enabledNames = ranked.items.filter((item) => item.enabled).map((item) => item.name);
      if (enabledNames.length === 0) return current;
      const index = current === null ? -1 : enabledNames.indexOf(current);
      const next = index + direction;
      if (next < 0 || next >= enabledNames.length) return current; // no wrap
      return enabledNames[next] ?? null;
    });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    // IME composition owns every key: no filtering, insertion, or submit.
    if (isComposing) return;
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
          setDismissedSignature(slashDismissalSignature(prompt, selection.start));
          return;
        default:
          return; // typing filters locally; Left/Right and editing stay native
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const placeholder =
    connection !== 'live'
      ? 'Reconnect to send'
      : running
        ? 'Steer Pi, or send after this turn'
        : 'Reply to Pi';

  const disclaimer = awaitingSnapshot
    ? 'Syncing with the relay…'
    : 'Pi can make mistakes · actions stay read-only';

  // Stop is the primary action only when a turn is running and the draft is empty;
  // any draft makes the primary Send (idle) or Steer (running). With the inline
  // surface open, the disc becomes the local Insert action — never Send.
  const showStop = running && !hasText;

  return (
    <div className="composer-region">
      {promptError !== null && <div className="inline-alert">{promptError}</div>}
      <p className="composer-disclaimer">{disclaimer}</p>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <form
        ref={trayRef}
        className="composer-tray"
        onSubmit={(event) => {
          event.preventDefault();
          if (showStop) return;
          submit();
        }}
      >
        <ComposerCommandAutocomplete
          prompt={prompt}
          open={effectivePanelOpen}
          derivation={panelDerivation}
          activeName={activeName}
          items={ranked.items}
          catalog={catalog}
          running={running}
          anchorRef={trayRef}
          panelRef={panelRef}
          onInsert={(name) => {
            const binding = bindingFor(catalog.snapshot, name);
            if (binding === null) {
              setAnnouncement('No command selected.');
              return;
            }
            insertCommandAtToken(name, binding);
          }}
          onDisabledPress={(reason) => setAnnouncement(reason)}
          onRetry={() => void catalog.refresh('manual')}
          onAnnounce={setAnnouncement}
        />
        <textarea
          ref={textareaRef}
          id="session-prompt"
          className="composer-input"
          aria-label="Message Pi"
          aria-autocomplete="list"
          aria-expanded={effectivePanelOpen ? true : undefined}
          aria-controls={effectivePanelOpen && rowsVisible ? SLASH_LISTBOX_ID : undefined}
          aria-activedescendant={
            effectivePanelOpen && activeRow ? `slash-option-${activeName}` : undefined
          }
          value={prompt}
          rows={1}
          onChange={(event) => {
            onDraftChange(event.target.value);
            grow();
          }}
          onSelect={(event) =>
            setSelection({
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd,
            })
          }
          onFocus={() => {
            setIsFocused(true);
            setDismissedSignature(null);
          }}
          onBlur={() => setIsFocused(false)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => {
            // Composition re-evaluation resumes on the next event-loop turn
            // so the committed value is what the predicate sees.
            window.setTimeout(() => setIsComposing(false), 0);
          }}
          onKeyDown={onKeyDown}
          disabled={connection !== 'live' || awaitingSnapshot || sendingPrompt}
          placeholder={placeholder}
        />
        <div className="composer-bar">
          <div className="composer-left">
            <ComposerTools
              runtimeControls={runtimeControls}
              catalog={catalog}
              onInsert={insertCommand}
              onOpenChange={setToolsOpen}
            />
          </div>
          <div className="composer-right">
            {running && hasText && (
              <Button
                type="button"
                className="composer-later"
                onPress={() => sendPrompt('followUp')}
                isDisabled={!canSubmit}
              >
                Later
              </Button>
            )}
            {showStop ? (
              <Button
                type="button"
                className="composer-primary is-stop"
                aria-label="Stop the current turn"
                onPress={stopRun}
                isDisabled={stopping || connection !== 'live'}
              >
                <StopGlyph />
              </Button>
            ) : effectivePanelOpen ? (
              <Button
                type="button"
                className="composer-primary is-send"
                aria-label="Insert command"
                isDisabled={!activeRow}
                onPointerDown={(event) => event.preventDefault()}
                onPress={() => {
                  if (activeRow) insertActiveRow();
                }}
              >
                <SendGlyph />
              </Button>
            ) : (
              <Button
                type="submit"
                className="composer-primary is-send"
                aria-label={running ? 'Steer the current turn' : 'Send message'}
                isDisabled={!canSubmit}
              >
                {sendingPrompt ? <SpinnerGlyph /> : <SendGlyph />}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

/** The "+" popover: model, effort, Build/Plan, and slash commands — everything that used
 * to stack in the reading path, now one tap away and out of the transcript. */
function ComposerTools({
  runtimeControls,
  catalog,
  onInsert,
  onOpenChange,
}: {
  readonly runtimeControls: RuntimeControls;
  readonly catalog: HostCommandCatalogState;
  readonly onInsert: (name: string, binding: SelectedCommandBinding) => void;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const { runtime, setMode } = runtimeControls;
  const state = runtime.state;
  const disabled = runtime.status !== 'ready' || state === null;
  const planActive = state?.mode === 'plan' || state?.mode === 'executing-plan';

  return (
    <DialogTrigger onOpenChange={onOpenChange}>
      <Button className="composer-plus" aria-label="Mode and commands">
        <PlusGlyph />
      </Button>
      <Popover className="composer-tools-popover" placement="top start">
        <Dialog aria-label="Session tools" className="composer-tools">
          <section className="tools-group">
            <span className="tools-label">Mode</span>
            <ToggleButtonGroup
              className="tools-mode"
              aria-label="Build or Plan"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={state ? [planActive ? 'plan' : 'build'] : []}
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next === 'build' || next === 'plan') void setMode(next);
              }}
            >
              <ToggleButton id="build" isDisabled={disabled}>
                Build
              </ToggleButton>
              <ToggleButton id="plan" isDisabled={disabled}>
                {state?.mode === 'plan' ? 'Plan · read-only' : 'Plan'}
              </ToggleButton>
            </ToggleButtonGroup>
          </section>

          <section className="tools-group">
            <span className="tools-label">Commands</span>
            <CommandPalette catalog={catalog} onInsert={onInsert} isDisabled={catalog.snapshot === null} />
          </section>

          <span className="tools-status" role="status" aria-live="polite">
            {statusHint(runtime.status, runtime.pending !== null)}
          </span>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

function statusHint(status: RuntimeControls['runtime']['status'], hasPending: boolean): string {
  switch (status) {
    case 'checking':
      return 'Checking runtime…';
    case 'pending':
      return hasPending ? 'Applying…' : 'Working…';
    case 'stale':
      return 'Refreshed — host changed';
    case 'error':
      return 'Unavailable — reconcile';
    default:
      return '';
  }
}

function SendGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
    </svg>
  );
}

function SpinnerGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
      className="composer-spinner"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
