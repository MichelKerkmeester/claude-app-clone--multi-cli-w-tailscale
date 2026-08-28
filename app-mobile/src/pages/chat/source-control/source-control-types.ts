// ───────────────────────────────────────────────────────────────────
// MODULE: SOURCE CONTROL TYPES
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. PULL REQUEST TYPES
// ───────────────────────────────────────────────────────────────────

export interface PullRequestSummary {
  readonly state: string;
  readonly rollup: string;
  readonly commentCount?: number;
  readonly stateLabel?: string;
  readonly rollupLabel?: string;
}

export interface PullRequestDetails extends PullRequestSummary {
  readonly title?: string;
  readonly number?: string | number;
  readonly webUrl?: string | null;
  readonly description?: string;
}

// ───────────────────────────────────────────────────────────────────
// 2. CHECK TYPES
// ───────────────────────────────────────────────────────────────────

export type CheckClassification = 'passing' | 'failing' | 'pending' | 'unknown' | (string & {});

export interface CheckSummary {
  readonly classification: CheckClassification;
  readonly label: string;
  readonly detail?: string;
}

export interface CheckRow {
  readonly id: string;
  readonly name: string;
  readonly classification: CheckClassification;
  readonly statusLabel: string;
  readonly detail?: string;
  readonly webUrl?: string | null;
  /** Host-resolved order; lower values appear first. */
  readonly order?: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. FILE TYPES
// ───────────────────────────────────────────────────────────────────

export interface ChangedFile {
  readonly path: string;
  readonly additions?: number;
  readonly deletions?: number;
  readonly patch?: string | null;
}

export interface ChangedFilesData {
  readonly branchLabel?: string;
  readonly files: readonly ChangedFile[];
}

// ───────────────────────────────────────────────────────────────────
// 4. COMMIT TYPES
// ───────────────────────────────────────────────────────────────────

export type CommitFilesState = 'idle' | 'loading' | 'loaded' | 'failed';

export interface CommitRecord {
  readonly id: string;
  readonly subject: string;
  readonly author?: string;
  readonly committedAt?: string;
  readonly filesState: CommitFilesState;
  readonly files?: readonly ChangedFile[];
  readonly failureMessage?: string;
}

export interface CommitHistoryData {
  readonly branchLabel?: string;
  readonly commits: readonly CommitRecord[];
}

// ───────────────────────────────────────────────────────────────────
// 5. REPOSITORY TYPES
// ───────────────────────────────────────────────────────────────────

export interface UpstreamStatus {
  readonly branch?: string;
  readonly upstream?: string;
  readonly ahead?: number;
  readonly behind?: number;
}

export interface ConflictSets {
  readonly providerReported?: readonly ChangedFile[];
  readonly locallyConfirmed?: readonly ChangedFile[];
}

export type ReviewerStatus = 'approved' | 'changes-requested' | 'commented' | 'pending';

export interface ReviewerRow {
  readonly id: string;
  readonly name: string;
  readonly status: ReviewerStatus;
  readonly label?: string;
}

// ───────────────────────────────────────────────────────────────────
// 6. HUB TYPES
// ───────────────────────────────────────────────────────────────────

export type SourceControlSegment = 'changes' | 'pr' | 'commits';

export interface SourceControlHubData {
  readonly changes?: ChangedFilesData | null;
  readonly pullRequest?: PullRequestDetails | null;
  readonly checkSummary?: CheckSummary | null;
  readonly checks?: readonly CheckRow[] | null;
  readonly commits?: CommitHistoryData | null;
  readonly upstreamStatus?: UpstreamStatus | null;
  readonly conflicts?: ConflictSets | null;
  readonly reviewers?: readonly ReviewerRow[] | null;
}
