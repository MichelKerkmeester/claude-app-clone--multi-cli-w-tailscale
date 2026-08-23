// ───────────────────────────────────────────────────────────────────
// MODULE: Canonical Slash Command Insertion (pure)
// ───────────────────────────────────────────────────────────────────
// The one text mutation shared by every discovery surface: replace the
// Complete token range with the canonical `/${name} ` and record the
// Revision binding. The draft update is synchronous and controlled; caret
// Placement, focus restoration, and the "Not sent" announcement follow the
// Returned offsets. The function performs no network work.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { SelectedCommandBinding } from './commands.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface InsertSlashCommandInput {
  readonly draft: string;
  /** Selection fallback when no explicit token range is given. */
  readonly selectionStart: number;
  readonly selectionEnd: number;
  /** Canonical host command name (no leading slash). */
  readonly commandName: string;
  readonly binding: SelectedCommandBinding;
  /** The complete token range to replace; defaults to the selection. */
  readonly replaceRange?: { readonly start: number; readonly end: number };
}

export interface InsertSlashCommandResult {
  readonly draft: string;
  /** Caret offset: directly after the inserted trailing space. */
  readonly caretOffset: number;
  readonly binding: SelectedCommandBinding;
  readonly announcement: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. SLASH COMMAND INSERTION
// ───────────────────────────────────────────────────────────────────

export function insertSlashCommand(input: InsertSlashCommandInput): InsertSlashCommandResult {
  const start = input.replaceRange?.start ?? Math.min(input.selectionStart, input.selectionEnd);
  const end = input.replaceRange?.end ?? Math.max(input.selectionStart, input.selectionEnd);
  const token = `/${input.commandName} `;
  const draft = input.draft.slice(0, start) + token + input.draft.slice(end);
  return {
    draft,
    caretOffset: start + token.length,
    binding: input.binding,
    announcement: `Inserted slash command ${input.commandName}. Not sent.`,
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. BINDING RETENTION
// ───────────────────────────────────────────────────────────────────

/**
 * Retain a binding only while the command-name token is untouched. Editing
 * The token itself clears the binding; edits anywhere after the trailing
 * Boundary (arguments) retain it.
 */
export function bindingAfterDraftChange(input: {
  readonly previousDraft: string;
  readonly nextDraft: string;
  readonly binding: SelectedCommandBinding | null;
}): SelectedCommandBinding | null {
  const { previousDraft, nextDraft, binding } = input;
  if (binding === null) return null;
  const token = `/${binding.name}`;
  const tokenEnd = token.length;
  const tokenIntact = (draft: string) => {
    if (!draft.startsWith(token)) return false;
    if (draft.length === tokenEnd) return true;
    const boundary = draft[tokenEnd];
    return boundary !== undefined && isTokenBoundary(boundary);
  };
  if (!tokenIntact(previousDraft) || !tokenIntact(nextDraft)) return null;
  return binding;
}

function isTokenBoundary(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}
