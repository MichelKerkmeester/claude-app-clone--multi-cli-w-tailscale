// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Action Authorization Policy
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type AuthorizedAction =
  | 'health:read'
  | 'sessions:list'
  | 'transcript:read'
  | 'artifact:read'
  | 'artifact:publish'
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
  | 'ask-question.answer'
  | AttachmentAction;

export const ATTACHMENT_ACTIONS = [
  'attachment:reserve',
  'attachment:upload',
  'attachment:status',
  'attachment:cancel',
] as const;
export type AttachmentAction = (typeof ATTACHMENT_ACTIONS)[number];

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

export const READ_ONLY_ACTIONS = ['artifact:read'] as const;
export const HOST_AUTHORITATIVE_ACTIONS = ['artifact:publish'] as const;
export type HostAuthoritativeAction = (typeof HOST_AUTHORITATIVE_ACTIONS)[number];

const AUTHORIZED_ACTIONS = new Set<string>([
  'health:read',
  'sessions:list',
  'transcript:read',
  ...READ_ONLY_ACTIONS,
  ...HOST_AUTHORITATIVE_ACTIONS,
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
  // Slash lane authorized separately so either path can be denied independently.
  'commands:submit',
  'ask-question.answer',
  ...ATTACHMENT_ACTIONS,
]);

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Media stays unavailable by default and is enabled only by the runtime capability. */
export function isMediaFeatureEnabled(
  value: string | undefined = process.env.PI_REMOTE_MEDIA_ENABLED,
): value is '1' {
  return value === '1';
}

export function isAttachmentAction(action: string): action is AttachmentAction {
  return (ATTACHMENT_ACTIONS as readonly string[]).includes(action);
}

export function isHostAuthoritativeAction(action: string): action is HostAuthoritativeAction {
  return (HOST_AUTHORITATIVE_ACTIONS as readonly string[]).includes(action);
}

export function isPhoneGrantableAction(
  action: string,
): action is Exclude<AuthorizedAction, HostAuthoritativeAction | 'artifact:read'> {
  return (
    authorizeAction(action) &&
    !isHostAuthoritativeAction(action) &&
    !(READ_ONLY_ACTIONS as readonly string[]).includes(action)
  );
}

/** Keep unknown and tool-mutation actions denied unless explicitly authorized. */
export function authorizeAction(action: string): action is AuthorizedAction {
  return AUTHORIZED_ACTIONS.has(action);
}
