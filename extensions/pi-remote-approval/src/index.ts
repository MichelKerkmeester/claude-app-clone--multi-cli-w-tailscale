// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Approval Extension Boundary
// ───────────────────────────────────────────────────────────────────

import {
  approvalActionDigest,
  isApprovalAuthorityConsumeResponse,
  isApprovalAuthorityRequestResponse,
  type ApprovalAction,
  type JsonValue,
} from '@pi-remote/pi-rpc-protocol';

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

function sleep(delay: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
