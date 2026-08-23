// ───────────────────────────────────────────────────────────────────
// MODULE: Deterministic Host Command Ranking (pure)
// ───────────────────────────────────────────────────────────────────
// Local-only filtering over the relay-filtered catalog. Comparison text is
// normalized for case, diacritics, and Unicode without ever changing the
// canonical host string that is displayed or inserted. Exact tiers win over
// prefixes, prefixes over substrings, and host order breaks every tie.
// Nothing here performs transport, history, or edit-distance correction: a
// plausible typo simply matches nothing.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export interface GraphemeRange {
  /** Grapheme-cluster index into the canonical name, inclusive. */
  readonly start: number;
  /** Grapheme-cluster index into the canonical name, exclusive. */
  readonly end: number;
}

/** Ranking tiers in ascending precedence. */
export type HostCommandMatchTier =
  | 'host-order'
  | 'exact-name'
  | 'exact-alias'
  | 'name-prefix'
  | 'alias-prefix'
  | 'boundary-prefix'
  | 'substring'
  | 'subsequence'
  | 'description'
  | 'hint';

// ───────────────────────────────────────────────────────────────────
// 3. TIER CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TIER_ORDER: readonly HostCommandMatchTier[] = [
  'host-order',
  'exact-name',
  'exact-alias',
  'name-prefix',
  'alias-prefix',
  'boundary-prefix',
  'substring',
  'subsequence',
  'description',
  'hint',
];

const TIER_INDEX = new Map(TIER_ORDER.map((tier, index) => [tier, index]));

// ───────────────────────────────────────────────────────────────────
// 4. RANKED RESULT TYPES
// ───────────────────────────────────────────────────────────────────

export interface RankedHostCommand extends CommandDescriptorDto {
  /** The best tier this row matched, or host-order for an empty query. */
  readonly matchTier: HostCommandMatchTier;
  /** Matching grapheme ranges within the canonical name; empty when only
   * aliases, descriptions, or hints matched. */
  readonly matchRanges: readonly GraphemeRange[];
}

export interface RankedHostCommandList {
  readonly items: readonly RankedHostCommand[];
  /** The first enabled row, or the retained active row when still visible. */
  readonly activeName: string | null;
}

export interface RankHostCommandsOptions {
  /** Retain this canonical name as active when it remains visible. */
  readonly activeName?: string | null;
}

interface MatchCandidate {
  readonly tier: HostCommandMatchTier;
  readonly ranges: readonly GraphemeRange[];
  /** Total inter-match gap length for subsequence ties. */
  readonly gapPenalty: number;
}

// ───────────────────────────────────────────────────────────────────
// 5. NORMALIZATION HELPERS
// ───────────────────────────────────────────────────────────────────

/** Normalize comparison text: NFC, then diacritic-folded lowercase. */
export function normalizeCommandText(text: string): string {
  return text
    .normalize('NFC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Deterministic grapheme-cluster segmentation for display and matching. */
export function commandGraphemes(text: string): readonly string[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(text)].map((segment) => segment.segment);
  }
  return Array.from(text);
}

// ───────────────────────────────────────────────────────────────────
// 6. RANKING PIPELINE
// ───────────────────────────────────────────────────────────────────

export function rankHostCommands(
  commands: readonly CommandDescriptorDto[],
  query: string,
  options: RankHostCommandsOptions = {},
): RankedHostCommandList {
  const queryGraphemes = commandGraphemes(normalizeCommandText(query));
  const items = commands
    .map((command, hostIndex) => {
      const ranked = rankCommand(command, queryGraphemes);
      return ranked === null ? null : { item: ranked, hostIndex };
    })
    .filter((candidate): candidate is { item: RankedHostCommand; hostIndex: number } => candidate !== null)
    .sort((a, b) => compareRanked(a.item, b.item, a.hostIndex, b.hostIndex))
    .map((candidate) => candidate.item);
  return { items, activeName: chooseActiveName(items, options.activeName ?? null) };
}

function rankCommand(
  command: CommandDescriptorDto,
  queryGraphemes: readonly string[],
): RankedHostCommand | null {
  if (queryGraphemes.length === 0) {
    return { ...command, matchTier: 'host-order', matchRanges: [] };
  }
  const match = bestMatch(command, queryGraphemes);
  if (match === null) return null;
  return { ...command, matchTier: match.tier, matchRanges: match.ranges };
}

function bestMatch(
  command: CommandDescriptorDto,
  query: readonly string[],
): MatchCandidate | null {
  const name = commandGraphemes(command.name);
  const nameNorm = name.map(normalizeCommandText);
  const aliases = command.aliases ?? [];
  const aliasNorm = aliases.map((alias) => commandGraphemes(normalizeCommandText(alias)));
  const queryText = query.join('');

  if (nameNorm.join('') === queryText) {
    return { tier: 'exact-name', ranges: fullRange(name), gapPenalty: 0 };
  }
  for (const alias of aliasNorm) {
    if (alias.join('') === queryText) {
      return { tier: 'exact-alias', ranges: [], gapPenalty: 0 };
    }
  }
  if (isPrefix(nameNorm, query)) {
    return { tier: 'name-prefix', ranges: [{ start: 0, end: query.length }], gapPenalty: 0 };
  }
  for (const alias of aliasNorm) {
    if (isPrefix(alias, query)) return { tier: 'alias-prefix', ranges: [], gapPenalty: 0 };
  }
  const boundary = boundaryPrefix(nameNorm, query);
  if (boundary !== null) {
    return { tier: 'boundary-prefix', ranges: [boundary], gapPenalty: 0 };
  }
  const substring = contiguousSubstring(nameNorm, query, aliasNorm);
  if (substring !== null) return { tier: 'substring', ranges: substring, gapPenalty: 0 };
  const subsequence = orderedSubsequence(nameNorm, query);
  if (subsequence !== null) return { tier: 'subsequence', ranges: subsequence.ranges, gapPenalty: subsequence.gapPenalty };
  const description = command.description ?? '';
  if (containsNormalized(description, query)) {
    return { tier: 'description', ranges: [], gapPenalty: 0 };
  }
  const hint = command.argumentHint ?? null;
  if (hint !== null && containsNormalized(hint, query)) {
    return { tier: 'hint', ranges: [], gapPenalty: 0 };
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────
// 7. GRAPHEME MATCHING PRIMITIVES
// ───────────────────────────────────────────────────────────────────

function fullRange(graphemes: readonly string[]): readonly GraphemeRange[] {
  return graphemes.length === 0 ? [] : [{ start: 0, end: graphemes.length }];
}

function isPrefix(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length > haystack.length) return false;
  for (let index = 0; index < needle.length; index += 1) {
    if (haystack[index] !== needle[index]) return false;
  }
  return true;
}

/** Prefix match that starts directly after a `:`, `-`, or `_` boundary. */
function boundaryPrefix(
  haystack: readonly string[],
  needle: readonly string[],
): GraphemeRange | null {
  for (let boundary = 0; boundary < haystack.length - 1; boundary += 1) {
    const marker = haystack[boundary];
    if (marker !== ':' && marker !== '-' && marker !== '_') continue;
    const start = boundary + 1;
    if (start + needle.length <= haystack.length && isPrefix(haystack.slice(start), needle)) {
      return { start, end: start + needle.length };
    }
  }
  return null;
}

function contiguousSubstring(
  name: readonly string[],
  needle: readonly string[],
  aliases: readonly (readonly string[])[],
): readonly GraphemeRange[] | null {
  const nameRange = indexOfNormalized(name, needle);
  if (nameRange !== null) {
    return [{ start: nameRange, end: nameRange + needle.length }];
  }
  for (const alias of aliases) {
    if (indexOfNormalized(alias, needle) !== null) return [];
  }
  return null;
}

/** Ordered subsequence over the canonical name; gaps raise the penalty. */
function orderedSubsequence(
  name: readonly string[],
  needle: readonly string[],
): { readonly ranges: readonly GraphemeRange[]; readonly gapPenalty: number } | null {
  const matched: number[] = [];
  let cursor = 0;
  let gapPenalty = 0;
  for (const grapheme of needle) {
    let found = -1;
    for (let index = cursor; index < name.length; index += 1) {
      if (name[index] === grapheme) {
        found = index;
        break;
      }
    }
    if (found === -1) return null;
    const previous = matched.at(-1);
    if (previous !== undefined) gapPenalty += Math.max(0, found - previous - 1);
    matched.push(found);
    cursor = found + 1;
  }
  return { ranges: mergeRanges(matched), gapPenalty };
}

function mergeRanges(indexes: readonly number[]): readonly GraphemeRange[] {
  const ranges: GraphemeRange[] = [];
  for (const index of indexes) {
    const last = ranges.at(-1);
    if (last !== undefined && last.end === index) {
      ranges.splice(ranges.length - 1, 1, { start: last.start, end: index + 1 });
    } else {
      ranges.push({ start: index, end: index + 1 });
    }
  }
  return ranges;
}

function indexOfNormalized(haystack: readonly string[], needle: readonly string[]): number | null {
  if (needle.length === 0 || needle.length > haystack.length) return null;
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return start;
  }
  return null;
}

function containsNormalized(text: string, needle: readonly string[]): boolean {
  return indexOfNormalized(commandGraphemes(normalizeCommandText(text)), needle) !== null;
}

// ───────────────────────────────────────────────────────────────────
// 8. COMPARISON AND ACTIVE SELECTION
// ───────────────────────────────────────────────────────────────────

function compareRanked(
  a: RankedHostCommand,
  b: RankedHostCommand,
  aHostIndex: number,
  bHostIndex: number,
): number {
  const tierDelta = (TIER_INDEX.get(a.matchTier) ?? 0) - (TIER_INDEX.get(b.matchTier) ?? 0);
  if (tierDelta !== 0) return tierDelta;
  if (a.matchTier === 'subsequence' && b.matchTier === 'subsequence') {
    // Penalize gaps: a tighter subsequence outranks a scattered one.
    const gapDelta = subsequenceGap(a) - subsequenceGap(b);
    if (gapDelta !== 0) return gapDelta;
  }
  return aHostIndex - bHostIndex;
}

function subsequenceGap(item: RankedHostCommand): number {
  let gap = 0;
  for (let index = 1; index < item.matchRanges.length; index += 1) {
    const previous = item.matchRanges[index - 1];
    const current = item.matchRanges[index];
    if (previous === undefined || current === undefined) continue;
    gap += Math.max(0, current.start - previous.end - 1);
  }
  return gap;
}

function chooseActiveName(items: readonly RankedHostCommand[], retained: string | null): string | null {
  if (retained !== null && items.some((item) => item.name === retained && item.enabled)) {
    return retained;
  }
  return items.find((item) => item.enabled)?.name ?? null;
}
