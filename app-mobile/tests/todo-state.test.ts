import type {
  Envelope,
  SyncDelta,
  SyncSnapshot,
  TodoProjectionDeltaV1,
  TodoProjectionV1,
  TodoTaskProjectionV1,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { buildTodoDisplayModel } from '../src/shared/state/todo-model.js';
import { EMPTY_TODO_PROJECTION_STATE, todoProjectionReducer } from '../src/shared/state/todo-state.js';

const sessionId = 'session_todos_001';
const epoch = 'epoch_todos_001';
const updatedAt = '2026-08-18T10:00:00.000Z';

function task(
  id: string,
  state: TodoTaskProjectionV1['state'],
  order: number,
  group: string | null = null,
  revision = 1,
  title = `Title ${id}`,
):
  | TodoTaskProjectionV1
  | (TodoTaskProjectionV1 & { readonly [key: string]: unknown }) {
  return { id, title, state, group, order, revision, updatedAt };
}

function projection(
  tasks: readonly TodoTaskProjectionV1[],
  revision = 1,
  planId = 'plan_todos_001',
): TodoProjectionV1 {
  return { planId, source: 'pi', revision, updatedAt, tasks };
}

function envelope(
  kind: string,
  payload: TodoProjectionV1 | TodoProjectionDeltaV1,
  seq: number,
  epochOverride: string = epoch,
): Envelope {
  return {
    v: 1,
    eventId: `event_todos_${seq}`,
    kind,
    hostId: 'host_todos_001',
    workspaceRef: 'workspace_todos_001',
    sessionId,
    epoch: epochOverride,
    seq,
    occurredAt: updatedAt,
    causedBy: null,
    payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
}

function deltaMessage(
  payload: TodoProjectionDeltaV1,
  seq: number,
  coversThrough = seq,
  epochOverride: string = epoch,
): SyncDelta {
  return {
    kind: 'sync.delta',
    sessionId,
    epoch: epochOverride,
    coversThrough,
    envelopes: [envelope('todo.delta.v1', payload, seq, epochOverride)],
  };
}

function snapshotMessage(
  payload: TodoProjectionV1,
  seq: number,
  epochOverride: string = epoch,
): SyncSnapshot {
  return {
    kind: 'sync.snapshot',
    sessionId,
    epoch: epochOverride,
    coversThrough: seq,
    envelopes: [envelope('todo.snapshot.v1', payload, seq, epochOverride)],
  };
}

function selectedState() {
  return todoProjectionReducer(EMPTY_TODO_PROJECTION_STATE, { type: 'select', sessionId });
}

describe('todo display model', () => {
  it('uses the closed state order while preserving host order and contiguous group headings', () => {
    const model = buildTodoDisplayModel(
      projection([
        task('task_pending_late', 'pending', 30, 'Panel'),
        task('task_done', 'done', 40, 'Protocol'),
        task('task_pending_early', 'pending', 10, 'Panel'),
        task('task_active', 'active', 20, 'State'),
        task('task_blocked', 'blocked', 50),
      ]),
    );

    expect(model.sections.map((section) => section.state)).toEqual([
      'pending',
      'active',
      'done',
      'blocked',
    ]);
    expect(model.sections[0]?.groups[0]?.group).toBe('Panel');
    expect(model.sections[0]?.groups[0]?.tasks.map((entry) => entry.id)).toEqual([
      'task_pending_early',
      'task_pending_late',
    ]);
    expect(model).toMatchObject({ totalCount: 5, doneCount: 1, allDone: false });
  });

  it('distinguishes empty plans from all-done plans', () => {
    expect(buildTodoDisplayModel(projection([]))).toMatchObject({
      totalCount: 0,
      doneCount: 0,
      progressPercent: null,
      allDone: false,
    });
    expect(buildTodoDisplayModel(projection([task('task_done', 'done', 1)]))).toMatchObject({
      totalCount: 1,
      doneCount: 1,
      progressPercent: 100,
      allDone: true,
    });
  });
});

describe('todo projection state', () => {
  it('accepts a validated snapshot separately from transcript state', () => {
    const snapshot = snapshotMessage(projection([task('task_001', 'pending', 1)]), 7);

    const state = todoProjectionReducer(selectedState(), { type: 'snapshot', message: snapshot });

    expect(state.availability).toBe('available');
    expect(state.anchorSeq).toBe(7);
    expect(state.projection?.tasks[0]?.id).toBe('task_001');
  });

  it('applies a matching delta by stable id and host order', () => {
    const initial = projection([
      task('task_keep', 'pending', 20),
      task('task_change', 'active', 10),
    ]);
    const snapshot = snapshotMessage(initial, 2);
    const deltaPayload: TodoProjectionDeltaV1 = {
      planId: initial.planId,
      baseRevision: 1,
      revision: 2,
      upsertedTasks: [{ ...task('task_change', 'done', 30), revision: 2 }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta = deltaMessage(deltaPayload, 3);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, { type: 'delta', message: delta });

    expect(state.projection?.revision).toBe(2);
    expect(state.projection?.tasks.map((entry) => entry.id)).toEqual(['task_keep', 'task_change']);
    expect(state.projection?.tasks[1]?.state).toBe('done');
    expect(state.anchorSeq).toBe(2);
  });

  it('preserves the last valid view and requests read-only refresh on a base mismatch', () => {
    const current = projection([task('task_001', 'pending', 1)]);
    const snapshot = snapshotMessage(current, 1);
    const invalidDelta: TodoProjectionDeltaV1 = {
      planId: current.planId,
      baseRevision: 9,
      revision: 10,
      upsertedTasks: [{ ...task('task_001', 'done', 1), revision: 10 }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta = deltaMessage(invalidDelta, 2);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, { type: 'delta', message: delta });

    expect(state.projection).toBe(hydrated.projection);
    expect(state.projection?.tasks[0]?.state).toBe('pending');
    expect(state).toMatchObject({ needsRefresh: true, refreshing: true });
  });

  it('fails closed for an unsupported capability without fabricating rows', () => {
    const unsupported = todoProjectionReducer(selectedState(), {
      type: 'capability',
      capability: null,
    });
    const snapshot = snapshotMessage(
      projection([task('task_unsupported', 'pending', 1)]),
      1,
    );
    const afterEnvelope = todoProjectionReducer(unsupported, {
      type: 'snapshot',
      message: snapshot,
    });

    expect(unsupported).toMatchObject({ availability: 'unsupported', projection: null });
    expect(afterEnvelope).toMatchObject({ availability: 'unsupported', projection: null });
  });

  it('ignores a stale delta whose revision is not strictly newer', () => {
    const initial = projection([task('task_001', 'pending', 1)]);
    const snapshot = snapshotMessage({ ...initial, revision: 2 }, 2);
    const staleDelta: TodoProjectionDeltaV1 = {
      planId: initial.planId,
      baseRevision: 2,
      revision: 1,
      upsertedTasks: [{ ...task('task_001', 'done', 1), revision: 1 }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta = deltaMessage(staleDelta, 3);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, { type: 'delta', message: delta });

    expect(state.projection).toBe(hydrated.projection);
    expect(state.projection?.revision).toBe(2);
    expect(state.projection?.tasks[0]?.state).toBe('pending');
  });

  it('replaces the projection when the plan identity changes', () => {
    const initial = projection([task('task_001', 'pending', 1)], 1, 'plan_a');
    const snapshot = snapshotMessage(initial, 1);
    const otherPlan = projection([task('task_other', 'active', 1)], 1, 'plan_b');
    const replacement = snapshotMessage(otherPlan, 5);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, {
      type: 'snapshot',
      message: replacement,
    });

    expect(state.projection?.planId).toBe('plan_b');
    expect(state.projection?.tasks).toHaveLength(1);
    expect(state.projection?.tasks[0]?.id).toBe('task_other');
  });

  it('removes host-deleted tasks via the delta removedTaskIds list', () => {
    const initial = projection([
      task('task_keep', 'pending', 1),
      task('task_drop', 'active', 2),
    ]);
    const snapshot = snapshotMessage(initial, 2);
    const deltaPayload: TodoProjectionDeltaV1 = {
      planId: initial.planId,
      baseRevision: 1,
      revision: 2,
      upsertedTasks: [],
      removedTaskIds: ['task_drop'],
      updatedAt,
    };
    const delta = deltaMessage(deltaPayload, 3);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, { type: 'delta', message: delta });

    expect(state.projection?.tasks.map((entry) => entry.id)).toEqual(['task_keep']);
    expect(state.projection?.revision).toBe(2);
  });

  it('keeps the older task row when an incoming upsert carries a lower revision', () => {
    const initial = projection([
      task('task_stable', 'pending', 1, null, 5),
      task('task_changed', 'pending', 2, null, 5),
    ]);
    const snapshot = snapshotMessage(initial, 2);
    const deltaPayload: TodoProjectionDeltaV1 = {
      planId: initial.planId,
      baseRevision: 1,
      revision: 2,
      upsertedTasks: [{ ...task('task_changed', 'done', 2, null, 4) }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta = deltaMessage(deltaPayload, 3);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, { type: 'delta', message: delta });

    expect(state.projection?.tasks[1]?.state).toBe('pending');
    expect(state.projection?.tasks[1]?.revision).toBe(5);
  });

  it('resets the projection cleanly when a session switches', () => {
    const initial = projection([task('task_001', 'pending', 1)]);
    const snapshot = snapshotMessage(initial, 1);
    const selected = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const switched = todoProjectionReducer(selected, {
      type: 'select',
      sessionId: 'session_other_001',
    });

    expect(switched).toMatchObject({
      sessionId: 'session_other_001',
      projection: null,
      availability: 'waiting',
      announcement: '',
    });
  });

  it('made-up deltas chain before any snapshot are rejected without inventing a chain', () => {
    const selected = todoProjectionReducer(EMPTY_TODO_PROJECTION_STATE, {
      type: 'select',
      sessionId,
    });
    const deltaPayload: TodoProjectionDeltaV1 = {
      planId: 'plan_unknown_001',
      baseRevision: 1,
      revision: 2,
      upsertedTasks: [{ ...task('task_late', 'active', 1) }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta = deltaMessage(deltaPayload, 1);

    const state = todoProjectionReducer(selected, { type: 'delta', message: delta });

    expect(state.projection).toBeNull();
    expect(state).toMatchObject({ needsRefresh: true, refreshing: true });
  });

  it('announces once with the redacted title and localized state on a per-task change', () => {
    const initial = projection([
      task('task_a', 'pending', 1),
      task('task_b', 'pending', 2),
    ]);
    const snapshot = snapshotMessage(initial, 2);
    const deltaPayload: TodoProjectionDeltaV1 = {
      planId: initial.planId,
      baseRevision: 1,
      revision: 2,
      upsertedTasks: [{ ...task('task_a', 'active', 1, null, 2) }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta = deltaMessage(deltaPayload, 3);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, { type: 'delta', message: delta });

    expect(state.announcement).toBe('Title task_a is now doing.');
  });

  it('keeps the projection untouched when a delta only repeats the current task revision', () => {
    const initial = projection([
      task('task_a', 'pending', 1),
      task('task_b', 'pending', 2),
    ]);
    const snapshot = snapshotMessage(initial, 2);
    const deltaPayload: TodoProjectionDeltaV1 = {
      planId: initial.planId,
      baseRevision: 1,
      revision: 2,
      upsertedTasks: [{ ...task('task_b', 'pending', 2, null, 1) }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta = deltaMessage(deltaPayload, 3);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, { type: 'delta', message: delta });

    expect(state.projection).toBe(hydrated.projection);
    expect(state.announcement).toBe(hydrated.announcement);
  });

  it('clearAnnouncement resets the live region without disturbing the projection', () => {
    const initial = projection([task('task_a', 'pending', 1)]);
    const snapshot = snapshotMessage(initial, 2);
    const deltaPayload: TodoProjectionDeltaV1 = {
      planId: initial.planId,
      baseRevision: 1,
      revision: 2,
      upsertedTasks: [{ ...task('task_a', 'active', 1, null, 2) }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta = deltaMessage(deltaPayload, 3);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const withAnnouncement = todoProjectionReducer(hydrated, {
      type: 'delta',
      message: delta,
    });
    const cleared = todoProjectionReducer(withAnnouncement, { type: 'clearAnnouncement' });

    expect(withAnnouncement.announcement).not.toBe('');
    expect(cleared).toMatchObject({
      projection: withAnnouncement.projection,
      announcement: '',
    });
  });

  it('all-done restoration: a new pending task recomputes progress from the authoritative snapshot', () => {
    const allDoneTasks = [
      task('task_a', 'done', 1),
      task('task_b', 'done', 2),
    ];
    const initial = projection(allDoneTasks);
    const snapshot = snapshotMessage(initial, 2);
    const restored = projection([
      task('task_a', 'done', 1),
      task('task_b', 'done', 2),
      task('task_c', 'pending', 3),
    ]);
    const replacement = snapshotMessage(restored, 5);

    const hydrated = todoProjectionReducer(selectedState(), {
      type: 'snapshot',
      message: snapshot,
    });
    const state = todoProjectionReducer(hydrated, {
      type: 'snapshot',
      message: replacement,
    });

    expect(state.projection?.tasks).toHaveLength(3);
    expect(state.projection?.revision).toBe(1);
    expect(state.projection?.tasks.map((entry) => entry.id)).toEqual([
      'task_a',
      'task_b',
      'task_c',
    ]);
  });
});
