// ───────────────────────────────────────────────────────────────────
// MODULE: RPC Response and Event Demultiplexer
// ───────────────────────────────────────────────────────────────────

import { isPiRpcEvent, isPiRpcResponse } from '@pi-remote/pi-rpc-protocol';
import type {
  AskQuestionResultReason,
  PiRpcEvent,
  PiRpcResponse,
} from '@pi-remote/pi-rpc-protocol';

interface PendingResponse {
  readonly resolve: (response: PiRpcResponse) => void;
  readonly reject: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
}

export type AskQuestionCallbackOutcome =
  | { readonly status: 'accepted' }
  | { readonly status: 'rejected'; readonly reason: AskQuestionResultReason }
  | { readonly status: 'delivery-unknown' };

export interface AskQuestionCallbackRoute {
  /** Bind this predicate to the Pi version's confirmed callback/event shape. */
  readonly matches: (record: unknown) => boolean;
  /** Convert a matched callback to safe outcome metadata without exposing its payload. */
  readonly map: (record: unknown) => AskQuestionCallbackOutcome;
  readonly onOutcome: (outcome: AskQuestionCallbackOutcome) => void;
}

export interface RpcDemultiplexerOptions {
  readonly onEvent: (event: PiRpcEvent) => void;
  readonly onProtocolError: (error: Error) => void;
  readonly askQuestionCallback?: AskQuestionCallbackRoute;
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
    if (this.routeAskQuestionCallback(record)) return;
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

  private routeAskQuestionCallback(record: unknown): boolean {
    const route = this.options.askQuestionCallback;
    if (route === undefined) return false;
    let matches: boolean;
    try {
      matches = route.matches(record);
    } catch (error: unknown) {
      this.options.onProtocolError(
        error instanceof Error ? error : new Error('Ask-question callback matching failed.'),
      );
      return true;
    }
    if (!matches) return false;
    try {
      route.onOutcome(normalizeAskQuestionCallbackOutcome(route.map(record)));
    } catch (error: unknown) {
      this.options.onProtocolError(
        error instanceof Error ? error : new Error('Ask-question callback mapping failed.'),
      );
    }
    return true;
  }
}

function normalizeAskQuestionCallbackOutcome(
  outcome: AskQuestionCallbackOutcome,
): AskQuestionCallbackOutcome {
  if (outcome.status === 'accepted') return { status: 'accepted' };
  if (outcome.status === 'delivery-unknown') return { status: 'delivery-unknown' };
  return isAskQuestionResultReason(outcome.reason)
    ? { status: 'rejected', reason: outcome.reason }
    : { status: 'delivery-unknown' };
}

function isAskQuestionResultReason(value: unknown): value is AskQuestionResultReason {
  return (
    value === 'invalid-ticket' ||
    value === 'revision-mismatch' ||
    value === 'question-withdrawn' ||
    value === 'question-already-answered' ||
    value === 'plan-mode-blocked' ||
    value === 'redaction-policy-blocked' ||
    value === 'validation-failed' ||
    value === 'host-unavailable' ||
    value === 'delivery-unknown'
  );
}
