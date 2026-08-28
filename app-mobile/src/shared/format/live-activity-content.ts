// ───────────────────────────────────────────────────────────────────
// MODULE: Live Activity Content Fallback
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Keep the glanceable line the same size wherever the client renders it. */
export const LIVE_ACTIVITY_CLIP_LENGTH = 80;

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Host-shaped content kept optional so an older host produces no invented text. */
export interface LiveActivityContentInput {
  readonly prompt?: string;
  readonly activity?: string;
  readonly state?: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONTENT RESOLUTION
// ───────────────────────────────────────────────────────────────────

/** Choose the most specific available line, then apply the shared clip once. */
export function resolveLiveActivityContent(
  input: LiveActivityContentInput,
): string | undefined {
  const prompt = presentText(input.prompt);
  const activity = presentText(input.activity);
  const state = presentText(input.state);
  const content = prompt === undefined ? (activity ?? state) : `You: ${prompt}`;
  return content === undefined ? undefined : clipLiveActivityContent(content);
}

/** Keep blank or non-string optional fields from becoming misleading placeholders. */
function presentText(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Use one truncation rule for prompt, activity, and state content. */
function clipLiveActivityContent(value: string): string {
  if (value.length <= LIVE_ACTIVITY_CLIP_LENGTH) return value;
  return `${value.slice(0, LIVE_ACTIVITY_CLIP_LENGTH - 1)}…`;
}
