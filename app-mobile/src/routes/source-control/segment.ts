// ───────────────────────────────────────────────────────────────────
// MODULE: Source Control Segment Route
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SourceControlHubData, SourceControlSegment } from '../../pages/chat/source-control/source-control-types.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface SourceControlRouteData {
  readonly sourceControl?: SourceControlHubData | null;
  readonly sourceControlCapability?: boolean;
  readonly requestedSegment?: string | null;
}

export interface SourceControlRouteProps {
  readonly data?: SourceControlRouteData | null;
}

// ───────────────────────────────────────────────────────────────────
// 3. ROUTE RESOLUTION
// ───────────────────────────────────────────────────────────────────

/** Keep stale or incomplete deep links on the hub's usable default segment. */
export function resolveSourceControlSegment(
  value: string | null | undefined,
): SourceControlSegment {
  switch (value) {
    case 'changes':
    case 'pr':
    case 'commits':
      return value;
    default:
      return 'changes';
  }
}
