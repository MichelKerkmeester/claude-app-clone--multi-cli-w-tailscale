// ───────────────────────────────────────────────────────────────────
// MODULE: Prose Link Classification
// ───────────────────────────────────────────────────────────────────

// Relay-remote clients have no filesystem. http(s) and mailto may open in the
// in-app overlay; a path-like token stays inert unless a host artifact
// reference is supplied. Unknown schemes are rejected, never allowed by omission.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type ProseLinkKind = 'external-url' | 'file-path' | 'unavailable';
export type HrefSchemeVerdict = 'open-external' | 'inert' | 'rejected';

export interface ClassifiedProseLink {
  readonly kind: ProseLinkKind;
  readonly destination: string;
  readonly openable: boolean;
}

export type FilePathSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'file-path'; readonly text: string };

export interface FilePathTokenOptions {
  readonly allowBareName?: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):/iu;
const WINDOWS_PATH_PATTERN = /^[A-Za-z]:[\\/]/u;
const PROTOCOL_RELATIVE_PATTERN = /^\/\//u;
const LINE_COLUMN_SUFFIX_PATTERN = /:([1-9]\d*)(?::([1-9]\d*))?$/u;
const MID_TOKEN_AT_PATTERN = /[^\\/]@/u;
const MAX_DETECTION_LENGTH = 2000;

// Explicit extensions keep "etc." / "e.g." and domain-ish tokens from becoming
// paths. A URL is never classified as a path even when it ends in one of these.
const FILE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'jsonc',
  'css',
  'scss',
  'sass',
  'less',
  'html',
  'htm',
  'md',
  'mdx',
  'markdown',
  'txt',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'kts',
  'swift',
  'c',
  'h',
  'cc',
  'cpp',
  'hpp',
  'cs',
  'php',
  'sh',
  'bash',
  'zsh',
  'fish',
  'yml',
  'yaml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'env',
  'lock',
  'sql',
  'graphql',
  'gql',
  'proto',
  'xml',
  'svg',
  'vue',
  'svelte',
  'astro',
  'dart',
  'ex',
  'exs',
  'erl',
  'lua',
  'pl',
  'r',
  'scala',
  'clj',
  'gradle',
  'dockerfile',
  'gitignore',
  'npmrc',
]);

const OPEN_EXTERNAL_SCHEMES = new Set(['http', 'https', 'mailto']);
const INERT_SCHEMES = new Set(['file']);

const CANDIDATE_PATTERN =
  /(?:(?:[A-Za-z]:[\\/]|\\\\|[\\/]|\.{1,2}[\\/])(?:[\w.@~+-]+[\\/])*|(?:[\w.@~+-]+[\\/])+)[\w.@+-]+\.[A-Za-z0-9]+(?::[1-9]\d*(?::[1-9]\d*)?(?![\w@%]))?/gu;

// ───────────────────────────────────────────────────────────────────
// 3. SCHEME GATE
// ───────────────────────────────────────────────────────────────────

// One fail-closed verdict used by href classification and Markdown destination
// checks. http/https/mailto may open; file and schemeless paths stay inert;
// javascript, tel, data, and every unknown scheme are rejected.
export function classifyHrefScheme(value: string): HrefSchemeVerdict {
  const dest = value.trim();
  if (dest.length === 0) return 'rejected';
  if (PROTOCOL_RELATIVE_PATTERN.test(dest)) return 'rejected';
  if (WINDOWS_PATH_PATTERN.test(dest)) return 'inert';
  const match = SCHEME_PATTERN.exec(dest);
  if (match === null) return 'inert';
  const scheme = (match[1] ?? '').toLocaleLowerCase();
  const rest = dest.slice((match[0] ?? '').length);
  // `app.ts:42` matches scheme syntax because "." is legal in a scheme name.
  // A trailing all-digit citation is a file path, not a URI, unless "://" follows.
  if (scheme.includes('.') && !rest.startsWith('//') && LINE_COLUMN_SUFFIX_PATTERN.test(dest)) {
    return 'inert';
  }
  if (OPEN_EXTERNAL_SCHEMES.has(scheme)) return 'open-external';
  if (INERT_SCHEMES.has(scheme)) return 'inert';
  return 'rejected';
}

// ───────────────────────────────────────────────────────────────────
// 4. FILE PATH DETECTION
// ───────────────────────────────────────────────────────────────────

function stripLineColumnSuffix(pathText: string): string {
  const drive = WINDOWS_PATH_PATTERN.test(pathText) ? pathText.slice(0, 2) : '';
  const rest = drive.length > 0 ? pathText.slice(2) : pathText;
  const suffix = LINE_COLUMN_SUFFIX_PATTERN.exec(rest);
  if (suffix === null) return pathText;
  const before = rest.slice(0, suffix.index);
  return `${drive}${before}`;
}

function extensionOf(pathText: string): string | null {
  const candidate = stripLineColumnSuffix(pathText);
  const lastSeparator = Math.max(candidate.lastIndexOf('/'), candidate.lastIndexOf('\\'));
  const lastSegment = lastSeparator >= 0 ? candidate.slice(lastSeparator + 1) : candidate;
  const dot = lastSegment.lastIndexOf('.');
  if (dot <= 0) return null;
  const ext = lastSegment.slice(dot + 1).toLocaleLowerCase();
  if (ext.length === 0 || /^\d+$/u.test(ext)) return null;
  return ext;
}

function hasPathSeparator(pathText: string): boolean {
  return pathText.includes('/') || pathText.includes('\\');
}

function isUrlShaped(value: string): boolean {
  const dest = value.trim();
  if (dest.includes('://') || PROTOCOL_RELATIVE_PATTERN.test(dest)) return true;
  return classifyHrefScheme(dest) === 'open-external';
}

function isWhitelistedPath(pathText: string, requireSeparator: boolean): boolean {
  const dest = pathText.trim();
  if (dest.length === 0) return false;
  if (isUrlShaped(dest) || classifyHrefScheme(dest) === 'rejected') return false;
  if (MID_TOKEN_AT_PATTERN.test(dest)) return false;
  const pathOnly = stripLineColumnSuffix(dest);
  if (requireSeparator && !hasPathSeparator(pathOnly)) return false;
  if (!requireSeparator && hasPathSeparator(pathOnly)) return false;
  const ext = extensionOf(dest);
  return ext !== null && FILE_EXTENSIONS.has(ext);
}

export function isFilePathToken(value: string, options?: FilePathTokenOptions): boolean {
  const dest = value.trim();
  if (dest.length === 0) return false;
  if (isWhitelistedPath(dest, true)) return true;
  if (options?.allowBareName === true && isWhitelistedPath(dest, false)) return true;
  return false;
}

export function detectFilePathSegments(text: string): readonly FilePathSegment[] {
  if (text.length === 0) return [];
  if (text.length > MAX_DETECTION_LENGTH || !text.includes('.')) {
    return [{ kind: 'text', text }];
  }
  const segments: FilePathSegment[] = [];
  let lastIndex = 0;
  CANDIDATE_PATTERN.lastIndex = 0;
  let match = CANDIDATE_PATTERN.exec(text);
  while (match !== null) {
    const candidate = match[0];
    const prev = match.index > 0 ? (text[match.index - 1] ?? '') : '';
    const skip =
      prev === ':' ||
      prev === '/' ||
      prev === '\\' ||
      /[\w.@]/u.test(prev) ||
      !isWhitelistedPath(candidate, true);
    if (!skip) {
      if (match.index > lastIndex) {
        segments.push({ kind: 'text', text: text.slice(lastIndex, match.index) });
      }
      segments.push({ kind: 'file-path', text: candidate });
      lastIndex = match.index + candidate.length;
    }
    match = CANDIDATE_PATTERN.exec(text);
  }
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', text: text.slice(lastIndex) });
  }
  if (segments.length === 0) return [{ kind: 'text', text }];
  return segments;
}

export function classifyProseLink(destination: string): ClassifiedProseLink {
  const dest = destination.trim();
  if (dest.length === 0) {
    return { kind: 'unavailable', destination: dest, openable: false };
  }
  const verdict = classifyHrefScheme(dest);
  if (verdict === 'rejected') {
    return { kind: 'unavailable', destination: dest, openable: false };
  }
  if (verdict === 'open-external') {
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
