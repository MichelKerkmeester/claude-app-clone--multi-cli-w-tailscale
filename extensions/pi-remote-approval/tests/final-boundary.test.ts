// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Final Boundary Tests
// ───────────────────────────────────────────────────────────────────

import { approvalActionDigest } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it, vi } from 'vitest';

import { createFinalBoundaryHandler } from '../src/index.js';

const context = { sessionManager: { getSessionId: () => 'session_local' } };

describe('Pi final-boundary fixture', () => {
  it('allows only an exact requested and consumed action', async () => {
    const request = vi.fn(async () => ({
      requested: true as const,
      approvalId: 'approval_fixture',
      expiresAt: new Date(Date.now() + 1_000).toISOString(),
    }));
    const consume = vi.fn(
      async (input: {
        readonly action: Parameters<typeof approvalActionDigest>[0];
        readonly digest: string;
      }) => {
        return input.digest === approvalActionDigest(input.action) &&
          input.action.arguments === FIXTURE_INPUT
          ? { allowed: true as const }
          : { allowed: false as const, reason: 'digest-mismatch' };
      },
    );
    const handler = createFinalBoundaryHandler(fixtureOptions({ request, consume }));

    expect(await handler({ toolName: 'edit', input: FIXTURE_INPUT }, context)).toBeUndefined();
    expect(request).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledOnce();
    expect(await handler({ toolName: 'edit', input: { path: 'changed.txt' } }, context)).toEqual({
      block: true,
      reason: 'digest-mismatch',
    });
  });

  it('fails closed when the relay is unavailable and ignores read-only tools', async () => {
    const request = vi.fn(async () => {
      throw new Error('offline');
    });
    const consume = vi.fn(async () => ({ allowed: true as const }));
    const handler = createFinalBoundaryHandler(fixtureOptions({ request, consume }));

    expect(await handler({ toolName: 'edit', input: FIXTURE_INPUT }, context)).toEqual({
      block: true,
      reason: 'approval-authorizer-unavailable',
    });
    expect(await handler({ toolName: 'read', input: FIXTURE_INPUT }, context)).toBeUndefined();
    expect(request).toHaveBeenCalledOnce();
    expect(consume).not.toHaveBeenCalled();
  });

  it('blocks a denied request before attempting lease consumption', async () => {
    const request = vi.fn(async () => ({ requested: false as const, reason: 'mutation-disabled' }));
    const consume = vi.fn(async () => ({ allowed: true as const }));
    const handler = createFinalBoundaryHandler(fixtureOptions({ request, consume }));

    expect(await handler({ toolName: 'edit', input: FIXTURE_INPUT }, context)).toEqual({
      block: true,
      reason: 'mutation-disabled',
    });
    expect(consume).not.toHaveBeenCalled();
  });
});

const FIXTURE_INPUT = { path: 'safe.txt', content: 'hello' } as const;

function fixtureOptions(
  authorizer = {
    request: async () => ({
      requested: true as const,
      approvalId: 'approval_fixture',
      expiresAt: new Date(Date.now() + 1_000).toISOString(),
    }),
    consume: async () => ({ allowed: true as const }),
  },
) {
  return {
    principal: () => 'operator@example.com',
    epoch: () => 'epoch_one',
    policyVersion: 1,
    protectedTools: new Set(['edit', 'write', 'bash']),
    authorizer,
  };
}
