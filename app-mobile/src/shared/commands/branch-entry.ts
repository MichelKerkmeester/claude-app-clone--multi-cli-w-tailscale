// ───────────────────────────────────────────────────────────────────
// MODULE: Host Branch Entry
// ───────────────────────────────────────────────────────────────────
// The branch action is exposed only when the host provides its branch RPC.
// The returned session remains host-owned; the client never creates an id.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface BranchRequest {
  readonly sessionId: string;
  readonly point: string;
}

export interface BranchResponse {
  readonly sessionId: string;
}

export interface HostBranchCapability {
  readonly requestBranch?: (request: BranchRequest) => Promise<unknown>;
}

export interface HostBranchEntry {
  readonly kind: 'branch';
  readonly label: 'Branch';
  readonly invoke: (request: BranchRequest) => Promise<BranchResponse | null>;
}

// ───────────────────────────────────────────────────────────────────
// 2. BRANCH ENTRY
// ───────────────────────────────────────────────────────────────────

export function createHostBranchEntry(
  capability: HostBranchCapability | null | undefined,
): HostBranchEntry | null {
  const requestBranch = capability?.requestBranch;
  if (typeof requestBranch !== 'function') return null;

  return {
    kind: 'branch',
    label: 'Branch',
    invoke: async (request: BranchRequest): Promise<BranchResponse | null> => {
      try {
        const response = await requestBranch(request);
        return isBranchResponse(response) ? response : null;
      } catch {
        return null;
      }
    },
  };
}

// Keep runtime response validation fail-closed so a malformed host result cannot look like a new session.
function isBranchResponse(value: unknown): value is BranchResponse {
  if (value === null || typeof value !== 'object') return false;
  const sessionId = Reflect.get(value, 'sessionId');
  return typeof sessionId === 'string' && sessionId.trim().length > 0;
}
