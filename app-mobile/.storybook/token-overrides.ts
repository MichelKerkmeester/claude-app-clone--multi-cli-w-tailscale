// ───────────────────────────────────────────────────────────────────
// MODULE: TOKEN OVERRIDES
// ───────────────────────────────────────────────────────────────────
// Catalog-only plumbing that lets a designer retune the design system and
// watch every story move at once.
//
// An override is written as an inline custom property on the document
// element, which outranks every stylesheet rule including the per-theme
// blocks. That is deliberate: it makes a retune visible immediately, and it
// is also why an overridden token stops flipping between themes, which the
// playground says out loud rather than leaving to be discovered.
//
// Overrides persist per browser so a value set on the playground still
// applies after navigating to any other story. Nothing here reaches the app
// bundle and nothing writes a stylesheet — the playground hands back text to
// paste, so the token gate stays the one authority on what a token really is.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type TokenOverrides = Readonly<Record<string, string>>;

export interface TokenThemeValues {
  readonly light: string;
  readonly dark: string;
}

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pi-catalog-token-overrides';

/** Broadcast so an open playground re-reads after another surface clears them. */
export const TOKEN_OVERRIDES_EVENT = 'pi-catalog-token-overrides';

// ───────────────────────────────────────────────────────────────────
// 3. PERSISTENCE
// ───────────────────────────────────────────────────────────────────

// Storage is unavailable in a private window and throws rather than
// returning null, so every access is guarded and simply yields no overrides.
export function readOverrides(): TokenOverrides {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (name.startsWith('--') && typeof value === 'string') out[name] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeOverrides(overrides: TokenOverrides): void {
  try {
    if (Object.keys(overrides).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // A browser that refuses storage still gets a live retune for this page.
  }
  window.dispatchEvent(new CustomEvent(TOKEN_OVERRIDES_EVENT));
}

// ───────────────────────────────────────────────────────────────────
// 4. APPLY
// ───────────────────────────────────────────────────────────────────

/** Re-apply the stored set, dropping any inline property no longer overridden. */
export function applyOverrides(overrides: TokenOverrides = readOverrides()): void {
  const root = document.documentElement;
  for (const name of inlineTokenNames(root)) {
    if (!(name in overrides)) root.style.removeProperty(name);
  }
  for (const [name, value] of Object.entries(overrides)) {
    root.style.setProperty(name, value);
  }
}

function inlineTokenNames(root: HTMLElement): readonly string[] {
  const names: string[] = [];
  for (let index = 0; index < root.style.length; index += 1) {
    const name = root.style.item(index);
    if (name.startsWith('--')) names.push(name);
  }
  return names;
}

// ───────────────────────────────────────────────────────────────────
// 5. DISCOVERY
// ───────────────────────────────────────────────────────────────────

/**
 * Every custom property the stylesheets declare on :root, read from the CSSOM
 * rather than from a hand-kept list, so a token added tomorrow appears here
 * without anyone remembering to register it.
 */
export function discoverTokens(): readonly string[] {
  const names = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // A cross-origin sheet cannot be read; it holds no app tokens.
    }
    collectFrom(rules, names);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function collectFrom(rules: CSSRuleList, names: Set<string>): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      if (!rule.selectorText.includes(':root')) continue;
      for (const property of Array.from(rule.style)) {
        if (property.startsWith('--')) names.add(property);
      }
      continue;
    }
    const grouping = rule as CSSGroupingRule;
    if ('cssRules' in grouping) collectFrom(grouping.cssRules, names);
  }
}

// ───────────────────────────────────────────────────────────────────
// 6. THEME RESOLUTION
// ───────────────────────────────────────────────────────────────────

/**
 * The value each token resolves to per theme, read with overrides lifted so
 * the answer describes the stylesheet rather than the current retune. A token
 * whose light and dark values differ is one an override will pin flat, which
 * is the single most useful thing to know before changing it.
 */
export function themeValues(names: readonly string[]): ReadonlyMap<string, TokenThemeValues> {
  const root = document.documentElement;
  const previousTheme = root.getAttribute('data-theme');
  const lifted = inlineTokenNames(root).map((name) => [name, root.style.getPropertyValue(name)] as const);
  for (const [name] of lifted) root.style.removeProperty(name);

  const read = (theme: string): ReadonlyMap<string, string> => {
    root.setAttribute('data-theme', theme);
    const computed = getComputedStyle(root);
    const values = new Map<string, string>();
    for (const name of names) values.set(name, computed.getPropertyValue(name).trim());
    return values;
  };

  const light = read('light');
  const dark = read('dark');

  if (previousTheme === null) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', previousTheme);
  for (const [name, value] of lifted) root.style.setProperty(name, value);

  const out = new Map<string, TokenThemeValues>();
  for (const name of names) {
    out.set(name, { light: light.get(name) ?? '', dark: dark.get(name) ?? '' });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
// 7. EXPORT
// ───────────────────────────────────────────────────────────────────

/** The changed tokens as a paste-ready block; the gate still owns the goldens. */
export function toCssBlock(overrides: TokenOverrides): string {
  const names = Object.keys(overrides).sort((a, b) => a.localeCompare(b));
  if (names.length === 0) return '/* No token overrides set. */';
  const lines = names.map((name) => `  ${name}: ${overrides[name]};`);
  return [':root {', ...lines, '}'].join('\n');
}
