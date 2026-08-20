import { describe, expect, it } from 'vitest';

import {
  isTodoProjectionDeltaV1,
  isTodoProjectionV1,
} from '@pi-remote/pi-rpc-protocol';

import { publishTodoProjection } from '../src/index.js';
import { SyncHub } from '../src/replay/sync.js';
import {
  applyTodoProjectionDelta,
  authoritativeTodoProjectionSource,
  isAuthoritativeTodoProjectionEvent,
  projectTodoDelta,
  projectTodoSnapshot,
  TodoProjector,
} from '../src/store/todo-projector.js';
import { RelayStore } from '../src/store/relay-store.js';

const IDENTITY = {
  hostId: 'host_local',
  workspaceRef: 'workspace_default',
  sessionId: 'session_local',
} as const;

function source(revision = 1, tasks = defaultTasks(), planId = 'plan_001'): object {
  return {
    planId,
    revision,
    updatedAt: `2026-01-01T00:00:0${revision}.000Z`,
    tasks,
  };
}

function defaultTasks(): readonly object[] {
  return [
    {
      id: 'task_002',
      title: 'Open /Users/private-project/README.md',
      state: 'active',
      group: 'group token=raw-group-secret',
      order: 20,
      revision: 1,
      updatedAt: '2026-01-01T00:00:01.000Z',
      detail: 'private detail must be discarded',
    },
    {
      id: 'task_001',
      title: 'Keep host order',
      state: 'pending',
      group: null,
      order: 10,
      revision: 1,
      updatedAt: null,
      detail: { command: 'private command' },
    },
  ];
}

describe('host todo projection', () => {
  it('allowlists stable identity, redacted display fields, state, order, revisions, and timestamps', () => {
    const snapshot = projectTodoSnapshot(source());

    expect(snapshot).not.toBeNull();
    if (snapshot === null) throw new Error('Projection fixture was rejected.');
    expect(snapshot).toMatchObject({
      planId: 'plan_001',
      source: 'pi',
      revision: 1,
      tasks: [
        {
          id: 'task_002',
          title: 'Open [REDACTED_PATH]',
          state: 'active',
          group: 'group [REDACTED_SECRET]',
          order: 20,
          revision: 1,
          updatedAt: '2026-01-01T00:00:01.000Z',
        },
        {
          id: 'task_001',
          title: 'Keep host order',
          state: 'pending',
          group: null,
          order: 10,
          revision: 1,
          updatedAt: null,
        },
      ],
    });
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('private-project');
    expect(serialized).not.toContain('raw-group-secret');
    expect(serialized).not.toContain('private detail');
    expect(serialized).not.toContain('detail');
    expect(isTodoProjectionV1(snapshot)).toBe(true);
  });

  it('rejects unknown state, duplicate identity, malformed time, invalid order, and missing identity', () => {
    const valid = defaultTasks();
    expect(projectTodoSnapshot(source(1, [{ ...valid[0], state: 'unknown' }]))).toBeNull();
    expect(projectTodoSnapshot(source(1, [valid[0], { ...valid[0], title: 'duplicate' }]))).toBeNull();
    expect(projectTodoSnapshot(source(1, [{ ...valid[0], updatedAt: 'tomorrow' }]))).toBeNull();
    expect(projectTodoSnapshot(source(1, [{ ...valid[0], order: -1 }]))).toBeNull();
    expect(
      projectTodoSnapshot(source(1, [{ ...valid[0], id: undefined, identityKey: undefined }])),
    ).toBeNull();
  });

  it('creates a stable opaque identity from an explicit host identity key, never array position', () => {
    const first = projectTodoSnapshot(
      source(1, [
        {
          ...defaultTasks()[0],
          id: undefined,
          identityKey: 'host-task-alpha',
        },
      ]),
    );
    const second = projectTodoSnapshot(
      source(2, [
        {
          ...defaultTasks()[0],
          id: undefined,
          identityKey: 'host-task-alpha',
          state: 'done',
          revision: 2,
        },
      ]),
    );

    expect(first?.tasks[0]?.id).toBe('host-task-alpha');
    expect(second?.tasks[0]?.id).toBe(first?.tasks[0]?.id);
    expect(second?.tasks[0]?.id).not.toBe('task_0');
  });

  it('emits a revision-safe delta and preserves the last valid view on base mismatch', () => {
    const initial = projectTodoSnapshot(source());
    if (initial === null) throw new Error('Initial projection fixture was rejected.');
    const changedSource = source(2, [
      {
        ...defaultTasks()[0],
        state: 'done',
        revision: 2,
      },
    ]);
    const delta = projectTodoDelta(initial, changedSource);
    expect(delta).not.toBeNull();
    if (delta === null) throw new Error('Delta fixture was rejected.');
    expect(isTodoProjectionDeltaV1(delta)).toBe(true);
    expect(delta.baseRevision).toBe(1);
    expect(delta.revision).toBe(2);
    expect(delta.removedTaskIds).toEqual(['task_001']);
    expect(
      projectTodoDelta(initial, source(2, [{ ...defaultTasks()[0], state: 'done' }])),
    ).toBeNull();

    const applied = applyTodoProjectionDelta(initial, delta);
    expect(applied.revision).toBe(2);
    expect(applied.tasks).toHaveLength(1);
    expect(applied.tasks[0]?.state).toBe('done');

    const mismatch = { ...delta, baseRevision: 99, revision: 100 };
    expect(applyTodoProjectionDelta(initial, mismatch)).toBe(initial);
    expect(applyTodoProjectionDelta(initial, { ...delta, revision: 1 })).toBe(initial);
  });

  it('keeps projection authority separate from transcript events', () => {
    const projection = projectTodoSnapshot(
      source(1, [
        {
          id: 'task_transcript_001',
          title: 'Transcript says done',
          state: 'blocked',
          group: null,
          order: 1,
          revision: 1,
          updatedAt: null,
        },
      ]),
    );
    expect(projection?.tasks[0]?.state).toBe('blocked');
    expect(
      isAuthoritativeTodoProjectionEvent({
        type: 'message_update',
        message: 'task_transcript_001 is done',
      }),
    ).toBe(false);
    expect(
      isAuthoritativeTodoProjectionEvent({
        type: 'extension_ui_request',
        method: 'setTodoProjection',
        statusKey: 'pi-remote-todo-projection',
        projection: source(),
      }),
    ).toBe(true);
    expect(
      authoritativeTodoProjectionSource({
        type: 'extension_ui_request',
        method: 'setTodoProjection',
        statusKey: 'pi-remote-todo-projection',
        projection: source(),
      }),
    ).toEqual(source());
  });

  it('publishes a complete snapshot and subsequent delta through the existing sync barrier', () => {
    const store = new RelayStore();
    try {
      const hub = new SyncHub(store);
      const projector = new TodoProjector();
      const messages = [] as import('@pi-remote/pi-rpc-protocol').SyncMessage[];
      const first = projector.project(source());
      if (first === null) throw new Error('Initial projector update was rejected.');
      publishTodoProjection(store, hub, first, 'epoch_todo', IDENTITY);
      const second = projector.project(
        source(2, [
          {
            ...defaultTasks()[0],
            state: 'done',
            revision: 2,
          },
          {
            id: 'task_003',
            title: 'New task',
            state: 'pending',
            group: null,
            order: 30,
            revision: 1,
            updatedAt: null,
          },
        ]),
      );
      if (second === null) throw new Error('Delta projector update was rejected.');
      publishTodoProjection(store, hub, second, 'epoch_todo', IDENTITY);

      hub.subscribe(IDENTITY, (message) => messages.push(message));
      expect(messages).toHaveLength(1);
      expect(messages[0]?.kind).toBe('sync.snapshot');
      if (messages[0]?.kind !== 'sync.snapshot') return;
      expect(messages[0].envelopes.map((envelope) => envelope.kind)).toEqual([
        'todo.snapshot.v1',
        'todo.delta.v1',
      ]);
      const durable = JSON.stringify(store.createSyncPlan(IDENTITY));
      expect(durable).not.toContain('private-project');
      expect(durable).not.toContain('raw-group-secret');
      expect(durable).not.toContain('private detail');
    } finally {
      store.close();
    }
  });
});
