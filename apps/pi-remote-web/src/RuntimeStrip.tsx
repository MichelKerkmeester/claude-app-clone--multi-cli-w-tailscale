// ───────────────────────────────────────────────────────────────────
// MODULE: Host-Backed Runtime Control Strip (Model / Effort / Build·Plan)
// ───────────────────────────────────────────────────────────────────

import {
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-aria-components';
import type { Key } from 'react-aria-components';

import type { RuntimeControls } from './runtime.js';

const EFFORT_LABELS: Readonly<Record<string, string>> = {
  off: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
};

/**
 * The three host-authoritative controls. Every label reflects host-confirmed state
 * only; a mutation shows pending on its own control and never an optimistic value, and
 * all controls disable whenever authority is not `ready`.
 */
export function RuntimeStrip({ controls }: { readonly controls: RuntimeControls }) {
  const { runtime, setModel, setThinkingLevel, setMode } = controls;
  const state = runtime.state;
  const disabled = runtime.status !== 'ready' || state === null;
  const pending = runtime.pending;

  const modelLabel = state?.model?.label ?? '—';
  const modelIndex = state?.model
    ? runtime.models.findIndex(
        (m) => m.provider === state.model?.provider && m.id === state.model?.id,
      )
    : -1;
  const planActive = state?.mode === 'plan' || state?.mode === 'executing-plan';

  return (
    <div className="runtime-strip" role="group" aria-label="Runtime controls">
      <Select
        aria-label="Model"
        className="runtime-control runtime-model"
        isDisabled={disabled}
        selectedKey={modelIndex >= 0 ? String(modelIndex) : null}
        onSelectionChange={(key: Key | null) => {
          const chosen = key === null ? undefined : runtime.models[Number(key)];
          if (chosen) void setModel(chosen.provider, chosen.id);
        }}
      >
        <Button>{`Model · ${modelLabel}`}</Button>
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

      <Select
        aria-label="Effort"
        className="runtime-control runtime-effort"
        isDisabled={disabled || (state?.availableThinkingLevels.length ?? 0) === 0}
        selectedKey={state?.thinkingLevel ?? null}
        onSelectionChange={(key: Key | null) => {
          if (key !== null) void setThinkingLevel(String(key));
        }}
      >
        <Button>{`Effort · ${effortLabel(state?.thinkingLevel)}`}</Button>
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

      <ToggleButtonGroup
        className="runtime-control runtime-mode"
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

      <span className="runtime-status" role="status" aria-live="polite">
        {statusHint(runtime.status, pending !== null)}
      </span>
    </div>
  );
}

function effortLabel(level: string | undefined): string {
  if (level === undefined || level.length === 0) return '—';
  return EFFORT_LABELS[level] ?? level;
}

function statusHint(status: RuntimeControls['runtime']['status'], hasPending: boolean): string {
  switch (status) {
    case 'checking':
      return 'Checking…';
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
