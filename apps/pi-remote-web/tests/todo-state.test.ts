import type {
  Envelope,
  SyncDelta,
  SyncSnapshot,
  TodoProjectionDeltaV1,
  TodoProjectionV1,
  TodoTaskProjectionV1,
} from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import { buildTodoDisplayModel } from '../src/todo-model.js';
import { EMPTY_TODO_PROJECTION_STATE, todoProjectionReducer } from '../src/todo-state.js';

const sessionId = 'session_todos_001';
const epoch = 'epoch_todos_001';
const updatedAt = '2026-08-18T10:00:00.000Z';

function task(
  id: string,
  state: TodoTaskProjectionV1['state'],
  order: number,
  group: string | null = null,
): TodoTaskProjectionV1 {
  return { id, title: `Title ${id}`, state, group, order, revision: 1, updatedAt };
}

function projection(tasks: readonly TodoTaskProjectionV1[], revision = 1): TodoProjectionV1 {
  return { planId: 'plan_todos_001', source: 'pi', revision, updatedAt, tasks };
}

function envelope(
  kind: string,
  payload: TodoProjectionV1 | TodoProjectionDeltaV1,
  seq: number,
): Envelope {
  return {
    v: 1,
    eventId: `event_todos_${seq}`,
    kind,
    hostId: 'host_todos_001',
    workspaceRef: 'workspace_todos_001',
    sessionId,
    epoch,
    seq,
    occurredAt: updatedAt,
    causedBy: null,
    payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
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
    const snapshot: SyncSnapshot = {
      kind: 'sync.snapshot',
      sessionId,
      epoch,
      coversThrough: 7,
      envelopes: [envelope('todo.snapshot.v1', projection([task('task_001', 'pending', 1)]), 7)],
    };

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
    const snapshot: SyncSnapshot = {
      kind: 'sync.snapshot',
      sessionId,
      epoch,
      coversThrough: 2,
      envelopes: [envelope('todo.snapshot.v1', initial, 2)],
    };
    const deltaPayload: TodoProjectionDeltaV1 = {
      planId: initial.planId,
      baseRevision: 1,
      revision: 2,
      upsertedTasks: [{ ...task('task_change', 'done', 30), revision: 2 }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta: SyncDelta = {
      kind: 'sync.delta',
      sessionId,
      epoch,
      coversThrough: 3,
      envelopes: [envelope('todo.delta.v1', deltaPayload, 3)],
    };

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
    const snapshot: SyncSnapshot = {
      kind: 'sync.snapshot',
      sessionId,
      epoch,
      coversThrough: 1,
      envelopes: [envelope('todo.snapshot.v1', current, 1)],
    };
    const invalidDelta: TodoProjectionDeltaV1 = {
      planId: current.planId,
      baseRevision: 9,
      revision: 10,
      upsertedTasks: [{ ...task('task_001', 'done', 1), revision: 10 }],
      removedTaskIds: [],
      updatedAt,
    };
    const delta: SyncDelta = {
      kind: 'sync.delta',
      sessionId,
      epoch,
      coversThrough: 2,
      envelopes: [envelope('todo.delta.v1', invalidDelta, 2)],
    };

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
    const snapshot: SyncSnapshot = {
      kind: 'sync.snapshot',
      sessionId,
      epoch,
      coversThrough: 1,
      envelopes: [
        envelope('todo.snapshot.v1', projection([task('task_unsupported', 'pending', 1)]), 1),
      ],
    };
    const afterEnvelope = todoProjectionReducer(unsupported, {
      type: 'snapshot',
      message: snapshot,
    });

    expect(unsupported).toMatchObject({ availability: 'unsupported', projection: null });
    expect(afterEnvelope).toMatchObject({ availability: 'unsupported', projection: null });
  });
});
