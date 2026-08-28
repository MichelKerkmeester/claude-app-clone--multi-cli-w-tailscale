// ───────────────────────────────────────────────────────────────────
// MODULE: Launch Draft Adoption
// ───────────────────────────────────────────────────────────────────
// Pure policy for adopting an optional host-provided draft into a controlled composer.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface LaunchDraftAdoptionInput {
  readonly sessionId: string | null | undefined;
  readonly launchDraft: string | null | undefined;
  readonly currentDraft: string;
  readonly alreadyHandled: boolean;
}

export interface LaunchDraftAdoptionResult {
  readonly draft: string;
  readonly adopted: boolean;
  readonly handled: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 2. ADOPTION POLICY
// ───────────────────────────────────────────────────────────────────

// Keeps a host draft from overwriting live typing or returning after deletion.
export function adoptLaunchDraft(input: LaunchDraftAdoptionInput): LaunchDraftAdoptionResult {
  const hasLaunchDraft = input.launchDraft !== null && input.launchDraft !== undefined && input.launchDraft.length > 0;
  if (input.sessionId === null || input.sessionId === undefined || !hasLaunchDraft || input.alreadyHandled) {
    return { draft: input.currentDraft, adopted: false, handled: false };
  }
  if (input.currentDraft.length > 0) {
    return { draft: input.currentDraft, adopted: false, handled: true };
  }
  return { draft: input.launchDraft, adopted: true, handled: true };
}
