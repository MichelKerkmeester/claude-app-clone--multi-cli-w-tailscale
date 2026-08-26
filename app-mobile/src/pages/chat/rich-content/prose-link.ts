// ───────────────────────────────────────────────────────────────────
// MODULE: Prose Link Classification
// ───────────────────────────────────────────────────────────────────

// Relay-remote clients have no filesystem. http(s) URLs may open externally;
// a path-like token stays inert unless a host artifact reference is supplied.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type ProseLinkKind = 'external-url' | 'file-path' | 'unavailable';

export interface ClassifiedProseLink {
  readonly kind: ProseLinkKind;
  readonly destination: string;
  readonly openable: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 2. CLASSIFICATION
// ───────────────────────────────────────────────────────────────────

const SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/iu;
const WINDOWS_PATH_PATTERN = /^[A-Za-z]:[\\/]/u;
const FILE_PATH_PATTERN = /^(?:~\/|\.{0,2}\/|\/)/u;
const EXTENSION_PATTERN = /\.[A-Za-z0-9]{1,8}$/u;

// Keep a local URI or unsafe scheme from ever becoming an openable href.
function hasUnsafeOrLocalScheme(value: string): boolean {
  const match = SCHEME_PATTERN.exec(value);
  if (match === null) return false;
  const scheme = (match[1] ?? '').toLocaleLowerCase();
  return (
    scheme === 'file' ||
    scheme === 'blob' ||
    scheme === 'javascript' ||
    scheme === 'vbscript' ||
    scheme === 'data'
  );
}

export function isFilePathToken(value: string): boolean {
  const dest = value.trim();
  if (dest.length === 0) return false;
  if (/^https?:\/\//iu.test(dest)) return false;
  if (hasUnsafeOrLocalScheme(dest)) return true;
  if (WINDOWS_PATH_PATTERN.test(dest) || FILE_PATH_PATTERN.test(dest)) return true;
  if (dest.includes('/') || dest.includes('\\')) return true;
  return EXTENSION_PATTERN.test(dest);
}

export function classifyProseLink(destination: string): ClassifiedProseLink {
  const dest = destination.trim();
  if (dest.length === 0) {
    return { kind: 'unavailable', destination: dest, openable: false };
  }
  if (hasUnsafeOrLocalScheme(dest)) {
    return { kind: 'unavailable', destination: dest, openable: false };
  }
  if (/^https?:\/\//iu.test(dest)) {
    return { kind: 'external-url', destination: dest, openable: true };
  }
  if (isFilePathToken(dest)) {
    return { kind: 'file-path', destination: dest, openable: false };
  }
  return { kind: 'unavailable', destination: dest, openable: false };
}

// Host-supplied artifact ids are opaque; presence is the only authorized gate.
export function canRouteProsePathToArtifact(hostArtifactRef: string | null | undefined): boolean {
  return typeof hostArtifactRef === 'string' && hostArtifactRef.trim().length > 0;
}
