// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Action Authorization Policy
// ───────────────────────────────────────────────────────────────────

export type AuthorizedAction =
  | 'health:read'
  | 'sessions:list'
  | 'transcript:read'
  | 'sync:read'
  | 'ticket:create'
  | 'session:revoke'
  | 'device:revoke'
  | 'approvals:list'
  | 'approval:decide'
  | 'accept-edits:create'
  | 'attention:read'
  | 'push:manage'
  | 'prompt:submit'
  | 'prompt:abort'
  | 'runtime:read'
  | 'runtime-ticket:create'
  | 'runtime:control'
  | 'plan:control'
  | 'commands:list'
  | 'commands:submit';

const AUTHORIZED_ACTIONS = new Set<string>([
  'health:read',
  'sessions:list',
  'transcript:read',
  'sync:read',
  'ticket:create',
  'session:revoke',
  'device:revoke',
  'approvals:list',
  'approval:decide',
  'accept-edits:create',
  'attention:read',
  'push:manage',
  'prompt:submit',
  'prompt:abort',
  'runtime:read',
  'runtime-ticket:create',
  'runtime:control',
  'plan:control',
  'commands:list',
  // The slash submission lane is authorized separately from ordinary prompt
  // submission so either can be denied without touching the other.
  'commands:submit',
]);

/** Keep unknown and tool-mutation actions denied unless explicitly authorized. */
export function authorizeAction(action: string): action is AuthorizedAction {
  return AUTHORIZED_ACTIONS.has(action);
}
