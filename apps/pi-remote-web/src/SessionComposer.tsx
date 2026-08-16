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

import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-aria-components';

import { CommandPalette } from './CommandPalette.js';
import type {
  HostCommandCatalogState,
  SelectedCommandBinding,
} from './commands.js';
import { insertSlashCommand } from './insertSlashCommand.js';
import type { RuntimeControls } from './runtime.js';

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
  const [announcement, setAnnouncement] = useState('');
  const pendingCaretRef = useRef<number | null>(null);

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

  const grow = () => {
    const element = textareaRef.current;
    if (element === null) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_TRAY_HEIGHT_PX)}px`;
  };

  const submit = () => sendPrompt(running ? 'steer' : undefined);

  // The one shared insertion path: replace the complete token range (the
  // palette appends at the draft end) with the canonical command, record the
  // binding, and announce that nothing was sent. Zero network work.
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
  // any draft makes the primary Send (idle) or Steer (running). This keeps one
  // circular target whose meaning is always unambiguous.
  const showStop = running && !hasText;

  return (
    <div className="composer-region">
      {promptError !== null && <div className="inline-alert">{promptError}</div>}
      <p className="composer-disclaimer">{disclaimer}</p>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <form
        className="composer-tray"
        onSubmit={(event) => {
          event.preventDefault();
          if (showStop) return;
          submit();
        }}
      >
        <textarea
          ref={textareaRef}
          id="session-prompt"
          className="composer-input"
          aria-label="Message Pi"
          value={prompt}
          rows={1}
          onChange={(event) => {
            onDraftChange(event.target.value);
            grow();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          disabled={connection !== 'live' || awaitingSnapshot || sendingPrompt}
          placeholder={placeholder}
        />
        <div className="composer-bar">
          <div className="composer-left">
            <ComposerTools
              runtimeControls={runtimeControls}
              catalog={catalog}
              onInsert={insertCommand}
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
}: {
  readonly runtimeControls: RuntimeControls;
  readonly catalog: HostCommandCatalogState;
  readonly onInsert: (name: string, binding: SelectedCommandBinding) => void;
}) {
  const { runtime, setMode } = runtimeControls;
  const state = runtime.state;
  const disabled = runtime.status !== 'ready' || state === null;
  const planActive = state?.mode === 'plan' || state?.mode === 'executing-plan';

  return (
    <DialogTrigger>
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
