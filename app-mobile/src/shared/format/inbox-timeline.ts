// MODULE: Inbox timeline formatting
// Nothing consumes this shaping layer until the host publishes an inbox-event stream.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The host-published fields needed to shape an inbox event without owning host truth. */
export interface InboxEvent {
  eventId: string;
  sessionId: string;
  nodeId: string;
  title: string;
  kind: string;
  content: string;
  occurredAt: number;
  resolved: boolean;
  options: readonly string[];
}

export type InboxEventStream = readonly InboxEvent[] | undefined;

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Repeated asks within this interval represent one visible card. */
export const INBOX_DEDUP_WINDOW_MS = 10 * 60 * 1000;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function eventKey(event: InboxEvent): string {
  return `${event.sessionId}\u0000${event.title}`;
}

function newestFirst(events: readonly InboxEvent[]): InboxEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort(
      (left, right) =>
        right.event.occurredAt - left.event.occurredAt || left.index - right.index,
    )
    .map(({ event }) => event);
}

function clearResolvedOptions(event: InboxEvent): InboxEvent {
  return event.resolved ? { ...event, options: [] } : event;
}

// ───────────────────────────────────────────────────────────────────
// 4. TIMELINE PROJECTIONS
// ───────────────────────────────────────────────────────────────────

/** Orders the host stream newest-first while preserving each event's session key. */
export function orderInboxTimeline(events: InboxEventStream): InboxEvent[] {
  return events?.length ? newestFirst(events) : [];
}

/** Collapses repeated asks that share a session and title inside the named window. */
export function deduplicateInboxEvents(events: InboxEventStream): InboxEvent[] {
  if (!events?.length) {
    return [];
  }

  const ordered = newestFirst(events);
  const newestByAsk = new Map<string, number>();
  const deduplicated: InboxEvent[] = [];

  for (const event of ordered) {
    const key = eventKey(event);
    const newestOccurredAt = newestByAsk.get(key);

    if (newestOccurredAt !== undefined && newestOccurredAt - event.occurredAt <= INBOX_DEDUP_WINDOW_MS) {
      continue;
    }

    newestByAsk.set(key, event.occurredAt);
    deduplicated.push(event);
  }

  return deduplicated;
}

/** Replaces older content or stale unresolved choices with the newest ask state. */
export function supersedeInboxEvents(events: InboxEventStream): InboxEvent[] {
  if (!events?.length) {
    return [];
  }

  const ordered = newestFirst(events);
  const newestByAsk = new Map<string, InboxEvent>();
  const superseded: InboxEvent[] = [];

  for (const event of ordered) {
    const key = eventKey(event);
    const newest = newestByAsk.get(key);

    if (!newest) {
      newestByAsk.set(key, event);
      superseded.push(event);
      continue;
    }

    if (newest.resolved || newest.content !== event.content) {
      continue;
    }

    superseded.push(event);
  }

  return superseded.map(clearResolvedOptions);
}

/** Builds the cross-session view without inventing events or resurrecting local data. */
export function buildInboxTimeline(events: InboxEventStream): InboxEvent[] {
  return supersedeInboxEvents(deduplicateInboxEvents(events));
}

// ───────────────────────────────────────────────────────────────────
// 5. RETENTION PROJECTION
// ───────────────────────────────────────────────────────────────────

/** Keeps only the newest resolved and newest unresolved event for every supplied node. */
export function retainInboxEvents(events: InboxEventStream): InboxEvent[] {
  if (!events?.length) {
    return [];
  }

  const retainedByNode = new Map<string, { done?: InboxEvent; unresolved?: InboxEvent }>();

  for (const event of newestFirst(events)) {
    const node = retainedByNode.get(event.nodeId) ?? {};

    if (event.resolved) {
      node.done ??= event;
    } else {
      node.unresolved ??= event;
    }

    retainedByNode.set(event.nodeId, node);
  }

  return newestFirst(
    [...retainedByNode.values()].flatMap(({ done, unresolved }) =>
      [done, unresolved].filter((event): event is InboxEvent => event !== undefined),
    ),
  );
}
