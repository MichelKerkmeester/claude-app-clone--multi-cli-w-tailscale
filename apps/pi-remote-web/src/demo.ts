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
import { sha256, type AvailableModelDto, type FilePreviewBlock } from '@pi-remote/pi-rpc-protocol';

// Opaque ids must match the protocol guard pattern ^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$.
const SESSION_IDLE = 'demo-session-refactor';
const SESSION_RUNNING = 'demo-session-triage';
const EPOCH = 'demo-epoch-01';
const EMPTY_DIGEST = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const DEMO_READY_TEXT = 'Relay-sanitized preview bytes for a deterministic local fixture.\n';
const DEMO_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const DEMO_IMAGE_DIGEST = '431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460';
const DEMO_PDF_BASE64 =
  'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0NCA+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjcyIDcyMCBUZAooU2FmZSBQREYgcHJldmlldykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDAwIDAwMDAwIG4gCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDAxNyAwMDAwMCBuIAowMDAwMDAwMDUxIDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo0MDgKJSVFT0YK';
const DEMO_PDF_DIGEST = '8b624fb6d7b45c2778c2dec0ff0db37dc64b401f03247f49cdaf756a67916ae8';

export const DEMO_DIFF_FIXTURE = Object.freeze({
  sessionId: SESSION_IDLE,
  blockId: 'blk-005',
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
  query: '?demo=1&fixture=diff',
});

export const DEMO_ARTIFACT_STATES_FIXTURE = Object.freeze({
  query: '?demo=1&fixture=artifact-states',
  ready: 'ready',
  withheld: 'withheld',
  missing: 'missing',
  denied: 'denied',
  unsupported: 'unsupported',
  imagePdfRelease: 'image-pdf-release',
});

export const DEMO_INBOUND_MEDIA_FIXTURE = Object.freeze({
  query: '?demo=1&fixture=inbound-media',
  processing: 'processing',
  withheld: 'withheld',
  availability: 'withheld',
  reason: 'capture-permission',
  capability: 'unsupported',
});

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

function artifactBase(id: string, revision: string, seq: number, minutesAgo: number) {
  return { id, revision, seq, occurredAt: isoAgo(minutesAgo) };
}

const DEMO_INBOUND_MEDIA_PROCESSING_BLOCK = {
  ...base('blk-inbound-processing', 8, 6),
  kind: 'inbound_image',
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'extension',
  availability: 'processing',
} as const;

const DEMO_INBOUND_MEDIA_BLOCK = {
  ...base('blk-inbound-processing', 9, 5),
  kind: 'inbound_image',
  revision: 2,
  schemaVersion: 1,
  mediaClass: 'screenshot',
  displayName: 'Screenshot',
  source: 'extension',
  availability: 'withheld',
  reason: 'capture-permission',
  shareAllowed: false,
  content: { kind: 'none' },
} as const;

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
    ...base(DEMO_DIFF_FIXTURE.blockId, 5, 7),
    kind: 'file_diff',
    summary: DEMO_DIFF_FIXTURE.summary,
    patch: DEMO_DIFF_FIXTURE.patch,
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

const RICH_REDACTION = {
  policyVersion: 1,
  fieldsRedacted: 1,
  reasons: ['command'],
} as const;
const RICH_CACHE_REDACTION = {
  policyVersion: 1,
  fieldsRedacted: 1,
  reasons: ['cache', 'command'],
} as const;

function richCall(
  id: string,
  callId: string,
  seq: number,
  lifecycle: 'queued' | 'running' | 'completed' | 'failed' | 'denied' | 'cancelled' | 'interrupted',
) {
  return {
    ...base(id, seq, 1),
    kind: 'tool_call',
    toolName: 'bash',
    inputSummary: 'printf "[redacted command]\\n"',
    callId,
    shellKind: 'bash',
    lifecycle,
    terminalCheckpoint:
      lifecycle === 'queued' ? 'none' : lifecycle === 'running' ? 'streaming' : 'terminal',
    redaction: RICH_REDACTION,
  };
}

function richResult(
  id: string,
  callId: string,
  seq: number,
  lifecycle: 'queued' | 'running' | 'completed' | 'failed' | 'denied' | 'cancelled' | 'interrupted',
  output: string,
  outputCompleteness: 'complete' | 'upstream-truncated' | 'unknown' | undefined = undefined,
) {
  return {
    ...base(id, seq, 1),
    kind: 'tool_result',
    toolName: 'bash',
    output,
    isError: lifecycle === 'failed',
    callId,
    shellKind: 'bash',
    lifecycle,
    terminalCheckpoint: lifecycle === 'running' ? 'streaming' : 'terminal',
    outputCompleteness: outputCompleteness ?? (lifecycle === 'completed' ? 'complete' : 'unknown'),
    redaction: RICH_REDACTION,
  };
}

export const DEMO_RICH_CONTENT_BLOCKS: readonly Record<string, unknown>[] = [
  richCall('rich-call-running', 'rich-call-001', 1, 'running'),
  richResult(
    'rich-result-running',
    'rich-call-001',
    2,
    'running',
    'first line\nsecond line\nthird line\nfourth line\nfifth line\nsixth line\nseventh line\ncurrent tail',
  ),
  richResult('rich-result-before-call', 'rich-call-002', 3, 'completed', 'result arrived first\n'),
  richCall('rich-call-before-result', 'rich-call-002', 4, 'completed'),
  richCall('rich-call-completed', 'rich-call-003', 5, 'completed'),
  richResult('rich-result-completed', 'rich-call-003', 6, 'completed', 'done\n'),
  richCall('rich-call-failed', 'rich-call-004', 7, 'failed'),
  richResult('rich-result-failed', 'rich-call-004', 8, 'failed', 'command failed\n'),
  richCall('rich-call-denied', 'rich-call-005', 9, 'denied'),
  richCall('rich-call-cancelled', 'rich-call-006', 10, 'cancelled'),
  richCall('rich-call-interrupted', 'rich-call-007', 11, 'interrupted'),
  {
    ...base('rich-code-source', 12, 1),
    kind: 'text',
    role: 'assistant',
    text: 'Here is the bounded code:\n\n```bash\nprintf "hello\\n"\n# no line numbers\n```\n',
    settled: true,
  },
  {
    ...base('rich-long-text', 13, 1),
    kind: 'text',
    role: 'assistant',
    text: Array.from({ length: 18 }, (_, index) => `Long text line ${index + 1}`).join('\n'),
    settled: true,
  },
  {
    ...base('rich-text-artifact', 14, 1),
    kind: 'text_artifact',
    label: 'document',
    source: 'A committed text artifact with an exact trailing newline.\n',
    redaction: RICH_REDACTION,
  },
  {
    ...base('rich-unknown', 15, 1),
    kind: 'unknown_payload',
    payload: '<not rendered>',
  },
  {
    ...base('rich-legacy-incomplete', 16, 1),
    kind: 'tool_call',
    toolName: 'legacy-tool',
    inputSummary: 'legacy content remains read-only',
  },
  {
    ...base('rich-optimistic', 17, 1),
    kind: 'text',
    role: 'user',
    text: 'This optimistic prompt must remain outside rich cards.',
    provenance: 'optimistic',
  },
];

export const DEMO_RICH_RELEASE_BLOCKS: readonly Record<string, unknown>[] = [
  ...DEMO_RICH_CONTENT_BLOCKS,
  {
    ...richCall('rich-release-cache-call', 'rich-release-cache', 18, 'running'),
    redaction: RICH_CACHE_REDACTION,
  },
  {
    ...richResult(
      'rich-release-cache-result',
      'rich-release-cache',
      19,
      'running',
      Array.from({ length: 80 }, (_, index) => `cached tail line ${index + 1}`).join('\n'),
    ),
    redaction: RICH_CACHE_REDACTION,
    revision: 2,
  },
  richCall('rich-release-truncated-call', 'rich-release-truncated', 20, 'completed'),
  richResult(
    'rich-release-truncated-result',
    'rich-release-truncated',
    21,
    'completed',
    'first retained line\nlast retained line\n',
    'upstream-truncated',
  ),
  {
    ...base('rich-release-rtl', 22, 1),
    kind: 'text',
    role: 'assistant',
    text: 'RTL prose: مرحبًا بالعالم\nControl marker: \u202evisible order',
    settled: true,
  },
  {
    ...base('rich-release-200-text', 23, 1),
    kind: 'text',
    role: 'assistant',
    text: Array.from({ length: 30 }, (_, index) => `200 percent text line ${index + 1}`).join('\n'),
    settled: true,
  },
];

export const DEMO_ARTIFACT_BLOCKS: readonly FilePreviewBlock[] = [
  {
    ...artifactBase('blk-artifact-ready', 'rev_ready_001', 8, 5),
    kind: 'file_preview',
    artifactId: 'artifact_ready_001',
    displayName: 'policy.ts',
    renderer: 'code',
    mimeType: 'text/typescript',
    byteLength: new TextEncoder().encode(DEMO_READY_TEXT).byteLength,
    digest: sha256(DEMO_READY_TEXT),
    language: 'typescript',
    redaction: 'not-needed',
    completeness: 'complete',
    shareAllowed: false,
    availability: 'ready',
    content: { kind: 'artifact-ref' },
  },
  {
    ...artifactBase('blk-artifact-withheld', 'rev_withheld_001', 9, 4),
    kind: 'file_preview',
    artifactId: 'artifact_withheld_001',
    displayName: 'report.pdf',
    renderer: 'pdf',
    mimeType: 'application/pdf',
    byteLength: null,
    digest: EMPTY_DIGEST,
    redaction: 'withheld',
    completeness: 'complete',
    shareAllowed: false,
    availability: 'withheld',
    content: { kind: 'none' },
  },
  {
    ...artifactBase('blk-artifact-missing', 'rev_missing_001', 10, 3),
    kind: 'file_preview',
    artifactId: 'artifact_missing_001',
    displayName: 'settings.json',
    renderer: 'code',
    mimeType: 'application/json',
    byteLength: null,
    digest: EMPTY_DIGEST,
    language: 'json',
    redaction: 'not-needed',
    completeness: 'complete',
    shareAllowed: false,
    availability: 'missing',
    content: { kind: 'none' },
  },
  {
    ...artifactBase('blk-artifact-denied', 'rev_denied_001', 11, 2),
    kind: 'file_preview',
    artifactId: 'artifact_denied_001',
    displayName: 'secrets.env',
    renderer: 'text',
    mimeType: 'text/plain',
    byteLength: null,
    digest: EMPTY_DIGEST,
    redaction: 'withheld',
    completeness: 'complete',
    shareAllowed: false,
    availability: 'denied',
    content: { kind: 'none' },
  },
  {
    ...artifactBase('blk-artifact-unsupported', 'rev_unsupported_001', 12, 1),
    kind: 'file_preview',
    artifactId: 'artifact_unsupported_001',
    displayName: 'archive.bin',
    renderer: 'unsupported',
    mimeType: 'application/octet-stream',
    byteLength: null,
    digest: EMPTY_DIGEST,
    redaction: 'not-needed',
    completeness: 'complete',
    shareAllowed: false,
    availability: 'unsupported',
    content: { kind: 'none' },
  },
];

const DEMO_SHARE_TEXT = 'A tab-local text preview remains selectable and exact.\n';
const DEMO_SHARE_MARKDOWN =
  '# Safe Markdown\n\nThis is **sanitized** and has no active links or remote images.\n';
const DEMO_SHARE_CODE =
  'export function exactRevision(value: string): string {\n  return value.trim();\n}\n';

function inlinePreview(
  id: string,
  artifactId: string,
  revision: string,
  seq: number,
  displayName: string,
  renderer: 'text' | 'code',
  mimeType: string,
  text: string,
  language?: string,
): FilePreviewBlock {
  return {
    ...artifactBase(id, revision, seq, 1),
    kind: 'file_preview',
    artifactId,
    displayName,
    renderer,
    mimeType,
    byteLength: new TextEncoder().encode(text).byteLength,
    digest: sha256(text),
    ...(language === undefined ? {} : { language }),
    redaction: 'applied',
    completeness: 'complete',
    shareAllowed: true,
    availability: 'ready',
    content: { kind: 'inline-text', text, firstLine: 1 },
  };
}

export const DEMO_TEXT_CODE_SHARE_BLOCKS: readonly FilePreviewBlock[] = [
  inlinePreview(
    'blk-artifact-share-text',
    'artifact_share_text_001',
    'rev_share_text_001',
    8,
    'notes.txt',
    'text',
    'text/plain',
    DEMO_SHARE_TEXT,
  ),
  inlinePreview(
    'blk-artifact-share-markdown',
    'artifact_share_markdown_001',
    'rev_share_markdown_001',
    9,
    'README.md',
    'text',
    'text/markdown',
    DEMO_SHARE_MARKDOWN,
    'markdown',
  ),
  inlinePreview(
    'blk-artifact-share-code',
    'artifact_share_code_001',
    'rev_share_code_001',
    10,
    'revision.ts',
    'code',
    'text/typescript',
    DEMO_SHARE_CODE,
    'typescript',
  ),
];

function binaryFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

const DEMO_IMAGE_BYTES = binaryFromBase64(DEMO_IMAGE_BASE64);
const DEMO_PDF_BYTES = binaryFromBase64(DEMO_PDF_BASE64);

function binaryPreview(
  id: string,
  artifactId: string,
  revision: string,
  seq: number,
  displayName: string,
  renderer: 'image' | 'pdf',
  mimeType: string,
  bytes: Uint8Array,
  digest: string,
  options: {
    readonly availability?: FilePreviewBlock['availability'];
    readonly byteLength?: number | null;
    readonly redaction?: FilePreviewBlock['redaction'];
    readonly textLayerSafe?: boolean;
    readonly shareAllowed?: boolean;
  } = {},
): FilePreviewBlock {
  return {
    ...artifactBase(id, revision, seq, 1),
    kind: 'file_preview',
    artifactId,
    displayName,
    renderer,
    mimeType,
    byteLength: options.byteLength === undefined ? bytes.byteLength : options.byteLength,
    digest,
    ...(options.textLayerSafe === undefined ? {} : { textLayerSafe: options.textLayerSafe }),
    redaction: options.redaction ?? 'applied',
    completeness: 'complete',
    shareAllowed: options.shareAllowed ?? true,
    availability: options.availability ?? 'ready',
    content: options.availability === 'withheld' ? { kind: 'none' } : { kind: 'artifact-ref' },
  };
}

export const DEMO_IMAGE_PDF_BLOCKS: readonly FilePreviewBlock[] = [
  binaryPreview(
    'blk-image-ready',
    'artifact_image_ready_001',
    'rev_image_ready_001',
    13,
    'sanitized-image.png',
    'image',
    'image/png',
    DEMO_IMAGE_BYTES,
    DEMO_IMAGE_DIGEST,
  ),
  binaryPreview(
    'blk-pdf-safe',
    'artifact_pdf_safe_001',
    'rev_pdf_safe_001',
    14,
    'safe-report.pdf',
    'pdf',
    'application/pdf',
    DEMO_PDF_BYTES,
    DEMO_PDF_DIGEST,
    { textLayerSafe: true },
  ),
  binaryPreview(
    'blk-pdf-unsafe',
    'artifact_pdf_unsafe_001',
    'rev_pdf_unsafe_001',
    15,
    'unsafe-report.pdf',
    'pdf',
    'application/pdf',
    new Uint8Array(),
    EMPTY_DIGEST,
    { availability: 'withheld', redaction: 'withheld', byteLength: null, shareAllowed: false },
  ),
  binaryPreview(
    'blk-image-too-large',
    'artifact_image_too_large_001',
    'rev_image_too_large_001',
    16,
    'too-large.png',
    'image',
    'image/png',
    DEMO_IMAGE_BYTES,
    EMPTY_DIGEST,
    { byteLength: 50 * 1024 * 1024 },
  ),
  binaryPreview(
    'blk-image-corrupt',
    'artifact_image_corrupt_001',
    'rev_image_corrupt_001',
    17,
    'corrupt.png',
    'image',
    'image/png',
    new Uint8Array(7),
    EMPTY_DIGEST,
    { byteLength: 7 },
  ),
  binaryPreview(
    'blk-image-revision-conflict',
    'artifact_image_revision_conflict_001',
    'rev_image_revision_conflict_001',
    18,
    'revision-conflict.png',
    'image',
    'image/png',
    DEMO_IMAGE_BYTES,
    EMPTY_DIGEST,
    { byteLength: 67 },
  ),
  binaryPreview(
    'blk-image-offline',
    'artifact_image_offline_001',
    'rev_image_offline_001',
    19,
    'offline-loaded.png',
    'image',
    'image/png',
    DEMO_IMAGE_BYTES,
    DEMO_IMAGE_DIGEST,
  ),
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

function fixtureName(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('fixture');
  } catch {
    return null;
  }
}

function isArtifactStatesFixture(): boolean {
  return fixtureName() === 'artifact-states';
}

function isInboundMediaFixture(): boolean {
  return fixtureName() === 'inbound-media';
}

function isTextCodeShareFixture(): boolean {
  return fixtureName() === 'text-code-share';
}

function isImagePdfReleaseFixture(): boolean {
  return fixtureName() === 'image-pdf-release';
}

function isRichCoreFixture(): boolean {
  return fixtureName() === 'rich-core';
}

function isRichReleaseFixture(): boolean {
  return fixtureName() === 'rich-release';
}

function blocksFor(sessionId: string): readonly Record<string, unknown>[] {
  const session = SESSIONS.find((candidate) => candidate.id === sessionId);
  if (session === undefined) return [];
  if (isRichCoreFixture() && sessionId === SESSION_IDLE) {
    return [
      ...session.blocks,
      ...DEMO_RICH_CONTENT_BLOCKS.filter(
        (block) => block.kind !== 'unknown_payload' && block.provenance !== 'optimistic',
      ),
    ];
  }
  if (isRichReleaseFixture() && sessionId === SESSION_IDLE) {
    return [
      ...session.blocks,
      ...DEMO_RICH_RELEASE_BLOCKS.filter(
        (block) => block.kind !== 'unknown_payload' && block.provenance !== 'optimistic',
      ),
    ];
  }
  if (isArtifactStatesFixture() && sessionId === SESSION_IDLE) {
    return [...session.blocks, ...DEMO_ARTIFACT_BLOCKS];
  }
  if (isInboundMediaFixture() && sessionId === SESSION_IDLE) {
    return [...session.blocks, DEMO_INBOUND_MEDIA_PROCESSING_BLOCK, DEMO_INBOUND_MEDIA_BLOCK];
  }
  if (isTextCodeShareFixture() && sessionId === SESSION_IDLE) {
    return [...session.blocks, ...DEMO_TEXT_CODE_SHARE_BLOCKS];
  }
  if (isImagePdfReleaseFixture() && sessionId === SESSION_IDLE) {
    return [...session.blocks, ...DEMO_IMAGE_PDF_BLOCKS];
  }
  return session.blocks;
}

const DEFAULT_MODEL: AvailableModelDto = {
  provider: 'anthropic',
  id: 'claude-opus-4-8',
  label: 'Claude Opus 4.8',
  reasoning: true,
  input: ['text', 'image'],
  contextWindow: 400_000,
  maxTokens: 128_000,
  tools: true,
  availability: 'available',
  pricing: { currency: 'USD', inputPerMillion: 15, outputPerMillion: 75 },
};

const MODELS: readonly AvailableModelDto[] = [
  DEFAULT_MODEL,
  {
    provider: 'anthropic',
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    reasoning: true,
    input: ['text', 'image'],
    contextWindow: 200_000,
    maxTokens: 64_000,
    tools: true,
    availability: 'available',
    pricing: { currency: 'USD', inputPerMillion: 3, outputPerMillion: 15 },
  },
  {
    provider: 'anthropic',
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    input: ['text', 'image'],
    contextWindow: 200_000,
    maxTokens: 32_000,
    tools: true,
    availability: 'available',
    pricing: { currency: 'USD', inputPerMillion: 1, outputPerMillion: 5 },
  },
  {
    provider: 'openai',
    id: 'gpt-5-6-luna',
    label: 'GPT-5.6 Luna',
    reasoning: true,
    input: ['text', 'image'],
    contextWindow: 400_000,
    maxTokens: 64_000,
    tools: true,
    availability: 'available',
    pricing: { currency: 'USD', inputPerMillion: 5, outputPerMillion: 20 },
  },
  {
    provider: 'openai',
    id: 'gpt-5-6-flash',
    label: 'GPT-5.6 Flash',
    input: ['text'],
    contextWindow: 128_000,
    maxTokens: 32_000,
    tools: true,
    availability: 'tier_locked',
    availabilityReasonCode: 'tier_locked',
    pricing: { currency: 'USD', inputPerMillion: 1.25, outputPerMillion: 10 },
  },
  {
    provider: 'openai',
    id: 'gpt-5-6-nano',
    label: 'GPT-5.6 Nano',
    input: ['text'],
    contextWindow: 128_000,
    maxTokens: 16_000,
    tools: false,
    availability: 'available',
    pricing: { currency: 'USD', inputPerMillion: 0.4, outputPerMillion: 2 },
  },
  {
    provider: 'deepseek',
    id: 'deepseek-v4-flash',
    label: 'DeepSeek v4 Flash',
    reasoning: true,
    input: ['text', 'image'],
    contextWindow: 128_000,
    maxTokens: 32_000,
    tools: true,
    availability: 'available',
    pricing: { currency: 'USD', inputPerMillion: 0.5, outputPerMillion: 1.5 },
  },
  {
    provider: 'deepseek',
    id: 'deepseek-v4-r1',
    label: 'DeepSeek v4 R1',
    reasoning: true,
    input: ['text'],
    contextWindow: 256_000,
    maxTokens: 64_000,
    tools: true,
    availability: 'policy_blocked',
    availabilityReasonCode: 'policy_blocked',
    pricing: { currency: 'USD', inputPerMillion: 0.8, outputPerMillion: 2.4 },
  },
  {
    provider: 'google',
    id: 'gemini-3-pro',
    label: 'Gemini 3 Pro',
    reasoning: true,
    input: ['text', 'image'],
    contextWindow: 1_000_000,
    maxTokens: 128_000,
    tools: true,
    availability: 'available',
    pricing: { currency: 'USD', inputPerMillion: 5, outputPerMillion: 10 },
  },
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

// The catalog revision identifies the host's model membership, which the demo
// fixture never changes, so it stays constant while the runtime revision
// advances with every accepted control mutation.
const CATALOG_REVISION = 1;

// Mutable per-session runtime so the Model/Effort/Build·Plan controls actually
// move and stick under the non-optimistic reducer (revision advances on commit).
interface DemoRuntime {
  revision: number;
  model: AvailableModelDto;
  thinkingLevel: string;
  mode: 'build' | 'plan';
}

const runtimeBySession = new Map<string, DemoRuntime>();

// One-use model-switch tickets mirror the relay's ticket authority: a ticket is
// minted per set_model intent and consumed (or expired) when control presents it.
interface DemoRuntimeTicket {
  readonly sessionId: string;
  readonly expectedRevision: number;
  readonly expectedCatalogRevision: number;
  readonly operation: {
    readonly type: 'set_model';
    readonly provider: string;
    readonly modelId: string;
  };
  readonly expiresAt: number;
}

let runtimeTicketCounter = 0;
const runtimeTickets = new Map<string, DemoRuntimeTicket>();

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

function applyControl(
  sessionId: string,
  expectedRevision: number,
  operation: Record<string, unknown>,
  ticket: string | undefined,
  expectedCatalogRevision: number | undefined,
) {
  const state = runtimeFor(sessionId);
  if (operation.type === 'set_model') {
    const issued = ticket !== undefined ? runtimeTickets.get(ticket) : undefined;
    if (ticket !== undefined) runtimeTickets.delete(ticket);
    if (issued === undefined || issued.sessionId !== sessionId || issued.expiresAt <= Date.now()) {
      return { outcome: { status: 'unavailable', reasonCode: 'host_rejected' } };
    }
    if (expectedRevision !== state.revision) {
      return { outcome: { status: 'stale', state: runtimeStateDto(sessionId) } };
    }
    if (expectedCatalogRevision !== CATALOG_REVISION) {
      return { outcome: { status: 'unavailable', reasonCode: 'stale_catalog' } };
    }
    const next = MODELS.find(
      (model) => model.provider === operation.provider && model.id === operation.modelId,
    );
    if (next === undefined) {
      return { outcome: { status: 'unavailable', reasonCode: 'model_unavailable' } };
    }
    const availability = next.availability ?? 'available';
    if (availability !== 'available') {
      return {
        outcome: {
          status: 'unavailable',
          reasonCode: availability === 'tier_locked' ? 'tier_locked' : 'policy_blocked',
        },
      };
    }
    state.model = next;
    state.revision += 1;
    return { outcome: { status: 'accepted', state: runtimeStateDto(sessionId) } };
  }
  if (expectedRevision !== state.revision) {
    return { outcome: { status: 'stale', state: runtimeStateDto(sessionId) } };
  }
  if (operation.type === 'set_thinking_level' && typeof operation.level === 'string') {
    if (THINKING_LEVELS.includes(operation.level)) state.thinkingLevel = operation.level;
  } else if (
    operation.type === 'set_mode' &&
    (operation.mode === 'build' || operation.mode === 'plan')
  ) {
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
    const blocks = blocksFor(sessionId);
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
          messageCount: blocksFor(session.id).length,
        })),
      };
    case '/api/auth/ticket':
      return { ticket: 'demo-ticket-0001', expiresAt: new Date(Date.now() + 60_000).toISOString() };
    case '/api/runtime/state':
      return { state: runtimeStateDto(String(request.sessionId ?? SESSION_IDLE)) };
    case '/api/runtime/models': {
      const sessionId = String(request.sessionId ?? SESSION_IDLE);
      const state = runtimeFor(sessionId);
      return {
        sessionId,
        catalogRevision: CATALOG_REVISION,
        runtimeRevision: state.revision,
        currentModel: state.model,
        streaming: sessionId === SESSION_RUNNING,
        canSetModelWhileStreaming: false,
        models: MODELS,
      };
    }
    case '/api/runtime/ticket': {
      const operation = request.operation as Record<string, unknown> | undefined;
      if (
        operation?.type !== 'set_model' ||
        typeof operation.provider !== 'string' ||
        typeof operation.modelId !== 'string' ||
        typeof request.sessionId !== 'string' ||
        typeof request.expectedRevision !== 'number' ||
        typeof request.expectedCatalogRevision !== 'number'
      ) {
        return {};
      }
      const ticket = `demo-runtime-ticket-${(runtimeTicketCounter += 1)}`;
      runtimeTickets.set(ticket, {
        sessionId: request.sessionId,
        expectedRevision: request.expectedRevision,
        expectedCatalogRevision: request.expectedCatalogRevision,
        operation: { type: 'set_model', provider: operation.provider, modelId: operation.modelId },
        expiresAt: Date.now() + 10_000,
      });
      return { ticket, expiresAt: new Date(Date.now() + 10_000).toISOString() };
    }
    case '/api/commands/list':
      return { sessionId: SESSION_IDLE, revision: 1, commands: COMMANDS };
    case '/api/runtime/control':
      return applyControl(
        String(request.sessionId ?? SESSION_IDLE),
        Number(request.expectedRevision ?? 0),
        (request.operation ?? {}) as Record<string, unknown>,
        typeof request.ticket === 'string' ? request.ticket : undefined,
        typeof request.expectedCatalogRevision === 'number'
          ? request.expectedCatalogRevision
          : undefined,
      );
    case '/api/prompt/abort':
      return { outcome: { status: 'aborted' } };
    case '/api/prompt/submit':
      return {
        accepted: true,
        block: {
          id: `blk-echo-${Math.round(Date.now() % 1_000_000)}`,
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

export function demoArtifactBytes(block: FilePreviewBlock): Uint8Array {
  if (block.artifactId === 'artifact_ready_001' && block.revision === 'rev_ready_001') {
    return new TextEncoder().encode(DEMO_READY_TEXT);
  }
  if (
    block.artifactId === 'artifact_image_ready_001' ||
    block.artifactId === 'artifact_image_offline_001'
  ) {
    return DEMO_IMAGE_BYTES.slice();
  }
  if (block.artifactId === 'artifact_pdf_safe_001') return DEMO_PDF_BYTES.slice();
  if (block.artifactId === 'artifact_image_too_large_001') {
    return new Uint8Array(50 * 1024 * 1024 + 1);
  }
  if (block.artifactId === 'artifact_image_corrupt_001') return new Uint8Array(7);
  if (block.artifactId === 'artifact_image_revision_conflict_001') return DEMO_IMAGE_BYTES.slice();
  return new Uint8Array();
}

interface FakeSocketListeners {
  [type: string]: Array<(event: unknown) => void>;
}

/** A WebSocket-shaped stub. It emits one empty-envelope delta so the
 * connection reducer flips to "live" (enabling the composer) without
 * disturbing the transcript already loaded from the fixture page. */
export function demoSocket(sessionId: string, onMessage: (message: unknown) => void): WebSocket {
  const listeners: FakeSocketListeners = {};
  const coversThrough = blocksFor(sessionId).length;
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
