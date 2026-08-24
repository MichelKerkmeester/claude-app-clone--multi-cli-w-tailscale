// ───────────────────────────────────────────────────────────────────
// MODULE: Replay and Live Sync Barrier
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { isAskQuestionTranscriptMeta, isEnvelope } from '@pi-remote/pi-rpc-protocol';
import type {
  AskQuestionTranscriptMeta,
  Envelope,
  SyncCursor,
  SyncDelta,
  SyncMessage,
} from '@pi-remote/pi-rpc-protocol';

import type { RelayStore } from '../store/relay-store.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface SubscriptionIdentity {
  readonly hostId: string;
  readonly workspaceRef: string;
  readonly sessionId: string;
}

interface Subscription {
  readonly identity: SubscriptionIdentity;
  readonly send: (message: SyncMessage) => void;
  isInitializing: boolean;
  barrier: number;
  readonly queued: Envelope[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Join replay and live delivery without interleaving pre-snapshot deltas. */
export class SyncHub {
  private readonly subscriptions = new Set<Subscription>();
  private readonly committedListeners = new Set<(envelope: Envelope) => void>();

  public constructor(private readonly store: RelayStore) {}

  /** Redact and persist an envelope before notifying any subscriber. */
  public publish(candidate: Envelope): Envelope {
    const result = this.store.appendEnvelope(candidate);
    if (!isEnvelope(result.envelope)) {
      throw new TypeError('Sync refused an envelope that failed the redaction contract.');
    }
    if (result.inserted) {
      this.broadcast(result.envelope);
      for (const listener of this.committedListeners) listener(result.envelope);
    }
    return result.envelope;
  }

  /** Publish only the metadata representation of a host-owned question. */
  public publishAskQuestionMetadata(
    candidate: Envelope<AskQuestionTranscriptMeta>,
  ): Envelope<AskQuestionTranscriptMeta> {
    if (candidate.kind !== 'transcript.block' || !isAskQuestionTranscriptMeta(candidate.payload)) {
      throw new TypeError('Sync refused a display-bearing ask-question payload.');
    }
    return this.publish(candidate) as Envelope<AskQuestionTranscriptMeta>;
  }

  public onCommitted(listener: (envelope: Envelope) => void): () => void {
    this.committedListeners.add(listener);
    return () => this.committedListeners.delete(listener);
  }

  /** Send a cursor plan, then release only live deltas beyond its barrier. */
  public subscribe(
    identity: SubscriptionIdentity,
    send: (message: SyncMessage) => void,
    cursor?: SyncCursor,
  ): () => void {
    const subscription: Subscription = {
      identity,
      send,
      isInitializing: true,
      barrier: 0,
      queued: [],
    };
    this.subscriptions.add(subscription);
    const plan = this.store.createSyncPlan(identity, cursor);
    subscription.barrier = plan.barrier;
    for (const message of plan.messages) {
      send(message);
    }
    subscription.isInitializing = false;
    for (const envelope of subscription.queued
      .filter((item) => item.seq > subscription.barrier)
      .sort((left, right) => left.seq - right.seq)) {
      send(this.delta(envelope));
    }
    subscription.queued.length = 0;
    return () => this.subscriptions.delete(subscription);
  }

  private broadcast(envelope: Envelope): void {
    for (const subscription of this.subscriptions) {
      if (!this.matches(subscription.identity, envelope)) {
        continue;
      }
      if (subscription.isInitializing) {
        subscription.queued.push(envelope);
      } else {
        subscription.send(this.delta(envelope));
      }
    }
  }

  private delta(envelope: Envelope): SyncDelta {
    return {
      kind: 'sync.delta',
      sessionId: envelope.sessionId,
      epoch: envelope.epoch,
      coversThrough: envelope.seq,
      envelopes: [envelope],
    };
  }

  private matches(identity: SubscriptionIdentity, envelope: Envelope): boolean {
    return (
      identity.hostId === envelope.hostId &&
      identity.workspaceRef === envelope.workspaceRef &&
      identity.sessionId === envelope.sessionId
    );
  }
}
