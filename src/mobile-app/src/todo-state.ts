import {
  isTodoProjectionDeltaV1,
  isTodoProjectionV1,
  type Envelope,
  type SyncDelta,
  type SyncGap,
  type SyncSnapshot,
  type TodoProjectionCapabilityDto,
  type TodoProjectionDeltaV1,
  type TodoProjectionV1,
  type TodoTaskProjectionV1,
} from '@pi-remote/pi-rpc-protocol';

export type TodoProjectionAvailability = 'waiting' | 'available' | 'unsupported';

export interface TodoProjectionState {
  readonly sessionId: string | null;
  readonly epoch: string | null;
  readonly availability: TodoProjectionAvailability;
  readonly projection: TodoProjectionV1 | null;
  readonly anchorSeq: number | null;
  readonly refreshing: boolean;
  readonly needsRefresh: boolean;
  /**
   * One concise polite announcement per change. The string is empty until the
   * next applicable diff, and the live region only speaks when the value is
   * non-empty. Timestamps, provenance, and group counts are exposed through
   * the panel itself, never here.
   */
  readonly announcement: string;
}

export type TodoProjectionAction =
  | { readonly type: 'select'; readonly sessionId: string }
  | {
      readonly type: 'capability';
      readonly capability: TodoProjectionCapabilityDto | null;
    }
  | { readonly type: 'snapshot'; readonly message: SyncSnapshot }
  | { readonly type: 'delta'; readonly message: SyncDelta }
  | { readonly type: 'gap'; readonly message: SyncGap }
  | { readonly type: 'refreshRequested' }
  | { readonly type: 'clearAnnouncement' };

export const EMPTY_TODO_PROJECTION_STATE: TodoProjectionState = {
  sessionId: null,
  epoch: null,
  availability: 'waiting',
  projection: null,
  anchorSeq: null,
  refreshing: false,
  needsRefresh: false,
  announcement: '',
};

export function todoProjectionReducer(
  state: TodoProjectionState,
  action: TodoProjectionAction,
): TodoProjectionState {
  switch (action.type) {
    case 'select':
      return state.sessionId === action.sessionId
        ? state
        : { ...EMPTY_TODO_PROJECTION_STATE, sessionId: action.sessionId };
    case 'clearAnnouncement':
      return state.announcement === '' ? state : { ...state, announcement: '' };
    case 'capability':
      return action.capability?.todoProjection === 1
        ? { ...state, availability: state.projection === null ? 'waiting' : 'available' }
        : {
            ...EMPTY_TODO_PROJECTION_STATE,
            sessionId: state.sessionId,
            availability: 'unsupported',
          };
    case 'refreshRequested':
      return state.projection === null ? state : { ...state, refreshing: true };
    case 'gap':
      if (state.sessionId !== action.message.sessionId) return state;
      return {
        ...state,
        epoch: action.message.epoch,
        refreshing: false,
        needsRefresh: action.message.reason !== 'unknown-session',
      };
    case 'snapshot': {
      if (state.sessionId !== action.message.sessionId) return state;
      const base: TodoProjectionState = {
        ...EMPTY_TODO_PROJECTION_STATE,
        sessionId: state.sessionId,
        epoch: action.message.epoch,
        availability: state.availability === 'unsupported' ? 'unsupported' : 'waiting',
      };
      return foldTodoEnvelopes(base, action.message.envelopes, action.message);
    }
    case 'delta': {
      if (state.sessionId !== action.message.sessionId) return state;
      if (state.epoch !== null && state.epoch !== action.message.epoch) {
        return {
          ...EMPTY_TODO_PROJECTION_STATE,
          sessionId: state.sessionId,
          epoch: action.message.epoch,
          needsRefresh: true,
        };
      }
      return foldTodoEnvelopes(
        { ...state, epoch: action.message.epoch, refreshing: false },
        action.message.envelopes,
        action.message,
      );
    }
  }
}

function foldTodoEnvelopes(
  state: TodoProjectionState,
  envelopes: readonly Envelope[],
  message: SyncSnapshot | SyncDelta,
): TodoProjectionState {
  if (state.availability === 'unsupported') return state;
  let next = state;
  const ordered = [...envelopes].sort((left, right) => left.seq - right.seq);
  for (const envelope of ordered) {
    if (
      envelope.sessionId !== message.sessionId ||
      envelope.epoch !== message.epoch ||
      envelope.seq > message.coversThrough
    ) {
      continue;
    }
    if (envelope.kind === 'todo.snapshot.v1' && isTodoProjectionV1(envelope.payload)) {
      next = applySnapshot(next, envelope.payload, envelope.seq);
    } else if (envelope.kind === 'todo.delta.v1' && isTodoProjectionDeltaV1(envelope.payload)) {
      next = applyDelta(next, envelope.payload);
    }
  }
  return next;
}

function applySnapshot(
  state: TodoProjectionState,
  projection: TodoProjectionV1,
  anchorSeq: number,
): TodoProjectionState {
  // A plan-identity change replaces the prior projection; a same-plan snapshot
  // with a newer revision also replaces. A same-plan snapshot whose incoming
  // revision is not strictly newer is stale and is discarded without mutating
  // the rendered view.
  const planChanged = state.projection === null || state.projection.planId !== projection.planId;
  if (!planChanged && state.projection !== null && state.projection.revision >= projection.revision) {
    return state;
  }
  const previousTasks = state.projection?.tasks ?? [];
  const previousRevision = state.projection?.revision ?? 0;
  return {
    ...state,
    availability: 'available',
    projection,
    anchorSeq,
    refreshing: false,
    needsRefresh: false,
    announcement: snapshotAnnouncement(projection, previousTasks, previousRevision, planChanged),
  };
}

function applyDelta(state: TodoProjectionState, delta: TodoProjectionDeltaV1): TodoProjectionState {
  const current = state.projection;
  // A delta that arrives before any snapshot, or against a different plan,
  // cannot be applied safely. Surface a read-only refresh instead of inventing
  // a delta chain.
  if (current === null || current.planId !== delta.planId) {
    return { ...state, refreshing: true, needsRefresh: true };
  }
  if (delta.revision <= current.revision) return state;
  if (delta.baseRevision !== current.revision) {
    return { ...state, refreshing: true, needsRefresh: true };
  }

  const removed = new Set(delta.removedTaskIds);
  const byId = new Map(
    current.tasks.filter((task) => !removed.has(task.id)).map((task) => [task.id, task]),
  );

  let announcedTask: TodoTaskProjectionV1 | null = null;
  let changed = removed.size > 0;
  for (const task of delta.upsertedTasks) {
    const previous = byId.get(task.id);
    if (previous === undefined || task.revision > previous.revision) {
      byId.set(task.id, task);
      changed = true;
      if (previous === undefined || previous.state !== task.state) {
        announcedTask ??= task;
      }
    }
  }
  if (!changed) return state;

  const tasks = [...byId.values()].sort((left, right) => left.order - right.order);
  const projection: TodoProjectionV1 = {
    planId: current.planId,
    source: 'pi',
    revision: delta.revision,
    updatedAt: delta.updatedAt,
    tasks,
  };
  return {
    ...state,
    availability: 'available',
    projection,
    refreshing: false,
    needsRefresh: false,
    announcement: deltaAnnouncement(projection, announcedTask),
  };
}

function snapshotAnnouncement(
  projection: TodoProjectionV1,
  previousTasks: readonly TodoTaskProjectionV1[],
  previousRevision: number,
  planChanged: boolean,
): string {
  if (planChanged || previousRevision === 0) {
    if (projection.tasks.length === 0) return '';
    return `Pi todo plan updated. ${doneCount(projection.tasks)} of ${projection.tasks.length} done.`;
  }
  const diff = firstStateChange(projection.tasks, previousTasks);
  if (diff === null) return '';
  return `${diff.title} is now ${stateLabel(diff.state)}.`;
}

function deltaAnnouncement(
  projection: TodoProjectionV1,
  announcedTask: TodoTaskProjectionV1 | null,
): string {
  if (announcedTask === null) {
    return `Pi todo plan updated. ${doneCount(projection.tasks)} of ${projection.tasks.length} done.`;
  }
  return `${announcedTask.title} is now ${stateLabel(announcedTask.state)}.`;
}

function firstStateChange(
  next: readonly TodoTaskProjectionV1[],
  previous: readonly TodoTaskProjectionV1[],
): TodoTaskProjectionV1 | null {
  const previousById = new Map(previous.map((task) => [task.id, task]));
  const nextById = new Map(next.map((task) => [task.id, task]));
  for (const task of next) {
    const prior = previousById.get(task.id);
    if (prior === undefined || prior.state !== task.state) return task;
  }
  for (const task of previous) {
    if (!nextById.has(task.id)) return null;
  }
  return null;
}

function doneCount(tasks: readonly TodoTaskProjectionV1[]): number {
  return tasks.filter((task) => task.state === 'done').length;
}

function stateLabel(state: TodoTaskProjectionV1['state']): string {
  return {
    pending: 'to do',
    active: 'doing',
    done: 'done',
    blocked: 'blocked',
  }[state];
}
