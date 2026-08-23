// ───────────────────────────────────────────────────────────────────
// MODULE: Explicit Slash Draft Submission (fail-closed)
// ───────────────────────────────────────────────────────────────────
// The single client orchestration that turns a drafted slash binding into
// Exactly one host-visible submission. Every local gate runs before any
// Transport work: the binding must be current for the committed snapshot
// (host epoch, session, and both revisions), the canonical name must still
// Resolve to an enabled row in the CURRENT filtered catalog, and the live
// Connection plus an authoritative running/plan snapshot must be present.
// Only then is ONE fresh one-use ticket requested and ONE expected-revision
// Envelope submitted; no outcome is retried, converted to text, or mapped
// To steer/followUp. The draft itself is never touched by this module.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { TextBlock } from '@pi-remote/pi-rpc-protocol';

import {
  bindingMatchesSnapshot,
  type ScopedCommandSnapshot,
  type SelectedCommandBinding,
} from './commands.js';
import { RelayRequestError, SlashSubmitError, requestTicket, submitSlashCommand } from '../transport/relay.js';
import type { ConnectionPhase } from '../state/state.js';

// ───────────────────────────────────────────────────────────────────
// 2. OUTCOME AND INPUT TYPES
// ───────────────────────────────────────────────────────────────────

/** Every fail-closed outcome a draft submission can settle to, except acceptance. */
export type SlashSubmitFailureCode =
  | 'invalid-draft'
  | 'not-live'
  | 'no-running-authority'
  | 'running'
  | 'stale'
  | 'denied'
  | 'forbidden'
  | 'unavailable'
  | 'incompatible'
  | 'delivery-unknown';

export type SlashSubmitOutcome =
  | { readonly status: 'accepted'; readonly block: TextBlock }
  | { readonly status: 'failed'; readonly code: SlashSubmitFailureCode };

export interface SubmitSlashDraftInput {
  readonly sessionId: string;
  /** The drafted message, exactly as the user left it in the composer. */
  readonly draft: string;
  /** The binding carried by the draft; null means no insertion ever happened. */
  readonly binding: SelectedCommandBinding | null;
  /** The CURRENT committed catalog snapshot (never a stale capture). */
  readonly snapshot: ScopedCommandSnapshot | null;
  readonly connection: ConnectionPhase;
  readonly awaitingSnapshot: boolean;
  /** Host-confirmed running/plan snapshot is present (never guessed). */
  readonly runtimeAuthority: boolean;
  /** Authoritative host running state from the runtime snapshot. */
  readonly running: boolean;
  readonly signal?: AbortSignal;
}

// ───────────────────────────────────────────────────────────────────
// 3. DRAFT SUBMISSION PIPELINE
// ───────────────────────────────────────────────────────────────────

/**
 * Submit one explicit slash draft. Returns an outcome; throws only on
 * Programmer error. Failures never retry: the caller preserves the draft
 * And requires a fresh insertion before any second attempt.
 */
export async function submitSlashDraft(input: SubmitSlashDraftInput): Promise<SlashSubmitOutcome> {
  const { binding, snapshot } = input;
  if (binding === null) return failed('invalid-draft');
  // The draft must still be exactly the bound token (plus arguments).
  const message = canonicalSlashMessage(input.draft, binding.name);
  if (message === null) return failed('invalid-draft');
  // Host/session/catalog revision race: the binding no longer matches the
  // Committed scope. Zero Pi calls; the caller refreshes and reselects.
  if (snapshot === null || !bindingMatchesSnapshot(binding, snapshot)) return failed('stale');
  // Resolve the canonical token inside the CURRENT filtered catalog. A row
  // That vanished or became disabled fails closed before any ticket.
  const descriptor = snapshot.commands.find((command) => command.name === binding.name);
  if (descriptor === undefined || !descriptor.enabled) return failed('denied');
  if (input.connection !== 'live' || input.awaitingSnapshot) return failed('not-live');
  if (!input.runtimeAuthority) return failed('no-running-authority');
  if (input.running) return failed('running');

  const submissionId = `slash_${crypto.randomUUID().replaceAll('-', '_')}`;
  let submitStarted = false;
  try {
    const ticket = await requestTicket(input.signal);
    submitStarted = true;
    const block = await submitSlashCommand(
      input.sessionId,
      submissionId,
      message,
      binding,
      input.signal,
    );
    return { status: 'accepted', block };
  } catch (error: unknown) {
    if (!submitStarted) return failed(preSubmitFailureCode(error));
    return failed(postSubmitFailureCode(error));
  }
}

/**
 * The exact message the host must see: the canonical name plus the user's
 * Arguments, or null when the draft no longer matches the binding token.
 */
export function canonicalSlashMessage(draft: string, name: string): string | null {
  const token = `/${name}`;
  if (!draft.startsWith(token)) return null;
  const rest = draft.slice(token.length);
  if (rest.length === 0) return token;
  if (rest[0] !== ' ' && rest[0] !== '\t') return null;
  const args = rest.trim();
  return args.length === 0 ? token : `${token} ${args}`;
}

// ───────────────────────────────────────────────────────────────────
// 4. FAILURE CLASSIFICATION
// ───────────────────────────────────────────────────────────────────

function preSubmitFailureCode(error: unknown): SlashSubmitFailureCode {
  // Nothing reached the relay: every transport classification is bounded and
  // The outcome is unambiguous.
  if (error instanceof RelayRequestError) {
    if (error.status === 401 || error.status === 403) return 'forbidden';
    if (error.status === 400) return 'incompatible';
    return 'unavailable';
  }
  if (error instanceof SyntaxError) return 'incompatible';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'unavailable';
  return 'unavailable';
}

function postSubmitFailureCode(error: unknown): SlashSubmitFailureCode {
  // The submission started; only typed outcomes are definitive. A transport
  // Failure here is ambiguous — the host may have received the envelope —
  // So it settles as delivery-unknown and is never retried.
  if (error instanceof SlashSubmitError) {
    return error.reasonCode === 'stale_catalog' ? 'stale' : 'denied';
  }
  if (error instanceof RelayRequestError) {
    if (error.status === 401 || error.status === 403) return 'forbidden';
    if (error.status === 400) return 'incompatible';
    if (error.status === 429 || (error.status !== null && error.status >= 500)) {
      return 'unavailable';
    }
    return 'delivery-unknown';
  }
  if (error instanceof SyntaxError) return 'incompatible';
  return 'delivery-unknown';
}

function failed(code: SlashSubmitFailureCode): SlashSubmitOutcome {
  return { status: 'failed', code };
}
