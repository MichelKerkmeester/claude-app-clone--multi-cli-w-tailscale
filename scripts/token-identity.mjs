#!/usr/bin/env node
// Token-identity resolver — the browser-free acceptance oracle for the SvelteKit migration.
//
// WHY browser-free: the app ships a strict CSP (style-src 'self', no unsafe-inline), so headless
// Chrome renders it unstyled — screenshots prove nothing about colour. Instead we resolve the
// stylesheet text directly: every CSS custom property to its final literal, per theme state.
//
// The migration moves each surface's rules out of one 7,931-line style.css into per-component
// scoped <style> blocks. "Nothing changed" means: resolve every token in all 3 theme states from
// the post-migration corpus (all scoped <style> + app.css) and diff against the snapshot this
// script captures from the pre-migration style.css → CHANGED/VANISHED/ADDED must all be 0.
//
// Usage:
//   node scripts/token-identity.mjs snapshot <input.css...> --out <baseline.json>   capture a baseline
//   node scripts/token-identity.mjs diff <baseline.json> <input.css...>             diff corpus vs baseline
//   node scripts/token-identity.mjs verify <input.css...>                           self-check vs tokens.md goldens
//
// Multiple input files are concatenated (corpus mode). Exit 0 = ok / 0 diffs; exit 2 = diffs or failure.

import { readFileSync, writeFileSync } from 'node:fs';

// ---- The three theme states, keyed by the root selector that carries their token remap. ----
// light  = the base :root block.
// dark   = :root base then :root[data-theme='dark'] overrides.
// system = :root base then the @media(prefers-color-scheme:dark) :root[data-theme='system'] overrides.
const THEMES = ['light', 'dark', 'system'];

// Normalized global-root selectors (whitespace-collapsed, quotes normalized to single).
const ROOT_LIGHT = ':root';
const ROOT_DARK = ":root[data-theme='dark']";
const ROOT_SYSTEM = ":root[data-theme='system']";

// -------------------------------------------------------------------------------------------------
// CSS parsing: strip comments, then walk a flat rule list honoring one level of @media nesting.
// Every rule contributes its custom-property (--x: y) declarations, tagged with:
//   - selector: normalized selector text
//   - media:    the @media prelude if the rule sits inside one, else null
// -------------------------------------------------------------------------------------------------

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function normalizeSelector(sel) {
  return sel.replace(/\s+/g, ' ').replace(/"/g, "'").trim();
}

// Returns [{ selector, media, decls: [{prop, value}] }, ...] for rules that declare >=1 custom prop.
function parseRules(css) {
  const src = stripComments(css);
  const rules = [];
  let i = 0;
  const n = src.length;

  function parseBlockBody(body, media) {
    // body is the inside of a `selector { ... }` — collect only custom-property declarations.
    const decls = [];
    // Split on ';' at top level (no nested blocks inside a normal rule body here).
    for (const raw of body.split(';')) {
      const seg = raw.trim();
      if (!seg.startsWith('--')) continue;
      const idx = seg.indexOf(':');
      if (idx === -1) continue;
      const prop = seg.slice(0, idx).trim();
      const value = seg.slice(idx + 1).trim();
      if (prop && value) decls.push({ prop, value });
    }
    return decls;
  }

  // Walk the top level, matching `prelude { body }`, descending one level into @media.
  function walk(text, media) {
    let p = 0;
    const len = text.length;
    while (p < len) {
      const brace = text.indexOf('{', p);
      if (brace === -1) break;
      const prelude = text.slice(p, brace).trim();
      // Find the matching close brace for this block.
      let depth = 1;
      let q = brace + 1;
      while (q < len && depth > 0) {
        if (text[q] === '{') depth++;
        else if (text[q] === '}') depth--;
        if (depth === 0) break;
        q++;
      }
      const body = text.slice(brace + 1, q);
      p = q + 1;

      if (/^@media\b/i.test(prelude)) {
        // Descend one level; nested rules carry this media prelude.
        walk(body, normalizeSelector(prelude));
      } else if (/^@/.test(prelude)) {
        // @theme and other at-rules with a plain body of declarations.
        const decls = parseBlockBody(body, media);
        if (decls.length) rules.push({ selector: normalizeSelector(prelude), media, decls });
      } else {
        const decls = parseBlockBody(body, media);
        if (decls.length) rules.push({ selector: normalizeSelector(prelude), media, decls });
      }
    }
  }

  walk(src, null);
  return rules;
}

// -------------------------------------------------------------------------------------------------
// Build, per theme, the effective declaration map keyed by "context::prop", where context is the
// element scope a token is declared on (global root selectors collapse to "" = document scope).
// Later declarations win (source order), matching CSS cascade for equal specificity within a theme.
// -------------------------------------------------------------------------------------------------

function isGlobalRoot(sel) {
  return sel === ROOT_LIGHT || sel === ROOT_DARK || sel === ROOT_SYSTEM || sel === '@theme';
}

// Which themes does a rule contribute to, and what element-context key does it live at?
function classify(rule) {
  const { selector, media } = rule;
  const systemMedia = media && /prefers-color-scheme:\s*dark/i.test(media);

  // Global document-scope tokens.
  if (selector === '@theme') return { context: '', themes: THEMES };          // theme-invariant
  if (selector === ROOT_LIGHT && !media) return { context: '', themes: THEMES }; // base, all themes
  if (selector === ROOT_DARK && !media) return { context: '', themes: ['dark'] };
  if (selector === ROOT_SYSTEM && systemMedia) return { context: '', themes: ['system'] };

  // Component / surface scope. Strip a leading themed root prefix to get the base element context.
  let context = selector;
  let themes = THEMES;
  const darkPrefix = new RegExp(`^${escapeRe(ROOT_DARK)}\\s+`);
  const systemPrefix = new RegExp(`^${escapeRe(ROOT_SYSTEM)}\\s+`);
  if (darkPrefix.test(selector)) {
    context = selector.replace(darkPrefix, '');
    themes = ['dark'];
  } else if (systemPrefix.test(selector) && systemMedia) {
    context = selector.replace(systemPrefix, '');
    themes = ['system'];
  } else if (systemMedia) {
    // A component rule inside the system media block without the [data-theme='system'] prefix.
    themes = ['system'];
  }
  return { context, themes };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build raw (unresolved) declaration maps per theme: Map<"context::prop", rawValue>.
function buildRawMaps(rules) {
  const maps = { light: new Map(), dark: new Map(), system: new Map() };
  for (const rule of rules) {
    const { context, themes } = classify(rule);
    for (const { prop, value } of rule.decls) {
      const key = `${context}::${prop}`;
      for (const t of themes) maps[t].set(key, value);
    }
  }
  return maps;
}

// -------------------------------------------------------------------------------------------------
// Resolve var() chains. A value may reference custom properties by name; resolve against the same
// theme's map. Document-scope tokens (context "") are the fallback lookup for any element context.
// -------------------------------------------------------------------------------------------------

function resolveValue(rawValue, context, themeMap, seen) {
  // Replace every var(--name[, fallback]) with the resolved name, recursively.
  return rawValue.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (_m, name, fallback) => {
    // Look up the referenced property: prefer the same element context, then document scope.
    const local = `${context}::${name}`;
    const global = `::${name}`;
    let ref = themeMap.has(local) ? themeMap.get(local) : themeMap.has(global) ? themeMap.get(global) : undefined;
    if (ref === undefined) {
      // Unresolved reference: use the fallback if present, else mark it.
      return fallback !== undefined ? resolveValue(fallback.trim(), context, themeMap, seen) : `UNRESOLVED(${name})`;
    }
    const cycleKey = themeMap.has(local) ? local : global;
    if (seen.has(cycleKey)) return `CYCLE(${name})`;
    const nextSeen = new Set(seen);
    nextSeen.add(cycleKey);
    return resolveValue(ref, context, themeMap, nextSeen);
  });
}

function resolveTheme(rawMap) {
  const resolved = {};
  for (const [key, raw] of rawMap) {
    const sep = key.indexOf('::');
    const context = key.slice(0, sep);
    const value = resolveValue(raw, context, rawMap, new Set([key])).replace(/\s+/g, ' ').trim();
    resolved[key] = value;
  }
  return resolved;
}

// -------------------------------------------------------------------------------------------------
// Snapshot / diff / verify entry points.
// -------------------------------------------------------------------------------------------------

function resolveAll(cssFiles) {
  const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
  const rules = parseRules(css);
  const raw = buildRawMaps(rules);
  const out = {};
  for (const t of THEMES) out[t] = resolveTheme(raw[t]);
  return out;
}

function snapshot(cssFiles, outPath) {
  const resolved = resolveAll(cssFiles);
  const counts = Object.fromEntries(THEMES.map((t) => [t, Object.keys(resolved[t]).length]));
  const unresolved = [];
  for (const t of THEMES) {
    for (const [k, v] of Object.entries(resolved[t])) {
      if (/UNRESOLVED\(|CYCLE\(/.test(v)) unresolved.push(`${t} ${k} = ${v}`);
    }
  }
  const payload = {
    kind: 'token-identity-baseline',
    sources: cssFiles,
    themes: THEMES,
    counts,
    resolved,
  };
  if (outPath) writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  return { payload, counts, unresolved };
}

function diff(baselinePath, cssFiles) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const now = resolveAll(cssFiles);
  const report = {};
  let total = 0;
  for (const t of THEMES) {
    const before = baseline.resolved[t] || {};
    const after = now[t] || {};
    const changed = [];
    const vanished = [];
    const added = [];
    for (const k of Object.keys(before)) {
      if (!(k in after)) vanished.push({ key: k, was: before[k] });
      else if (after[k] !== before[k]) changed.push({ key: k, was: before[k], now: after[k] });
    }
    for (const k of Object.keys(after)) {
      if (!(k in before)) added.push({ key: k, now: after[k] });
    }
    report[t] = { CHANGED: changed.length, VANISHED: vanished.length, ADDED: added.length, changed, vanished, added };
    total += changed.length + vanished.length + added.length;
  }
  return { report, total };
}

// tokens.md golden cross-check — a hand-verified subset of resolved global roles per theme.
const GOLDENS = {
  light: {
    '::--canvas': '#f8f8f6', '::--surface': '#ffffff', '::--ink': '#24221f', '::--ink-muted': '#6c6a65',
    '::--accent': '#d97757', '::--accent-strong': '#b85f42', '::--accent-ink': '#8a452f',
    '::--accent-soft': '#f3e4de', '::--focus': '#121212', '::--action-bg': '#24221f', '::--action-fg': '#f8f8f6',
    '::--success': '#37624a', '::--danger': '#8d382e', '::--surface-code': '#24221f',
  },
  dark: {
    '::--canvas': '#24221f', '::--surface': '#2d2a26', '::--ink': '#f8f8f6', '::--ink-muted': '#9f998f',
    '::--accent': '#d97757', '::--accent-strong': '#b85f42', '::--accent-ink': '#f0b19a',
    '::--accent-soft': '#3a2720', '::--focus': '#f8f8f6', '::--action-bg': '#f8f8f6', '::--action-fg': '#24221f',
    '::--success': '#8fc4a4', '::--danger': '#ee9b91', '::--surface-code': '#24221f',
  },
  system: {
    '::--canvas': '#24221f', '::--surface': '#2d2a26', '::--ink': '#f8f8f6', '::--ink-muted': '#9f998f',
    '::--accent-strong': '#b85f42', '::--accent-ink': '#f0b19a', '::--focus': '#f8f8f6',
  },
};

function verify(cssFiles) {
  const resolved = resolveAll(cssFiles);
  const failures = [];
  for (const t of THEMES) {
    for (const [k, want] of Object.entries(GOLDENS[t] || {})) {
      const got = resolved[t][k];
      if (got !== want) failures.push(`${t} ${k}: want ${want}, got ${got ?? '(missing)'}`);
    }
  }
  return failures;
}

// -------------------------------------------------------------------------------------------------
// CLI
// -------------------------------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const rest = argv.slice(1);

  if (cmd === 'snapshot') {
    const outIdx = rest.indexOf('--out');
    const outPath = outIdx !== -1 ? rest[outIdx + 1] : null;
    const files = rest.filter((a, i) => a !== '--out' && rest[i - 1] !== '--out');
    const { counts, unresolved } = snapshot(files, outPath);
    console.log('token-identity snapshot');
    console.log('  sources:', files.join(', '));
    console.log('  counts :', JSON.stringify(counts));
    if (unresolved.length) {
      console.log(`  UNRESOLVED (${unresolved.length}):`);
      for (const u of unresolved.slice(0, 40)) console.log('   -', u);
    } else {
      console.log('  unresolved: 0 (every var() chain reached a literal)');
    }
    if (outPath) console.log('  written:', outPath);
    process.exit(unresolved.length ? 2 : 0);
  }

  if (cmd === 'diff') {
    const baselinePath = rest[0];
    const files = rest.slice(1);
    const { report, total } = diff(baselinePath, files);
    console.log('token-identity diff vs', baselinePath);
    for (const t of THEMES) {
      const r = report[t];
      console.log(`  ${t}: CHANGED ${r.CHANGED} / VANISHED ${r.VANISHED} / ADDED ${r.ADDED}`);
      for (const c of r.changed.slice(0, 20)) console.log(`     ~ ${c.key}: ${c.was} -> ${c.now}`);
      for (const v of r.vanished.slice(0, 20)) console.log(`     - ${v.key}: ${v.was}`);
      for (const a of r.added.slice(0, 20)) console.log(`     + ${a.key}: ${a.now}`);
    }
    console.log(total === 0 ? 'PASS: 0 diffs' : `FAIL: ${total} diffs`);
    process.exit(total === 0 ? 0 : 2);
  }

  if (cmd === 'verify') {
    const failures = verify(rest);
    if (failures.length) {
      console.log(`verify FAIL (${failures.length} golden mismatches):`);
      for (const f of failures) console.log('   -', f);
      process.exit(2);
    }
    console.log(`verify PASS: all ${Object.values(GOLDENS).reduce((n, g) => n + Object.keys(g).length, 0)} tokens.md goldens matched across light/dark/system`);
    process.exit(0);
  }

  console.error('usage: token-identity.mjs <snapshot|diff|verify> ...');
  process.exit(1);
}

main();
