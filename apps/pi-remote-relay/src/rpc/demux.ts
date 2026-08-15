// ───────────────────────────────────────────────────────────────────
// MODULE: RPC Response and Event Demultiplexer
// ───────────────────────────────────────────────────────────────────

import { isPiRpcEvent, isPiRpcResponse } from '@pi-remote/pi-rpc-protocol';
import type { PiRpcEvent, PiRpcResponse } from '@pi-remote/pi-rpc-protocol';

interface PendingResponse {
  readonly resolve: (response: PiRpcResponse) => void;
  readonly reject: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
}

export interface RpcDemultiplexerOptions {
  readonly onEvent: (event: PiRpcEvent) => void;
  readonly onProtocolError: (error: Error) => void;
}

/** Correlate responses by request id while delivering events independently. */
export class RpcDemultiplexer {
  private readonly pending = new Map<string, PendingResponse>();

  public constructor(private readonly options: RpcDemultiplexerOptions) {}

  /** Register one response id before writing its command to Pi stdin. */
  public expect(id: string, timeoutMs: number): Promise<PiRpcResponse> {
    if (this.pending.has(id)) {
      return Promise.reject(new Error(`RPC request id '${id}' is already pending.`));
    }
    return new Promise<PiRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC response '${id}' timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  /** Route one parsed stdout record without treating stderr as protocol input. */
  public accept(record: unknown): void {
    if (isPiRpcResponse(record)) {
      if (record.id === undefined) {
        this.options.onProtocolError(new Error('RPC response omitted its correlation id.'));
        return;
      }
      const pending = this.pending.get(record.id);
      if (pending === undefined) {
        this.options.onProtocolError(
          new Error(`RPC response used unknown correlation id '${record.id}'.`),
        );
        return;
      }
      clearTimeout(pending.timer);
      this.pending.delete(record.id);
      pending.resolve(record);
      return;
    }
    if (isPiRpcEvent(record)) {
      this.options.onEvent(record);
      return;
    }
    this.options.onProtocolError(
      new Error('RPC stdout record did not match a pinned response or event.'),
    );
  }

  /** Reject every pending response when the owning child exits. */
  public rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
