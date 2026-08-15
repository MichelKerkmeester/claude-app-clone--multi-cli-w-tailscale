// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Local Preview (offline demo)
// ───────────────────────────────────────────────────────────────────
// Durable WHY: previewing the mobile chat surface on this Mac (iOS
// Simulator or a browser) needs the app past enrollment and populated
// with a representative session, but no live relay or pi is available
// off the tailnet. This module answers the relay's read + control
// endpoints with in-memory fixtures so the four controls, transcript,
// and design system are all exercisable. It is inert unless the build
// carries VITE_PI_DEMO=1 AND the client opts in with ?demo=1, and it
// never speaks to the relay — the fake data lives only in this tab, so
// the real deployment's authority and redaction are untouched.

import type { DeviceIdentity } from './auth.js';

// Opaque ids must match the protocol guard pattern ^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$.
const SESSION_IDLE = 'demo-session-refactor';
const SESSION_RUNNING = 'demo-session-triage';
const EPOCH = 'demo-epoch-01';

let cachedEnabled: boolean | null = null;

/**
 * Preview is double-gated: the build must define VITE_PI_DEMO=1 (so a normal
 * production build strips this path) and the client must pass ?demo=1 once.
 * The opt-in is persisted so the installed PWA — which relaunches at "/" and
 * loses the query string — stays in preview until ?demo=0 clears it.
 */
export function isDemoMode(): boolean {
  if (import.meta.env.VITE_PI_DEMO !== '1') return false;
  if (cachedEnabled === null) cachedEnabled = readDemoOptIn();
  return cachedEnabled;
}

function readDemoOptIn(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('demo');
    if (requested === '1') window.localStorage.setItem('pi-remote.demo', '1');
    else if (requested === '0') window.localStorage.removeItem('pi-remote.demo');
    return window.localStorage.getItem('pi-remote.demo') === '1';
  } catch {
    return new URLSearchParams(window.location.search).get('demo') === '1';
  }
}

export const DEMO_IDENTITY: DeviceIdentity = {
  deviceId: 'demo-device-iphone',
  hostFingerprint: 'demo-host-fingerprint',
};

function isoAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function base(id: string, seq: number, minutesAgo: number) {
  return { id, revision: 1, seq, occurredAt: isoAgo(minutesAgo) };
}

// A representative completed turn: user request, then the agent's thinking,
// tool calls, a file diff, prose, and usage — so evidence collapse, turn
// grouping, the diff renderer, and the prose treatment are all visible.
const REFACTOR_BLOCKS = [
  {
    ...base('blk-001', 1, 9),
    kind: 'text',
    role: 'user',
    text: 'Refactor the auth guard so expired tickets fail closed, and add a regression test.',
  },
  {
    ...base('blk-002', 2, 8),
    kind: 'thinking',
    summary:
      'Locate the ticket guard, tighten the expiry comparison to reject on the boundary, then cover it with a test that asserts an expired ticket is denied.',
  },
  {
    ...base('blk-003', 3, 8),
    kind: 'tool_call',
    toolName: 'grep',
    inputSummary: 'rg "verifyTicket" src',
  },
  {
    ...base('blk-004', 4, 8),
    kind: 'tool_result',
    toolName: 'grep',
    output: 'src/auth/policy.ts:42:  const fresh = verifyTicket(ticket, now);',
    isError: false,
  },
  {
    ...base('blk-005', 5, 7),
    kind: 'file_diff',
    summary: 'Harden ticket expiry in policy.ts',
    patch: [
      '@@ -40,7 +40,8 @@ export function verifyTicket(ticket, now) {',
      '   if (ticket.principal !== expected) return false;',
      '-  if (ticket.expiresAt < now) return true;',
      '+  // Boundary is expired: fail closed rather than admit a stale ticket.',
      '+  if (ticket.expiresAt <= now) return false;',
      '   return true;',
      ' }',
    ].join('\n'),
  },
  {
    ...base('blk-006', 6, 6),
    kind: 'text',
    role: 'assistant',
    text: 'Tightened the expiry comparison to fail closed on the boundary and added a regression test asserting an expired ticket is rejected. Both the relay and protocol suites pass.',
  },
  {
    ...base('blk-007', 7, 6),
    kind: 'usage',
    inputTokens: 1840,
    outputTokens: 320,
    cost: 0.021,
  },
];

const TRIAGE_BLOCKS = [
  {
    ...base('blk-101', 1, 2),
    kind: 'text',
    role: 'user',
    text: 'The sync socket drops every few minutes on cellular — can you find why?',
  },
  {
    ...base('blk-102', 2, 1),
    kind: 'thinking',
    summary:
      'Check the reconnect backoff and whether the cursor is preserved across a close so the stream resumes without a gap.',
  },
  {
    ...base('blk-103', 3, 1),
    kind: 'tool_call',
    toolName: 'read',
    inputSummary: 'apps/pi-remote-web/src/App.tsx:958-1020',
  },
];

interface DemoSession {
  readonly id: string;
  readonly status: 'idle' | 'running';
  readonly blocks: readonly Record<string, unknown>[];
}

const SESSIONS: readonly DemoSession[] = [
  { id: SESSION_IDLE, status: 'idle', blocks: REFACTOR_BLOCKS },
  { id: SESSION_RUNNING, status: 'running', blocks: TRIAGE_BLOCKS },
];

interface DemoModel {
  readonly provider: string;
  readonly id: string;
  readonly label: string;
}

const DEFAULT_MODEL: DemoModel = {
  provider: 'anthropic',
  id: 'claude-opus-4-8',
  label: 'Claude Opus 4.8',
};

const MODELS: readonly DemoModel[] = [
  DEFAULT_MODEL,
  { provider: 'anthropic', id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { provider: 'openai', id: 'gpt-5-6-luna', label: 'GPT-5.6 Luna' },
  { provider: 'deepseek', id: 'deepseek-v4-flash', label: 'DeepSeek v4 Flash' },
];

const THINKING_LEVELS = ['off', 'high', 'max'];

const COMMANDS = [
  { name: 'plan', description: 'Toggle plan mode', source: 'extension' },
  { name: 'model', description: 'Switch the active model', source: 'prompt' },
  { name: 'compact', description: 'Compact the conversation', source: 'prompt' },
  { name: 'clear', description: 'Clear the transcript', source: 'prompt' },
  { name: 'help', description: 'List available commands', source: 'prompt' },
].map((command) => ({
  ...command,
  enabled: true,
  disabledReason: null,
  requiresConfirmation: false,
}));

// Mutable per-session runtime so the Model/Effort/Build·Plan controls actually
// move and stick under the non-optimistic reducer (revision advances on commit).
interface DemoRuntime {
  revision: number;
  model: DemoModel;
  thinkingLevel: string;
  mode: 'build' | 'plan';
}

const runtimeBySession = new Map<string, DemoRuntime>();

function runtimeFor(sessionId: string): DemoRuntime {
  const existing = runtimeBySession.get(sessionId);
  if (existing !== undefined) return existing;
  const created: DemoRuntime = {
    revision: 1,
    model: DEFAULT_MODEL,
    thinkingLevel: 'high',
    mode: 'build',
  };
  runtimeBySession.set(sessionId, created);
  return created;
}

function runtimeStateDto(sessionId: string) {
  const state = runtimeFor(sessionId);
  return {
    sessionId,
    revision: state.revision,
    model: state.model,
    thinkingLevel: state.thinkingLevel,
    availableThinkingLevels: THINKING_LEVELS,
    mode: state.mode,
    streaming: sessionId === SESSION_RUNNING,
    updatedAt: new Date().toISOString(),
  };
}

function applyControl(sessionId: string, expectedRevision: number, operation: Record<string, unknown>) {
  const state = runtimeFor(sessionId);
  if (expectedRevision !== state.revision) {
    return { outcome: { status: 'stale', state: runtimeStateDto(sessionId) } };
  }
  if (operation.type === 'set_model') {
    const next = MODELS.find(
      (model) => model.provider === operation.provider && model.id === operation.modelId,
    );
    if (next !== undefined) state.model = next;
  } else if (operation.type === 'set_thinking_level' && typeof operation.level === 'string') {
    if (THINKING_LEVELS.includes(operation.level)) state.thinkingLevel = operation.level;
  } else if (operation.type === 'set_mode' && (operation.mode === 'build' || operation.mode === 'plan')) {
    state.mode = operation.mode;
  }
  state.revision += 1;
  return { outcome: { status: 'accepted', state: runtimeStateDto(sessionId) } };
}

const TRANSCRIPT_PATH = /^\/api\/sessions\/([^/]+)\/transcript$/;

/** Fixture responses keyed by relay path. Unknown paths resolve to {} so
 * best-effort effects (push foreground, attention) neither throw nor act. */
export function demoPostJson(path: string, body: unknown): unknown {
  const request = (body ?? {}) as Record<string, unknown>;

  const transcriptMatch = TRANSCRIPT_PATH.exec(path);
  if (transcriptMatch !== null) {
    const sessionId = decodeURIComponent(transcriptMatch[1] ?? '');
    const session = SESSIONS.find((candidate) => candidate.id === sessionId);
    const blocks = session?.blocks ?? [];
    return {
      sessionId,
      items: blocks,
      nextSeq: null,
      coversThrough: blocks.length,
    };
  }

  switch (path) {
    case '/api/sessions':
      return {
        sessions: SESSIONS.map((session) => ({
          id: session.id,
          status: session.status,
          updatedAt: isoAgo(session.status === 'running' ? 1 : 6),
          messageCount: session.blocks.length,
        })),
      };
    case '/api/auth/ticket':
      return { ticket: 'demo-ticket-0001', expiresAt: new Date(Date.now() + 60_000).toISOString() };
    case '/api/runtime/state':
      return { state: runtimeStateDto(String(request.sessionId ?? SESSION_IDLE)) };
    case '/api/runtime/models':
      return {
        sessionId: SESSION_IDLE,
        runtimeRevision: runtimeFor(SESSION_IDLE).revision,
        models: MODELS,
      };
    case '/api/commands/list':
      return { sessionId: SESSION_IDLE, revision: 1, commands: COMMANDS };
    case '/api/runtime/control':
      return applyControl(
        String(request.sessionId ?? SESSION_IDLE),
        Number(request.expectedRevision ?? 0),
        (request.operation ?? {}) as Record<string, unknown>,
      );
    case '/api/prompt/abort':
      return { outcome: { status: 'aborted' } };
    case '/api/prompt/submit':
      return {
        accepted: true,
        block: {
          id: `blk-echo-${Math.round((Date.now() % 1_000_000))}`,
          kind: 'text',
          role: 'user',
          text: String(request.message ?? ''),
          revision: 1,
          seq: 999,
          occurredAt: new Date().toISOString(),
        },
      };
    case '/api/approvals':
      return { approvals: [] };
    default:
      return {};
  }
}

interface FakeSocketListeners {
  [type: string]: Array<(event: unknown) => void>;
}

/** A WebSocket-shaped stub. It emits one empty-envelope delta so the
 * connection reducer flips to "live" (enabling the composer) without
 * disturbing the transcript already loaded from the fixture page. */
export function demoSocket(
  sessionId: string,
  onMessage: (message: unknown) => void,
): WebSocket {
  const listeners: FakeSocketListeners = {};
  const session = SESSIONS.find((candidate) => candidate.id === sessionId);
  const coversThrough = session?.blocks.length ?? 0;
  window.setTimeout(() => {
    onMessage({
      kind: 'sync.delta',
      sessionId,
      epoch: EPOCH,
      coversThrough,
      envelopes: [],
    });
  }, 0);
  return {
    addEventListener(type: string, callback: (event: unknown) => void) {
      (listeners[type] ??= []).push(callback);
    },
    removeEventListener(type: string, callback: (event: unknown) => void) {
      listeners[type] = (listeners[type] ?? []).filter((entry) => entry !== callback);
    },
    close() {
      for (const callback of listeners.close ?? []) callback({});
    },
    send() {
      // Preview stream is read-only; nothing is sent upstream.
    },
  } as unknown as WebSocket;
}
