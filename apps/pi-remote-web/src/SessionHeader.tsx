// ───────────────────────────────────────────────────────────────────
// MODULE: Session Header (quiet, model-centered top bar)
// ───────────────────────────────────────────────────────────────────
// In-session the chrome goes quiet: a back control, the host-confirmed
// model name + chevron centered as the anchor, a separate effort control,
// and one overflow that holds the app navigation (Inbox,
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
import { useRef, useState } from 'react';

import { ModelSwitcherSheet } from './ModelSwitcherSheet.js';
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
  const { runtime, setThinkingLevel } = runtimeControls;
  const state = runtime.state;
  const disabled = runtime.status !== 'ready' || state === null;
  const modelLabel = state?.model?.label ?? 'Model';
  const modelProvider = state?.model?.provider ?? 'unknown provider';
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const modelTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <header className="session-header">
        <Button className="session-header-icon" aria-label="Back to sessions" onPress={onBack}>
          <ChevronLeftGlyph />
        </Button>

        <div className="session-runtime-controls">
          <Button
            ref={modelTriggerRef}
            className="session-model-trigger"
            aria-label={`Model, ${modelLabel}, ${modelProvider}`}
            aria-haspopup="dialog"
            aria-expanded={modelSheetOpen}
            aria-controls="model-switcher-dialog"
            onPress={() => setModelSheetOpen(true)}
          >
            <span className="session-model-name">{modelLabel}</span>
            <ChevronDownGlyph />
          </Button>

          <Select
            aria-label="Thinking effort"
            className="session-effort-select"
            isDisabled={disabled || (state?.availableThinkingLevels.length ?? 0) === 0}
            selectedKey={state?.thinkingLevel ?? null}
            onSelectionChange={(key: Key | null) => {
              if (key !== null) void setThinkingLevel(String(key));
            }}
          >
            <Button>
              <span className="session-effort-label">Effort</span>
              <span>{effortLabel(state?.thinkingLevel)}</span>
            </Button>
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
        </div>

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
      <ModelSwitcherSheet
        isOpen={modelSheetOpen}
        onOpenChange={setModelSheetOpen}
        runtimeControls={runtimeControls}
        triggerRef={modelTriggerRef}
      />
    </>
  );
}

function effortLabel(level: string | undefined): string {
  if (level === undefined || level.length === 0) return '—';
  return EFFORT_LABELS[level] ?? level;
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
