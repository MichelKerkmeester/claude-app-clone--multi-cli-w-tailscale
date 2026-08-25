// ───────────────────────────────────────────────────────────────────
// MODULE: Opaque Session Catalog
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { isOpaqueId } from '@pi-remote/pi-rpc-protocol';
import type { SessionCardDto } from '@pi-remote/pi-rpc-protocol';

import type { RelayStore } from '../store/relay-store.js';

// ───────────────────────────────────────────────────────────────────
// 2. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Keep filesystem paths and prompt-derived labels outside the client catalog. */
export class SessionCatalog {
  public constructor(private readonly store: RelayStore) {}

  public register(
    id: string,
    status: SessionCardDto['status'],
    messageCount: number,
    updatedAt = new Date().toISOString(),
  ): void {
    if (!isOpaqueId(id)) {
      throw new TypeError('Session catalog id must be opaque and path-free.');
    }
    this.store.upsertSession({ id, status, updatedAt, messageCount });
  }

  public list(): readonly SessionCardDto[] {
    return this.store.listSessions();
  }
}
