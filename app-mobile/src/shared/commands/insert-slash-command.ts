// ───────────────────────────────────────────────────────────────────
// MODULE: Canonical Slash Command Insertion (pure)
// ───────────────────────────────────────────────────────────────────
// Shared slash insertion: replace token range, record binding; no network work.

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

/** One device-local saved prompt chip. */
export interface QuickPrompt {
  readonly label: string;
  readonly prompt: string;
}

export interface InsertQuickPromptInput {
  readonly draft: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly quickPrompt: QuickPrompt;
}

export interface InsertQuickPromptResult {
  readonly draft: string;
  readonly caretOffset: number;
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
// 4. DEVICE-LOCAL QUICK PROMPTS
// ───────────────────────────────────────────────────────────────────

const MAX_QUICK_PROMPTS = 50;
const QUICK_PROMPT_LABEL_MAX_LENGTH = 120;
const QUICK_PROMPT_BODY_MAX_LENGTH = 4000;
export const QUICK_PROMPTS_STORAGE_KEY = 'pi-remote.quick-prompts';

function isQuickPrompt(value: unknown): value is QuickPrompt {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    typeof record.label === 'string' &&
    record.label.trim().length > 0 &&
    record.label.length <= QUICK_PROMPT_LABEL_MAX_LENGTH &&
    typeof record.prompt === 'string' &&
    record.prompt.trim().length > 0 &&
    record.prompt.length <= QUICK_PROMPT_BODY_MAX_LENGTH
  );
}

/** Read saved chips from device storage; unavailable or malformed data stays empty. */
export function readQuickPrompts(): readonly QuickPrompt[] {
  try {
    const raw = window.localStorage.getItem(QUICK_PROMPTS_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQuickPrompt).slice(0, MAX_QUICK_PROMPTS);
  } catch {
    return [];
  }
}

/** Insert a saved chip into the draft without creating a send or host operation. */
export function insertQuickPrompt(input: InsertQuickPromptInput): InsertQuickPromptResult {
  const start = Math.min(input.selectionStart, input.selectionEnd);
  const end = Math.max(input.selectionStart, input.selectionEnd);
  const draft = input.draft.slice(0, start) + input.quickPrompt.prompt + input.draft.slice(end);
  return {
    draft,
    caretOffset: start + input.quickPrompt.prompt.length,
    announcement: `Inserted ${input.quickPrompt.label}. Not sent.`,
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. BINDING RETENTION
// ───────────────────────────────────────────────────────────────────

/** Retain binding while the command token is untouched; edits after the boundary keep it. */
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
