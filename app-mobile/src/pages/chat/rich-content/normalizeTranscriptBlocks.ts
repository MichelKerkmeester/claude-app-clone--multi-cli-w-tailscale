import {
  isRichToolCallBlock,
  isRichToolResultBlock,
  isTextArtifactBlock,
  type RedactionMetadata,
  type RichToolCallBlock,
  type RichToolResultBlock,
  type TextArtifactBlock,
  type TextBlock,
  type TranscriptBlock,
  type TranscriptLifecycle,
  type TranscriptOutputCompleteness,
  type TranscriptShellKind,
  type TranscriptTerminalCheckpoint,
} from '@pi-remote/pi-rpc-protocol';

import type { DisplayTranscriptBlock, TranscriptProvenance } from '../../../shared/data/state.js';

export type RichContentSource = TranscriptProvenance;

export const SAFE_CODE_LANGUAGES = [
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

export type SafeCodeLanguage = (typeof SAFE_CODE_LANGUAGES)[number];

type TranscriptInputBlock = DisplayTranscriptBlock | TranscriptBlock;

interface NormalizedBase {
  readonly sessionId: string;
  readonly blockId: string;
  readonly sourceBlockId: string;
  readonly revision: number;
  readonly sequence: number;
  readonly source: RichContentSource;
  readonly redaction: RedactionMetadata | null;
  readonly sourceBlock: DisplayTranscriptBlock;
}

export interface NormalizedCommandBlock extends NormalizedBase {
  readonly kind: 'command';
  readonly callId: string;
  readonly shellKind: Exclude<TranscriptShellKind, 'other'>;
  readonly command: string | null;
  readonly output: string | null;
  readonly canonicalCommand: string | null;
  readonly canonicalOutput: string | null;
  readonly lifecycle: TranscriptLifecycle;
  readonly terminalCheckpoint: TranscriptTerminalCheckpoint;
  readonly outputCompleteness: TranscriptOutputCompleteness;
  readonly isError: boolean;
  readonly pendingCall: boolean;
  readonly resultMissing: boolean;
  readonly commandBlockId: string | null;
  readonly resultBlockId: string | null;
  readonly commandRedaction: RedactionMetadata | null;
  readonly outputRedaction: RedactionMetadata | null;
  readonly outputRevision: number | null;
}

export interface NormalizedCodeBlock extends NormalizedBase {
  readonly kind: 'code';
  readonly canonicalSource: string;
  readonly language: SafeCodeLanguage | null;
  readonly languageLabel: string;
  readonly fenceOrdinal: number;
  readonly settled: boolean;
  readonly incomplete: boolean;
}

export interface NormalizedTextArtifactBlock extends NormalizedBase {
  readonly kind: 'text-artifact';
  readonly canonicalSource: string;
  readonly label: TextArtifactBlock['label'] | 'long-text';
  readonly settled: boolean;
  readonly explicit: boolean;
}

export interface NormalizedProseBlock extends NormalizedBase {
  readonly kind: 'prose';
  readonly canonicalSource: string;
  readonly sourceBlock: DisplayTranscriptBlock;
  readonly role: 'assistant' | 'user' | null;
  readonly settled: boolean;
}

export interface NormalizedActivityBlock extends NormalizedBase {
  readonly kind: 'activity';
  readonly sourceBlock: DisplayTranscriptBlock;
}

export interface NormalizedDiffBlock extends NormalizedBase {
  readonly kind: 'diff';
  readonly sourceBlock: DisplayTranscriptBlock;
}

export interface NormalizedFallbackBlock extends NormalizedBase {
  readonly kind: 'fallback';
  readonly sourceBlock: DisplayTranscriptBlock;
  readonly originalKind: string;
}

export type NormalizedTranscriptBlock =
  | NormalizedCommandBlock
  | NormalizedCodeBlock
  | NormalizedTextArtifactBlock
  | NormalizedProseBlock
  | NormalizedActivityBlock
  | NormalizedDiffBlock
  | NormalizedFallbackBlock;

export interface NormalizeTranscriptBlocksOptions {
  readonly sessionId: string;
  readonly blocks: readonly TranscriptInputBlock[];
  readonly source?: RichContentSource;
  readonly settled?: boolean;
  readonly settledBlockIds?: ReadonlySet<string> | readonly string[];
}

export interface NormalizedTranscript {
  readonly sessionId: string;
  readonly blocks: readonly NormalizedTranscriptBlock[];
  readonly pendingResultCallIds: readonly string[];
}

interface NormalizedArgs {
  readonly sessionId: string;
  readonly blocks: readonly TranscriptInputBlock[];
  readonly source: RichContentSource | undefined;
  readonly settled: boolean | undefined;
  readonly settledBlockIds: ReadonlySet<string> | undefined;
}

interface RichCallRecord {
  readonly block: RichToolCallBlock;
  readonly source: RichContentSource;
}

interface RichResultRecord {
  readonly block: RichToolResultBlock;
  readonly source: RichContentSource;
}

interface OrderedValue {
  readonly order: number;
  readonly value: NormalizedTranscriptBlock;
}

interface FenceSegment {
  readonly kind: 'prose' | 'code';
  readonly source: string;
  readonly language: SafeCodeLanguage | null;
  readonly ordinal: number;
  readonly incomplete: boolean;
}

const SHELL_KINDS = new Set<TranscriptShellKind>(['bash', 'shell']);
const FENCE_START = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\r\n]*)\r?$/u;

export function normalizeTranscriptBlocks(
  options: NormalizeTranscriptBlocksOptions,
): readonly NormalizedTranscriptBlock[];
export function normalizeTranscriptBlocks(
  blocks: readonly TranscriptInputBlock[],
  sessionId: string,
  source?: RichContentSource,
): readonly NormalizedTranscriptBlock[];
export function normalizeTranscriptBlocks(
  first: NormalizeTranscriptBlocksOptions | readonly TranscriptInputBlock[],
  sessionId?: string,
  source?: RichContentSource,
): readonly NormalizedTranscriptBlock[] {
  return normalizeTranscript(first, sessionId, source).blocks;
}

export function normalizeTranscript(
  first: NormalizeTranscriptBlocksOptions | readonly TranscriptInputBlock[],
  sessionId?: string,
  source?: RichContentSource,
): NormalizedTranscript {
  const args = readArgs(first, sessionId, source);
  const latest = latestByBlockIdentity(args.blocks);
  const ordered: OrderedValue[] = [];
  const calls = new Map<string, RichCallRecord>();
  const results = new Map<string, RichResultRecord>();
  const pairedIds = new Set<string>();
  let order = 0;

  for (const entry of latest) {
    const protocolBlock = toProtocolBlock(entry.block);
    const entrySource = blockSource(entry.block) ?? args.source ?? 'relay';
    if (entrySource === 'optimistic') {
      const fallback = normalizeFallback(args.sessionId, entry.block, entrySource);
      ordered.push({ order: order++, value: fallback });
      continue;
    }
    if (isRichToolCallBlock(protocolBlock) && isShell(protocolBlock.shellKind)) {
      calls.set(protocolBlock.callId, { block: protocolBlock, source: entrySource });
      continue;
    }
    if (isRichToolResultBlock(protocolBlock) && isShell(protocolBlock.shellKind)) {
      results.set(protocolBlock.callId, { block: protocolBlock, source: entrySource });
      continue;
    }
    const normalized = normalizeNonShellBlock(
      args.sessionId,
      entry.block,
      protocolBlock,
      entrySource,
      args,
    );
    for (const value of normalized) ordered.push({ order: order++, value });
  }

  const callIds = new Set([...calls.keys(), ...results.keys()]);
  for (const callId of callIds) {
    const call = calls.get(callId);
    const result = results.get(callId);
    const normalized = normalizeCommand(
      args.sessionId,
      call,
      result,
      call === undefined ? (result?.source ?? args.source ?? 'relay') : call.source,
    );
    pairedIds.add(callId);
    ordered.push({ order: order++, value: normalized });
  }

  ordered.sort((left, right) => {
    const sequenceDifference = left.value.sequence - right.value.sequence;
    return sequenceDifference === 0 ? left.order - right.order : sequenceDifference;
  });

  return {
    sessionId: args.sessionId,
    blocks: ordered.map((entry) => entry.value),
    pendingResultCallIds: [...results.keys()].filter((callId) => !calls.has(callId)),
  };
}

export function normalizeFenceLanguage(value: string | undefined): SafeCodeLanguage | null {
  if (value === undefined) return null;
  const normalized = value.trim().toLocaleLowerCase();
  const aliases: Readonly<Record<string, SafeCodeLanguage>> = {
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
    plaintext: 'plaintext',
    plain: 'plaintext',
  };
  return aliases[normalized] ?? null;
}

export function fenceBlockIdentity(sourceBlockId: string, ordinal: number): string {
  return `${sourceBlockId}-fence-${ordinal}`;
}

function readArgs(
  first: NormalizeTranscriptBlocksOptions | readonly TranscriptInputBlock[],
  sessionId: string | undefined,
  source: RichContentSource | undefined,
): NormalizedArgs {
  if (Array.isArray(first)) {
    if (sessionId === undefined || sessionId.length === 0) {
      throw new Error('normalizeTranscriptBlocks requires a sessionId.');
    }
    return {
      sessionId,
      blocks: first,
      source,
      settled: undefined,
      settledBlockIds: undefined,
    };
  }
  const options = first as NormalizeTranscriptBlocksOptions;
  return {
    sessionId: options.sessionId,
    blocks: options.blocks,
    source: options.source,
    settled: options.settled,
    settledBlockIds: toSet(options.settledBlockIds),
  };
}

function toSet(
  value: ReadonlySet<string> | readonly string[] | undefined,
): ReadonlySet<string> | undefined {
  if (value === undefined) return undefined;
  return value instanceof Set ? value : new Set(value);
}

function latestByBlockIdentity(
  blocks: readonly TranscriptInputBlock[],
): readonly { readonly block: TranscriptInputBlock; readonly index: number }[] {
  const latest = new Map<
    string,
    { readonly block: TranscriptInputBlock; readonly index: number }
  >();
  blocks.forEach((block, index) => {
    const id = readBlockId(block);
    if (id === null) return;
    const current = latest.get(id);
    if (current === undefined || isLaterRevision(block, current.block)) {
      latest.set(id, { block, index });
    }
  });
  return [...latest.values()].sort((left, right) => {
    const sequenceDifference = readSequence(left.block) - readSequence(right.block);
    return sequenceDifference === 0 ? left.index - right.index : sequenceDifference;
  });
}

function isLaterRevision(left: TranscriptInputBlock, right: TranscriptInputBlock): boolean {
  const leftRevision = readRevision(left);
  const rightRevision = readRevision(right);
  return leftRevision > rightRevision;
}

function normalizeNonShellBlock(
  sessionId: string,
  sourceBlock: TranscriptInputBlock,
  protocolBlock: unknown,
  source: RichContentSource,
  options: NormalizedArgs,
): readonly NormalizedTranscriptBlock[] {
  const base = baseFields(sessionId, sourceBlock, source);
  if (isTextArtifactBlock(protocolBlock) && source !== 'optimistic') {
    return [
      {
        ...base,
        kind: 'text-artifact',
        canonicalSource: protocolBlock.source,
        label: protocolBlock.label,
        settled: true,
        explicit: true,
        sourceBlock: asDisplayBlock(sourceBlock),
      },
    ];
  }
  if (isTextBlock(protocolBlock)) {
    const settled = isSettled(sourceBlock, options);
    const segments = splitFencedCode(protocolBlock.text);
    const hasCode = segments.some((segment) => segment.kind === 'code');
    if (source !== 'optimistic' && hasCode) {
      const sourceId = readBlockId(sourceBlock) ?? base.blockId;
      return segments.flatMap((segment): readonly NormalizedTranscriptBlock[] => {
        if (segment.kind === 'code') {
          const blockId = fenceBlockIdentity(sourceId, segment.ordinal);
          return [
            {
              ...base,
              blockId,
              sourceBlockId: sourceId,
              kind: 'code' as const,
              canonicalSource: segment.source,
              language: segment.language,
              languageLabel: segment.language === null ? 'Code' : segment.language,
              fenceOrdinal: segment.ordinal,
              settled,
              incomplete: segment.incomplete,
              sourceBlock: asDisplayBlock(sourceBlock),
            },
          ];
        }
        if (segment.source.length === 0) return [];
        const segmentBlock = segmentTextBlock(
          sourceBlock,
          segment.source,
          sourceId,
          segment.ordinal,
        );
        return [normalizeProse(sessionId, segmentBlock, segmentBlock, source, settled)];
      });
    }
    if (
      source !== 'optimistic' &&
      settled &&
      segments.length === 1 &&
      segments[0]?.kind === 'prose' &&
      isLongText(protocolBlock.text)
    ) {
      return [
        {
          ...base,
          kind: 'text-artifact',
          canonicalSource: protocolBlock.text,
          label: 'long-text',
          settled,
          explicit: false,
          sourceBlock: asDisplayBlock(sourceBlock),
        },
      ];
    }
    return [normalizeProse(sessionId, sourceBlock, protocolBlock, source, settled)];
  }
  if (isRichToolCallBlock(protocolBlock) || isRichToolResultBlock(protocolBlock)) {
    return [normalizeActivity(sessionId, sourceBlock, source)];
  }
  if (isFileDiffLike(protocolBlock)) {
    return [
      {
        ...base,
        kind: 'diff',
        sourceBlock: asDisplayBlock(sourceBlock),
      },
    ];
  }
  if (isActivityKind(protocolBlock)) {
    return [normalizeActivity(sessionId, sourceBlock, source)];
  }
  return [
    {
      ...base,
      kind: 'fallback',
      originalKind: readKind(sourceBlock) ?? 'unknown',
      sourceBlock: asDisplayBlock(sourceBlock),
    },
  ];
}

function normalizeFallback(
  sessionId: string,
  sourceBlock: TranscriptInputBlock,
  source: RichContentSource,
): NormalizedFallbackBlock {
  return {
    ...baseFields(sessionId, sourceBlock, source),
    kind: 'fallback',
    originalKind: readKind(sourceBlock) ?? 'unknown',
    sourceBlock: asDisplayBlock(sourceBlock),
  };
}

function normalizeProse(
  sessionId: string,
  sourceBlock: TranscriptInputBlock,
  block: TextBlock,
  source: RichContentSource,
  settled: boolean,
): NormalizedProseBlock {
  const base = baseFields(sessionId, sourceBlock, source);
  return {
    ...base,
    kind: 'prose',
    canonicalSource: block.text,
    sourceBlock: asDisplayBlock(sourceBlock),
    role: block.role ?? null,
    settled,
  };
}

function normalizeActivity(
  sessionId: string,
  sourceBlock: TranscriptInputBlock,
  source: RichContentSource,
): NormalizedActivityBlock {
  return {
    ...baseFields(sessionId, sourceBlock, source),
    kind: 'activity',
    sourceBlock: asDisplayBlock(sourceBlock),
  };
}

function segmentTextBlock(
  sourceBlock: TranscriptInputBlock,
  text: string,
  sourceId: string,
  ordinal: number,
): TextBlock {
  const value = sourceBlock as unknown as Record<string, unknown>;
  return {
    ...value,
    id: `${sourceId}-prose-${ordinal}`,
    kind: 'text',
    text,
  } as TextBlock;
}

function normalizeCommand(
  sessionId: string,
  call: RichCallRecord | undefined,
  result: RichResultRecord | undefined,
  source: RichContentSource,
): NormalizedCommandBlock {
  const callBlock = call?.block;
  const resultBlock = result?.block;
  const sourceBlock = callBlock ?? resultBlock;
  if (sourceBlock === undefined) {
    throw new Error('A command cannot be normalized without a call or result.');
  }
  const command = callBlock?.inputSummary ?? null;
  const output = resultBlock?.output ?? null;
  const lifecycle = resultBlock?.lifecycle ?? callBlock?.lifecycle ?? 'unknown';
  const terminalCheckpoint =
    resultBlock?.terminalCheckpoint ?? callBlock?.terminalCheckpoint ?? 'unknown';
  const outputCompleteness = resultBlock?.outputCompleteness ?? 'unknown';
  const commandRedaction = callBlock?.redaction ?? null;
  const outputRedaction = resultBlock?.redaction ?? null;
  const redaction = mergeRedaction(commandRedaction, outputRedaction);
  const callId = callBlock?.callId ?? resultBlock?.callId;
  const shellKindValue = callBlock?.shellKind ?? resultBlock?.shellKind;
  if (callId === undefined || shellKindValue === undefined || !isShell(shellKindValue)) {
    throw new Error('A command must carry a callId and shellKind.');
  }
  const shellKind = shellKindValue;
  const blockId = callId;
  return {
    sessionId,
    blockId,
    sourceBlockId: sourceBlock.id,
    revision: Math.max(callBlock?.revision ?? 0, resultBlock?.revision ?? 0),
    sequence: Math.min(
      callBlock?.seq ?? Number.MAX_SAFE_INTEGER,
      resultBlock?.seq ?? Number.MAX_SAFE_INTEGER,
    ),
    source,
    redaction,
    kind: 'command',
    callId,
    shellKind,
    command,
    output,
    canonicalCommand: command,
    canonicalOutput: output,
    lifecycle,
    terminalCheckpoint,
    outputCompleteness,
    isError: resultBlock?.isError ?? lifecycle === 'failed',
    pendingCall: callBlock === undefined,
    resultMissing:
      callBlock !== undefined && resultBlock === undefined && terminalCheckpoint === 'terminal',
    commandBlockId: callBlock?.id ?? null,
    resultBlockId: resultBlock?.id ?? null,
    commandRedaction,
    outputRedaction,
    outputRevision: resultBlock?.revision ?? null,
    sourceBlock: asDisplayBlock(sourceBlock),
  };
}

function baseFields(
  sessionId: string,
  block: TranscriptInputBlock,
  source: RichContentSource,
): NormalizedBase {
  return {
    sessionId,
    blockId: readBlockId(block) ?? `unknown-${readSequence(block)}`,
    sourceBlockId: readBlockId(block) ?? `unknown-${readSequence(block)}`,
    revision: readRevision(block),
    sequence: readSequence(block),
    source,
    redaction: readRedaction(block),
    sourceBlock: asDisplayBlock(block),
  };
}

function splitFencedCode(text: string): readonly FenceSegment[] {
  const lines = text.split(/\r?\n/u);
  const segments: FenceSegment[] = [];
  let prose: string[] = [];
  let ordinal = 0;
  let index = 0;
  const flushProse = () => {
    if (prose.length === 0) return;
    const value = prose.join('\n');
    if (value.length > 0)
      segments.push({
        kind: 'prose',
        source: value,
        language: null,
        ordinal: -1,
        incomplete: false,
      });
    prose = [];
  };
  while (index < lines.length) {
    const line = lines[index] ?? '';
    const opening = FENCE_START.exec(line);
    if (opening === null) {
      prose.push(line);
      index += 1;
      continue;
    }
    const marker = opening[1] ?? '';
    const info = opening[2] ?? '';
    const body: string[] = [];
    let closeIndex = index + 1;
    let closed = false;
    while (closeIndex < lines.length) {
      const candidate = lines[closeIndex] ?? '';
      if (
        new RegExp(`^ {0,3}${escapeRegExp(marker.charAt(0))}{${marker.length},}[ \\t]*$`, 'u').test(
          candidate,
        )
      ) {
        closed = true;
        break;
      }
      body.push(candidate);
      closeIndex += 1;
    }
    if (!closed) {
      prose.push(...lines.slice(index));
      break;
    }
    flushProse();
    const bodySource = body.length === 0 ? '' : `${body.join('\n')}\n`;
    segments.push({
      kind: 'code',
      source: bodySource,
      language: normalizeFenceLanguage(info.split(/[ \t]/u, 1)[0] ?? undefined),
      ordinal,
      incomplete: false,
    });
    ordinal += 1;
    index = closeIndex + 1;
  }
  flushProse();
  return segments.length === 0
    ? [{ kind: 'prose', source: text, language: null, ordinal: -1, incomplete: false }]
    : segments;
}

function isLongText(value: string): boolean {
  return value.length >= 1_200 || value.split(/\r?\n/u).length >= 16;
}

function isSettled(block: TranscriptInputBlock, options: NormalizedArgs): boolean {
  const id = readBlockId(block);
  if (id !== null && options.settledBlockIds?.has(id)) return true;
  if (options.settled !== undefined) return options.settled;
  const value = block as unknown as Record<string, unknown>;
  return value.settled === true || value.settlement === 'settled' || blockSource(block) === 'cache';
}

function isShell(value: TranscriptShellKind): value is Exclude<TranscriptShellKind, 'other'> {
  return SHELL_KINDS.has(value);
}

function isTextBlock(value: unknown): value is TextBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { readonly kind?: unknown }).kind === 'text' &&
    typeof (value as { readonly text?: unknown }).text === 'string'
  );
}

function isFileDiffLike(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { readonly kind?: unknown }).kind === 'file_diff' &&
    typeof (value as { readonly patch?: unknown }).patch === 'string'
  );
}

function isActivityKind(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const kind = (value as { readonly kind?: unknown }).kind;
  return (
    kind === 'thinking' ||
    kind === 'plan' ||
    kind === 'tool_call' ||
    kind === 'tool_result' ||
    kind === 'usage'
  );
}

function toProtocolBlock(block: TranscriptInputBlock): unknown {
  if (typeof block !== 'object' || block === null) return block;
  const value = block as unknown as Record<string, unknown>;
  const protocolBlock = { ...value };
  delete protocolBlock.provenance;
  delete protocolBlock.richEligible;
  return protocolBlock;
}

function asDisplayBlock(block: TranscriptInputBlock): DisplayTranscriptBlock {
  if (typeof block !== 'object' || block === null) {
    throw new Error('Transcript blocks must be objects.');
  }
  return block as DisplayTranscriptBlock;
}

function blockSource(block: TranscriptInputBlock): RichContentSource | undefined {
  if (readRedaction(block)?.reasons.includes('cache')) return 'cache';
  const value = block as unknown as { readonly provenance?: unknown };
  if (
    value.provenance === 'relay' ||
    value.provenance === 'cache' ||
    value.provenance === 'optimistic'
  ) {
    return value.provenance;
  }
  return undefined;
}

function readRedaction(block: TranscriptInputBlock): RedactionMetadata | null {
  const value = block as unknown as { readonly redaction?: unknown };
  return isRedactionMetadataLike(value.redaction) ? value.redaction : null;
}

function isRedactionMetadataLike(value: unknown): value is RedactionMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const metadata = value as {
    readonly policyVersion?: unknown;
    readonly fieldsRedacted?: unknown;
    readonly reasons?: unknown;
  };
  return (
    metadata.policyVersion === 1 &&
    typeof metadata.fieldsRedacted === 'number' &&
    Array.isArray(metadata.reasons) &&
    metadata.reasons.every((reason) => typeof reason === 'string')
  );
}

function readBlockId(block: TranscriptInputBlock): string | null {
  const value = block as unknown as { readonly id?: unknown };
  return typeof value.id === 'string' && value.id.length > 0 ? value.id : null;
}

function readRevision(block: TranscriptInputBlock): number {
  const value = block as unknown as { readonly revision?: unknown };
  return typeof value.revision === 'number' && Number.isSafeInteger(value.revision)
    ? value.revision
    : 1;
}

function readSequence(block: TranscriptInputBlock): number {
  const value = block as unknown as { readonly seq?: unknown };
  return typeof value.seq === 'number' && Number.isSafeInteger(value.seq) ? value.seq : 0;
}

function readKind(block: TranscriptInputBlock): string | null {
  const value = block as unknown as { readonly kind?: unknown };
  return typeof value.kind === 'string' ? value.kind : null;
}

function mergeRedaction(
  first: RedactionMetadata | null,
  second: RedactionMetadata | null,
): RedactionMetadata | null {
  if (first === null) return second;
  if (second === null) return first;
  return {
    policyVersion: Math.max(first.policyVersion, second.policyVersion),
    fieldsRedacted: first.fieldsRedacted + second.fieldsRedacted,
    reasons: [...new Set([...first.reasons, ...second.reasons])],
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
