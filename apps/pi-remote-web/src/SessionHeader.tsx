// ───────────────────────────────────────────────────────────────────
// MODULE: Session Header (quiet, model-centered top bar)
// ───────────────────────────────────────────────────────────────────
// In-session the chrome goes quiet: a back control, the host-confirmed
// model name + chevron centered as the anchor (tapping it opens a Model +
// Effort sheet), and one overflow that holds the app navigation (Inbox,
// Review) and the theme control — so nothing competes with the transcript.

import {
  Button,
  Dialog,
  DialogTrigger,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  ToggleButton,
} from 'react-aria-components';
import type { Key } from 'react-aria-components';

import type { RuntimeControls } from './runtime.js';

type ThemePreference = 'system' | 'light' | 'dark';

const EFFORT_LABELS: Readonly<Record<string, string>> = {
  off: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
};

export interface SessionHeaderProps {
  readonly onBack: () => void;
  readonly onInbox: () => void;
  readonly onReview: () => void;
  readonly theme: ThemePreference;
  readonly onThemeChange: (theme: ThemePreference) => void;
  readonly runtimeControls: RuntimeControls;
}

export function SessionHeader({
  onBack,
  onInbox,
  onReview,
  theme,
  onThemeChange,
  runtimeControls,
}: SessionHeaderProps) {
  const { runtime, setModel, setThinkingLevel } = runtimeControls;
  const state = runtime.state;
  const disabled = runtime.status !== 'ready' || state === null;
  const modelIndex = state?.model
    ? runtime.models.findIndex(
        (model) => model.provider === state.model?.provider && model.id === state.model?.id,
      )
    : -1;
  const modelLabel = state?.model?.label ?? 'Model';

  return (
    <header className="session-header">
      <Button className="session-header-icon" aria-label="Back to sessions" onPress={onBack}>
        <ChevronLeftGlyph />
      </Button>

      <DialogTrigger>
        <Button className="session-model-trigger" isDisabled={disabled}>
          <span className="session-model-name">{modelLabel}</span>
          <ChevronDownGlyph />
        </Button>
        <Popover className="session-sheet-popover" placement="bottom">
          <Dialog aria-label="Model and effort" className="session-sheet">
            <section className="tools-group">
              <span className="tools-label">Model</span>
              <Select
                aria-label="Model"
                className="tools-select"
                isDisabled={disabled}
                selectedKey={modelIndex >= 0 ? String(modelIndex) : null}
                onSelectionChange={(key: Key | null) => {
                  const chosen = key === null ? undefined : runtime.models[Number(key)];
                  if (chosen) void setModel(chosen.provider, chosen.id);
                }}
              >
                <Button>{modelLabel}</Button>
                <Popover>
                  <ListBox>
                    {runtime.models.map((model, index) => (
                      <ListBoxItem key={`${model.provider}|${model.id}`} id={String(index)}>
                        {model.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>
            </section>

            <section className="tools-group">
              <span className="tools-label">Effort</span>
              <Select
                aria-label="Effort"
                className="tools-select"
                isDisabled={disabled || (state?.availableThinkingLevels.length ?? 0) === 0}
                selectedKey={state?.thinkingLevel ?? null}
                onSelectionChange={(key: Key | null) => {
                  if (key !== null) void setThinkingLevel(String(key));
                }}
              >
                <Button>{effortLabel(state?.thinkingLevel)}</Button>
                <Popover>
                  <ListBox>
                    {(state?.availableThinkingLevels ?? []).map((level) => (
                      <ListBoxItem key={level} id={level}>
                        {effortLabel(level)}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </Select>
            </section>

            <span className="tools-status" role="status" aria-live="polite">
              {statusHint(runtime.status, runtime.pending !== null)}
            </span>
          </Dialog>
        </Popover>
      </DialogTrigger>

      <DialogTrigger>
        <Button className="session-header-icon" aria-label="More: navigation and theme">
          <OverflowGlyph />
        </Button>
        <Popover className="session-sheet-popover" placement="bottom end">
          <Dialog aria-label="Navigation and theme" className="session-sheet">
            <section className="tools-group">
              <span className="tools-label">Go to</span>
              <div className="overflow-nav">
                <Button className="overflow-item" onPress={onInbox}>
                  Inbox
                </Button>
                <Button className="overflow-item" onPress={onReview}>
                  Review
                </Button>
              </div>
            </section>
            <section className="tools-group">
              <span className="tools-label">Theme</span>
              <div className="theme-control" role="group" aria-label="Color theme">
                {(['system', 'light', 'dark'] as const).map((option) => (
                  <ToggleButton
                    key={option}
                    className="theme-option"
                    isSelected={theme === option}
                    onChange={(selected) => {
                      if (selected) onThemeChange(option);
                    }}
                    aria-label={`Use ${option} theme`}
                  >
                    {option === 'system' ? 'Auto' : option === 'light' ? 'Light' : 'Dark'}
                  </ToggleButton>
                ))}
              </div>
            </section>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </header>
  );
}

function effortLabel(level: string | undefined): string {
  if (level === undefined || level.length === 0) return '—';
  return EFFORT_LABELS[level] ?? level;
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

function ChevronLeftGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OverflowGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <circle cx="5" cy="12" r="1.7" fill="currentColor" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" />
    </svg>
  );
}
