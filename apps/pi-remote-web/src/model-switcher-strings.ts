import type { RuntimeControlOutcome } from '@pi-remote/pi-rpc-protocol';

export const modelSwitcherStrings = {
  title: 'Change model',
  close: 'Close model switcher',
  currentSection: 'Current model',
  availableModels: 'Available models',
  searchLabel: 'Search models',
  searchPlaceholder: 'Provider, model, or ID',
  clearSearch: 'Clear model search',
  clearSearchVisible: 'Clear',
  current: 'Current',
  selected: 'Selected',
  available: 'Available',
  applying: 'Applying…',
  loading: 'Loading models',
  noModels: 'No models configured. Configure a provider on the host.',
  streamingBlocked: 'Available after the current turn. You can still browse and select a model.',
  refreshing: 'Refreshing…',
  cancel: 'Cancel',
  switchModel: 'Switch model',
  offline: 'You’re offline. Catalog browsing is read-only.',
  unreachable: 'Host unreachable.',
  retryRefresh: 'Retry refresh',
  accessExpired: 'Access expired.',
  reconnect: 'Reconnect',
  retired: 'No longer available',
  hostChanged: 'Host state changed. Choose again.',
  policyBlocked: 'Blocked by host policy.',
  deliveryUnknown: 'Outcome unknown · Reconcile before switching again.',
  unavailable: 'That model is unavailable. Choose another model.',
  unsupported: 'Model switching is not supported by this host.',
  runtimeUnavailable: 'The host runtime is unavailable.',
  tierLocked: 'That model is unavailable for the active account tier.',
  streamingActive: 'Model switching is unavailable during the current turn.',
  hostRejected: 'The host rejected the model change.',
  genericFailure: 'The model change could not be completed.',
  planMode: 'Plan mode',
  planBadge: 'Plan',
  effort: 'Effort',
  thinkingEffort: 'Thinking effort',
} as const;

export function modelTriggerName(label: string, provider: string): string {
  return `Model, ${label}, ${provider}`;
}

export function modelCountMessage(visible: number, total: number): string {
  const category = new Intl.PluralRules().select(visible);
  return `${visible} of ${total} ${category === 'one' ? 'model' : 'models'}`;
}

export function noModelMatchMessage(query: string): string {
  return `No models match “${query}”.`;
}

export function modelSwitchedMessage(label: string): string {
  return `Model switched to ${label}.`;
}

export function modelStatusAnnouncement(message: string): string {
  return `Model switch status: ${message}`;
}

export function modelRowName({
  label,
  provider,
  id,
  capabilities,
  availability,
  isCurrent,
  isSelected,
  isApplying,
}: {
  readonly label: string;
  readonly provider: string;
  readonly id: string;
  readonly capabilities: readonly string[];
  readonly availability: string | null;
  readonly isCurrent: boolean;
  readonly isSelected: boolean;
  readonly isApplying: boolean;
}): string {
  return [
    label,
    provider,
    id,
    ...capabilities,
    availability,
    isCurrent ? modelSwitcherStrings.current : null,
    isSelected ? modelSwitcherStrings.selected : null,
    isApplying ? modelSwitcherStrings.applying : null,
  ]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(', ');
}

export function runtimeOutcomeMessage(outcome: RuntimeControlOutcome): string {
  switch (outcome.status) {
    case 'stale':
      return modelSwitcherStrings.hostChanged;
    case 'policy_blocked':
      return modelSwitcherStrings.policyBlocked;
    case 'delivery-unknown':
      return modelSwitcherStrings.deliveryUnknown;
    case 'unsupported':
      return modelSwitcherStrings.unsupported;
    case 'unavailable':
      switch (outcome.reasonCode) {
        case 'runtime_unavailable':
          return modelSwitcherStrings.runtimeUnavailable;
        case 'tier_locked':
          return modelSwitcherStrings.tierLocked;
        case 'streaming_active':
          return modelSwitcherStrings.streamingActive;
        case 'host_rejected':
          return modelSwitcherStrings.hostRejected;
        default:
          return modelSwitcherStrings.unavailable;
      }
    case 'accepted':
      return '';
    default:
      return modelSwitcherStrings.genericFailure;
  }
}
