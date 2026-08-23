// ───────────────────────────────────────────────────────────────────
// MODULE: Code Syntax Highlighting
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. HIGHLIGHT LIMITS AND LANGUAGE ALLOWLIST
// ───────────────────────────────────────────────────────────────────

export const HIGHLIGHT_MAX_CHARS = 20_000;
export const HIGHLIGHT_MAX_LINES = 1_000;

export const HIGHLIGHT_LANGUAGE_ALLOWLIST = [
  'bash',
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'json',
  'html',
  'css',
  'markdown',
  'python',
  'go',
  'rust',
  'yaml',
  'sql',
  'diff',
  'ansi',
  'plaintext',
] as const;

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type HighlightLanguage = (typeof HIGHLIGHT_LANGUAGE_ALLOWLIST)[number];
export type HighlightTheme = 'light' | 'dark';
export type HighlightTokenKind =
  | 'plain'
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'boolean'
  | 'tag'
  | 'heading'
  | 'diff-add'
  | 'diff-remove'
  | 'ansi';

export interface HighlightToken {
  readonly text: string;
  readonly kind: HighlightTokenKind;
}

export interface UseHighlightedCodeOptions {
  /** The canonical redacted text. This value is the only source sent to the worker. */
  readonly source: string;
  readonly language?: string | null;
  readonly theme?: HighlightTheme;
  readonly revision?: string | number;
  readonly enabled?: boolean;
}

export type HighlightStatus = 'plain' | 'pending' | 'highlighted' | 'skipped' | 'failed';

export interface HighlightState {
  readonly status: HighlightStatus;
  readonly tokens: readonly HighlightToken[] | null;
  readonly contentHash: string;
  readonly requestId: string | null;
  readonly revisionId: string;
  readonly language: HighlightLanguage | null;
}

export interface HighlightResourceStats {
  readonly activeWorkers: number;
  readonly pendingRequests: number;
  readonly retainedHighlightSets: number;
}

export type HighlightEligibility =
  'eligible' | 'plaintext' | 'unsupported-language' | 'character-cutoff' | 'line-cutoff';

interface HighlightRequest {
  readonly source: string;
  readonly language: HighlightLanguage;
  readonly theme: HighlightTheme;
  readonly contentHash: string;
  readonly requestId: string;
  readonly revisionId: string;
}

interface HighlightResponse {
  readonly tokens: readonly HighlightToken[];
  readonly contentHash: string;
  readonly requestId: string;
  readonly revisionId: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. MODULE STATE AND RESOURCE STATS
// ───────────────────────────────────────────────────────────────────

let requestSequence = 0;
let activeWorkers = 0;
const pendingRequests = new Set<string>();

function nextRequestId(): string {
  requestSequence = (requestSequence + 1) % 1_000_000_000;
  return `highlight-${requestSequence.toString(36)}`;
}

export function getHighlightResourceStats(): HighlightResourceStats {
  return {
    activeWorkers,
    pendingRequests: pendingRequests.size,
    retainedHighlightSets: 0,
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. HASHING AND LANGUAGE NORMALIZATION
// ───────────────────────────────────────────────────────────────────

export function hashCanonicalSource(source: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normalizeHighlightLanguage(
  value: string | null | undefined,
): HighlightLanguage | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim().toLocaleLowerCase();
  const aliases: Readonly<Record<string, HighlightLanguage>> = {
    bash: 'bash',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    js: 'javascript',
    javascript: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    typescript: 'typescript',
    tsx: 'tsx',
    json: 'json',
    html: 'html',
    xml: 'html',
    css: 'css',
    md: 'markdown',
    markdown: 'markdown',
    python: 'python',
    py: 'python',
    go: 'go',
    rust: 'rust',
    rs: 'rust',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
    diff: 'diff',
    patch: 'diff',
    ansi: 'ansi',
    text: 'plaintext',
    plain: 'plaintext',
    plaintext: 'plaintext',
  };
  return aliases[normalized] ?? null;
}

export function lineCount(source: string): number {
  return source.length === 0 ? 1 : source.split(/\r?\n/u).length;
}

// ───────────────────────────────────────────────────────────────────
// 5. ELIGIBILITY POLICY
// ───────────────────────────────────────────────────────────────────

export function highlightEligibility(
  source: string,
  language: string | null | undefined,
): HighlightEligibility {
  const normalized = normalizeHighlightLanguage(language);
  if (normalized === null) return 'unsupported-language';
  if (normalized === 'plaintext') return 'plaintext';
  if (source.length > HIGHLIGHT_MAX_CHARS) return 'character-cutoff';
  if (lineCount(source) > HIGHLIGHT_MAX_LINES) return 'line-cutoff';
  return 'eligible';
}

export function shouldDispatchHighlight(
  source: string,
  language: string | null | undefined,
  enabled = true,
): boolean {
  return enabled && highlightEligibility(source, language) === 'eligible';
}

// ───────────────────────────────────────────────────────────────────
// 6. THEME RESOLUTION AND RESPONSE VALIDATION
// ───────────────────────────────────────────────────────────────────

function resolveTheme(): HighlightTheme {
  if (typeof document !== 'undefined') {
    const rootTheme = document.documentElement.dataset.theme;
    if (rootTheme === 'dark') return 'dark';
    if (rootTheme === 'light') return 'light';
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  }
  return 'light';
}

function isHighlightToken(value: unknown): value is HighlightToken {
  if (typeof value !== 'object' || value === null) return false;
  const token = value as { readonly text?: unknown; readonly kind?: unknown };
  return (
    typeof token.text === 'string' &&
    (token.kind === 'plain' ||
      token.kind === 'keyword' ||
      token.kind === 'string' ||
      token.kind === 'comment' ||
      token.kind === 'number' ||
      token.kind === 'boolean' ||
      token.kind === 'tag' ||
      token.kind === 'heading' ||
      token.kind === 'diff-add' ||
      token.kind === 'diff-remove' ||
      token.kind === 'ansi')
  );
}

function isHighlightResponse(value: unknown): value is HighlightResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<HighlightResponse>;
  return (
    Array.isArray(candidate.tokens) &&
    candidate.tokens.every(isHighlightToken) &&
    typeof candidate.contentHash === 'string' &&
    typeof candidate.requestId === 'string' &&
    typeof candidate.revisionId === 'string'
  );
}

function tokensCoverSource(tokens: readonly HighlightToken[], source: string): boolean {
  let length = 0;
  for (const token of tokens) length += token.text.length;
  return length === source.length;
}

function initialState(
  source: string,
  language: HighlightLanguage | null,
  revisionId: string,
): HighlightState {
  return {
    status: 'plain',
    tokens: null,
    contentHash: hashCanonicalSource(source),
    requestId: null,
    revisionId,
    language,
  };
}

// ───────────────────────────────────────────────────────────────────
// 7. RUNES HOOK FACTORY
// ───────────────────────────────────────────────────────────────────

/**
 * Svelte 5 runes port of the React hook. Call it once during component init and pass a getter thunk that reads
 * The reactive inputs; the returned `current` getter exposes the reactive HighlightState. The $effect re-runs
 * Whenever the tracked inputs change and its cleanup terminates the worker (matching the React useEffect).
 */
export function useHighlightedCode(
  getOptions: () => UseHighlightedCodeOptions,
): { readonly current: HighlightState } {
  const derive = () => {
    const options = getOptions();
    const source = options.source;
    const normalizedLanguage = normalizeHighlightLanguage(options.language);
    const theme = options.theme ?? resolveTheme();
    const revisionId = String(options.revision ?? 1);
    const enabled = options.enabled ?? true;
    const contentHash = hashCanonicalSource(source);
    return { source, normalizedLanguage, theme, revisionId, enabled, contentHash };
  };

  const seed = derive();
  let state = $state<HighlightState>(
    initialState(seed.source, seed.normalizedLanguage, seed.revisionId),
  );

  let currentRequestId: string | null = null;
  let currentRevisionId = '';

  $effect(() => {
    const { source, normalizedLanguage, theme, revisionId, enabled, contentHash } = derive();

    let disposed = false;
    let worker: Worker | null = null;
    let workerClosed = false;

    const eligibility = highlightEligibility(source, normalizedLanguage);
    const shouldDispatch = enabled && eligibility === 'eligible' && normalizedLanguage !== null;
    const requestId = shouldDispatch ? nextRequestId() : null;
    currentRequestId = requestId;
    currentRevisionId = revisionId;

    state = {
      ...initialState(source, normalizedLanguage, revisionId),
      status: shouldDispatch ? 'pending' : 'skipped',
      requestId,
    };

    if (!shouldDispatch || requestId === null || normalizedLanguage === null) {
      return () => {
        disposed = true;
        currentRequestId = null;
      };
    }
    if (typeof Worker === 'undefined') {
      if (state.contentHash === contentHash && state.revisionId === revisionId) {
        state = { ...state, status: 'failed', requestId: null };
      }
      return () => {
        disposed = true;
        currentRequestId = null;
      };
    }

    const pendingKey = `${requestId}\u0000${revisionId}`;
    pendingRequests.add(pendingKey);
    const closeWorker = () => {
      if (workerClosed) return;
      workerClosed = true;
      pendingRequests.delete(pendingKey);
      if (worker !== null) {
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
        worker = null;
        activeWorkers = Math.max(0, activeWorkers - 1);
      }
    };
    const acceptResponse = (value: unknown) => {
      if (disposed || currentRequestId !== requestId || currentRevisionId !== revisionId) return;
      if (!isHighlightResponse(value)) return;
      if (
        value.requestId !== requestId ||
        value.revisionId !== revisionId ||
        value.contentHash !== contentHash ||
        !tokensCoverSource(value.tokens, source)
      ) {
        return;
      }
      closeWorker();
      state = {
        status: 'highlighted',
        tokens: value.tokens,
        contentHash,
        requestId,
        revisionId,
        language: normalizedLanguage,
      };
    };

    try {
      worker = new Worker(new URL('./highlight.worker.ts', import.meta.url), { type: 'module' });
      activeWorkers += 1;
      worker.onmessage = (event: MessageEvent<unknown>) => acceptResponse(event.data);
      worker.onerror = () => {
        if (disposed || currentRequestId !== requestId || currentRevisionId !== revisionId) return;
        closeWorker();
        if (state.contentHash === contentHash && state.revisionId === revisionId) {
          state = { ...state, status: 'failed', tokens: null, requestId: null };
        }
      };
      const message: HighlightRequest = {
        source,
        language: normalizedLanguage,
        theme,
        contentHash,
        requestId,
        revisionId,
      };
      worker.postMessage(message);
    } catch {
      closeWorker();
      if (!disposed && currentRequestId === requestId && currentRevisionId === revisionId) {
        if (state.contentHash === contentHash && state.revisionId === revisionId) {
          state = { ...state, status: 'failed', tokens: null, requestId: null };
        }
      }
    }

    return () => {
      disposed = true;
      if (currentRequestId === requestId) currentRequestId = null;
      closeWorker();
    };
  });

  return {
    get current(): HighlightState {
      const { source, normalizedLanguage, revisionId, contentHash } = derive();
      if (state.contentHash !== contentHash || state.revisionId !== revisionId) {
        return initialState(source, normalizedLanguage, revisionId);
      }
      return state;
    },
  };
}
