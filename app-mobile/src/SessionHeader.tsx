// ───────────────────────────────────────────────────────────────────
// MODULE: Session Header (quiet, model-centered top bar)
// ───────────────────────────────────────────────────────────────────
// In-session the chrome goes quiet: a back control, the host-confirmed
// model + effort readout centered as one trigger into the shared sheet,
// and one overflow that holds the app navigation (Inbox, Review) and
// the theme control — so nothing competes with the transcript.

import {
  Button,
  Dialog,
  DialogTrigger,
  Popover,
  ToggleButton,
} from 'react-aria-components';
import type { RefObject } from 'react';

import { modelEffortTriggerName, effortTriggerText } from './effort.js';
import { modelSwitcherStrings } from './model-switcher-strings.js';
import type { RuntimeControls } from './runtime.js';

type ThemePreference = 'system' | 'light' | 'dark';

export interface SessionHeaderProps {
  readonly onBack: () => void;
  readonly onInbox: () => void;
  readonly onReview: () => void;
  readonly theme: ThemePreference;
  readonly onThemeChange: (theme: ThemePreference) => void;
  readonly runtimeControls: RuntimeControls;
  /** Whether the shared model/effort sheet is open (for aria-expanded). */
  readonly sheetOpen: boolean;
  /** Opens the shared sheet at the model section. */
  readonly onOpenModelSheet: () => void;
  /** Attached to the readout trigger so the sheet can restore focus to it. */
  readonly modelTriggerRef: RefObject<HTMLButtonElement | null>;
}

export function SessionHeader({
  onBack,
  onInbox,
  onReview,
  theme,
  onThemeChange,
  runtimeControls,
  sheetOpen,
  onOpenModelSheet,
  modelTriggerRef,
}: SessionHeaderProps) {
  const { runtime } = runtimeControls;
  const state = runtime.state;
  const modelLabel = state?.model?.label ?? 'Model';
  const modelProvider = state?.model?.provider ?? 'unknown provider';
  const effortText = effortTriggerText(state?.thinkingLevel, state?.availableThinkingLevels ?? []);

  // @ds surface: session-header — quiet in-session header. Slots: back · model · overflow.
  return (
    <>
      <header className="session-header">
        {/* @ds slot: back — back-to-sessions control. */}
        {/* @ds guardrail: react-aria Button (onPress / aria-label) — not designer-editable. */}
        <Button className="session-header-icon" aria-label="Back to sessions" onPress={onBack}>
          <ChevronLeftGlyph />
        </Button>

        {/* @ds slot: model — host-confirmed model / effort readout trigger. */}
        <div className="session-runtime-controls">
          {/* @ds guardrail: react-aria Button + aria-* (expanded/controls/haspopup); 44px target — not designer-editable. */}
          <Button
            ref={modelTriggerRef}
            className="session-model-trigger"
            aria-label={modelEffortTriggerName(modelLabel, modelProvider, effortText)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            aria-controls="model-effort-dialog"
            onPress={onOpenModelSheet}
            style={{ minBlockSize: '44px' }}
          >
            <span
              key={`${state?.model?.provider ?? ''}:${state?.model?.id ?? ''}`}
              className="session-model-name"
            >
              {modelLabel}
            </span>
            <span className="session-header-sep" aria-hidden="true">
              ·
            </span>
            <span
              key={`effort:${state?.thinkingLevel ?? ''}`}
              className="session-effort-name"
            >
              {effortText}
            </span>
            <ChevronDownGlyph />
          </Button>

          {/* @ds slot: plan-badge — plan-mode status chip. */}
          {/* @ds guardrail: role="status" readout — not designer-editable. */}
          {state?.mode === 'plan' && (
            <span
              className="session-plan-badge"
              role="status"
              aria-label={modelSwitcherStrings.planMode}
            >
              {modelSwitcherStrings.planBadge}
            </span>
          )}
        </div>

        {/* @ds slot: overflow — nav + theme popover trigger. */}
        {/* @ds guardrail: react-aria DialogTrigger / Popover / Dialog wiring — not designer-editable. */}
        <DialogTrigger>
          <Button className="session-header-icon" aria-label="More: navigation and theme">
            <OverflowGlyph />
          </Button>
          <Popover className="session-sheet-popover" placement="bottom end">
            <Dialog aria-label="Navigation and theme" className="session-sheet">
              <section className="tools-group">
                <span className="tools-label">Go to</span>
                {/* @ds slot: nav — Inbox · Review. */}
                {/* @ds guardrail: react-aria onPress nav routing — not designer-editable. */}
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
                {/* @ds slot: theme-toggle — segmented light / dark / auto. */}
                {/* @ds guardrail: react-aria ToggleButton group (onChange / aria-label) — not designer-editable. */}
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
    </>
  );
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
