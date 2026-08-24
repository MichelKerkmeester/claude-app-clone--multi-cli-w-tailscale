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

  /** Register coarse state for one server-owned opaque session id. */
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

  /** Return the read-only session card projection. */
  public list(): readonly SessionCardDto[] {
    return this.store.listSessions();
  }
}
