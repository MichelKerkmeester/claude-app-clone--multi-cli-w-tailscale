// ───────────────────────────────────────────────────────────────────
// MODULE: Banner Retraction Race Guard
// ───────────────────────────────────────────────────────────────────

// A dismissal is remembered before a pending banner is committed. This keeps
// a late show from reviving a notification that another surface already closed.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface BannerNotice {
  readonly id: string;
}

export interface BannerRetractionState {
  readonly dismissedIds: ReadonlySet<string>;
  readonly pendingIds: ReadonlySet<string>;
  readonly visibleIds: ReadonlySet<string>;
}

export interface BannerOperation {
  readonly type: 'show' | 'retract';
  readonly id: string;
}

export interface BannerRetractionTransition {
  readonly state: BannerRetractionState;
  readonly operations: readonly BannerOperation[];
}

// ───────────────────────────────────────────────────────────────────
// 2. STATE AND VALIDATION
// ───────────────────────────────────────────────────────────────────

export function createBannerRetractionState(): BannerRetractionState {
  return { dismissedIds: new Set(), pendingIds: new Set(), visibleIds: new Set() };
}

function isNotice(value: unknown): value is BannerNotice {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && candidate.id.length > 0;
}

function validId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0;
}

function unchanged(state: BannerRetractionState): BannerRetractionTransition {
  return { state, operations: [] };
}

function withId(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  next.add(id);
  return next;
}

function withoutId(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  next.delete(id);
  return next;
}

// ───────────────────────────────────────────────────────────────────
// 3. SHOW TRANSACTION
// ───────────────────────────────────────────────────────────────────

/** Reserve a show slot without emitting a visible operation yet. */
export function requestBannerShow(
  current: BannerRetractionState,
  notice: BannerNotice | null | undefined,
): BannerRetractionTransition {
  if (!isNotice(notice)) return unchanged(current);
  if (
    current.dismissedIds.has(notice.id) ||
    current.pendingIds.has(notice.id) ||
    current.visibleIds.has(notice.id)
  ) {
    return unchanged(current);
  }
  return { state: { ...current, pendingIds: withId(current.pendingIds, notice.id) }, operations: [] };
}

/** Emit show only if the reserved notice is still allowed to appear. */
export function commitBannerShow(
  current: BannerRetractionState,
  id: string,
): BannerRetractionTransition {
  if (!validId(id) || !current.pendingIds.has(id) || current.dismissedIds.has(id)) {
    return unchanged(current);
  }
  return {
    state: {
      ...current,
      pendingIds: withoutId(current.pendingIds, id),
      visibleIds: withId(current.visibleIds, id),
    },
    operations: [{ type: 'show', id }],
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. DISMISSAL
// ───────────────────────────────────────────────────────────────────

/** Record dismissal first, then retract only a banner that is visible. */
export function dismissBanner(
  current: BannerRetractionState,
  id: string,
): BannerRetractionTransition {
  if (!validId(id) || current.dismissedIds.has(id)) return unchanged(current);

  const visible = current.visibleIds.has(id);
  return {
    state: {
      ...current,
      dismissedIds: withId(current.dismissedIds, id),
      pendingIds: withoutId(current.pendingIds, id),
      visibleIds: visible ? withoutId(current.visibleIds, id) : current.visibleIds,
    },
    operations: visible ? [{ type: 'retract', id }] : [],
  };
}
