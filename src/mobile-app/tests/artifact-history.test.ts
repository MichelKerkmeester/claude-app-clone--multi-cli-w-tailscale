import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createArtifactHistory } from '../src/artifacts/useArtifactHistory.js';

afterEach(() => {
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe('useArtifactHistory', () => {
  it('pushes one opaque entry and cleans it on explicit close', () => {
    const onBack = vi.fn();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const controller = createArtifactHistory(onBack);
    const before = window.history.length;
    const previousState = window.history.state;

    controller.open();
    expect(window.history.length).toBe(before + 1);
    expect(window.history.state).toEqual(
      expect.objectContaining({ __piRemoteArtifactViewer: expect.any(String) }),
    );

    controller.open();
    expect(window.history.length).toBe(before + 1);
    controller.close();
    expect(back).toHaveBeenCalledOnce();
    expect(window.history.state).toEqual(previousState);
    expect(onBack).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('routes a popstate to close without changing the session URL', () => {
    const onBack = vi.fn();
    const controller = createArtifactHistory(onBack);
    const locationBefore = window.location.href;
    controller.open();

    act(() => window.dispatchEvent(new PopStateEvent('popstate')));

    expect(onBack).toHaveBeenCalledOnce();
    expect(window.location.href).toBe(locationBefore);
    controller.dispose();
  });
});
