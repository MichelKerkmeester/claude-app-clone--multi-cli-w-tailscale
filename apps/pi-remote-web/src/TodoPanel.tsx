import type { TodoProjectionV1, TodoTaskProjectionV1 } from '@pi-remote/pi-rpc-protocol';
import { useEffect, useRef } from 'react';
import { Button, Disclosure, DisclosurePanel, Heading } from 'react-aria-components';

import { buildTodoDisplayModel, TODO_STATE_LABELS, type TodoDisplaySection } from './todo-model.js';
import type { TodoProjectionState } from './todo-state.js';

export interface TodoPanelProps {
  readonly projection: TodoProjectionV1;
  readonly refreshing?: boolean;
  readonly needsRefresh?: boolean;
  readonly announcement?: string;
  readonly onRefresh?: () => void;
  /**
   * Called after the panel has rendered an announcement so the parent can
   * clear the announcement slot on the next render pass. The reducer keeps
   * the source-of-truth; the panel owns only the visual lifecycle.
   */
  readonly onAnnouncementConsumed?: () => void;
  /** Optional locale used for the relative timestamp. Defaults to the platform. */
  readonly locale?: string | string[];
  /** Override the wall-clock used for the relative timestamp. */
  readonly now?: () => number;
}

export function TodoProjectionBlock({
  state,
  onRefresh,
  onAnnouncementConsumed,
  locale,
  now,
}: {
  readonly state: TodoProjectionState;
  readonly onRefresh?: () => void;
  readonly onAnnouncementConsumed?: () => void;
  readonly locale?: string | string[];
  readonly now?: () => number;
}) {
  if (state.availability !== 'available' || state.projection === null) return null;
  return (
    <article className="todo-projection-block" data-todo-projection-block="true">
      <TodoPanel
        key={state.projection.planId}
        projection={state.projection}
        refreshing={state.refreshing}
        needsRefresh={state.needsRefresh}
        announcement={state.announcement}
        {...(onRefresh === undefined ? {} : { onRefresh })}
        {...(onAnnouncementConsumed === undefined ? {} : { onAnnouncementConsumed })}
        {...(locale === undefined ? {} : { locale })}
        {...(now === undefined ? {} : { now })}
      />
    </article>
  );
}

export function TodoPanel({
  projection,
  refreshing = false,
  needsRefresh = false,
  announcement = '',
  onRefresh,
  onAnnouncementConsumed,
  locale,
  now,
}: TodoPanelProps) {
  const model = buildTodoDisplayModel(projection);
  return (
    <section
      className="todo-panel"
      aria-label="pi's plan"
      data-todo-panel="true"
      data-todo-all-done={model.allDone ? 'true' : 'false'}
    >
      <TodoPanelHeader
        doneCount={model.doneCount}
        totalCount={model.totalCount}
        refreshing={refreshing}
        {...(onRefresh === undefined ? {} : { onRefresh })}
      />
      {model.progressPercent !== null && (
        <TodoProgressHairline
          doneCount={model.doneCount}
          totalCount={model.totalCount}
          percent={model.progressPercent}
        />
      )}
      {needsRefresh && (
        <p className="todo-sync-note" role="status">
          The last verified plan is shown while the read-only view refreshes.
        </p>
      )}
      <div className="todo-panel-body">
        {model.allDone ? (
          <TodoAllDoneLine doneCount={model.doneCount} totalCount={model.totalCount} />
        ) : model.totalCount === 0 ? (
          <p className="todo-empty-line">No tasks in pi's current plan.</p>
        ) : (
          model.sections.map((section) => (
            <TodoStateSection
              key={`${projection.planId}-${section.state}`}
              planId={projection.planId}
              section={section}
            />
          ))
        )}
      </div>
      <TodoUpdatedLabel
        updatedAt={projection.updatedAt}
        {...(locale === undefined ? {} : { locale })}
        {...(now === undefined ? {} : { now })}
      />
      <TodoLiveRegion
        announcement={announcement}
        {...(onAnnouncementConsumed === undefined ? {} : { onConsumed: onAnnouncementConsumed })}
      />
    </section>
  );
}

export function TodoPanelHeader({
  doneCount,
  totalCount,
  refreshing,
  onRefresh,
}: {
  readonly doneCount: number;
  readonly totalCount: number;
  readonly refreshing: boolean;
  readonly onRefresh?: () => void;
}) {
  return (
    <header className="todo-panel-header">
      <div className="todo-panel-heading">
        <p className="todo-provenance">pi's plan · todo</p>
        <p className="todo-read-only-label">Read-only host projection</p>
      </div>
      <span
        className="todo-progress-count"
        aria-label={`${doneCount} of ${totalCount} tasks done`}
      >
        {doneCount}/{totalCount}
      </span>
      <Button
        type="button"
        className="todo-refresh"
        aria-label="Refresh pi todos"
        isDisabled={refreshing || onRefresh === undefined}
        {...(onRefresh === undefined ? {} : { onPress: onRefresh })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M19 8a7 7 0 1 0 1 5M19 4v4h-4" />
        </svg>
        <span className="todo-refresh-label">{refreshing ? 'Refreshing' : 'Refresh'}</span>
      </Button>
    </header>
  );
}

export function TodoProgressHairline({
  doneCount,
  totalCount,
  percent,
}: {
  readonly doneCount: number;
  readonly totalCount: number;
  readonly percent: number;
}) {
  return (
    <div
      className="todo-progress-hairline"
      role="progressbar"
      aria-label="Todo progress"
      aria-valuemin={0}
      aria-valuemax={totalCount}
      aria-valuenow={doneCount}
    >
      <span data-todo-progress-fill="true" style={{ inlineSize: `${percent}%` }} />
    </div>
  );
}

export function TodoStateSection({
  planId,
  section,
}: {
  readonly planId: string;
  readonly section: TodoDisplaySection;
}) {
  return (
    <Disclosure defaultExpanded className="todo-state-section" data-todo-state={section.state}>
      <Heading>
        <Button
          slot="trigger"
          className="todo-section-trigger"
          aria-label={`${section.label}, ${section.count} ${section.count === 1 ? 'task' : 'tasks'}`}
        >
          <span className="todo-section-chevron" aria-hidden="true">
            ›
          </span>
          <span>{section.label}</span>
          <span className="todo-section-count">{section.count}</span>
        </Button>
      </Heading>
      <DisclosurePanel className="todo-section-panel">
        {section.groups.map((group, groupIndex) => (
          <div
            className="todo-group-run"
            key={`${planId}-${section.state}-${group.group ?? 'ungrouped'}-${groupIndex}`}
          >
            {group.group !== null && <h4 className="todo-group-heading">{group.group}</h4>}
            <ul className="todo-task-list" aria-label={`${section.label} tasks`}>
              {group.tasks.map((task) => (
                <TodoTaskRow key={task.id} task={task} />
              ))}
            </ul>
          </div>
        ))}
      </DisclosurePanel>
    </Disclosure>
  );
}

export function TodoTaskRow({ task }: { readonly task: TodoTaskProjectionV1 }) {
  return (
    <li
      className="todo-task-row"
      data-todo-task-id={task.id}
      data-todo-task-state={task.state}
      data-todo-task-revision={task.revision}
    >
      <TodoStateGlyph state={task.state} />
      <span className="todo-task-title" dir="auto">
        {task.title}
      </span>
      <span className="todo-task-state">{TODO_STATE_LABELS[task.state]}</span>
      {task.updatedAt !== null && (
        <time
          className="todo-task-updated-at"
          dateTime={task.updatedAt}
          title={task.updatedAt}
        >
          {relativeTimestamp(task.updatedAt)}
        </time>
      )}
    </li>
  );
}

export function TodoStateGlyph({ state }: { readonly state: TodoTaskProjectionV1['state'] }) {
  return (
    <span className={`todo-state-glyph todo-state-glyph-${state}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false">
        {state === 'pending' || state === 'active' ? (
          <rect x="3.5" y="3.5" width="9" height="9" rx="1.25" />
        ) : state === 'done' ? (
          <path d="m3.5 8.25 2.7 2.7 6.3-6.3" />
        ) : (
          <path d="M3.5 8h9" />
        )}
      </svg>
    </span>
  );
}

export function TodoUpdatedLabel({
  updatedAt,
  locale,
  now,
}: {
  readonly updatedAt: string | null;
  readonly locale?: string | string[];
  readonly now?: () => number;
}) {
  if (updatedAt === null) return null;
  return (
    <time className="todo-updated-label" dateTime={updatedAt} title={updatedAt}>
      Updated {relativeTimestamp(updatedAt, locale, now)}
    </time>
  );
}

export function TodoAllDoneLine({
  doneCount,
  totalCount,
}: {
  readonly doneCount: number;
  readonly totalCount: number;
}) {
  return (
    <p className="todo-all-done" role="status">
      All done · {doneCount}/{totalCount}
    </p>
  );
}

/**
 * The live region speaks only the redacted title and the localized state. The
 * region is removed from the DOM between announcements so screen readers do
 * not re-announce stale text and the polite queue is never backlogged.
 */
export function TodoLiveRegion({
  announcement,
  onConsumed,
}: {
  readonly announcement: string;
  readonly onConsumed?: () => void;
}) {
  const lastSeen = useRef('');
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      lastSeen.current = announcement;
      return;
    }
    if (announcement !== '' && announcement !== lastSeen.current) {
      lastSeen.current = announcement;
      onConsumed?.();
    }
  }, [announcement, onConsumed]);
  if (announcement === '') return null;
  return (
    <div className="todo-live-region sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}

function relativeTimestamp(
  value: string,
  locale?: string | string[],
  now: () => number = Date.now,
): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'recently';
  const elapsedMinutes = Math.round((parsed - now()) / 60_000);
  if (Math.abs(elapsedMinutes) < 60) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(elapsedMinutes, 'minute');
  }
  const elapsedHours = Math.round(elapsedMinutes / 60);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(elapsedHours, 'hour');
}
