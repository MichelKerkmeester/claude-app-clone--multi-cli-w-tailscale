// MODULE: Inbox timeline behavior

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  INBOX_DEDUP_WINDOW_MS,
  type InboxEvent,
  buildInboxTimeline,
  deduplicateInboxEvents,
  orderInboxTimeline,
  retainInboxEvents,
  supersedeInboxEvents,
} from "../src/shared/format/inbox-timeline";

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<InboxEvent> = {}): InboxEvent {
  return {
    eventId: "event-default",
    sessionId: "session-default",
    nodeId: "node-default",
    title: "Choose an action",
    kind: "question",
    content: "Choose an action",
    occurredAt: 0,
    resolved: false,
    options: ["Approve", "Decline"],
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe("inbox timeline", () => {
  it("orders a cross-session fixture newest-first and keeps each session key", () => {
    const events = [
      makeEvent({ eventId: "session-a-earlier", sessionId: "session-a", occurredAt: 10 }),
      makeEvent({ eventId: "session-c-newest", sessionId: "session-c", occurredAt: 40 }),
      makeEvent({ eventId: "session-b-middle", sessionId: "session-b", occurredAt: 30 }),
      makeEvent({ eventId: "session-a-newer", sessionId: "session-a", occurredAt: 20 }),
    ];

    expect(orderInboxTimeline(events).map(({ eventId, sessionId }) => [eventId, sessionId])).toEqual([
      ["session-c-newest", "session-c"],
      ["session-b-middle", "session-b"],
      ["session-a-newer", "session-a"],
      ["session-a-earlier", "session-a"],
    ]);
  });

  it("returns no timeline when the event capability is absent or empty", () => {
    expect(buildInboxTimeline(undefined)).toEqual([]);
    expect(buildInboxTimeline([])).toEqual([]);
    expect(retainInboxEvents([])).toEqual([]);
  });
});

describe("inbox deduplication", () => {
  it("keeps one card when the same session title repeats just inside the ten-minute window", () => {
    const events = [
      makeEvent({ eventId: "older-repeat", sessionId: "session-a", occurredAt: 1_000 }),
      makeEvent({
        eventId: "newer-repeat",
        sessionId: "session-a",
        occurredAt: 1_000 + INBOX_DEDUP_WINDOW_MS - 1,
      }),
    ];

    expect(deduplicateInboxEvents(events).map(({ eventId }) => eventId)).toEqual(["newer-repeat"]);
  });

  it("keeps both cards when the same session title repeats just outside the ten-minute window", () => {
    const events = [
      makeEvent({ eventId: "older-repeat", sessionId: "session-a", occurredAt: 1_000 }),
      makeEvent({
        eventId: "newer-repeat",
        sessionId: "session-a",
        occurredAt: 1_000 + INBOX_DEDUP_WINDOW_MS + 1,
      }),
    ];

    expect(deduplicateInboxEvents(events).map(({ eventId }) => eventId)).toEqual([
      "newer-repeat",
      "older-repeat",
    ]);
  });
});

describe("inbox supersession", () => {
  it("removes answered choices and keeps the changed ask instead of the old content", () => {
    const answered = makeEvent({
      eventId: "answered-ask",
      resolved: true,
      options: ["Approve", "Decline"],
      occurredAt: 5_000,
    });
    const oldContent = makeEvent({
      eventId: "old-content",
      sessionId: "session-b",
      title: "Review changes",
      content: "Review the original changes",
      occurredAt: 1_000,
    });
    const newContent = makeEvent({
      eventId: "new-content",
      sessionId: "session-b",
      title: "Review changes",
      content: "Review the updated changes",
      occurredAt: 1_000 + INBOX_DEDUP_WINDOW_MS + 1,
    });

    const timeline = buildInboxTimeline([answered, oldContent, newContent]);

    expect(timeline.find(({ eventId }) => eventId === "answered-ask")?.options).toEqual([]);
    expect(timeline.map(({ eventId }) => eventId)).toEqual(["new-content", "answered-ask"]);
    expect(timeline.find(({ eventId }) => eventId === "new-content")?.content).toBe(
      "Review the updated changes",
    );
  });

  it("does not resurrect older content when superseding an ask", () => {
    const oldContent = makeEvent({
      eventId: "old-content",
      sessionId: "session-c",
      title: "Confirm release",
      content: "Confirm the first release",
      occurredAt: 1_000,
    });
    const newContent = makeEvent({
      eventId: "new-content",
      sessionId: "session-c",
      title: "Confirm release",
      content: "Confirm the corrected release",
      occurredAt: 1_000 + INBOX_DEDUP_WINDOW_MS + 1,
    });

    expect(supersedeInboxEvents([oldContent, newContent])).toEqual([newContent]);
  });
});

describe("inbox retention", () => {
  it("retains the newest done and unresolved event for every supplied node", () => {
    const events = [
      makeEvent({ eventId: "node-a-done-old", nodeId: "node-a", occurredAt: 100, resolved: true }),
      makeEvent({ eventId: "node-a-open-old", nodeId: "node-a", occurredAt: 200, resolved: false }),
      makeEvent({ eventId: "node-a-done-new", nodeId: "node-a", occurredAt: 600, resolved: true }),
      makeEvent({ eventId: "node-a-open-new", nodeId: "node-a", occurredAt: 500, resolved: false }),
      makeEvent({ eventId: "node-b-done", nodeId: "node-b", occurredAt: 400, resolved: true }),
      makeEvent({ eventId: "node-b-open", nodeId: "node-b", occurredAt: 300, resolved: false }),
    ];

    const inputNodeIds = new Set(events.map(({ nodeId }) => nodeId));
    const retained = retainInboxEvents(events);

    expect(retained.map(({ eventId }) => eventId)).toEqual([
      "node-a-done-new",
      "node-a-open-new",
      "node-b-done",
      "node-b-open",
    ]);
    expect(new Set(retained.map(({ nodeId }) => nodeId))).toEqual(new Set(["node-a", "node-b"]));
    expect(retained.every(({ nodeId }) => inputNodeIds.has(nodeId))).toBe(true);
  });
});
