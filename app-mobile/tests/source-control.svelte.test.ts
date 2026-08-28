// ───────────────────────────────────────────────────────────────────
// MODULE: SOURCE CONTROL TESTS
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ChangedFiles from '../src/pages/chat/source-control/changed-files.svelte';
import CheckList from '../src/pages/chat/source-control/check-list.svelte';
import CheckSummary from '../src/pages/chat/source-control/check-summary.svelte';
import CommitHistory from '../src/pages/chat/source-control/commit-history.svelte';
import ConflictList from '../src/pages/chat/source-control/conflict-list.svelte';
import PrChip from '../src/pages/chat/source-control/pr-chip.svelte';
import ReviewerList from '../src/pages/chat/source-control/reviewer-list.svelte';
import SheetPrDetails from '../src/pages/chat/source-control/sheet-pr-details.svelte';
import SourceControlHub from '../src/pages/chat/source-control/source-control-hub.svelte';
import UpstreamStatus from '../src/pages/chat/source-control/upstream-status.svelte';
import type { SourceControlHubData } from '../src/pages/chat/source-control/source-control-types.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const VALID_PATCH = [
  'diff --git a/src/policy.ts b/src/policy.ts',
  '--- a/src/policy.ts',
  '+++ b/src/policy.ts',
  '@@ -1 +1 @@',
  '-old policy',
  '+new policy',
].join('\n');

const pullRequestSummary = {
  state: 'open',
  rollup: 'Host-resolved changes requested',
  commentCount: 3,
};

const changedFiles = {
  branchLabel: 'Committed on feature/a11y',
  files: [{ path: 'src/policy.ts', additions: 1, deletions: 1, patch: VALID_PATCH }],
};

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const sourceControlDirectory = join(testsDirectory, '../src/pages/chat/source-control');

function sourceControlSourceFiles(): string[] {
  return readdirSync(sourceControlDirectory)
    .filter((name) => name.endsWith('.svelte') || name.endsWith('.ts'))
    .map((name) => join(sourceControlDirectory, name));
}

// ───────────────────────────────────────────────────────────────────
// 4. SETUP
// ───────────────────────────────────────────────────────────────────

afterEach(cleanup);

// ───────────────────────────────────────────────────────────────────
// 5. TESTS
// ───────────────────────────────────────────────────────────────────

describe('source-control host-data gates', () => {
  it('renders no chip, rows, sync label, or segments when host data is absent', () => {
    render(PrChip);
    render(SheetPrDetails);
    render(CheckSummary);
    render(CheckList);
    render(ChangedFiles);
    render(CommitHistory);
    render(UpstreamStatus);
    render(ConflictList);
    render(ReviewerList);
    render(SourceControlHub);

    expect(document.querySelector('[data-source-control-surface]')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('pull-request surfaces', () => {
  it('opens read-only details from a chip and preserves the host rollup and comment count', async () => {
    render(PrChip, { props: { summary: pullRequestSummary } });

    await fireEvent.click(screen.getByRole('button', { name: /Open pull request details/u }));

    const dialog = screen.getByRole('dialog', { name: 'Pull request details' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Host-resolved changes requested')).toBeInTheDocument();
    expect(within(dialog).getByText('3')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply|merge|edit/u })).toBeNull();
  });
});

describe('check surfaces', () => {
  it('renders an unknown summary as muted unresolved instead of passing', () => {
    render(CheckSummary, {
      props: { summary: { classification: 'unknown', label: 'Passing from an untrusted source' } },
    });

    expect(screen.getByText('MUTED UNRESOLVED')).toBeInTheDocument();
    expect(screen.queryByText('Passing from an untrusted source')).toBeNull();
    expect(document.querySelector('.is-muted-unresolved')).not.toBeNull();
  });

  it('keeps host order, expands the first host-classified failure, and uses the supplied web URL', async () => {
    render(CheckList, {
      props: {
        checks: [
          {
            id: 'passing-check',
            name: 'Unit tests',
            classification: 'passing',
            statusLabel: 'Passed',
            order: 2,
          },
          {
            id: 'failure-check',
            name: 'Lint',
            classification: 'failing',
            statusLabel: 'Failed',
            detail: 'The host reported a lint failure.',
            webUrl: 'https://ci.example.test/check/42',
            order: 1,
          },
        ],
      },
    });

    const rows = [...document.querySelectorAll('[data-check-id]')].map((row) => row.getAttribute('data-check-id'));
    expect(rows).toEqual(['failure-check', 'passing-check']);
    expect(screen.getByText('The host reported a lint failure.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open on web' })).toHaveAttribute(
      'href',
      'https://ci.example.test/check/42',
    );
  });
});

describe('changed-files and diff surfaces', () => {
  it('opens a read-only shared-parser diff and exposes no patch mutation action', async () => {
    render(ChangedFiles, { props: { data: changedFiles } });

    await fireEvent.click(screen.getByRole('button', { name: 'Open diff for src/policy.ts' }));

    expect(screen.getByRole('region', { name: 'Read-only diff for src/policy.ts' })).toHaveAttribute(
      'data-read-only',
      'true',
    );
    expect(document.querySelector('[data-diff-path="src/policy.ts"]')).not.toBeNull();
    expect(screen.getByLabelText('1 added, 1 removed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply|edit|patch/u })).toBeNull();
  });

  it('imports the shared unified-diff parser and does not define another parser in this directory', () => {
    const changedFilesSource = readFileSync(join(sourceControlDirectory, 'changed-files.svelte'), 'utf8');
    expect(changedFilesSource).toMatch(/import DiffPreview, \{ parseUnifiedDiff \} from/u);

    const parserDeclarations = sourceControlSourceFiles().flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return source.match(/(?:function|const|let)\s+parseUnifiedDiff\b/gu) ?? [];
    });
    expect(parserDeclarations).toEqual([]);
  });
});

describe('commit history', () => {
  it('loads files only after expansion and shows a failed expansion instead of an empty list', async () => {
    const onExpandFiles = vi.fn();
    const initialData = {
      commits: [
        {
          id: 'abc123',
          subject: 'Update policy',
          filesState: 'idle' as const,
        },
      ],
    };
    const { rerender } = render(CommitHistory, { props: { data: initialData, onExpandFiles } });

    expect(screen.queryByText('src/policy.ts')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Expand files for commit abc123' }));
    expect(onExpandFiles).toHaveBeenCalledWith('abc123');

    await rerender({
      data: {
        commits: [
          {
            ...initialData.commits[0],
            filesState: 'failed' as const,
            failureMessage: 'Commit file expansion failed.',
          },
        ],
      },
      onExpandFiles,
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Commit file expansion failed.');
    expect(screen.queryByText('No files changed in this commit.')).toBeNull();
  });
});

describe('repository evidence surfaces', () => {
  it('renders branch sync only from upstreamStatus', () => {
    render(UpstreamStatus, {
      props: {
        upstreamStatus: { branch: 'feature/a11y', upstream: 'origin/main', ahead: 2, behind: 1 },
      },
    });

    expect(screen.getByRole('region', { name: 'Branch sync' })).toBeInTheDocument();
    expect(screen.getByText('feature/a11y')).toBeInTheDocument();
    expect(screen.getByText('origin/main')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('keeps provider-reported and locally-confirmed conflicts visibly separate', () => {
    render(ConflictList, {
      props: {
        conflicts: {
          providerReported: [{ path: 'src/provider.ts' }],
          locallyConfirmed: [{ path: 'src/local.ts' }],
        },
      },
    });

    expect(screen.getByRole('region', { name: 'Provider-reported conflicts' })).toHaveTextContent('src/provider.ts');
    expect(screen.getByRole('region', { name: 'Locally confirmed conflicts' })).toHaveTextContent('src/local.ts');
    expect(screen.getByRole('region', { name: 'Provider-reported conflicts' })).not.toHaveTextContent('src/local.ts');
  });

  it('renders all supported reviewer statuses with their textual colour-coded labels', () => {
    render(ReviewerList, {
      props: {
        reviewers: [
          { id: 'one', name: 'Ada', status: 'approved' },
          { id: 'two', name: 'Lin', status: 'changes-requested' },
          { id: 'three', name: 'Sam', status: 'commented' },
          { id: 'four', name: 'Rae', status: 'pending' },
        ],
      },
    });

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Changes requested')).toBeInTheDocument();
    expect(screen.getByText('Commented')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});

describe('source-control hub', () => {
  it('exposes Changes, PR, and Commits and falls back to the first available segment', async () => {
    const data: SourceControlHubData = {
      changes: changedFiles,
      pullRequest: pullRequestSummary,
      commits: {
        commits: [{ id: 'abc123', subject: 'Update policy', filesState: 'idle' }],
      },
    };
    const { rerender } = render(SourceControlHub, { props: { data, requestedSegment: 'pr' } });

    expect(screen.getByRole('tab', { name: 'Changes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'PR' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Commits' })).toBeInTheDocument();
    expect(screen.getByText('Host-resolved changes requested')).toBeInTheDocument();

    await rerender({ data: { changes: changedFiles }, requestedSegment: 'commits' });

    expect(screen.getByRole('tab', { name: 'Changes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: 'Commits' })).toBeNull();
    expect(screen.getByText('src/policy.ts')).toBeInTheDocument();
  });
});
