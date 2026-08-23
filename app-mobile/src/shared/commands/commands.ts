// ───────────────────────────────────────────────────────────────────
// MODULE: Host Command Catalog Types + Binding Resolution (web)
// ───────────────────────────────────────────────────────────────────
// The scoped-snapshot types and the fail-closed binding resolver shared by
// the command palette and composer. A binding is only ever created from a
// row present in the CURRENT scoped snapshot (matching host epoch, session,
// and revisions), so a reconnect, foreground refresh, session switch, or
// host-epoch change can never bind another session's row. The live catalog
// fetch/refresh lifecycle lives in the runes twin.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type HostCommandCatalogStatus =
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'unavailable'
  | 'forbidden'
  | 'incompatible'
  | 'stale';

/** One committed catalog snapshot, bound to host epoch, session, and revisions. */
export interface ScopedCommandSnapshot {
  readonly hostEpoch: string;
  readonly sessionId: string;
  readonly sessionRevision: number;
  readonly catalogRevision: number;
  readonly commands: readonly CommandDescriptorDto[];
  /** Monotonic wall-clock commit time, used only for foreground staleness gating. */
  readonly fetchedAt: number;
}

/** The explicit binding a draft carries for fail-closed revalidation at Send. */
export interface SelectedCommandBinding {
  readonly hostEpoch: string;
  readonly sessionId: string;
  readonly name: string;
  readonly sessionRevision: number;
  readonly catalogRevision: number;
}

export interface HostCommandCatalogState {
  readonly status: HostCommandCatalogStatus;
  /** The committed snapshot for the current scope, or null while none exists. */
  readonly snapshot: ScopedCommandSnapshot | null;
  readonly commands: readonly CommandDescriptorDto[];
  readonly refresh: (reason?: CatalogRefreshReason) => Promise<void>;
}

export type CatalogRefreshReason =
  | 'initial'
  | 'live'
  | 'reconnect'
  | 'foreground'
  | 'online'
  | 'manual';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Revalidation triggers that must wait until the snapshot is older than this. */
export const CATALOG_STALE_AFTER_MS = 30_000;

// ───────────────────────────────────────────────────────────────────
// 4. BINDING RESOLUTION
// ───────────────────────────────────────────────────────────────────

/**
 * Resolve a canonical name inside the CURRENT scoped snapshot. No binding is
 * ever created from a missing, disabled, or out-of-scope row.
 */
export function bindingFor(
  snapshot: ScopedCommandSnapshot | null,
  name: string,
): SelectedCommandBinding | null {
  if (snapshot === null) return null;
  const descriptor = snapshot.commands.find((command) => command.name === name);
  if (descriptor === undefined || !descriptor.enabled) return null;
  return {
    hostEpoch: snapshot.hostEpoch,
    sessionId: snapshot.sessionId,
    name,
    sessionRevision: snapshot.sessionRevision,
    catalogRevision: snapshot.catalogRevision,
  };
}

/**
 * Fail-closed binding validity: a binding is only current for its exact
 * scope, and only while its canonical row still exists as an ENABLED entry
 * in the committed snapshot. A refresh that disables the command ages the
 * binding out just like a revision bump.
 */
export function bindingMatchesSnapshot(
  binding: SelectedCommandBinding | null,
  snapshot: ScopedCommandSnapshot | null,
): boolean {
  if (binding === null) return true;
  if (snapshot === null) return false;
  return (
    binding.hostEpoch === snapshot.hostEpoch &&
    binding.sessionId === snapshot.sessionId &&
    binding.sessionRevision === snapshot.sessionRevision &&
    binding.catalogRevision === snapshot.catalogRevision &&
    snapshot.commands.some((command) => command.name === binding.name && command.enabled)
  );
}
