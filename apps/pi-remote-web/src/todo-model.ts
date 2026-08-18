import type {
  TodoProjectionV1,
  TodoTaskProjectionV1,
  TodoTaskState,
} from '@pi-remote/pi-rpc-protocol';

export const TODO_STATE_ORDER = ['pending', 'active', 'done', 'blocked'] as const;

export const TODO_STATE_LABELS: Readonly<Record<TodoTaskState, string>> = {
  pending: 'To do',
  active: 'Doing',
  done: 'Done',
  blocked: 'Blocked',
};

export interface TodoGroupRun {
  readonly group: string | null;
  readonly tasks: readonly TodoTaskProjectionV1[];
}

export interface TodoDisplaySection {
  readonly state: TodoTaskState;
  readonly label: string;
  readonly count: number;
  readonly groups: readonly TodoGroupRun[];
}

export interface TodoDisplayModel {
  readonly totalCount: number;
  readonly doneCount: number;
  readonly progressPercent: number | null;
  readonly allDone: boolean;
  readonly sections: readonly TodoDisplaySection[];
}

export function buildTodoDisplayModel(projection: TodoProjectionV1): TodoDisplayModel {
  const tasks = projection.tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => left.task.order - right.task.order || left.index - right.index)
    .map(({ task }) => task);
  const totalCount = tasks.length;
  const doneCount = tasks.filter((task) => task.state === 'done').length;
  const sections = TODO_STATE_ORDER.map((state) => {
    const stateTasks = tasks.filter((task) => task.state === state);
    return {
      state,
      label: TODO_STATE_LABELS[state],
      count: stateTasks.length,
      groups: contiguousGroupRuns(stateTasks),
    };
  }).filter((section) => section.count > 0);

  return {
    totalCount,
    doneCount,
    progressPercent: totalCount === 0 ? null : (doneCount / totalCount) * 100,
    allDone: totalCount > 0 && doneCount === totalCount,
    sections,
  };
}

function contiguousGroupRuns(tasks: readonly TodoTaskProjectionV1[]): readonly TodoGroupRun[] {
  const runs: Array<{ group: string | null; tasks: TodoTaskProjectionV1[] }> = [];
  for (const task of tasks) {
    const current = runs.at(-1);
    if (current?.group === task.group) current.tasks.push(task);
    else runs.push({ group: task.group, tasks: [task] });
  }
  return runs;
}
