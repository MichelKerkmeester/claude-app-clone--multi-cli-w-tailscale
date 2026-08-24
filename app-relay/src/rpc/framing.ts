// ───────────────────────────────────────────────────────────────────
// MODULE: Strict LF JSONL Framing
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { StringDecoder } from 'node:string_decoder';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const DEFAULT_MAX_RECORD_BYTES = 1_048_576;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface JsonlFramingOptions {
  readonly onRecord: (record: unknown) => void;
  readonly onError: (error: Error) => void;
  readonly maxRecordBytes?: number;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Decode UTF-8 JSON records while treating LF as the only delimiter. */
export class StrictJsonlDecoder {
  private readonly decoder = new StringDecoder('utf8');
  private readonly maxRecordBytes: number;
  private buffer = '';

  public constructor(private readonly options: JsonlFramingOptions) {
    this.maxRecordBytes = options.maxRecordBytes ?? DEFAULT_MAX_RECORD_BYTES;
  }

  /** Push one arbitrary stdout chunk into the framing buffer. */
  public push(chunk: Buffer | string): void {
    this.buffer += typeof chunk === 'string' ? chunk : this.decoder.write(chunk);
    this.consumeCompleteRecords();
    if (Buffer.byteLength(this.buffer, 'utf8') > this.maxRecordBytes) {
      this.options.onError(
        new Error(`RPC JSONL record exceeded ${this.maxRecordBytes} bytes before an LF delimiter.`),
      );
      this.buffer = '';
    }
  }

  /** Reject a trailing partial record because every frame must end with LF. */
  public finish(): void {
    this.buffer += this.decoder.end();
    if (this.buffer.length > 0) {
      this.options.onError(new Error('RPC JSONL stream ended without an LF delimiter.'));
      this.buffer = '';
    }
  }

  private consumeCompleteRecords(): void {
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      this.parseRecord(line);
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  private parseRecord(line: string): void {
    if (line.length === 0) {
      this.options.onError(new Error('RPC JSONL contained an empty record.'));
      return;
    }
    if (Buffer.byteLength(line, 'utf8') > this.maxRecordBytes) {
      this.options.onError(
        new Error(`RPC JSONL record exceeded the ${this.maxRecordBytes}-byte limit.`),
      );
      return;
    }
    if (line.includes('\r')) {
      this.options.onError(new Error('RPC JSONL requires LF delimiters without carriage returns.'));
      return;
    }
    let record: unknown;
    try {
      record = JSON.parse(line) as unknown;
    } catch {
      this.options.onError(
        new Error(
          `RPC JSONL framing failed for a record of ${Buffer.byteLength(line, 'utf8')} bytes.`,
        ),
      );
      return;
    }
    try {
      this.options.onRecord(record);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.onError(new Error(`RPC JSONL record handling failed: ${message}`));
    }
  }
}
