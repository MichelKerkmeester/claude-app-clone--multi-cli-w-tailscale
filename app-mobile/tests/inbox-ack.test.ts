// ───────────────────────────────────────────────────────────────────
// MODULE: Inbox acknowledgment behavior
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { AttentionItemDto } from '@pi-remote/pi-rpc-protocol';
import { describe, expect, it } from 'vitest';

import {
  applyInboxAckDoneRebroadcast,
  createInboxAckIntent,
  type InboxAckDoneRebroadcast,
} from '../src/shared/format/inbox-ack.js';
import {
  applyAttentionAckDoneRebroadcast,
  createAttentionAckIntent,
  visibleAttentionItems,
} from '../src/shared/format/attention.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const LOOKUP_ID = 'finished_attention_001';
const ACK_CAPABILITY = { ackDone: true } as const;
const ACK_DONE_REBROADCAST = {
  ackDone: true,
  lookupId: LOOKUP_ID,
} satisfies InboxAckDoneRebroadcast;
const ATTENTION_ITEM: AttentionItemDto = {
  lookupId: LOOKUP_ID,
  attentionClass: 'done',
  generation: 4,
  nonce: 'nonce_finished_attention_001',
  occurredAt: '2026-08-13T10:00:00.000Z',
};

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('inbox acknowledgment', () => {
  it('emits an intent on open but keeps the item visible until host confirmation', () => {
    const localReadIds = new Set<string>();
    const intent = createAttentionAckIntent(LOOKUP_ID, ACK_CAPABILITY);
    const pureIntent = createInboxAckIntent(LOOKUP_ID, ACK_CAPABILITY);
    const afterOpen = applyInboxAckDoneRebroadcast(localReadIds, undefined, ACK_CAPABILITY);

    expect(intent).toEqual({ type: 'attention-ack', lookupId: LOOKUP_ID });
    expect(pureIntent).toEqual(intent);
    expect(afterOpen).toEqual(new Set());
    expect(visibleAttentionItems([ATTENTION_ITEM], afterOpen)).toEqual([ATTENTION_ITEM]);
  });

  it('clears the item when the host re-broadcasts ackDone', () => {
    const localReadIds = applyAttentionAckDoneRebroadcast(
      new Set(),
      ACK_DONE_REBROADCAST,
      ACK_CAPABILITY,
    );
    const pureReadIds = applyInboxAckDoneRebroadcast(
      new Set(),
      ACK_DONE_REBROADCAST,
      ACK_CAPABILITY,
    );

    expect(localReadIds).toEqual(new Set([LOOKUP_ID]));
    expect(pureReadIds).toEqual(localReadIds);
    expect(visibleAttentionItems([ATTENTION_ITEM], localReadIds)).toEqual([]);
  });

  it('emits nothing and clears nothing when the acknowledgment capability is absent', () => {
    const localReadIds = applyAttentionAckDoneRebroadcast(
      new Set(),
      ACK_DONE_REBROADCAST,
      undefined,
    );

    expect(createAttentionAckIntent(LOOKUP_ID, undefined)).toBeUndefined();
    expect(localReadIds).toEqual(new Set());
    expect(visibleAttentionItems([ATTENTION_ITEM], localReadIds)).toEqual([ATTENTION_ITEM]);
  });
});
