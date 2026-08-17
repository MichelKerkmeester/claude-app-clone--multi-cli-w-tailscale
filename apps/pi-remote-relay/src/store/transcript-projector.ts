// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Event Transcript Projector
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';

import type {
  FilePreviewBlock,
  JsonValue,
  PiRpcEvent,
  RedactionMetadata,
  TextArtifactBlock,
  TranscriptBlock,
  TranscriptLifecycle,
  TranscriptOutputCompleteness,
  TranscriptShellKind,
  TranscriptTerminalCheckpoint,
} from '@pi-remote/pi-rpc-protocol';

import type { ArtifactStore } from './artifact-store.js';
import { getAllowlistedArtifactSnapshot, sanitizeArtifactSnapshot } from './artifact-sanitizer.js';

type TranscriptBlockBody =
  | { readonly kind: 'text'; readonly text: string; readonly role?: 'assistant' | 'user' }
  | { readonly kind: 'thinking'; readonly summary: string }
  | {
      readonly kind: 'plan';
      readonly items: readonly { readonly text: string; readonly done: boolean }[];
    }
  | {
      readonly kind: 'tool_call';
      readonly toolName: string;
      readonly inputSummary: string;
      readonly callId?: string;
      readonly shellKind?: TranscriptShellKind;
      readonly lifecycle?: TranscriptLifecycle;
      readonly terminalCheckpoint?: TranscriptTerminalCheckpoint;
      readonly redaction?: RedactionMetadata;
    }
  | {
      readonly kind: 'tool_result';
      readonly toolName: string;
      readonly output: string;
      readonly isError: boolean;
      readonly callId?: string;
      readonly shellKind?: TranscriptShellKind;
      readonly lifecycle?: TranscriptLifecycle;
      readonly terminalCheckpoint?: TranscriptTerminalCheckpoint;
      readonly outputCompleteness?: TranscriptOutputCompleteness;
      readonly redaction?: RedactionMetadata;
    }
  | {
      readonly kind: 'text_artifact';
      readonly label: TextArtifactBlock['label'];
      readonly source: string;
      readonly redaction: RedactionMetadata;
    }
  | { readonly kind: 'file_diff'; readonly summary: string; readonly patch: string }
  | {
      readonly kind: 'usage';
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly cost: number;
    };

const EMPTY_REDACTION: RedactionMetadata = {
  policyVersion: 1,
  fieldsRedacted: 0,
  reasons: [],
};
const MAX_PROJECTED_INPUT = 64 * 1024;
const MAX_PROJECTED_OUTPUT = 128 * 1024;

export interface TranscriptProjectionContext {
  readonly occurredAt: string;
  readonly nextSequence: () => number;
  readonly sessionId?: string;
}

/** Convert Pi's event stream into typed, revisable transcript blocks. */
export class TranscriptProjector {
  private readonly revisions = new Map<string, number>();
  private readonly textBuffers = new Map<string, string>();
  private readonly thinkingBuffers = new Map<string, string>();
  private readonly toolCallBuffers = new Map<string, string>();
  private readonly toolCallKeys = new Map<string, string>();
  private readonly stableCallIds = new Map<string, string>();
  private readonly toolResultBuffers = new Map<string, string>();
  private eventOrdinal = 0;
  private turnOrdinal = 0;
  private messageOrdinal = 0;
  private activeMessage: number | null = null;

  public constructor(private readonly artifactStore?: ArtifactStore) {}

  public project(
    event: PiRpcEvent,
    context: TranscriptProjectionContext,
  ): readonly TranscriptBlock[] {
    this.eventOrdinal += 1;
    const blocks: TranscriptBlock[] = [];
    const emit = (key: string, body: TranscriptBlockBody): void => {
      blocks.push(this.createBlock(key, body, context));
    };

    switch (event.type) {
      case 'agent_start':
        emit(this.eventKey(event.type), { kind: 'text', text: 'Agent started.' });
        break;
      case 'agent_end':
        emit(this.eventKey(event.type), { kind: 'text', text: 'Agent run ended.' });
        break;
      case 'agent_settled':
        emit(this.eventKey(event.type), { kind: 'text', text: 'Agent settled.' });
        break;
      case 'turn_start':
        this.turnOrdinal += 1;
        emit(`turn:${this.turnOrdinal}`, {
          kind: 'plan',
          items: [{ text: `Turn ${this.turnOrdinal}`, done: false }],
        });
        break;
      case 'turn_end':
        emit(`turn:${Math.max(this.turnOrdinal, 1)}`, {
          kind: 'plan',
          items: [{ text: `Turn ${Math.max(this.turnOrdinal, 1)}`, done: true }],
        });
        this.projectUsage(
          recordValue(event['message'])?.['usage'],
          `turn:${Math.max(this.turnOrdinal, 1)}:usage`,
          emit,
        );
        break;
      case 'message_start':
        this.messageOrdinal += 1;
        this.activeMessage = this.messageOrdinal;
        this.projectMessage(event['message'], emit);
        break;
      case 'message_update':
        this.projectMessageUpdate(event, emit);
        this.projectUsage(event['usage'], `${this.messageKey()}:usage`, emit);
        break;
      case 'message_end':
        this.projectMessage(event['message'], emit);
        this.activeMessage = null;
        break;
      case 'bash_execution_update': {
        const commandId = stringValue(event['toolCallId']) ?? stringValue(event['id']);
        const key = `bash:${commandId ?? `event_${this.eventOrdinal}`}:result`;
        const output = appendBounded(
          this.toolResultBuffers.get(key) ?? '',
          stringValue(event['delta']) ?? '',
        );
        this.toolResultBuffers.set(key, output);
        const callId = commandId === null ? null : this.callIdForExternal(commandId);
        if (callId === null) {
          emit(key, { kind: 'tool_result', toolName: 'bash', output, isError: false });
        } else {
          emit(key, {
            kind: 'tool_result',
            toolName: 'bash',
            output,
            isError: false,
            callId,
            shellKind: shellKindFromMetadata(event, 'bash'),
            lifecycle: lifecycleFromMetadata(event, 'running'),
            terminalCheckpoint: checkpointFromMetadata(event, 'streaming'),
            outputCompleteness: completenessFromMetadata(event, 'unknown'),
            redaction: EMPTY_REDACTION,
          });
        }
        break;
      }
      case 'tool_execution_start': {
        const toolCallId = stringValue(event['toolCallId']) ?? `event_${this.eventOrdinal}`;
        const key = this.toolCallKeys.get(toolCallId) ?? `tool:${toolCallId}:call`;
        this.toolCallKeys.set(toolCallId, key);
        const rawCallId = stringValue(event['toolCallId']);
        const callId = rawCallId === null ? null : this.callIdForExternal(rawCallId);
        if (callId === null) {
          emit(key, {
            kind: 'tool_call',
            toolName: stringValue(event['toolName']) ?? 'unknown',
            inputSummary: summarizeJson(event['args']),
          });
        } else {
          emit(key, {
            kind: 'tool_call',
            toolName: stringValue(event['toolName']) ?? 'unknown',
            inputSummary: summarizeJson(event['args']),
            callId,
            shellKind: shellKindFromMetadata(event, 'other'),
            lifecycle: lifecycleFromMetadata(event, 'running'),
            terminalCheckpoint: checkpointFromMetadata(event, 'started'),
            redaction: EMPTY_REDACTION,
          });
        }
        break;
      }
      case 'tool_execution_update':
        this.projectToolResult(event, event['partialResult'], false, emit);
        break;
      case 'tool_execution_end':
        this.projectToolResult(event, event['result'], event['isError'] === true, emit);
        break;
      case 'queue_update': {
        const items = [...stringArray(event['steering']), ...stringArray(event['followUp'])].map(
          (text) => ({ text, done: false }),
        );
        emit('queue:pending', { kind: 'plan', items });
        break;
      }
      case 'compaction_start':
        emit('compaction:active', {
          kind: 'thinking',
          summary: `Compacting context (${stringValue(event['reason']) ?? 'unspecified'}).`,
        });
        break;
      case 'compaction_end': {
        const result = recordValue(event['result']);
        emit('compaction:active', {
          kind: 'thinking',
          summary:
            stringValue(result?.['summary']) ??
            (event['aborted'] === true
              ? 'Context compaction was aborted.'
              : 'Context compaction completed.'),
        });
        this.projectUsage(result?.['usage'], 'compaction:usage', emit);
        break;
      }
      case 'auto_retry_start':
        emit(`retry:${numberValue(event['attempt']) ?? 1}`, {
          kind: 'plan',
          items: [{ text: 'Retrying the agent request', done: false }],
        });
        break;
      case 'auto_retry_end':
        emit(`retry:${numberValue(event['attempt']) ?? 1}`, {
          kind: 'plan',
          items: [
            {
              text: event['success'] === true ? 'Agent retry completed' : 'Agent retry failed',
              done: true,
            },
          ],
        });
        break;
      case 'summarization_retry_scheduled':
        emit('summary-retry:active', {
          kind: 'plan',
          items: [
            {
              text: `Summary retry ${numberValue(event['attempt']) ?? 1} scheduled`,
              done: false,
            },
          ],
        });
        break;
      case 'summarization_retry_attempt_start':
        emit('summary-retry:active', {
          kind: 'plan',
          items: [{ text: 'Summary retry running', done: false }],
        });
        break;
      case 'summarization_retry_finished':
        emit('summary-retry:active', {
          kind: 'plan',
          items: [{ text: 'Summary retry completed', done: true }],
        });
        break;
      case 'extension_error':
        emit(this.eventKey(event.type), {
          kind: 'tool_result',
          toolName: 'extension',
          output: stringValue(event['error']) ?? 'Extension failed.',
          isError: true,
        });
        break;
      case 'extension_ui_request':
        emit(this.eventKey(event.type), {
          kind: 'plan',
          items: [
            {
              text:
                stringValue(event['title']) ??
                stringValue(event['message']) ??
                `Extension requested ${stringValue(event['method']) ?? 'input'}`,
              done: false,
            },
          ],
        });
        break;
      default:
        emit(this.eventKey(String(event['type'] ?? 'unknown')), {
          kind: 'text',
          text: `Pi event: ${String(event['type'] ?? 'unknown')}`,
        });
    }

    const artifact = this.projectArtifact(event, context);
    if (artifact !== null) blocks.push(artifact);
    const textArtifact = this.projectTextArtifact(event, context);
    if (textArtifact !== null) blocks.push(textArtifact);

    if (blocks.length === 0) {
      emit(this.eventKey(event.type), { kind: 'text', text: `Pi event: ${event.type}` });
    }
    return blocks;
  }

  /** Project one accepted phone prompt without persisting its command authority. */
  public projectSubmittedPrompt(
    submissionId: string,
    message: string,
    context: TranscriptProjectionContext,
  ): TranscriptBlock {
    return this.createBlock(
      `prompt:${submissionId}`,
      {
        kind: 'text',
        role: 'user',
        text: message,
      },
      context,
    );
  }

  private projectMessageUpdate(
    event: PiRpcEvent,
    emit: (key: string, body: TranscriptBlockBody) => void,
  ): void {
    const update = recordValue(event['assistantMessageEvent']);
    if (update === null) return;
    const contentIndex = numberValue(update['contentIndex']) ?? 0;
    const key = `${this.messageKey()}:content:${contentIndex}`;
    switch (update['type']) {
      case 'text_start':
        this.textBuffers.set(key, '');
        emit(key, { kind: 'text', text: '' });
        break;
      case 'text_delta': {
        const text = `${this.textBuffers.get(key) ?? ''}${stringValue(update['delta']) ?? ''}`;
        this.textBuffers.set(key, text);
        emit(key, { kind: 'text', text });
        break;
      }
      case 'text_end': {
        const text = stringValue(update['content']) ?? this.textBuffers.get(key) ?? '';
        this.textBuffers.set(key, text);
        emit(key, { kind: 'text', text });
        break;
      }
      case 'thinking_start':
        this.thinkingBuffers.set(key, '');
        emit(key, { kind: 'thinking', summary: '' });
        break;
      case 'thinking_delta': {
        const summary = `${this.thinkingBuffers.get(key) ?? ''}${stringValue(update['delta']) ?? ''}`;
        this.thinkingBuffers.set(key, summary);
        emit(key, { kind: 'thinking', summary });
        break;
      }
      case 'thinking_end': {
        const summary = stringValue(update['content']) ?? this.thinkingBuffers.get(key) ?? '';
        this.thinkingBuffers.set(key, summary);
        emit(key, { kind: 'thinking', summary });
        break;
      }
      case 'toolcall_start':
        this.toolCallBuffers.set(key, '');
        emit(key, {
          kind: 'tool_call',
          toolName: 'tool',
          inputSummary: '',
          callId: this.callIdForKey(key, toolCallIdFromRecord(update)),
          shellKind: shellKindFromMetadata(update, 'other'),
          lifecycle: lifecycleFromMetadata(update, 'running'),
          terminalCheckpoint: checkpointFromMetadata(update, 'started'),
          redaction: EMPTY_REDACTION,
        });
        break;
      case 'toolcall_delta': {
        const inputSummary = `${this.toolCallBuffers.get(key) ?? ''}${stringValue(update['delta']) ?? ''}`;
        this.toolCallBuffers.set(key, inputSummary);
        emit(key, {
          kind: 'tool_call',
          toolName: 'tool',
          inputSummary,
          callId: this.callIdForKey(key, toolCallIdFromRecord(update)),
          shellKind: shellKindFromMetadata(update, 'other'),
          lifecycle: lifecycleFromMetadata(update, 'running'),
          terminalCheckpoint: checkpointFromMetadata(update, 'streaming'),
          redaction: EMPTY_REDACTION,
        });
        break;
      }
      case 'toolcall_end': {
        const toolCall = recordValue(update['toolCall']);
        const toolCallId = stringValue(toolCall?.['id']);
        if (toolCallId !== null) this.toolCallKeys.set(toolCallId, key);
        const callId = this.callIdForKey(key, toolCallId);
        emit(key, {
          kind: 'tool_call',
          toolName: stringValue(toolCall?.['name']) ?? 'tool',
          inputSummary:
            summarizeJson(toolCall?.['arguments']) || this.toolCallBuffers.get(key) || '',
          callId,
          shellKind: shellKindFromMetadata(update, 'other'),
          lifecycle: lifecycleFromMetadata(update, 'running'),
          terminalCheckpoint: checkpointFromMetadata(update, 'terminal'),
          redaction: EMPTY_REDACTION,
        });
        break;
      }
    }
  }

  private projectMessage(
    value: JsonValue | undefined,
    emit: (key: string, body: TranscriptBlockBody) => void,
  ): void {
    const message = recordValue(value);
    if (message === null) return;
    const role = stringValue(message['role']);
    if (role === 'toolResult') {
      const externalCallId = stringValue(message['toolCallId']);
      const keyCallId = externalCallId ?? `message_${this.ensureActiveMessage()}`;
      const key = `tool:${keyCallId}:result`;
      const output = appendBounded(
        '',
        textFromContent(stripArtifactSnapshotSource(message['content'])),
      );
      const callId = externalCallId === null ? null : this.callIdForExternal(externalCallId);
      if (callId === null) {
        emit(key, {
          kind: 'tool_result',
          toolName: stringValue(message['toolName']) ?? 'unknown',
          output,
          isError: message['isError'] === true,
        });
      } else {
        emit(key, {
          kind: 'tool_result',
          toolName: stringValue(message['toolName']) ?? 'unknown',
          output,
          isError: message['isError'] === true,
          callId,
          shellKind: shellKindFromMetadata(message, 'other'),
          lifecycle: lifecycleFromMetadata(
            message,
            message['isError'] === true ? 'failed' : 'completed',
          ),
          terminalCheckpoint: checkpointFromMetadata(message, 'terminal'),
          outputCompleteness: completenessFromMetadata(message, 'complete'),
          redaction: EMPTY_REDACTION,
        });
      }
      this.projectUsage(message['usage'], `tool:${keyCallId}:usage`, emit);
      return;
    }
    if (role !== 'assistant') return;
    const content = Array.isArray(message['content']) ? message['content'] : [];
    content.forEach((item, index) => {
      const contentItem = recordValue(item);
      if (contentItem === null) return;
      const key = `${this.messageKey()}:content:${index}`;
      if (contentItem['type'] === 'text') {
        emit(key, { kind: 'text', text: stringValue(contentItem['text']) ?? '' });
      } else if (contentItem['type'] === 'thinking') {
        emit(key, { kind: 'thinking', summary: stringValue(contentItem['thinking']) ?? '' });
      } else if (contentItem['type'] === 'toolCall') {
        const callId = stringValue(contentItem['id']);
        if (callId !== null) this.toolCallKeys.set(callId, key);
        emit(key, {
          kind: 'tool_call',
          toolName: stringValue(contentItem['name']) ?? 'tool',
          inputSummary: summarizeJson(contentItem['arguments']),
          callId: this.callIdForKey(key, callId),
          shellKind: shellKindFromMetadata(contentItem, 'other'),
          lifecycle: lifecycleFromMetadata(contentItem, 'running'),
          terminalCheckpoint: checkpointFromMetadata(contentItem, 'started'),
          redaction: EMPTY_REDACTION,
        });
      }
    });
    this.projectUsage(message['usage'], `${this.messageKey()}:usage`, emit);
  }

  private projectToolResult(
    event: PiRpcEvent,
    resultValue: JsonValue | undefined,
    isError: boolean,
    emit: (key: string, body: TranscriptBlockBody) => void,
  ): void {
    const externalCallId = stringValue(event['toolCallId']);
    const keyCallId = externalCallId ?? `event_${this.eventOrdinal}`;
    const toolName = stringValue(event['toolName']) ?? 'unknown';
    const key = `tool:${keyCallId}:result`;
    const output = appendBounded('', textFromContent(stripArtifactSnapshotSource(resultValue)));
    this.toolResultBuffers.set(key, output);
    const callId = externalCallId === null ? null : this.callIdForExternal(externalCallId);
    if (callId === null) {
      emit(key, { kind: 'tool_result', toolName, output, isError });
    } else {
      emit(key, {
        kind: 'tool_result',
        toolName,
        output,
        isError,
        callId,
        shellKind: shellKindFromMetadata(event, 'other'),
        lifecycle: lifecycleFromMetadata(
          event,
          event.type === 'tool_execution_end' ? (isError ? 'failed' : 'completed') : 'running',
        ),
        terminalCheckpoint: checkpointFromMetadata(
          event,
          event.type === 'tool_execution_end' ? 'terminal' : 'streaming',
        ),
        outputCompleteness: completenessFromMetadata(
          event,
          event.type === 'tool_execution_end' ? 'complete' : 'unknown',
        ),
        redaction: EMPTY_REDACTION,
      });
    }
    this.projectUsage(recordValue(resultValue)?.['usage'], `tool:${keyCallId}:usage`, emit);

    if (isFileMutationTool(toolName)) {
      const patch = extractPatch(resultValue) || output;
      emit(`tool:${keyCallId}:diff`, {
        kind: 'file_diff',
        summary: `${toolName} changed a file`,
        patch,
      });
    }
  }

  private projectUsage(
    value: JsonValue | undefined,
    key: string,
    emit: (key: string, body: TranscriptBlockBody) => void,
  ): void {
    const usage = recordValue(value);
    if (usage === null) return;
    const cost = recordValue(usage['cost']);
    emit(key, {
      kind: 'usage',
      inputTokens: nonNegativeNumber(usage['input']),
      outputTokens: nonNegativeNumber(usage['output']),
      cost: nonNegativeNumber(cost?.['total'] ?? usage['cost']),
    });
  }

  private createBlock(
    key: string,
    body: TranscriptBlockBody,
    context: TranscriptProjectionContext,
  ): TranscriptBlock {
    const revision = (this.revisions.get(key) ?? 0) + 1;
    this.revisions.set(key, revision);
    return {
      ...body,
      id: stableBlockId(key),
      revision,
      seq: context.nextSequence(),
      occurredAt: context.occurredAt,
    };
  }

  private ensureActiveMessage(): number {
    if (this.activeMessage === null) {
      this.messageOrdinal += 1;
      this.activeMessage = this.messageOrdinal;
    }
    return this.activeMessage;
  }

  private messageKey(): string {
    return `message:${this.ensureActiveMessage()}`;
  }

  private eventKey(type: string): string {
    return `event:${this.eventOrdinal}:${type}`;
  }

  private projectArtifact(
    event: PiRpcEvent,
    context: TranscriptProjectionContext,
  ): FilePreviewBlock | null {
    const sanitized = sanitizeArtifactSnapshot(event);
    if (sanitized === null) return null;
    const block: FilePreviewBlock = {
      ...sanitized.descriptor,
      id: stableBlockId(
        `file-preview:${sanitized.descriptor.artifactId}:${sanitized.descriptor.revision}`,
      ),
      revision: sanitized.descriptor.revision,
      seq: context.nextSequence(),
      occurredAt: context.occurredAt,
    };
    if (
      sanitized.bytes !== null &&
      this.artifactStore !== undefined &&
      context.sessionId !== undefined
    ) {
      this.artifactStore.putArtifact({
        sessionId: context.sessionId,
        artifactId: block.artifactId,
        revision: block.revision,
        descriptor: block,
        bytes: sanitized.bytes,
        ...(sanitized.retentionMs === undefined ? {} : { retentionMs: sanitized.retentionMs }),
        ...(sanitized.expiresAt === undefined ? {} : { expiresAt: sanitized.expiresAt }),
      });
    }
    return block;
  }

  private projectTextArtifact(
    event: PiRpcEvent,
    context: TranscriptProjectionContext,
  ): TextArtifactBlock | null {
    const metadata = trustedTextArtifactMetadata(event);
    if (metadata === null) return null;
    const key = `text-artifact:${metadata.identity}`;
    return this.createBlock(
      key,
      {
        kind: 'text_artifact',
        label: metadata.label,
        source: metadata.source,
        redaction: EMPTY_REDACTION,
      },
      context,
    ) as TextArtifactBlock;
  }

  private callIdForExternal(externalCallId: string): string {
    const current = this.stableCallIds.get(externalCallId);
    if (current !== undefined) return current;
    const callId = isOpaqueCallId(externalCallId)
      ? externalCallId
      : stableOpaqueId(`external:${externalCallId}`);
    this.stableCallIds.set(externalCallId, callId);
    return callId;
  }

  private callIdForKey(key: string, externalCallId: string | null): string {
    const current = this.stableCallIds.get(key);
    if (current !== undefined) {
      if (externalCallId !== null) this.stableCallIds.set(externalCallId, current);
      return current;
    }
    if (externalCallId !== null) {
      const callId = this.callIdForExternal(externalCallId);
      this.stableCallIds.set(key, callId);
      return callId;
    }
    const callId = stableOpaqueId(`key:${key}`);
    this.stableCallIds.set(key, callId);
    return callId;
  }
}

function stableBlockId(key: string): string {
  return `block_${createHash('sha256').update(key).digest('hex').slice(0, 24)}`;
}

function recordValue(value: JsonValue | undefined): Record<string, JsonValue> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : null;
}

function stringValue(value: JsonValue | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function numberValue(value: JsonValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nonNegativeNumber(value: JsonValue | undefined): number {
  const number = numberValue(value);
  return number !== null && number >= 0 ? number : 0;
}

function stringArray(value: JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function summarizeJson(value: JsonValue | undefined): string {
  if (value === undefined) return '';
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return serialized.slice(0, MAX_PROJECTED_INPUT);
}

function textFromContent(value: JsonValue | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const record = recordValue(item);
        return record?.['type'] === 'text' ? (stringValue(record['text']) ?? '') : '';
      })
      .filter((text) => text.length > 0)
      .join('\n');
  }
  return value === undefined ? '' : JSON.stringify(value);
}

function stripArtifactSnapshotSource(value: JsonValue | undefined): JsonValue | undefined {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripArtifactSnapshotSource(item) ?? null);
  }
  const record = value as Record<string, JsonValue>;
  const stripped: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(record)) {
    if (
      (key === 'artifactSnapshot' || key === 'snapshot') &&
      getAllowlistedArtifactSnapshot(child) !== null
    ) {
      continue;
    } else {
      stripped[key] = stripArtifactSnapshotSource(child) ?? null;
    }
  }
  return stripped;
}

function extractPatch(value: JsonValue | undefined): string {
  const result = recordValue(value);
  const details = recordValue(result?.['details']);
  return (
    stringValue(result?.['patch']) ??
    stringValue(result?.['diff']) ??
    stringValue(details?.['patch']) ??
    stringValue(details?.['diff']) ??
    ''
  );
}

function isFileMutationTool(toolName: string): boolean {
  return ['edit', 'write', 'apply_patch'].includes(toolName.toLowerCase());
}

function appendBounded(current: string, next: string): string {
  const combined = `${current}${next}`;
  return combined.length <= MAX_PROJECTED_OUTPUT
    ? combined
    : combined.slice(0, MAX_PROJECTED_OUTPUT);
}

function isOpaqueCallId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/.test(value);
}

function stableOpaqueId(value: string): string {
  return `call_${createHash('sha256').update(value).digest('hex').slice(0, 24)}`;
}

function toolCallIdFromRecord(value: Record<string, JsonValue>): string | null {
  return (
    stringValue(value['toolCallId']) ??
    stringValue(recordValue(value['toolCall'])?.['id']) ??
    stringValue(value['id'])
  );
}

function metadataRecord(value: Record<string, JsonValue>): Record<string, JsonValue> {
  return (
    recordValue(value['metadata']) ??
    recordValue(value['meta']) ??
    recordValue(value['protocolMetadata']) ??
    value
  );
}

function metadataValue(
  value: Record<string, JsonValue>,
  keys: readonly string[],
): JsonValue | undefined {
  const metadata = metadataRecord(value);
  for (const key of keys) {
    if (metadata[key] !== undefined) return metadata[key];
  }
  return undefined;
}

function shellKindFromMetadata(
  value: Record<string, JsonValue>,
  fallback: TranscriptShellKind,
): TranscriptShellKind {
  const candidate = stringValue(metadataValue(value, ['shellKind', 'shellGenre']));
  return candidate === 'bash' || candidate === 'shell' || candidate === 'other'
    ? candidate
    : fallback;
}

function lifecycleFromMetadata(
  value: Record<string, JsonValue>,
  fallback: TranscriptLifecycle,
): TranscriptLifecycle {
  const candidate = stringValue(metadataValue(value, ['lifecycle', 'status']));
  return candidate === 'queued' ||
    candidate === 'running' ||
    candidate === 'completed' ||
    candidate === 'failed' ||
    candidate === 'denied' ||
    candidate === 'cancelled' ||
    candidate === 'interrupted' ||
    candidate === 'unknown'
    ? candidate
    : fallback;
}

function checkpointFromMetadata(
  value: Record<string, JsonValue>,
  fallback: TranscriptTerminalCheckpoint,
): TranscriptTerminalCheckpoint {
  const candidate = stringValue(metadataValue(value, ['terminalCheckpoint', 'checkpoint']));
  return candidate === 'none' ||
    candidate === 'started' ||
    candidate === 'streaming' ||
    candidate === 'terminal' ||
    candidate === 'unknown'
    ? candidate
    : fallback;
}

function completenessFromMetadata(
  value: Record<string, JsonValue>,
  fallback: TranscriptOutputCompleteness,
): TranscriptOutputCompleteness {
  const metadata = metadataRecord(value);
  const candidate = stringValue(metadataValue(value, ['outputCompleteness', 'completeness']));
  if (candidate === 'complete' || candidate === 'upstream-truncated' || candidate === 'unknown') {
    return candidate;
  }
  if (metadata['truncated'] === true) return 'upstream-truncated';
  return fallback;
}

function trustedTextArtifactMetadata(event: PiRpcEvent): {
  readonly identity: string;
  readonly label: TextArtifactBlock['label'];
  readonly source: string;
} | null {
  const metadata = recordValue(event['metadata']);
  if (metadata === null) return null;
  const artifact =
    recordValue(metadata['textArtifact']) ??
    recordValue(metadata['text_artifact']) ??
    recordValue(metadata['artifact']);
  if (artifact === null || artifact['trusted'] !== true || typeof artifact['source'] !== 'string') {
    return null;
  }
  const labelValue = stringValue(artifact['label']) ?? stringValue(artifact['kind']);
  if (
    labelValue !== 'prompt' &&
    labelValue !== 'goal' &&
    labelValue !== 'plan' &&
    labelValue !== 'document' &&
    labelValue !== 'text'
  ) {
    return null;
  }
  if (artifact['source'].length === 0 || artifact['source'].length > 256 * 1024) return null;
  const suppliedIdentity = stringValue(artifact['id']) ?? stringValue(artifact['artifactId']);
  return {
    identity:
      suppliedIdentity !== null && isOpaqueCallId(suppliedIdentity)
        ? suppliedIdentity
        : stableOpaqueId(`artifact:${labelValue}:${artifact['source']}`),
    label: labelValue,
    source: artifact['source'],
  };
}
