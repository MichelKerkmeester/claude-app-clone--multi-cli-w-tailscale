// ───────────────────────────────────────────────────────────────────
// MODULE: Host-gated inbox acknowledgment
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The host capability required before an acknowledgment can be requested or applied. */
export interface InboxAckCapability {
  readonly ackDone?: boolean;
}

/** Device-local intent to request a host acknowledgment for an opened item. */
export interface InboxAckIntent {
  readonly type: 'attention-ack';
  readonly lookupId: string;
}

/** The host confirmation that an acknowledgment was completed and re-broadcast. */
export interface InboxAckDoneRebroadcast {
  readonly ackDone: true;
  readonly lookupId: string;
}

// ───────────────────────────────────────────────────────────────────
// 2. CAPABILITY AND INPUT GUARDS
// ───────────────────────────────────────────────────────────────────

function hasAckDoneCapability(capability: InboxAckCapability | undefined): boolean {
  return (
    capability !== undefined &&
    Object.prototype.hasOwnProperty.call(capability, 'ackDone') &&
    capability.ackDone === true
  );
}

function isAckDoneRebroadcast(
  rebroadcast: InboxAckDoneRebroadcast | undefined,
): rebroadcast is InboxAckDoneRebroadcast {
  return (
    rebroadcast !== undefined &&
    Object.prototype.hasOwnProperty.call(rebroadcast, 'ackDone') &&
    rebroadcast.ackDone === true &&
    typeof rebroadcast.lookupId === 'string' &&
    rebroadcast.lookupId.length > 0
  );
}

// ───────────────────────────────────────────────────────────────────
// 3. PURE ACKNOWLEDGMENT TRANSITIONS
// ───────────────────────────────────────────────────────────────────

/** Return an open intent only when the host advertises the completion edge. */
export function createInboxAckIntent(
  lookupId: string,
  capability: InboxAckCapability | undefined,
): InboxAckIntent | undefined {
  if (!hasAckDoneCapability(capability) || lookupId.length === 0) return undefined;
  return { type: 'attention-ack', lookupId };
}

/** Add only a host-confirmed acknowledgment to the device-local read overlay. */
export function applyInboxAckDoneRebroadcast(
  readIds: ReadonlySet<string>,
  rebroadcast: InboxAckDoneRebroadcast | undefined,
  capability: InboxAckCapability | undefined,
): Set<string> {
  const next = new Set(readIds);
  if (!hasAckDoneCapability(capability) || !isAckDoneRebroadcast(rebroadcast)) return next;
  next.add(rebroadcast.lookupId);
  return next;
}
