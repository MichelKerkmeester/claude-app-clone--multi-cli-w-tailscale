// ───────────────────────────────────────────────────────────────────
// MODULE: Session stack navigation coordinator tests
// ───────────────────────────────────────────────────────────────────

// A notification tap racing a card tap must occupy one slot: same-host
// retargets, an empty slot cancel-and-restarts, and an occupied slot
// replaces instead of pushing a second route. Exit pops when home is
// under the chat and replaces when the chat is the root.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  completeAttentionNavigation,
  coordinateSessionStackNavigation,
  dismissSessionToHome,
  markSessionPushedFromHome,
  markSessionReplacedAsRoot,
  navigateSessionStack,
  navigateToSessionStackRoute,
  resetSessionStackNavigation,
  sessionExitAction,
  sessionStackHostId,
  sessionStackHref,
  bindSessionStackRouter,
  type SessionStackRouter,
  type StackNavTarget,
} from '../src/shared/state/session-stack-navigation.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function sessionTarget(sessionId: string): StackNavTarget {
  return { kind: 'session', sessionId };
}

function attentionTarget(lookupId: string): StackNavTarget {
  return { kind: 'attention', lookupId };
}

function homeLocation() {
  return { pathname: '/' };
}

function attentionLocation(lookupId: string) {
  return { pathname: `/attention/${encodeURIComponent(lookupId)}` };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function makeRouter(): SessionStackRouter & {
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  pop: ReturnType<typeof vi.fn>;
} {
  return {
    push: vi.fn(async () => undefined),
    replace: vi.fn(async () => undefined),
    pop: vi.fn(),
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. SETUP
// ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetSessionStackNavigation();
});

afterEach(() => {
  resetSessionStackNavigation();
});

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

describe('session stack hrefs', () => {
  it('encodes a session id and never exposes the blank attention route', () => {
    expect(sessionStackHref(sessionTarget('session/one'))).toBe(
      `/session/${encodeURIComponent('session/one')}`,
    );
    expect(sessionStackHref(attentionTarget('hint-1'))).toBeNull();
    expect(sessionStackHostId(sessionTarget('s1'))).toBe('s1');
    expect(sessionStackHostId(attentionTarget('hint-1'))).toBe('attention:hint-1');
  });
});

describe('single-slot session stack navigation', () => {
  it('retargets a still-pending transition to the same host instead of pushing twice', async () => {
    const router = makeRouter();
    let settlePush: (() => void) | undefined;
    router.push.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          settlePush = resolve;
        }),
    );

    const pending = coordinateSessionStackNavigation(
      null,
      router,
      homeLocation(),
      'session_a',
      sessionTarget('session_a'),
    );
    const retargeted = coordinateSessionStackNavigation(
      pending,
      router,
      homeLocation(),
      'session_a',
      sessionTarget('session_a'),
    );

    expect(retargeted).toBe(pending);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/session/session_a');
    expect(router.replace).not.toHaveBeenCalled();

    settlePush?.();
    await flush();
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces the occupied slot when a notification tap races a different session', async () => {
    const router = makeRouter();
    let settlePush: (() => void) | undefined;
    router.push.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          settlePush = resolve;
        }),
    );

    const pending = coordinateSessionStackNavigation(
      null,
      router,
      homeLocation(),
      'session_card',
      sessionTarget('session_card'),
    );
    coordinateSessionStackNavigation(
      pending,
      router,
      homeLocation(),
      'session_notice',
      sessionTarget('session_notice'),
    );

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/session/session_card');

    settlePush?.();
    await flush();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/session/session_notice');
  });

  it('cancels an unresolved attention slot and starts the card session once', async () => {
    const router = makeRouter();

    const pending = coordinateSessionStackNavigation(
      null,
      router,
      attentionLocation('hint-9'),
      'attention:hint-9',
      attentionTarget('hint-9'),
    );
    await flush();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    coordinateSessionStackNavigation(
      pending,
      router,
      homeLocation(),
      'session_card',
      sessionTarget('session_card'),
    );
    await flush();

    expect(pending.controller.isActive()).toBe(false);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/session/session_card');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces the attention resolver once the hint resolves to a session', async () => {
    const router = makeRouter();
    bindSessionStackRouter(router);

    navigateSessionStack(attentionLocation('hint-3'), attentionTarget('hint-3'));
    await flush();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    const accepted = completeAttentionNavigation('hint-3', sessionTarget('session_from_hint'));
    expect(accepted).toBe(true);
    await flush();

    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/session/session_from_hint');
  });

  it('drops a late attention resolve after the person already opened another session', async () => {
    const router = makeRouter();
    bindSessionStackRouter(router);

    navigateSessionStack(attentionLocation('hint-late'), attentionTarget('hint-late'));
    navigateSessionStack(homeLocation(), sessionTarget('session_card'));
    await flush();

    expect(completeAttentionNavigation('hint-late', sessionTarget('session_from_hint'))).toBe(false);
    await flush();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/session/session_card');
    expect(router.replace).not.toHaveBeenCalledWith('/session/session_from_hint');
  });

  it('does not replace after cancel even when the host route later settles', async () => {
    const router = makeRouter();
    let settlePush: (() => void) | undefined;
    router.push.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          settlePush = resolve;
        }),
    );

    const controller = navigateToSessionStackRoute(
      router,
      homeLocation(),
      sessionTarget('session_a'),
    );
    controller.cancel();
    settlePush?.();
    await flush();

    expect(controller.isActive()).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('stack-aware exit to home', () => {
  it('pops when the chat was pushed on top of home', () => {
    expect(sessionExitAction(true)).toBe('pop');
    const router = makeRouter();
    markSessionPushedFromHome();
    dismissSessionToHome(router);
    expect(router.pop).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces when the chat is the root from a deep link', () => {
    expect(sessionExitAction(false)).toBe('replace');
    const router = makeRouter();
    markSessionReplacedAsRoot();
    dismissSessionToHome(router);
    expect(router.pop).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
