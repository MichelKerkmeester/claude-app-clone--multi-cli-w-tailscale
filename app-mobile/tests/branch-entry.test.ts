// ───────────────────────────────────────────────────────────────────
// MODULE: Host Branch Entry Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from 'vitest';

import { createHostBranchEntry, type BranchRequest } from '../src/shared/commands/branch-entry.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const BRANCH_REQUEST: BranchRequest = {
  sessionId: 'source-session',
  point: 'turn-7',
};

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('createHostBranchEntry', () => {
  it('returns no entry when the branch RPC capability is absent', () => {
    expect(createHostBranchEntry(undefined)).toBeNull();
    expect(createHostBranchEntry({ requestBranch: undefined })).toBeNull();
  });

  it('issues one branch request and returns the host-created resumable session', async () => {
    const requestBranch = vi.fn().mockResolvedValue({ sessionId: 'host-session-99' });
    const entry = createHostBranchEntry({ requestBranch });

    expect(entry).not.toBeNull();
    const result = await entry?.invoke(BRANCH_REQUEST);

    expect(requestBranch).toHaveBeenCalledTimes(1);
    expect(requestBranch).toHaveBeenCalledWith(BRANCH_REQUEST);
    expect(result).toEqual({ sessionId: 'host-session-99' });
  });

  it('does not surface a session when the host response has no resumable id', async () => {
    const requestBranch = vi.fn().mockResolvedValue({ sessionId: '' });
    const entry = createHostBranchEntry({ requestBranch });

    expect(entry).not.toBeNull();
    await expect(entry?.invoke(BRANCH_REQUEST)).resolves.toBeNull();
    expect(requestBranch).toHaveBeenCalledTimes(1);
  });
});
