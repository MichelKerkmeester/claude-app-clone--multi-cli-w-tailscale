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

import { useRef } from 'react';
import {
  Button,
  ComboBox,
  Dialog,
  DialogTrigger,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-aria-components';
import type { Key } from 'react-aria-components';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

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
  readonly commands: readonly CommandDescriptorDto[];
  readonly commandsDisabled: boolean;
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
  commands,
  commandsDisabled,
}: SessionComposerProps) {
  const running = status === 'running';
  const hasText = prompt.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const element = textareaRef.current;
    if (element === null) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_TRAY_HEIGHT_PX)}px`;
  };

  const submit = () => sendPrompt(running ? 'steer' : undefined);
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
              commands={commands}
              commandsDisabled={commandsDisabled}
              onInsert={(text) => setPrompt((current) => current + text)}
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
  commands,
  commandsDisabled,
  onInsert,
}: {
  readonly runtimeControls: RuntimeControls;
  readonly commands: readonly CommandDescriptorDto[];
  readonly commandsDisabled: boolean;
  readonly onInsert: (text: string) => void;
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
            <ComboBox
              aria-label="Insert a command"
              className="command-palette"
              isDisabled={commandsDisabled}
              menuTrigger="focus"
              allowsEmptyCollection
              selectedKey={null}
              onSelectionChange={(key: Key | null) => {
                if (key !== null) onInsert(`/${String(key)} `);
              }}
            >
              <Input placeholder="/ command" />
              <Button aria-label="Show commands">/</Button>
              <Popover>
                <ListBox
                  renderEmptyState={() => <span className="command-empty">No commands</span>}
                >
                  {commands.map((command) => (
                    <ListBoxItem key={command.name} id={command.name} textValue={command.name}>
                      <span className="command-name">{`/${command.name}`}</span>
                      {command.description !== null && (
                        <span className="command-desc">{command.description}</span>
                      )}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Popover>
            </ComboBox>
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
