// ───────────────────────────────────────────────────────────────────
// MODULE: Explicit Slash Draft Submission (fail-closed)
// ───────────────────────────────────────────────────────────────────
// Fail-closed slash submit: local gates, then one ticket and one envelope; never retries or touches the draft.

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

/** One explicit slash submit; failures never retry — caller preserves the draft. */
export async function submitSlashDraft(input: SubmitSlashDraftInput): Promise<SlashSubmitOutcome> {
  const { binding, snapshot } = input;
  if (binding === null) return failed('invalid-draft');
  // The draft must still be exactly the bound token (plus arguments).
  const message = canonicalSlashMessage(input.draft, binding.name);
  if (message === null) return failed('invalid-draft');
  // Binding must match committed scope before any Pi call.
  if (snapshot === null || !bindingMatchesSnapshot(binding, snapshot)) return failed('stale');
  // Row must still be enabled in the current catalog before ticket request.
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

/** Canonical `/${name}` plus trimmed args, or null when the draft no longer matches. */
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
  // Pre-submit failures map to bounded issues; ambiguous transport is still safe to redact.
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
  // Post-submit transport failure is ambiguous — reconcile only, never retry.
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
