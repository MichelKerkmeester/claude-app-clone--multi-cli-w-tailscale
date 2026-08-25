// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Approval Extension Boundary
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  approvalActionDigest,
  isAskQuestionAnswer,
  isAskQuestionDisplay,
  isOpaqueId,
  normalizeAskQuestionAnswer,
  isApprovalAuthorityConsumeResponse,
  isApprovalAuthorityRequestResponse,
  type ApprovalAction,
  type AskQuestionAnswer,
  type AskQuestionDisplay,
  type AskQuestionResultReason,
  type AskQuestionSelectionMode,
  type JsonValue,
} from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface ToolCallEvent {
  readonly toolName: string;
  readonly input: JsonValue;
}

export interface PiContext {
  readonly sessionManager: { getSessionId(): string };
}

export interface PiExtensionApi {
  on(
    event: 'tool_call',
    handler: (
      event: ToolCallEvent,
      context: PiContext,
    ) => Promise<{ readonly block: true; readonly reason: string } | undefined>,
  ): void;
}

export interface PiPendingAskQuestion {
  readonly sessionId: string;
  readonly questionId: string;
  readonly revision: number;
  readonly selectionMode: AskQuestionSelectionMode;
  readonly display: AskQuestionDisplay;
}

export type AskQuestionCallbackOutcome =
  | { readonly status: 'accepted' }
  | { readonly status: 'rejected'; readonly reason: AskQuestionResultReason }
  | { readonly status: 'delivery-unknown' };

export interface AskQuestionCallbackContract {
  /** Read Pi's current pending question without changing it. */
  readonly readCurrentPendingQuestion: (input: {
    readonly sessionId: string;
    readonly questionId: string;
  }) => Promise<unknown | null>;
  /** Deliver one answer and return Pi's confirmed callback outcome. */
  readonly submitAnswer: (input: {
    readonly sessionId: string;
    readonly questionId: string;
    readonly expectedRevision: number;
    readonly principal: string;
    readonly answer: AskQuestionAnswer;
    readonly clientMutationId: string;
  }) => Promise<unknown>;
}

export interface AskQuestionAdapterInput {
  readonly sessionId: string;
  readonly questionId: string;
  readonly expectedRevision: number;
  readonly principal: string;
  readonly answer: AskQuestionAnswer;
  readonly clientMutationId: string;
}

/** Adapt Pi's callback contract to the relay handoff; does not fabricate Pi event names. */
// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

export function createAskQuestionAnswerAdapter(
  contract: AskQuestionCallbackContract,
): (input: AskQuestionAdapterInput) => Promise<AskQuestionCallbackOutcome> {
  return async (input) => {
    if (!isAskQuestionAnswer(input.answer)) {
      return { status: 'rejected', reason: 'validation-failed' };
    }

    let current: PiPendingAskQuestion | null;
    try {
      const candidate = await contract.readCurrentPendingQuestion({
        sessionId: input.sessionId,
        questionId: input.questionId,
      });
      current = parsePendingAskQuestion(candidate);
    } catch {
      return { status: 'rejected', reason: 'host-unavailable' };
    }
    if (current === null) return { status: 'rejected', reason: 'question-withdrawn' };
    if (
      current.sessionId !== input.sessionId ||
      current.questionId !== input.questionId ||
      current.revision !== input.expectedRevision
    ) {
      return { status: 'rejected', reason: 'revision-mismatch' };
    }
    if (!answerMatchesPending(current, input.answer)) {
      return { status: 'rejected', reason: 'validation-failed' };
    }

    try {
      return normalizeAskQuestionCallbackOutcome(
        await contract.submitAnswer({
          sessionId: input.sessionId,
          questionId: input.questionId,
          expectedRevision: input.expectedRevision,
          principal: input.principal,
          answer: normalizeAskQuestionAnswer(input.answer),
          clientMutationId: input.clientMutationId,
        }),
      );
    } catch {
      return { status: 'delivery-unknown' };
    }
  };
}

export interface RelayLeaseAuthorizer {
  request(input: {
    readonly action: ApprovalAction;
    readonly digest: string;
  }): Promise<
    | { readonly requested: true; readonly approvalId: string; readonly expiresAt: string }
    | { readonly requested: false; readonly reason: string }
  >;
  consume(input: {
    readonly approvalId: string;
    readonly action: ApprovalAction;
    readonly digest: string;
  }): Promise<{ readonly allowed: true } | { readonly allowed: false; readonly reason: string }>;
}

export interface ApprovalExtensionOptions {
  readonly principal: () => string;
  readonly epoch: () => string;
  readonly sessionId?: () => string;
  readonly policyVersion: number;
  readonly protectedTools: ReadonlySet<string>;
  readonly authorizer: RelayLeaseAuthorizer;
}

export type FinalBoundaryHandler = (
  event: ToolCallEvent,
  context: PiContext,
) => Promise<{ readonly block: true; readonly reason: string } | undefined>;

/** Build the final pre-execution handler used by both Pi and fixture tests. */
export function createFinalBoundaryHandler(
  options: ApprovalExtensionOptions,
): FinalBoundaryHandler {
  return async (event: ToolCallEvent, context: PiContext) => {
    if (!options.protectedTools.has(event.toolName)) return undefined;
    const action: ApprovalAction = {
      principal: options.principal(),
      sessionId: options.sessionId?.() ?? context.sessionManager.getSessionId(),
      epoch: options.epoch(),
      tool: event.toolName,
      arguments: event.input,
      policyVersion: options.policyVersion,
    };
    const digest = approvalActionDigest(action);
    try {
      const requested = await options.authorizer.request({ action, digest });
      if (!requested.requested) return { block: true as const, reason: requested.reason };
      while (Date.now() < Date.parse(requested.expiresAt)) {
        const result = await options.authorizer.consume({
          approvalId: requested.approvalId,
          action,
          digest,
        });
        if (result.allowed) return undefined;
        if (result.reason !== 'approval-pending') {
          return { block: true as const, reason: result.reason };
        }
        await sleep(50);
      }
      return { block: true as const, reason: 'approval-expired' };
    } catch {
      return { block: true as const, reason: 'approval-authorizer-unavailable' };
    }
  };
}

export function createRelayLeaseAuthorizer(options: {
  readonly baseUrl: string;
  readonly secret: string;
  readonly fetch?: typeof fetch;
}): RelayLeaseAuthorizer {
  const send = async (path: string, body: unknown): Promise<unknown> => {
    const response = await (options.fetch ?? fetch)(`${options.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${options.secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2_000),
    });
    return response.json() as Promise<unknown>;
  };
  return {
    request: async (input) => {
      const response = await send('/api/extension/approval/request', input);
      if (!isApprovalAuthorityRequestResponse(response)) {
        throw new Error('Relay returned an invalid authority request response.');
      }
      return response.requested
        ? {
            requested: true,
            approvalId: response.approval.approvalId,
            expiresAt: response.approval.expiresAt,
          }
        : response;
    },
    consume: async (input) => {
      const response = await send('/api/extension/approval/consume', input);
      if (!isApprovalAuthorityConsumeResponse(response)) {
        throw new Error('Relay returned an invalid authority consume response.');
      }
      return response;
    },
  };
}

/** Register the pinned handler on Pi's documented final tool-call boundary. */
export function installPiRemoteApproval(
  pi: PiExtensionApi,
  options: ApprovalExtensionOptions,
): void {
  pi.on('tool_call', createFinalBoundaryHandler(options));
}

export default function piRemoteApproval(pi: PiExtensionApi): void {
  const baseUrl = requiredEnvironment('PI_REMOTE_APPROVAL_RELAY_URL');
  const secret = requiredEnvironment('PI_REMOTE_APPROVAL_SECRET');
  delete process.env.PI_REMOTE_APPROVAL_SECRET;
  const principal = requiredEnvironment('PI_REMOTE_APPROVAL_PRINCIPAL');
  const sessionId = requiredEnvironment('PI_REMOTE_APPROVAL_SESSION_ID');
  const epoch = requiredEnvironment('PI_REMOTE_APPROVAL_EPOCH');
  const family = requiredEnvironment('PI_REMOTE_MUTATION_FAMILY');
  installPiRemoteApproval(pi, {
    principal: () => principal,
    epoch: () => epoch,
    sessionId: () => sessionId,
    policyVersion: 1,
    protectedTools: toolsForFamily(family),
    authorizer: createRelayLeaseAuthorizer({ baseUrl, secret }),
  });
}

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function toolsForFamily(family: string): ReadonlySet<string> {
  if (family === 'filesystem') return new Set(['edit', 'write']);
  if (family === 'process') return new Set(['bash']);
  if (family === 'network') return new Set(['fetch']);
  throw new Error('PI_REMOTE_MUTATION_FAMILY must select one protected family.');
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new Error(`${name} is required.`);
  return value;
}

function parsePendingAskQuestion(value: unknown): PiPendingAskQuestion | null {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !hasExactKeys(value, ['sessionId', 'questionId', 'revision', 'selectionMode', 'display'])
  ) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (
    !isOpaqueId(candidate.sessionId) ||
    !isOpaqueId(candidate.questionId) ||
    !Number.isSafeInteger(candidate.revision) ||
    typeof candidate.revision !== 'number' ||
    candidate.revision <= 0 ||
    (candidate.selectionMode !== 'single' && candidate.selectionMode !== 'multiple') ||
    !isAskQuestionDisplay(candidate.display)
  ) {
    return null;
  }
  return {
    sessionId: candidate.sessionId,
    questionId: candidate.questionId,
    revision: candidate.revision,
    selectionMode: candidate.selectionMode,
    display: candidate.display,
  };
}

function answerMatchesPending(
  pending: PiPendingAskQuestion,
  answer: AskQuestionAnswer,
): boolean {
  const optionIds = new Set(pending.display.options.map((option) => option.id));
  if (answer.optionIds.some((optionId) => !optionIds.has(optionId))) return false;
  const selectedCount = answer.optionIds.length;
  if (pending.selectionMode === 'single' && selectedCount !== 1) return false;
  const minSelections =
    pending.display.minSelections ?? (pending.display.options.length === 0 ? 0 : 1);
  const maxSelections =
    pending.display.maxSelections ??
    (pending.selectionMode === 'single' ? 1 : pending.display.options.length);
  if (
    selectedCount < minSelections ||
    selectedCount > maxSelections ||
    (pending.selectionMode === 'single' && selectedCount !== 1)
  ) {
    return false;
  }
  if (!pending.display.freeText.allowed && answer.freeText !== undefined) return false;
  if (
    pending.display.freeText.required &&
    (answer.freeText === undefined || answer.freeText.trim().length === 0)
  ) {
    return false;
  }
  if (
    answer.freeText !== undefined &&
    pending.display.freeText.maxLength !== undefined &&
    answer.freeText.length > pending.display.freeText.maxLength
  ) {
    return false;
  }
  return selectedCount > 0 || (answer.freeText !== undefined && answer.freeText.trim().length > 0);
}

function normalizeAskQuestionCallbackOutcome(value: unknown): AskQuestionCallbackOutcome {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'delivery-unknown' };
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.status === 'accepted' && hasExactKeys(value, ['status'])) {
    return { status: 'accepted' };
  }
  if (candidate.status === 'delivery-unknown' && hasExactKeys(value, ['status'])) {
    return { status: 'delivery-unknown' };
  }
  if (candidate.status !== 'rejected' || typeof candidate.reason !== 'string') {
    return { status: 'delivery-unknown' };
  }
  const reason =
    candidate.reason === 'already-answered'
      ? 'question-already-answered'
      : candidate.reason;
  if (!isAskQuestionResultReason(reason) || !hasExactKeys(value, ['status', 'reason'])) {
    return { status: 'delivery-unknown' };
  }
  return { status: 'rejected', reason };
}

function isAskQuestionResultReason(value: string): value is AskQuestionResultReason {
  return (
    value === 'invalid-ticket' ||
    value === 'revision-mismatch' ||
    value === 'question-withdrawn' ||
    value === 'question-already-answered' ||
    value === 'plan-mode-blocked' ||
    value === 'redaction-policy-blocked' ||
    value === 'validation-failed' ||
    value === 'host-unavailable' ||
    value === 'delivery-unknown'
  );
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function sleep(delay: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
