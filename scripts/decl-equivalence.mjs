#!/usr/bin/env node
// Declaration-equivalence checker — the browser-free faithfulness oracle for CSS decomposition.
//
// WHY this exists: token-identity.mjs only resolves rules that DEFINE a custom property, so it is
// structurally blind to every rule that merely USES tokens — i.e. all base-chrome and all
// react-aria interaction rules. The plan's visual gate (CDP 390px) is deferred to L7. So when a
// surface's rules move out of the 7,931-line style.css into a component's scoped <style>, nothing
// currently proves the MOVE was faithful. This does: for a surface's owned selectors, it builds the
// effective declaration map (per selector, per @media context, later-declaration-wins) from the
// ORIGINAL style.css and from the component's scoped <style>, and asserts every scoped rule matches
// the original byte-for-value. It also reports which owned selectors are still only-in-original
// (not yet decomposed / deliberately left global).
//
// It correctly handles the @media property-level override trap: a narrow-width rule that sets a
// property the base rule never touches (e.g. `.rich-block-action { inline-size: 100% }` at <=20rem)
// is LIVE even when it appears before the base rule — "keep only @media after the base" is wrong.
// Each (selector, media) pair is compared independently, so such rules are never silently dropped.
//
// Usage:
//   node scripts/decl-equivalence.mjs <original.css> <component.svelte> --prefix <class-prefix> [--prefix ...]
//
// <original.css>    the pre-decomposition source of truth (style.css); its owned rules are the oracle.
// <component.svelte> the decomposed component; its <style> body carries the moved rules.
// --prefix          a class-name prefix identifying the surface's owned selectors (repeatable). A
//                   selector is owned if any of its class tokens starts with a prefix.
//
// Exit 0 = every scoped owned rule is declaration-faithful to the original. Exit 2 = a scoped rule
// diverges from, invents beyond, or drops a property relative to the original (a faithless move).

import { readFileSync } from 'node:fs';
import postcss from 'postcss';

// Read a CSS source. A .svelte file contributes only its <style> block bodies (the scoped CSS the
// migration moves each surface's rules into); anything else is read as raw CSS. Mirrors the
// convention in token-identity.mjs so the two gates read the component tree identically.
function readCssInput(file) {
  const text = readFileSync(file, 'utf8');
  if (!file.endsWith('.svelte')) return text;
  const bodies = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(text)) !== null) bodies.push(m[1]);
  return bodies.join('\n');
}

// Strip Svelte's :global(...) wrapping so a scoped selector normalizes to the same logical form as
// the original global one: `.tile:global([data-hovered])` -> `.tile[data-hovered]`, and
// `.actions :global(.action)` -> `.actions .action`. :global() does not nest parens in practice, so
// a non-greedy single-level unwrap is sufficient; a surviving `:global(` is flagged by the caller.
function stripGlobal(sel) {
  return sel.replace(/:global\(([^()]*)\)/g, '$1');
}

// Normalize a single selector for cross-source matching: unwrap :global(), collapse internal
// whitespace, and trim. Descendant combinators are preserved (whitespace collapsed to one space).
function normSelector(sel) {
  return stripGlobal(sel).replace(/\s+/g, ' ').trim();
}

// The class tokens in a selector, e.g. `.a.b[data-x] .c` -> ['a','b','c'].
function classTokens(sel) {
  return [...sel.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
}

function ownedBy(sel, prefixes) {
  const tokens = classTokens(sel);
  return tokens.some((t) => prefixes.some((p) => t === p || t.startsWith(p)));
}

// Normalize a declaration value: collapse whitespace, trim. Values stay case-sensitive (var() names
// and some values are). !important is folded into the compared value.
function declValue(decl) {
  const v = decl.value.replace(/\s+/g, ' ').trim();
  return decl.important ? `${v} !important` : v;
}

// Walk a stylesheet and, for every owned individual selector, emit an entry carrying its @media
// context, the normalized selector, and its ordered declarations. Grouped selectors are split so
// each owned member is scored on its own; non-owned members of a group are ignored.
function collectEntries(css, prefixes, label) {
  const root = postcss.parse(css, { from: label });
  const entries = [];
  let sawGlobalLeak = false;
  root.walkRules((rule) => {
    // Media context = the concatenated params of ancestor at-rules (media / supports). Base = ''.
    const conditions = [];
    let parent = rule.parent;
    while (parent && parent.type === 'atrule') {
      conditions.unshift(`@${parent.name} ${parent.params}`.trim());
      parent = parent.parent;
    }
    const media = conditions.join(' && ');
    const decls = [];
    rule.walkDecls((d) => decls.push({ prop: d.prop.toLowerCase(), value: declValue(d) }));
    if (decls.length === 0) return;
    for (const rawSel of rule.selectors) {
      const sel = normSelector(rawSel);
      if (sel.includes(':global(')) sawGlobalLeak = true;
      if (!ownedBy(sel, prefixes)) continue;
      entries.push({ media, sel, decls });
    }
  });
  return { entries, sawGlobalLeak };
}

// Build effective declaration maps keyed by `${media}||${selector}`; within a key, later
// declarations override earlier ones for the same property (source-order cascade for equal
// specificity — the same rule applies in both sources, so per-(selector,media) merge is the right
// granularity for proving the move faithful).
function effectiveMap(entries) {
  const map = new Map();
  for (const { media, sel, decls } of entries) {
    const key = `${media}||${sel}`;
    let props = map.get(key);
    if (props === undefined) {
      props = new Map();
      map.set(key, props);
    }
    for (const { prop, value } of decls) props.set(prop, value);
  }
  return map;
}

function main() {
  const args = process.argv.slice(2);
  const prefixes = [];
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--prefix') {
      prefixes.push(args[i + 1]);
      i += 1;
    } else {
      positional.push(args[i]);
    }
  }
  const [originalFile, componentFile] = positional;
  if (!originalFile || !componentFile || prefixes.length === 0) {
    console.error(
      'usage: node scripts/decl-equivalence.mjs <original.css> <component.svelte> --prefix <class-prefix> [--prefix ...]',
    );
    process.exit(2);
  }

  const orig = collectEntries(readCssInput(originalFile), prefixes, originalFile);
  const scoped = collectEntries(readCssInput(componentFile), prefixes, componentFile);
  const origMap = effectiveMap(orig.entries);
  const scopedMap = effectiveMap(scoped.entries);

  console.log(`decl-equivalence: ${componentFile}`);
  console.log(`  prefixes: ${prefixes.join(', ')}`);
  console.log(`  owned rules — original: ${origMap.size} selectors, scoped: ${scopedMap.size} selectors`);

  const problems = [];
  // Every scoped owned rule must match the original exactly (no diverging value, no invented rule,
  // no property the original lacks). This is the faithfulness gate.
  for (const [key, scopedProps] of scopedMap) {
    const [media, sel] = key.split('||');
    const where = media ? `${sel}  @[${media}]` : sel;
    const origProps = origMap.get(key);
    if (origProps === undefined) {
      problems.push(`EXTRA (scoped rule not in original): ${where}`);
      continue;
    }
    for (const [prop, val] of scopedProps) {
      if (!origProps.has(prop)) {
        problems.push(`EXTRA PROP: ${where} { ${prop}: ${val} } — absent in original`);
      } else if (origProps.get(prop) !== val) {
        problems.push(`CHANGED: ${where} { ${prop} } scoped=${val} vs original=${origProps.get(prop)}`);
      }
    }
    for (const [prop, val] of origProps) {
      if (!scopedProps.has(prop)) {
        problems.push(`DROPPED PROP: ${where} { ${prop}: ${val} } — present in original, missing in scoped`);
      }
    }
  }

  // Informational: owned selectors still only in the original (not yet decomposed / left global).
  const notMoved = [];
  for (const key of origMap.keys()) {
    if (!scopedMap.has(key)) {
      const [media, sel] = key.split('||');
      notMoved.push(media ? `${sel}  @[${media}]` : sel);
    }
  }

  if (scoped.sawGlobalLeak) {
    problems.push('NESTED :global() not fully unwrapped — extend stripGlobal for this selector');
  }

  if (notMoved.length > 0) {
    console.log(`  still global in original (not in scoped): ${notMoved.length}`);
    for (const s of notMoved) console.log(`    · ${s}`);
  }

  if (problems.length === 0) {
    console.log(`PASS: every scoped owned rule is declaration-faithful to the original`);
    process.exit(0);
  }
  console.log(`FAIL: ${problems.length} problem(s)`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exit(2);
}

main();
