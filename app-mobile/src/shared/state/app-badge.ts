// ───────────────────────────────────────────────────────────────────
// MODULE: PWA App Badge Adapter
// ───────────────────────────────────────────────────────────────────

// The browser owns badge support and may reject these calls even after exposing
// the methods, so this adapter deliberately has no observable failure path.

// ───────────────────────────────────────────────────────────────────
// 1. TYPES
// ───────────────────────────────────────────────────────────────────

interface AppBadgeNavigator {
  readonly setAppBadge?: (contents?: number) => Promise<void>;
  readonly clearAppBadge?: () => Promise<void>;
}

// ───────────────────────────────────────────────────────────────────
// 2. ADAPTER
// ───────────────────────────────────────────────────────────────────

/** Apply a non-negative attention count when the browser supports app badges. */
export function updateAppBadge(count: number): void {
  if (!Number.isFinite(count) || count < 0 || typeof navigator === 'undefined') return;

  const badgeNavigator = navigator as unknown as AppBadgeNavigator;
  if (
    typeof badgeNavigator.setAppBadge !== 'function' ||
    typeof badgeNavigator.clearAppBadge !== 'function'
  ) {
    return;
  }

  try {
    const operation =
      count > 0 ? badgeNavigator.setAppBadge(count) : badgeNavigator.clearAppBadge();
    void Promise.resolve(operation).catch(() => undefined);
  } catch {
    return;
  }
}
