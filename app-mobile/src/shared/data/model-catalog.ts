// ───────────────────────────────────────────────────────────────────
// MODULE: Model Catalog Organization
// ───────────────────────────────────────────────────────────────────

import type { AvailableModelDto } from '@pi-remote/pi-rpc-protocol';

export interface ModelCatalogGroup {
  readonly provider: string;
  readonly providerLabel: string;
  readonly models: readonly AvailableModelDto[];
}

export interface OrganizedModelCatalog {
  readonly retiredCurrent: AvailableModelDto | null;
  readonly groups: readonly ModelCatalogGroup[];
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function modelKey(model: Pick<AvailableModelDto, 'provider' | 'id'>): string {
  return `${encodeURIComponent(model.provider)}/${encodeURIComponent(model.id)}`;
}

export function isSameModel(
  first: Pick<AvailableModelDto, 'provider' | 'id'> | null,
  second: Pick<AvailableModelDto, 'provider' | 'id'> | null,
): boolean {
  return first !== null && second !== null && modelKey(first) === modelKey(second);
}

export function displayModelText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu, '').trim();
}

export function isModelAvailable(model: AvailableModelDto): boolean {
  return (model.availability ?? 'available') === 'available';
}

export function modelAvailabilityMessage(model: AvailableModelDto): string | null {
  if (isModelAvailable(model)) return null;
  const code = model.availabilityReasonCode ?? model.availability ?? 'unavailable';
  const messages: Readonly<Record<string, string>> = {
    tier_locked: 'Requires a different account tier',
    policy_blocked: 'Blocked by host policy',
    unavailable: 'No longer available',
  };
  return messages[code] ?? 'Unavailable';
}

export function modelCapabilities(model: AvailableModelDto): readonly string[] {
  const capabilities: string[] = [];
  if (model.reasoning === true) capabilities.push('Reasoning');
  if (model.input?.includes('image') === true) capabilities.push('Vision');
  if (model.tools === true) capabilities.push('Tools');
  if (model.contextWindow !== undefined) {
    capabilities.push(`${formatCompactNumber(model.contextWindow)} context`);
  }
  if (model.maxTokens !== undefined)
    capabilities.push(`${formatCompactNumber(model.maxTokens)} max`);
  if (model.pricing?.inputPerMillion !== undefined) {
    capabilities.push(
      `${formatPrice(model.pricing.inputPerMillion, model.pricing.currency)} / 1M input`,
    );
  }
  if (model.pricing?.outputPerMillion !== undefined) {
    capabilities.push(
      `${formatPrice(model.pricing.outputPerMillion, model.pricing.currency)} / 1M output`,
    );
  }
  return capabilities;
}

export function organizeModelCatalog(
  models: readonly AvailableModelDto[],
  current: AvailableModelDto | null,
  preserveModelOrder = false,
): OrganizedModelCatalog {
  const currentKey = current === null ? null : modelKey(current);
  const currentInCatalog =
    currentKey !== null && models.some((model) => modelKey(model) === currentKey);
  const providers = new Map<string, AvailableModelDto[]>();

  for (const model of models) {
    const group = providers.get(model.provider) ?? [];
    group.push(model);
    providers.set(model.provider, group);
  }

  const orderedProviders = [...providers.keys()].sort((first, second) => {
    if (current !== null) {
      if (first === current.provider && second !== current.provider) return -1;
      if (second === current.provider && first !== current.provider) return 1;
    }
    return collator.compare(displayModelText(first), displayModelText(second));
  });

  return {
    retiredCurrent: current !== null && !currentInCatalog ? current : null,
    groups: orderedProviders.map((provider) => ({
      provider,
      providerLabel: displayModelText(provider),
      models: [...(providers.get(provider) ?? [])].sort((first, second) => {
        if (currentKey !== null) {
          if (modelKey(first) === currentKey && modelKey(second) !== currentKey) return -1;
          if (modelKey(second) === currentKey && modelKey(first) !== currentKey) return 1;
        }
        if (preserveModelOrder) return 0;
        return compareModels(first, second);
      }),
    })),
  };
}

export function matchesModel(model: AvailableModelDto, query: string): boolean {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) return true;
  return [model.label, model.provider, model.id].some((value) =>
    normalize(value).includes(normalizedQuery),
  );
}

export function filterAndRankModels(
  models: readonly AvailableModelDto[],
  query: string,
): readonly AvailableModelDto[] {
  const normalizedQuery = normalize(query);
  return models
    .filter((model) => matchesModel(model, query))
    .sort((first, second) => {
      const firstPrefix =
        normalizedQuery.length > 0 && normalize(first.id).startsWith(normalizedQuery);
      const secondPrefix =
        normalizedQuery.length > 0 && normalize(second.id).startsWith(normalizedQuery);
      if (firstPrefix !== secondPrefix) return firstPrefix ? -1 : 1;
      return compareModels(first, second);
    });
}

function compareModels(first: AvailableModelDto, second: AvailableModelDto): number {
  return (
    collator.compare(displayModelText(first.label), displayModelText(second.label)) ||
    collator.compare(displayModelText(first.id), displayModelText(second.id))
  );
}

function normalize(value: string): string {
  return displayModelText(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 4,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${displayModelText(currency)}`;
  }
}
