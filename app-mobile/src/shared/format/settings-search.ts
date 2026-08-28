// ───────────────────────────────────────────────────────────────────
// MODULE: Settings Search Index
// ───────────────────────────────────────────────────────────────────

// Settings search is a static device-local index. It matches the words a
// person uses without consulting relay data or changing any setting.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type SettingsRowId =
  | 'notifications'
  | 'needs_input'
  | 'finished'
  | 'error'
  | 'logout'
  | 'revoke-device';

export interface SettingsRowMetadata {
  readonly id: SettingsRowId;
  readonly title: string;
  readonly description: string;
  readonly keywords: readonly string[];
}

// ───────────────────────────────────────────────────────────────────
// 2. STATIC INDEX
// ───────────────────────────────────────────────────────────────────

export const SETTINGS_ROWS: readonly SettingsRowMetadata[] = [
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Choose which attention hints this device may show.',
    keywords: ['alerts', 'push', 'permission', 'attention'],
  },
  {
    id: 'needs_input',
    title: 'Needs input',
    description: 'Show hints when a session is waiting for your attention.',
    keywords: ['approval', 'waiting', 'blocked', 'permission'],
  },
  {
    id: 'finished',
    title: 'Finished',
    description: 'Show hints when a session has completed.',
    keywords: ['done', 'complete', 'completed', 'success'],
  },
  {
    id: 'error',
    title: 'Error',
    description: 'Show hints when a session reports a problem.',
    keywords: ['failed', 'failure', 'problem', 'broken'],
  },
  {
    id: 'logout',
    title: 'Log out',
    description: 'End the current relay session on this device.',
    keywords: ['sign out', 'leave', 'exit'],
  },
  {
    id: 'revoke-device',
    title: 'Revoke this device',
    description: 'Remove this device from the paired relay devices.',
    keywords: ['remove', 'unpair', 'unlink', 'disconnect'],
  },
];

// ───────────────────────────────────────────────────────────────────
// 3. SEARCH
// ───────────────────────────────────────────────────────────────────

function normalizeQuery(query: string): readonly string[] {
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/u)
    .filter((term) => term.length > 0);
}

/** Return rows whose title, description or synonym vocabulary matches every query word. */
export function searchSettingsRows(query: string): readonly SettingsRowMetadata[] {
  const terms = normalizeQuery(query);
  if (terms.length === 0) return SETTINGS_ROWS;

  return SETTINGS_ROWS.filter((row) => {
    const searchable = [row.title, row.description, ...row.keywords].join(' ').toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}

/** Resolve metadata for an existing settings row without introducing a fallback row. */
export function getSettingsRow(id: SettingsRowId): SettingsRowMetadata {
  const row = SETTINGS_ROWS.find((candidate) => candidate.id === id);
  if (row === undefined) throw new Error(`Unknown settings row: ${id}`);
  return row;
}
