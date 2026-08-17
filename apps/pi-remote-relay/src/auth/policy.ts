// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Action Authorization Policy
// ───────────────────────────────────────────────────────────────────

export type AuthorizedAction =
  | 'health:read'
  | 'sessions:list'
  | 'transcript:read'
  | 'artifact:read'
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
  | 'commands:submit'
  | AttachmentAction;

export const ATTACHMENT_ACTIONS = [
  'attachment:reserve',
  'attachment:upload',
  'attachment:status',
  'attachment:cancel',
] as const;
export type AttachmentAction = (typeof ATTACHMENT_ACTIONS)[number];

const AUTHORIZED_ACTIONS = new Set<string>([
  'health:read',
  'sessions:list',
  'transcript:read',
  'artifact:read',
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
  ...ATTACHMENT_ACTIONS,
]);

/** Media stays unavailable unless the host operator explicitly enables it. */
export function isMediaFeatureEnabled(
  value: string | undefined = process.env.PI_REMOTE_MEDIA_ENABLED,
): value is '1' {
  return value === '1';
}

export function isAttachmentAction(action: string): action is AttachmentAction {
  return (ATTACHMENT_ACTIONS as readonly string[]).includes(action);
}

/** Keep unknown and tool-mutation actions denied unless explicitly authorized. */
export function authorizeAction(action: string): action is AuthorizedAction {
  return AUTHORIZED_ACTIONS.has(action);
}
