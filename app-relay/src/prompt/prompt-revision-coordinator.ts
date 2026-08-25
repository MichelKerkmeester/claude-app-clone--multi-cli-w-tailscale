// ───────────────────────────────────────────────────────────────────
// MODULE: Accepted Prompt Revision Coordination
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Mutations which change the prompt revision observed by attachment sets. */
export type AcceptedPromptMutation = 'user' | 'runtime';

// ───────────────────────────────────────────────────────────────────
// 2. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

export class PromptRevisionCoordinator {
  private revision: number;

  public constructor(initialRevision = 0) {
    if (!Number.isSafeInteger(initialRevision) || initialRevision < 0) {
      throw new RangeError('Prompt revision must be a non-negative safe integer.');
    }
    this.revision = initialRevision;
  }

  public current(): number {
    return this.revision;
  }

  public matches(expectedRevision: number): boolean {
    return expectedRevision === this.revision;
  }

  public accept(mutation: AcceptedPromptMutation): number {
    if (mutation !== 'user' && mutation !== 'runtime') {
      throw new TypeError('Unknown accepted prompt mutation.');
    }
    if (this.revision === Number.MAX_SAFE_INTEGER) {
      throw new RangeError('Prompt revision exhausted.');
    }
    this.revision += 1;
    return this.revision;
  }

  /** Streaming tokens do not advance the revision coordinator. */
  public observeStreamingToken(): number {
    return this.revision;
  }
}
