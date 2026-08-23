import type { AvailableModelDto } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  filterAndRankModels,
  isModelAvailable,
  modelAvailabilityMessage,
  modelKey,
  organizeModelCatalog,
} from '../src/shared/catalog/model-catalog.js';

const MODELS: readonly AvailableModelDto[] = [
  { provider: 'Zeta', id: 'zeta-standard', label: 'Zeta Standard' },
  { provider: 'Alpha', id: 'alpha-pro', label: 'Álpha Pro', reasoning: true },
  { provider: 'Alpha', id: 'alpha-mini', label: 'Alpha Mini' },
];

describe('model catalog helpers', () => {
  it('uses encoded stable identity and deterministic current-first grouping', () => {
    expect(modelKey({ provider: 'host provider', id: 'model/one' })).toBe(
      'host%20provider/model%2Fone',
    );
    const catalog = organizeModelCatalog(MODELS, MODELS[0] ?? null);
    expect(catalog.groups.map((group) => group.provider)).toEqual(['Zeta', 'Alpha']);
    expect(catalog.groups[1]?.models.map((model) => model.id)).toEqual(['alpha-mini', 'alpha-pro']);
  });

  it('pins a retired current model without adding it to an available provider group', () => {
    const retired = { provider: 'Legacy', id: 'legacy-one', label: 'Legacy One' };
    const catalog = organizeModelCatalog(MODELS, retired);
    expect(catalog.retiredCurrent).toEqual(retired);
    expect(catalog.groups.flatMap((group) => group.models)).not.toContainEqual(retired);
  });

  it('matches diacritics insensitively and ranks ID prefixes first', () => {
    expect(filterAndRankModels(MODELS, 'alpha').map((model) => model.id)).toEqual([
      'alpha-mini',
      'alpha-pro',
    ]);
    expect(filterAndRankModels(MODELS, 'Alphá Pro')).toEqual([MODELS[1]]);
  });

  it('maps availability from static reason codes', () => {
    const blocked: AvailableModelDto = {
      ...MODELS[0]!,
      availability: 'policy_blocked',
      availabilityReasonCode: 'policy_blocked',
    };
    expect(isModelAvailable(blocked)).toBe(false);
    expect(modelAvailabilityMessage(blocked)).toBe('Blocked by host policy');
  });
});
