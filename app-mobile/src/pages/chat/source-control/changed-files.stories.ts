// ───────────────────────────────────────────────────────────────────
// MODULE: CHANGED FILES STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import ChangedFiles from './changed-files.svelte';

const meta = {
  title: 'Source Control/ChangedFiles',
  component: ChangedFiles,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Projects the host’s committed-branch file snapshot as a read-only list and opens only the selected file’s host-supplied patch. Without source-control capability or a non-empty snapshot, it renders nothing; a selected file without a patch reports “Diff unavailable.”',
      },
    },
  },
} satisfies Meta<typeof ChangedFiles>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutHostData: Story = {
  args: {},
};

const CHANGED_FILES = {
  branchLabel: 'feature/compact-source-control',
  files: [
    {
      path: 'app-mobile/src/pages/chat/source-control/source-control-types.ts',
      additions: 6,
      deletions: 2,
      patch: `diff --git a/app-mobile/src/pages/chat/source-control/source-control-types.ts b/app-mobile/src/pages/chat/source-control/source-control-types.ts
index 1a2b3c4..5d6e7f8 100644
--- a/app-mobile/src/pages/chat/source-control/source-control-types.ts
+++ b/app-mobile/src/pages/chat/source-control/source-control-types.ts
@@ -18,6 +18,10 @@ export interface PullRequestSummary {
   readonly state: string;
   readonly rollup: string;
+  readonly stateLabel?: string;
+  readonly rollupLabel?: string;
+  readonly commentCount?: number;
 }
 
 export interface PullRequestDetails extends PullRequestSummary {
@@ -31,4 +35,6 @@ export interface PullRequestDetails extends PullRequestSummary {
   readonly webUrl?: string | null;
+  readonly description?: string;
 }
`,
    },
    {
      path: 'app-mobile/src/pages/chat/source-control/check-list.svelte',
      additions: 18,
      deletions: 7,
    },
    {
      path: 'app-mobile/src/pages/chat/source-control/source-control-hub.svelte',
      additions: 11,
      deletions: 4,
    },
    {
      path: 'app-mobile/src/pages/chat/source-control/check-summary.svelte',
      additions: 3,
      deletions: 1,
    },
  ],
};

export const PopulatedWithDiff: Story = {
  args: {
    data: CHANGED_FILES,
  },
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLButtonElement>('button[aria-label^="Open diff for"]')?.click();
  },
};
