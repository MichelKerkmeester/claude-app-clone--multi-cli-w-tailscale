// ───────────────────────────────────────────────────────────────────
// MODULE: Host-Owned Todo Projection
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';

import {
  isOpaqueId,
  isTodoProjectionDeltaV1,
  isTodoProjectionV1,
  isTodoTaskProjectionV1,
  type JsonObject,
  type JsonValue,
  type PiRpcEvent,
  type TodoProjectionDeltaV1,
  type TodoProjectionV1,
  type TodoTaskProjectionV1,
} from '@pi-remote/pi-rpc-protocol';

import { redactJson } from './redaction.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const TODO_PROJECTION_SOURCE_METHOD = 'setTodoProjection' as const;
export const TODO_PROJECTION_SOURCE_KEY = 'pi-remote-todo-projection' as const;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type TodoProjectionUpdate =
  | { readonly kind: 'todo.snapshot.v1'; readonly payload: TodoProjectionV1 }
  | { readonly kind: 'todo.delta.v1'; readonly payload: TodoProjectionDeltaV1 };

export interface AuthoritativeTodoProjectionEvent extends PiRpcEvent {
  readonly type: 'extension_ui_request';
  readonly method: typeof TODO_PROJECTION_SOURCE_METHOD;
  readonly statusKey?: typeof TODO_PROJECTION_SOURCE_KEY;
  readonly projection?: JsonValue;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Identify structured host data before it can enter transcript projection. */
export function isAuthoritativeTodoProjectionEvent(
  value: unknown,
): value is AuthoritativeTodoProjectionEvent {
  const record = asRecord(value);
  return record !== null && record.type === 'extension_ui_request' && record.method === TODO_PROJECTION_SOURCE_METHOD;
}

/** Return only the structured projection body from a recognized host event. */
export function authoritativeTodoProjectionSource(value: unknown): unknown {
  if (!isAuthoritativeTodoProjectionEvent(value)) return null;
  const record = asRecord(value);
  return record?.statusKey === TODO_PROJECTION_SOURCE_KEY ? record.projection ?? null : null;
}

/** Project a host snapshot into the redacted v1 DTO. */
export function projectTodoSnapshot(raw: unknown): TodoProjectionV1 | null {
  const record = asRecord(raw);
  const planId = record?.planId;
  const source = record?.source;
  const revision = record?.revision;
  if (record === null || !isOpaqueId(planId) || (source !== undefined && source !== 'pi')) {
    return null;
  }
  if (!isPositiveInteger(revision) || !Array.isArray(record.tasks)) return null;
  const tasks = record.tasks.map((task) => projectTask(task, planId));
  if (tasks.some((task): task is null => task === null)) return null;
  const snapshot = {
    planId,
    source: 'pi' as const,
    revision,
    updatedAt: timestampOrNull(record.updatedAt),
    tasks: tasks as TodoTaskProjectionV1[],
  };
  return isTodoProjectionV1(snapshot) ? snapshot : null;
}

/** Project one host-authored next view into a revision-bound delta. */
export function projectTodoDelta(
  previous: TodoProjectionV1,
  rawNext: unknown,
): TodoProjectionDeltaV1 | null {
  if (!isTodoProjectionV1(previous)) return null;
  const next = isTodoProjectionV1(rawNext) ? rawNext : projectTodoSnapshot(rawNext);
  if (
    next === null ||
    next.planId !== previous.planId ||
    next.revision <= previous.revision
  ) {
    return null;
  }
  const priorById = new Map(previous.tasks.map((task) => [task.id, task] as const));
  const nextIds = new Set(next.tasks.map((task) => task.id));
  const upsertedTasks = next.tasks.filter((task) => {
    const prior = priorById.get(task.id);
    return prior === undefined || !sameTask(prior, task);
  });
  if (
    upsertedTasks.some((task) => {
      const prior = priorById.get(task.id);
      return prior !== undefined && task.revision <= prior.revision;
    })
  ) {
    return null;
  }
  const removedTaskIds = previous.tasks
    .filter((task) => !nextIds.has(task.id))
    .map((task) => task.id);
  const delta = {
    planId: next.planId,
    baseRevision: previous.revision,
    revision: next.revision,
    upsertedTasks,
    removedTaskIds,
    updatedAt: next.updatedAt,
  };
  return isTodoProjectionDeltaV1(delta) ? delta : null;
}

/** Apply only a valid contiguous delta; otherwise return the same view object. */
export function applyTodoProjectionDelta(
  current: TodoProjectionV1,
  rawDelta: unknown,
): TodoProjectionV1 {
  if (!isTodoProjectionV1(current) || !isTodoProjectionDeltaV1(rawDelta)) return current;
  if (
    rawDelta.planId !== current.planId ||
    rawDelta.baseRevision !== current.revision ||
    rawDelta.revision <= current.revision
  ) {
    return current;
  }

  const nextTasks = [...current.tasks];
  const positions = new Map(nextTasks.map((task, index) => [task.id, index] as const));
  for (const task of rawDelta.upsertedTasks) {
    const position = positions.get(task.id);
    const previous = position === undefined ? undefined : nextTasks[position];
    if (previous !== undefined && task.revision <= previous.revision) continue;
    if (position === undefined) {
      positions.set(task.id, nextTasks.length);
      nextTasks.push(task);
    } else {
      nextTasks[position] = task;
    }
  }
  for (const taskId of rawDelta.removedTaskIds) {
    const position = positions.get(taskId);
    if (position === undefined) continue;
    nextTasks.splice(position, 1);
    positions.clear();
    nextTasks.forEach((task, index) => positions.set(task.id, index));
  }

  const next = {
    planId: current.planId,
    source: 'pi' as const,
    revision: rawDelta.revision,
    updatedAt: rawDelta.updatedAt,
    tasks: nextTasks,
  };
  return isTodoProjectionV1(next) ? next : current;
}

/** Hold the last host-valid view while rejecting stale or mismatched updates. */
export class TodoProjector {
  private current: TodoProjectionV1 | null = null;

  public project(raw: unknown): TodoProjectionUpdate | null {
    const record = asRecord(raw);
    if (record?.kind === 'delta') {
      return this.projectDeltaUpdate(record);
    }

    const snapshot = projectTodoSnapshot(raw);
    if (snapshot === null) return null;
    if (
      this.current !== null &&
      snapshot.planId === this.current.planId &&
      snapshot.revision <= this.current.revision
    ) {
      return null;
    }
    if (this.current === null || snapshot.planId !== this.current.planId) {
      this.current = snapshot;
      return { kind: 'todo.snapshot.v1', payload: snapshot };
    }
    const delta = projectTodoDelta(this.current, snapshot);
    if (delta === null) return null;
    const applied = applyTodoProjectionDelta(this.current, delta);
    if (applied === this.current) return null;
    this.current = applied;
    return { kind: 'todo.delta.v1', payload: delta };
  }

  public projectDelta(raw: unknown): TodoProjectionDeltaV1 | null {
    const update = this.projectDeltaUpdate(raw);
    return update?.kind === 'todo.delta.v1' ? update.payload : null;
  }

  public projectSourceEvent(event: unknown): TodoProjectionUpdate | null {
    return this.project(authoritativeTodoProjectionSource(event));
  }

  public currentSnapshot(): TodoProjectionV1 | null {
    return this.current;
  }

  public reset(): void {
    this.current = null;
  }

  private projectDeltaUpdate(raw: unknown): TodoProjectionUpdate | null {
    const record = asRecord(raw);
    if (record === null) return null;
    const delta = projectDeltaPayload(record);
    if (delta === null || this.current === null) return null;
    const applied = applyTodoProjectionDelta(this.current, delta);
    if (applied === this.current) return null;
    this.current = applied;
    return { kind: 'todo.delta.v1', payload: delta };
  }

}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function projectDeltaPayload(raw: unknown): TodoProjectionDeltaV1 | null {
  const record = asRecord(raw);
  const planId = record?.planId;
  const baseRevision = record?.baseRevision;
  const revision = record?.revision;
  if (
    record === null ||
    !isOpaqueId(planId) ||
    !isNonNegativeInteger(baseRevision) ||
    !isPositiveInteger(revision) ||
    revision <= baseRevision ||
    !Array.isArray(record.upsertedTasks) ||
    !Array.isArray(record.removedTaskIds)
  ) {
    return null;
  }
  const upsertedTasks = record.upsertedTasks.map((task) => projectTask(task, planId));
  const removedTaskIds = record.removedTaskIds.map((id) => projectTaskId(id, planId));
  if (
    upsertedTasks.some((task): task is null => task === null) ||
    removedTaskIds.some((id): id is null => id === null)
  ) {
    return null;
  }
  const delta = {
    planId,
    baseRevision,
    revision,
    upsertedTasks: upsertedTasks as TodoTaskProjectionV1[],
    removedTaskIds: removedTaskIds as string[],
    updatedAt: timestampOrNull(record.updatedAt),
  };
  return isTodoProjectionDeltaV1(delta) ? delta : null;
}

function projectTask(raw: unknown, planId: string): TodoTaskProjectionV1 | null {
  const record = asRecord(raw);
  if (record === null) return null;
  const identity = record.id ?? record.taskId ?? record.stableId ?? record.identityKey ?? record.key;
  const id = projectTaskId(identity, planId);
  const titleValue = record.title;
  const state = record.state;
  const revision = record.revision;
  const order = record.order;
  if (
    id === null ||
    typeof titleValue !== 'string' ||
    !isTodoTaskState(state) ||
    !isPositiveInteger(revision) ||
    !isNonNegativeInteger(order)
  ) {
    return null;
  }
  const title = projectDisplayText(titleValue, 500);
  if (title === null) return null;
  const groupValue = record.group;
  const group =
    groupValue === undefined || groupValue === null
      ? null
      : typeof groupValue === 'string'
        ? projectDisplayText(groupValue, 200)
        : null;
  if (groupValue !== undefined && groupValue !== null && group === null) return null;
  const task = {
    id,
    title,
    state,
    group,
    order,
    revision,
    updatedAt: timestampOrNull(record.updatedAt),
  };
  return isTodoTaskProjectionV1(task) ? task : null;
}

function projectTaskId(value: unknown, planId: string): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const source = String(value);
  if (source.length === 0 || source.length > 512) return null;
  if (isOpaqueId(source)) return source;
  const digest = createHash('sha256')
    .update('pi-remote-todo-id\0')
    .update(planId)
    .update('\0')
    .update(source)
    .digest('hex')
    .slice(0, 24);
  return `task_${digest}`;
}

function projectDisplayText(value: string, maximum: number): string | null {
  const redacted = redactJson(value);
  if (typeof redacted !== 'string') return null;
  const normalized = redacted.trim();
  return normalized.length > 0 && normalized.length <= maximum ? normalized : null;
}

function timestampOrNull(value: unknown): string | null {
  return value === undefined || value === null ? null : typeof value === 'string' ? value : null;
}

function isTodoTaskState(value: unknown): value is TodoTaskProjectionV1['state'] {
  return value === 'pending' || value === 'active' || value === 'done' || value === 'blocked';
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function sameTask(left: TodoTaskProjectionV1, right: TodoTaskProjectionV1): boolean {
  return (
    left.id === right.id &&
    left.title === right.title &&
    left.state === right.state &&
    left.group === right.group &&
    left.order === right.order &&
    left.revision === right.revision &&
    left.updatedAt === right.updatedAt
  );
}

function asRecord(value: unknown): (Record<string, unknown> & JsonObject) | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown> & JsonObject)
    : null;
}
