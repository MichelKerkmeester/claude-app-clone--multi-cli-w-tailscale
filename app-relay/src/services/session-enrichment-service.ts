// ───────────────────────────────────────────────────────────────────
// MODULE: In-Memory Session Card Enrichment
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  boundedNonNegativeNumber,
  pathFreeToken,
  safeDisplayString,
} from '../store/redaction.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TITLE_CAP = 200;
const PROMPT_CAP = 4_096;
const PREVIEW_CAP = 280;
const TOOL_CAP = 128;
const PREVIEW_MESSAGES_CAP = 8;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface SessionCardEnrichment {
  readonly title?: string;
  readonly prompt?: string;
  readonly lastMessagePreview?: string;
  readonly previewMessages?: readonly string[];
  readonly tool?: string;
  readonly contextPercent?: number;
}

export interface SessionEnrichmentServiceOptions {
  readonly getContextWindow?: () => number | null | undefined;
}

interface PreviewEntry {
  id: string;
  text: string;
}

interface SessionEnrichmentState {
  title: string | null;
  prompt: string | null;
  lastMessagePreview: string | null;
  readonly previews: PreviewEntry[];
  tool: string | null;
  readonly seenUsageIds: Set<string>;
  usedTotal: number;
  hasUsage: boolean;
  nextAnonymousId: number;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Host-redacted card summary from projected transcript blocks.
 * Raw prompt-derived text is never stored; a rejected value omits the field.
 */
export class SessionEnrichmentService {
  private readonly sessions = new Map<string, SessionEnrichmentState>();

  public constructor(private readonly options: SessionEnrichmentServiceOptions = {}) {}

  public ingestBlock(sessionId: string, block: unknown): void {
    if (typeof sessionId !== 'string' || sessionId.length === 0 || !isRecord(block)) {
      return;
    }
    const state = this.getOrCreate(sessionId);
    const id = blockIdentity(block, state);
    switch (block.kind) {
      case 'text':
        this.ingestText(state, id, block);
        return;
      case 'tool_call':
        this.ingestTool(state, block.toolName);
        return;
      case 'usage':
        this.ingestUsage(state, id, block);
        return;
      default:
        return;
    }
  }

  public getEnrichment(sessionId: string): SessionCardEnrichment {
    const state = this.sessions.get(sessionId);
    if (state === undefined) return {};
    const previewMessages = state.previews.map((entry) => entry.text);
    const contextPercent = this.contextPercent(state);
    return {
      ...(state.title === null ? {} : { title: state.title }),
      ...(state.prompt === null ? {} : { prompt: state.prompt }),
      ...(state.lastMessagePreview === null ? {} : { lastMessagePreview: state.lastMessagePreview }),
      ...(previewMessages.length === 0 ? {} : { previewMessages }),
      ...(state.tool === null ? {} : { tool: state.tool }),
      ...(contextPercent === null ? {} : { contextPercent }),
    };
  }

  private ingestText(
    state: SessionEnrichmentState,
    id: string,
    block: Record<string, unknown>,
  ): void {
    const role = block.role === 'user' || block.role === 'assistant' ? block.role : undefined;
    if (role === undefined) return;
    if (role === 'user') {
      const title = cardDisplayString(block.text, TITLE_CAP);
      if (state.title === null && title !== null) state.title = title;
      state.prompt = cardDisplayString(block.text, PROMPT_CAP);
    } else {
      state.lastMessagePreview = cardDisplayString(block.text, PREVIEW_CAP);
    }
    const preview = cardDisplayString(block.text, PREVIEW_CAP);
    if (preview === null) {
      removePreview(state, id);
      return;
    }
    upsertPreview(state, id, preview);
  }

  private ingestTool(state: SessionEnrichmentState, toolName: unknown): void {
    const token = pathFreeToken(toolName, TOOL_CAP);
    const tool = token === null ? null : safeDisplayString(token, TOOL_CAP);
    state.tool = tool;
  }

  private ingestUsage(
    state: SessionEnrichmentState,
    id: string,
    block: Record<string, unknown>,
  ): void {
    if (state.seenUsageIds.has(id)) return;
    const input = boundedNonNegativeNumber(block.inputTokens) ?? 0;
    const output = boundedNonNegativeNumber(block.outputTokens) ?? 0;
    state.seenUsageIds.add(id);
    state.usedTotal += input + output;
    state.hasUsage = true;
  }

  private contextPercent(state: SessionEnrichmentState): number | null {
    if (!state.hasUsage) return null;
    const max = boundedNonNegativeNumber(this.options.getContextWindow?.());
    if (max === null || max <= 0) return null;
    return Math.min(100, Math.max(0, Math.round((100 * state.usedTotal) / max)));
  }

  private getOrCreate(sessionId: string): SessionEnrichmentState {
    const current = this.sessions.get(sessionId);
    if (current !== undefined) return current;
    const created: SessionEnrichmentState = {
      title: null,
      prompt: null,
      lastMessagePreview: null,
      previews: [],
      tool: null,
      seenUsageIds: new Set(),
      usedTotal: 0,
      hasUsage: false,
      nextAnonymousId: 0,
    };
    this.sessions.set(sessionId, created);
    return created;
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cardDisplayString(value: unknown, max: number): string | null {
  const safe = safeDisplayString(value, max);
  if (safe === null) return null;
  return looksLikeSecret(safe) ? null : safe;
}

/**
 * Conservative card-boundary reject for un-prefixed token shapes that
 * the shared display sanitizer leaves through.
 */
function looksLikeSecret(text: string): boolean {
  if (
    /\bsk-[A-Za-z0-9-]{12,}/.test(text) ||
    /\b(?:ghp|gho|ghu|ghs)_[A-Za-z0-9]{20,}/.test(text) ||
    /\bxox[baprs]-[A-Za-z0-9-]{10,}/.test(text) ||
    /\bAKIA[0-9A-Z]{16}\b/.test(text) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)
  ) {
    return true;
  }
  const runs = text.match(/[A-Za-z0-9+/_-]{40,}/g);
  if (runs === null) return false;
  return runs.some((run) => /[A-Z]/.test(run) && /[a-z]/.test(run) && /[0-9]/.test(run));
}

function blockIdentity(block: Record<string, unknown>, state: SessionEnrichmentState): string {
  return typeof block.id === 'string' && block.id.length > 0
    ? block.id
    : `anon_${(state.nextAnonymousId += 1)}`;
}

function upsertPreview(state: SessionEnrichmentState, id: string, text: string): void {
  const existing = state.previews.findIndex((entry) => entry.id === id);
  if (existing >= 0) {
    state.previews[existing] = { id, text };
    return;
  }
  state.previews.push({ id, text });
  if (state.previews.length > PREVIEW_MESSAGES_CAP) {
    state.previews.shift();
  }
}

function removePreview(state: SessionEnrichmentState, id: string): void {
  const index = state.previews.findIndex((entry) => entry.id === id);
  if (index >= 0) state.previews.splice(index, 1);
}
