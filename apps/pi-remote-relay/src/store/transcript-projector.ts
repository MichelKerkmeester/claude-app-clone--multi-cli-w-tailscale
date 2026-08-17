// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Event Transcript Projector
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';

import type {
  FilePreviewBlock,
  JsonValue,
  PiRpcEvent,
  TranscriptBlock,
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
  | { readonly kind: 'tool_call'; readonly toolName: string; readonly inputSummary: string }
  | {
      readonly kind: 'tool_result';
      readonly toolName: string;
      readonly output: string;
      readonly isError: boolean;
    }
  | { readonly kind: 'file_diff'; readonly summary: string; readonly patch: string }
  | {
      readonly kind: 'usage';
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly cost: number;
    };

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
        const commandId = stringValue(event['id']) ?? `event_${this.eventOrdinal}`;
        const key = `bash:${commandId}:result`;
        const output = `${this.toolResultBuffers.get(key) ?? ''}${stringValue(event['delta']) ?? ''}`;
        this.toolResultBuffers.set(key, output);
        emit(key, { kind: 'tool_result', toolName: 'bash', output, isError: false });
        break;
      }
      case 'tool_execution_start': {
        const toolCallId = stringValue(event['toolCallId']) ?? `event_${this.eventOrdinal}`;
        const key = this.toolCallKeys.get(toolCallId) ?? `tool:${toolCallId}:call`;
        this.toolCallKeys.set(toolCallId, key);
        emit(key, {
          kind: 'tool_call',
          toolName: stringValue(event['toolName']) ?? 'unknown',
          inputSummary: summarizeJson(event['args']),
        });
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
        emit(key, { kind: 'tool_call', toolName: 'tool', inputSummary: '' });
        break;
      case 'toolcall_delta': {
        const inputSummary = `${this.toolCallBuffers.get(key) ?? ''}${stringValue(update['delta']) ?? ''}`;
        this.toolCallBuffers.set(key, inputSummary);
        emit(key, { kind: 'tool_call', toolName: 'tool', inputSummary });
        break;
      }
      case 'toolcall_end': {
        const toolCall = recordValue(update['toolCall']);
        const toolCallId = stringValue(toolCall?.['id']);
        if (toolCallId !== null) this.toolCallKeys.set(toolCallId, key);
        emit(key, {
          kind: 'tool_call',
          toolName: stringValue(toolCall?.['name']) ?? 'tool',
          inputSummary:
            summarizeJson(toolCall?.['arguments']) || this.toolCallBuffers.get(key) || '',
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
      const callId = stringValue(message['toolCallId']) ?? `message_${this.ensureActiveMessage()}`;
      emit(`tool:${callId}:result`, {
        kind: 'tool_result',
        toolName: stringValue(message['toolName']) ?? 'unknown',
        output: textFromContent(message['content']),
        isError: message['isError'] === true,
      });
      this.projectUsage(message['usage'], `tool:${callId}:usage`, emit);
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
    const callId = stringValue(event['toolCallId']) ?? `event_${this.eventOrdinal}`;
    const toolName = stringValue(event['toolName']) ?? 'unknown';
    const key = `tool:${callId}:result`;
    const output = textFromContent(stripArtifactSnapshotSource(resultValue));
    this.toolResultBuffers.set(key, output);
    emit(key, { kind: 'tool_result', toolName, output, isError });
    this.projectUsage(recordValue(resultValue)?.['usage'], `tool:${callId}:usage`, emit);

    if (isFileMutationTool(toolName)) {
      const patch = extractPatch(resultValue) || output;
      emit(`tool:${callId}:diff`, {
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
      id: stableBlockId(`file-preview:${sanitized.descriptor.artifactId}:${sanitized.descriptor.revision}`),
      revision: sanitized.descriptor.revision,
      seq: context.nextSequence(),
      occurredAt: context.occurredAt,
    };
    if (sanitized.bytes !== null && this.artifactStore !== undefined && context.sessionId !== undefined) {
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
  return typeof value === 'string' ? value : JSON.stringify(value);
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
    if ((key === 'artifactSnapshot' || key === 'snapshot') && getAllowlistedArtifactSnapshot(child) !== null) {
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
