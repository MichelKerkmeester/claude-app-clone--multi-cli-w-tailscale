// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Relay Client
// ───────────────────────────────────────────────────────────────────

import {
  isAcceptEditsGrantDto,
  isApprovalCardDto,
  isApprovalDecisionResponse,
  isSessionCardDto,
  isPromptSubmitResponse,
  isSyncMessage,
  isTranscriptPageDto,
  isWebSocketTicketResponse,
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

const PAGE_LIMIT = 100;
const MAX_PAGES = 100;

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
    },
    signal,
    [202],
  );
  if (!isPromptSubmitResponse(payload)) {
    throw new Error('Relay returned an invalid prompt acknowledgement.');
  }
  return payload.block;
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
  const response = await fetch(path, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
    ...(signal === undefined ? {} : { signal }),
  });
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    throw new Error(`Relay returned HTTP ${response.status}.`);
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
