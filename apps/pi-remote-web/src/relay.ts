// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Relay Client
// ───────────────────────────────────────────────────────────────────

import {
  isAcceptEditsGrantDto,
  isApprovalCardDto,
  isApprovalDecisionResponse,
  isCommandCatalogDto,
  isPromptAbortResponse,
  isRuntimeControlResponse,
  isRuntimeModelCatalogDto,
  isRuntimeModelTicketResponse,
  isRuntimeStateDto,
  isSessionCardDto,
  isPromptSubmitResponse,
  isSyncMessage,
  isTranscriptPageDto,
  isWebSocketTicketResponse,
  type CommandCatalogDto,
  type PromptAbortResponse,
  type RuntimeControlCommand,
  type RuntimeControlResponse,
  type RuntimeModelCatalogDto,
  type RuntimeModelTicketRequest,
  type RuntimeOperation,
  type RuntimeStateDto,
  type SessionCardDto,
  type AcceptEditsGrantDto,
  type ApprovalCardDto,
  type ApprovalDecision,
  type SyncCursor,
  type SyncMessage,
  type TranscriptBlock,
  type TextBlock,
} from '@pi-remote/pi-rpc-protocol';

import { establishSession } from './auth.js';
import { demoPostJson, demoSocket, isDemoMode } from './demo.js';

const PAGE_LIMIT = 100;
const MAX_PAGES = 100;

export class RelayRequestError extends Error {
  readonly code: 'access_denied' | 'request_failed';

  constructor(code: 'access_denied' | 'request_failed') {
    super(code === 'access_denied' ? 'Relay access denied.' : 'Relay request failed.');
    this.name = 'RelayRequestError';
    this.code = code;
  }
}

export interface TranscriptLoad {
  readonly items: readonly TranscriptBlock[];
  readonly coversThrough: number;
}

export async function fetchSessions(signal: AbortSignal): Promise<readonly SessionCardDto[]> {
  const payload = await postJson('/api/sessions', undefined, signal);
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.sessions) ||
    !payload.sessions.every(isSessionCardDto)
  ) {
    throw new Error('Relay returned an invalid session catalog.');
  }
  return payload.sessions;
}

export async function submitPrompt(
  sessionId: string,
  submissionId: string,
  message: string,
  streamingBehavior?: 'steer' | 'followUp',
  signal?: AbortSignal,
): Promise<TextBlock> {
  const ticketPayload = await postJson('/api/auth/ticket', undefined, signal);
  if (!isWebSocketTicketResponse(ticketPayload)) {
    throw new Error('Relay returned an invalid command ticket.');
  }
  const payload = await postJson(
    '/api/prompt/submit',
    {
      type: 'prompt.submit',
      submissionId,
      sessionId,
      message,
      ticket: ticketPayload.ticket,
      ...(streamingBehavior === undefined ? {} : { streamingBehavior }),
    },
    signal,
    [202],
  );
  if (!isPromptSubmitResponse(payload)) {
    throw new Error('Relay returned an invalid prompt acknowledgement.');
  }
  return payload.block;
}

export async function fetchRuntimeState(signal?: AbortSignal): Promise<RuntimeStateDto> {
  const payload = await postJson('/api/runtime/state', undefined, signal);
  if (!isRecord(payload) || !isRuntimeStateDto(payload.state)) {
    throw new Error('Relay returned an invalid runtime state.');
  }
  return payload.state;
}

export async function fetchRuntimeModels(signal?: AbortSignal): Promise<RuntimeModelCatalogDto> {
  const payload = await postJson('/api/runtime/models', undefined, signal);
  if (!isRuntimeModelCatalogDto(payload)) {
    throw new Error('Relay returned an invalid model catalog.');
  }
  return payload;
}

export async function fetchCommands(signal?: AbortSignal): Promise<CommandCatalogDto> {
  const payload = await postJson('/api/commands/list', undefined, signal);
  if (!isCommandCatalogDto(payload)) {
    throw new Error('Relay returned an invalid command catalog.');
  }
  return payload;
}

/**
 * Send one host-confirmed runtime mutation. A fresh one-use ticket is obtained
 * immediately before the write, and every settled outcome — including stale,
 * unsupported, and delivery-unknown — is returned rather than thrown, so the UI can
 * reconcile without ever inventing an optimistic committed value or auto-retrying.
 */
export async function controlRuntime(
  sessionId: string,
  expectedRevision: number,
  operation: RuntimeOperation,
  expectedCatalogRevision?: number,
  signal?: AbortSignal,
): Promise<RuntimeControlResponse> {
  const controlId = `control_${crypto.randomUUID().replaceAll('-', '_')}`;
  let command: RuntimeControlCommand;
  if (operation.type === 'set_model') {
    if (expectedCatalogRevision === undefined) {
      throw new Error('A catalog revision is required to switch models.');
    }
    const ticketRequest: RuntimeModelTicketRequest = {
      sessionId,
      expectedRevision,
      expectedCatalogRevision,
      operation,
    };
    const ticketPayload = await postJson('/api/runtime/ticket', ticketRequest, signal, [201]);
    if (!isRuntimeModelTicketResponse(ticketPayload)) {
      throw new Error('Relay returned an invalid runtime ticket.');
    }
    command = {
      type: 'runtime.control',
      controlId,
      sessionId,
      expectedRevision,
      expectedCatalogRevision,
      operation,
      ticket: ticketPayload.ticket,
    };
  } else {
    const ticketPayload = await postJson('/api/auth/ticket', undefined, signal);
    if (!isWebSocketTicketResponse(ticketPayload)) {
      throw new Error('Relay returned an invalid command ticket.');
    }
    command = {
      type: 'runtime.control',
      controlId,
      sessionId,
      expectedRevision,
      operation,
      ticket: ticketPayload.ticket,
    };
  }
  try {
    const payload = await postJson('/api/runtime/control', command, signal, [202, 409, 422, 503]);
    if (!isRuntimeControlResponse(payload)) {
      return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
    }
    return payload;
  } catch {
    // Once the command submission starts, transport failure is terminal and ambiguous.
    // A retry could apply the same user intent twice, so reconciliation is the only safe path.
    return { outcome: { status: 'delivery-unknown', reasonCode: 'delivery_unknown' } };
  }
}

/** Interrupt the running agent. A fresh one-use ticket is obtained immediately before. */
export async function abortPrompt(signal?: AbortSignal): Promise<PromptAbortResponse> {
  const ticketPayload = await postJson('/api/auth/ticket', undefined, signal);
  if (!isWebSocketTicketResponse(ticketPayload)) {
    throw new Error('Relay returned an invalid command ticket.');
  }
  const payload = await postJson(
    '/api/prompt/abort',
    { ticket: ticketPayload.ticket },
    signal,
    [202, 503],
  );
  if (!isPromptAbortResponse(payload)) {
    throw new Error('Relay returned an invalid abort result.');
  }
  return payload;
}

export async function fetchApprovals(
  sessionId: string,
  signal?: AbortSignal,
): Promise<readonly ApprovalCardDto[]> {
  const payload = await postJson('/api/approvals', { sessionId }, signal);
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.approvals) ||
    !payload.approvals.every(isApprovalCardDto)
  ) {
    throw new Error('Relay returned an invalid approval review.');
  }
  return payload.approvals;
}

export async function decideApproval(
  approval: ApprovalCardDto,
  decision: ApprovalDecision,
  signal?: AbortSignal,
): Promise<void> {
  const payload = await postJson(
    '/api/approval/decide',
    {
      type: 'approval.decide',
      approvalId: approval.approvalId,
      decision,
      idempotencyKey: `decision_${crypto.randomUUID().replaceAll('-', '_')}`,
      epoch: approval.epoch,
      revision: approval.revision,
      digest: approval.digest,
    },
    signal,
    [202, 409],
  );
  if (!isApprovalDecisionResponse(payload))
    throw new Error('Relay returned an invalid approval result.');
  if (!payload.accepted) throw new Error(denialMessage(payload.result.reason));
}

export async function createAcceptEditsGrant(
  approval: ApprovalCardDto,
  remainingActions: number,
  signal?: AbortSignal,
): Promise<AcceptEditsGrantDto> {
  const payload = await postJson(
    '/api/accept-edits',
    {
      sessionId: approval.sessionId,
      epoch: approval.epoch,
      allowedTools: [approval.tool],
      remainingActions,
      ttlMs: 10 * 60_000,
    },
    signal,
  );
  if (!isAcceptEditsGrantDto(payload))
    throw new Error('Relay returned an invalid accept-edits grant.');
  return payload;
}

export async function fetchTranscript(
  sessionId: string,
  signal: AbortSignal,
): Promise<TranscriptLoad> {
  const items: TranscriptBlock[] = [];
  let after = 0;
  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const payload = await postJson(
      `/api/sessions/${encodeURIComponent(sessionId)}/transcript`,
      { after, limit: PAGE_LIMIT },
      signal,
    );
    if (!isTranscriptPageDto(payload) || payload.sessionId !== sessionId) {
      throw new Error('Relay returned an invalid transcript page.');
    }
    items.push(...payload.items);
    if (payload.nextSeq === null) return { items, coversThrough: payload.coversThrough };
    after = payload.nextSeq;
  }
  throw new Error('Transcript exceeded the bounded page limit.');
}

export async function openSyncSocket(
  sessionId: string,
  cursor: SyncCursor | null,
  onMessage: (message: SyncMessage) => void,
  signal?: AbortSignal,
): Promise<WebSocket> {
  if (isDemoMode()) return demoSocket(sessionId, onMessage as (message: unknown) => void);
  if ((await establishSession()) === null) {
    throw new Error('Device enrollment is required before opening the read-only stream.');
  }
  const ticketPayload = await postJson('/api/auth/ticket', undefined, signal);
  if (!isWebSocketTicketResponse(ticketPayload)) {
    throw new Error('Relay returned an invalid WebSocket ticket.');
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = new URL(`${protocol}//${window.location.host}/api/sync`);
  url.searchParams.set('ticket', ticketPayload.ticket);
  const socket = new WebSocket(url);
  socket.addEventListener('open', () => {
    socket.send(
      JSON.stringify({
        type: 'subscribe',
        sessionId,
        ...(cursor === null ? {} : { cursor }),
      }),
    );
  });
  socket.addEventListener('message', (event) => {
    try {
      const value: unknown = JSON.parse(String(event.data));
      if (isSyncMessage(value) && value.sessionId === sessionId) onMessage(value);
    } catch {
      // Malformed frames cannot enter display state.
    }
  });
  return socket;
}

async function postJson(
  path: string,
  body: unknown,
  signal?: AbortSignal,
  acceptedStatuses: readonly number[] = [],
): Promise<unknown> {
  if (isDemoMode()) return demoPostJson(path, body);
  const response = await fetch(path, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    throw new RelayRequestError(
      response.status === 401 || response.status === 403 ? 'access_denied' : 'request_failed',
    );
  }
  return response.status === 204 ? null : (response.json() as Promise<unknown>);
}

function denialMessage(reason: string): string {
  const messages: Readonly<Record<string, string>> = {
    'approval-not-found': 'This approval no longer exists.',
    'principal-mismatch': 'This approval belongs to another operator.',
    'epoch-mismatch': 'The session changed before your decision arrived.',
    'revision-mismatch': 'Another device settled this approval first.',
    'digest-mismatch': 'The exact action changed and was denied.',
    'lease-expired': 'The approval expired before it could settle.',
    'lease-already-settled': 'This approval was already settled.',
    'idempotency-key-replayed': 'This decision was already submitted.',
  };
  return messages[reason] ?? `Approval denied: ${reason}.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
