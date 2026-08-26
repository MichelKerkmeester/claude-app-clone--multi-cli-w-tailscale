// ───────────────────────────────────────────────────────────────────
// MODULE: Host File-Search RPC (shape only — inert without host capability)
// ───────────────────────────────────────────────────────────────────
// Host file-search request/response types for the @-mention file search.
// No device FS walk; the host RPC is required.  Without it the source
// returns empty results — the scaffold is inert.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Request to search for files matching a query string. */
export interface FileSearchRequest {
  /** The query string (everything after @ in the mention token). */
  readonly query: string;
  /** Maximum number of results to return. */
  readonly limit: number;
}

/** A single file match result from the host. */
export interface FileSearchResult {
  /** Relative path from the project root (forward-slash separated). */
  readonly path: string;
  /** Display label for the file (e.g. basename). */
  readonly label: string;
  /** Optional file type indicator. */
  readonly kind?: string;
}

/** Response from the host file-search RPC. */
export interface FileSearchResponse {
  readonly matches: readonly FileSearchResult[];
  /** True when the host has more results beyond the requested limit. */
  readonly hasMore: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 2. CAPABILITY STATE
// ───────────────────────────────────────────────────────────────────

/** Whether the host file-search capability is available. */
export type FileSearchCapability =
  | { readonly available: true }
  | { readonly available: false; readonly reason?: string };

// ───────────────────────────────────────────────────────────────────
// 3. DISABLED SOURCE (inert without host RPC)
// ───────────────────────────────────────────────────────────────────

/** The default file-search capability: disabled. */
export const FILE_SEARCH_DISABLED: FileSearchCapability = { available: false };

/**
 * Default file-search implementation when the host RPC is absent.
 * Returns empty results — no device FS walk, no local paths.
 */
export function searchHostFiles(request: FileSearchRequest): Promise<FileSearchResponse> {
  void request;
  return Promise.resolve({ matches: [], hasMore: false });
}

/**
 * Check whether the file-search capability is available.
 * Currently always returns false — the host RPC does not exist yet.
 */
export function isFileSearchAvailable(capability: FileSearchCapability): boolean {
  void capability;
  return false;
}