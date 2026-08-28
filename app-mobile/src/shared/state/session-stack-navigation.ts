// ───────────────────────────────────────────────────────────────────
// MODULE: Single-slot session stack navigation
// ───────────────────────────────────────────────────────────────────
// One in-flight transition owns the session/attention slot. A second tap
// retargets when it is still the same host, or cancels-and-restarts when
// the slot is empty. Once a push occupies the slot, later destinations
// replace instead of pushing again — a notification racing a card tap
// cannot stack two routes or land on the empty attention resolver.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type SessionStackTarget = Readonly<{
  kind: 'session';
  sessionId: string;
}>;

export type AttentionStackTarget = Readonly<{
  kind: 'attention';
  lookupId: string;
}>;

export type StackNavTarget = SessionStackTarget | AttentionStackTarget;

export type SessionStackLocation = Readonly<{
  pathname: string;
}>;

export type SessionStackRouter = {
  push: (href: string) => Promise<void> | void;
  replace: (href: string) => Promise<void> | void;
  pop: () => void;
};

export type SessionStackNavigationController = Readonly<{
  cancel: () => void;
  isActive: () => boolean;
  hasOccupied: () => boolean;
  retarget: (target: StackNavTarget) => void;
}>;

export type PendingSessionStackNavigation = Readonly<{
  hostId: string;
  controller: SessionStackNavigationController;
}>;

// ───────────────────────────────────────────────────────────────────
// 2. SLOT STATE
// ───────────────────────────────────────────────────────────────────

let pending: PendingSessionStackNavigation | null = null;
let homeOnStack = false;
let boundRouter: SessionStackRouter | null = null;

export function bindSessionStackRouter(router: SessionStackRouter): () => void {
  boundRouter = router;
  return () => {
    if (boundRouter === router) boundRouter = null;
  };
}

export function resetSessionStackNavigation(): void {
  pending?.controller.cancel();
  pending = null;
  homeOnStack = false;
}

export function isHomeOnSessionStack(): boolean {
  return homeOnStack;
}

export function markSessionPushedFromHome(): void {
  homeOnStack = true;
}

export function markSessionReplacedAsRoot(): void {
  homeOnStack = false;
}

function requireRouter(): SessionStackRouter {
  if (boundRouter === null) {
    throw new Error('Session stack navigation is not bound.');
  }
  return boundRouter;
}

// ───────────────────────────────────────────────────────────────────
// 3. HOST AND HREF
// ───────────────────────────────────────────────────────────────────

export function sessionStackHref(target: StackNavTarget): string | null {
  if (target.kind === 'attention') return null;
  return `/session/${encodeURIComponent(target.sessionId)}`;
}

export function sessionStackHostId(target: StackNavTarget): string {
  return target.kind === 'session' ? target.sessionId : `attention:${target.lookupId}`;
}

function occupyByReplace(pathname: string): boolean {
  return pathname.startsWith('/session/') || pathname.startsWith('/attention/');
}

// ───────────────────────────────────────────────────────────────────
// 4. TWO-PHASE PUSH
// ───────────────────────────────────────────────────────────────────

/** Push the session route first, then replace if the slot was retargeted before it settled. */
export function navigateToSessionStackRoute(
  router: SessionStackRouter,
  location: SessionStackLocation,
  target: StackNavTarget,
): SessionStackNavigationController {
  let active = true;
  let selected: StackNavTarget = target;
  let occupied = false;
  let inFlight = false;
  let queued = false;
  let committedHref: string | null = null;

  const run = async (): Promise<void> => {
    if (!active) return;
    if (inFlight) {
      queued = true;
      return;
    }
    const href = sessionStackHref(selected);
    if (href === null) return;
    inFlight = true;
    try {
      if (!occupied) {
        occupied = true;
        if (occupyByReplace(location.pathname)) {
          if (location.pathname.startsWith('/attention/')) homeOnStack = false;
          await router.replace(href);
        } else {
          homeOnStack = true;
          await router.push(href);
        }
        committedHref = href;
      }
      if (!active) return;
      const latest = sessionStackHref(selected);
      if (latest !== null && latest !== committedHref) {
        await router.replace(latest);
        committedHref = latest;
      }
    } finally {
      inFlight = false;
      if (queued && active) {
        queued = false;
        void run();
      }
    }
  };

  void run();
  return {
    cancel: () => {
      active = false;
    },
    isActive: () => active,
    hasOccupied: () => occupied,
    retarget: (nextTarget) => {
      if (!active) return;
      selected = nextTarget;
      void run();
    },
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. SINGLE-SLOT COORDINATOR
// ───────────────────────────────────────────────────────────────────

export function coordinateSessionStackNavigation(
  current: PendingSessionStackNavigation | null,
  router: SessionStackRouter,
  location: SessionStackLocation,
  hostId: string,
  target: StackNavTarget,
): PendingSessionStackNavigation {
  if (current?.controller.isActive()) {
    if (current.hostId === hostId) {
      current.controller.retarget(target);
      return current;
    }
    if (current.controller.hasOccupied()) {
      current.controller.retarget(target);
      return { hostId, controller: current.controller };
    }
    current.controller.cancel();
  }
  return {
    hostId,
    controller: navigateToSessionStackRoute(router, location, target),
  };
}

export function navigateSessionStack(location: SessionStackLocation, target: StackNavTarget): void {
  pending = coordinateSessionStackNavigation(
    pending,
    requireRouter(),
    location,
    sessionStackHostId(target),
    target,
  );
}

export function completeAttentionNavigation(
  lookupId: string,
  target: SessionStackTarget,
): boolean {
  const hostId = `attention:${lookupId}`;
  if (pending === null || !pending.controller.isActive() || pending.hostId !== hostId) {
    return false;
  }
  pending.controller.retarget(target);
  pending = { hostId: target.sessionId, controller: pending.controller };
  return true;
}

export function cancelSessionStackNavigation(): void {
  pending?.controller.cancel();
  pending = null;
}

// ───────────────────────────────────────────────────────────────────
// 6. STACK-AWARE EXIT
// ───────────────────────────────────────────────────────────────────

export function sessionExitAction(homeIsOnStack: boolean): 'pop' | 'replace' {
  return homeIsOnStack ? 'pop' : 'replace';
}

export function dismissSessionToHome(router: SessionStackRouter = requireRouter()): void {
  cancelSessionStackNavigation();
  const action = sessionExitAction(homeOnStack);
  homeOnStack = false;
  if (action === 'pop') {
    router.pop();
    return;
  }
  void router.replace('/');
}
