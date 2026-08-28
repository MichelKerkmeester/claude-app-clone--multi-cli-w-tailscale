// MODULE: Push notification kind gate

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface PushKindGateItem {
  id: string;
  kind: string;
}

export interface PushKindGateInput {
  items?: readonly PushKindGateItem[];
  enabledByKind?: Readonly<Record<string, boolean>>;
  throttleLimit?: number;
}

// ───────────────────────────────────────────────────────────────────
// 2. GATING
// ───────────────────────────────────────────────────────────────────

// Removes muted kinds before shared throttle accounting so enabled kinds keep their budget.
export function applyPushKindGateThenThrottle(input: PushKindGateInput): PushKindGateItem[] {
  const { items, enabledByKind, throttleLimit } = input;

  if (
    !items ||
    !enabledByKind ||
    typeof throttleLimit !== 'number' ||
    !Number.isInteger(throttleLimit) ||
    throttleLimit <= 0
  ) {
    return [];
  }

  return items.filter((item) => enabledByKind[item.kind] === true).slice(0, throttleLimit);
}
