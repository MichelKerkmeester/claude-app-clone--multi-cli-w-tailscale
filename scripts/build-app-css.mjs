#!/usr/bin/env node
// app.css builder — carves the global foundation out of the pre-migration style.css.
//
// The SvelteKit cutover stops loading the 7,931-line style.css and loads a trimmed app.css instead,
// so each surface's CSS lives ONLY in its component's scoped <style> (cross-component leaks become
// structurally impossible). app.css must therefore hold exactly what is NOT already reproduced by a
// component: the token/@theme/@font-face/reset foundation, the guardrail media queries, and the
// shared/convention surfaces that no single component owns.
//
// SAFETY (complete-by-construction): a style.css selector is removed from app.css ONLY when the
// scoped-component corpus provably reproduces it — same (selector, @media) key AND every declaration
// this rule sets is present with an identical value in that component. Anything not proven covered
// stays. So `app.css ∪ (all scoped <style>)` reproduces every original rule; nothing can be dropped
// silently. token-identity (0/0/0) then proves custom-property identity across all three themes.
//
// Usage: node scripts/build-app-css.mjs [--out app-mobile/src/app.css] [--dry]

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import postcss from 'postcss';

const STYLE = 'app-mobile/src/style.css';
const args = process.argv.slice(2);
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'app-mobile/src/app.css';
const DRY = args.includes('--dry');

const stripGlobal = (sel) => sel.replace(/:global\(([^()]*)\)/g, '$1');
const normSelector = (sel) => stripGlobal(sel).replace(/\s+/g, ' ').trim();
const declValue = (d) => (d.important ? `${d.value.replace(/\s+/g, ' ').trim()} !important` : d.value.replace(/\s+/g, ' ').trim());

function mediaOf(rule) {
  const conditions = [];
  let parent = rule.parent;
  while (parent && parent.type === 'atrule') {
    conditions.unshift(`@${parent.name} ${parent.params}`.trim());
    parent = parent.parent;
  }
  return conditions.join(' && ');
}

// Effective declaration map of the whole scoped corpus, keyed `${media}||${normSelector}`.
function scopedCorpusMap() {
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.svelte')) files.push(p);
    }
  };
  walk('app-mobile/src/lib');
  walk('app-mobile/src/routes');
  const map = new Map();
  let componentsWithStyle = 0;
  const skipped = [];
  for (const f of files) {
    // Strip HTML comments first: a markup comment can literally mention `<style>`
    // (e.g. "the presentation lives in the scoped <style>"), which would make the
    // <style> regex capture markup through to the real </style>. CSS never contains
    // `<!--`, so this is safe.
    const text = readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const bodies = [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
    if (bodies.length === 0) continue;
    componentsWithStyle += 1;
    let root;
    try {
      root = postcss.parse(bodies.join('\n'), { from: f });
    } catch (e) {
      skipped.push(`${f}: ${e.message}`);
      continue;
    }
    root.walkRules((rule) => {
      const media = mediaOf(rule);
      const decls = [];
      rule.walkDecls((d) => decls.push([d.prop.toLowerCase(), declValue(d)]));
      if (decls.length === 0) return;
      for (const rawSel of rule.selectors) {
        const key = `${media}||${normSelector(rawSel)}`;
        let props = map.get(key);
        if (!props) { props = new Map(); map.set(key, props); }
        for (const [p, v] of decls) props.set(p, v); // later-wins
      }
    });
  }
  if (skipped.length > 0) {
    console.log(`WARNING: ${skipped.length} component <style> block(s) unparseable (their rules stay global in app.css):`);
    for (const s of skipped) console.log(`  · ${s}`);
  }
  return { map, componentsWithStyle, fileCount: files.length };
}

const { map: scoped, componentsWithStyle, fileCount } = scopedCorpusMap();

const root = postcss.parse(readFileSync(STYLE, 'utf8'), { from: STYLE });

// Build the ORIGINAL effective declaration map (per (selector,media), later-wins), so coverage is
// judged against the full cascade — not a single rule. A selector's rules are removed from app.css
// only when the scoped corpus reproduces its ENTIRE effective result. This removes both the base and
// the override rules of a fully-decomposed selector together, so no dead, order-sensitive leftover
// can survive to conflict with the component's scoped copy.
const origEffective = new Map();
root.walkRules((rule) => {
  const media = mediaOf(rule);
  const decls = [];
  rule.walkDecls((d) => decls.push([d.prop.toLowerCase(), declValue(d)]));
  if (decls.length === 0) return;
  for (const rawSel of rule.selectors) {
    const key = `${media}||${normSelector(rawSel)}`;
    let props = origEffective.get(key);
    if (!props) { props = new Map(); origEffective.set(key, props); }
    for (const [p, v] of decls) props.set(p, v);
  }
});

// A (selector,media) key is fully covered iff the scoped corpus reproduces every property of the
// original effective result with an identical value (superset — a component that dropped a property
// the original set is NOT covered, so app.css keeps it).
const coveredKey = new Map();
for (const [key, origProps] of origEffective) {
  const scopedProps = scoped.get(key);
  let covered = scopedProps !== undefined;
  if (covered) {
    for (const [prop, value] of origProps) {
      if (scopedProps.get(prop) !== value) { covered = false; break; }
    }
  }
  coveredKey.set(key, covered);
}
function selectorCovered(media, rawSel) {
  return coveredKey.get(`${media}||${normSelector(rawSel)}`) === true;
}
let removedRules = 0;
let trimmedRules = 0;
let keptRules = 0;
const removedSelectors = [];

root.walkRules((rule) => {
  const media = mediaOf(rule);
  const ruleDecls = [];
  rule.walkDecls((d) => ruleDecls.push([d.prop.toLowerCase(), declValue(d)]));
  if (ruleDecls.length === 0) { keptRules += 1; return; } // keep empty/structural rules untouched
  const kept = [];
  const dropped = [];
  for (const rawSel of rule.selectors) {
    if (selectorCovered(media, rawSel)) dropped.push(rawSel);
    else kept.push(rawSel);
  }
  if (kept.length === 0) {
    removedRules += 1;
    removedSelectors.push(...dropped.map((s) => `${normSelector(s)}${media ? '  @[' + media + ']' : ''}`));
    rule.remove();
  } else if (dropped.length > 0) {
    trimmedRules += 1;
    rule.selectors = kept;
  } else {
    keptRules += 1;
  }
});

// Drop now-empty @media/@supports shells left behind (no rules, only whitespace/comments would be odd
// to keep). Keep at-rules that still hold declarations or nested rules.
root.walkAtRules((at) => {
  if (!/^(media|supports)$/i.test(at.name)) return;
  const hasRule = at.nodes && at.nodes.some((n) => n.type === 'rule' || n.type === 'atrule' || n.type === 'decl');
  if (!hasRule) at.remove();
});

const out = root.toString();
const origLines = readFileSync(STYLE, 'utf8').split('\n').length;
const outLines = out.split('\n').length;
console.log(`scoped corpus: ${componentsWithStyle}/${fileCount} components with <style>, ${scoped.size} (selector,media) keys`);
console.log(`style.css rules — removed(all-selectors-covered): ${removedRules}, trimmed(some-selectors-covered): ${trimmedRules}, kept: ${keptRules}`);
console.log(`app.css: ${origLines} → ${outLines} lines`);
if (DRY) {
  console.log('\n--- first 40 removed selectors ---');
  console.log(removedSelectors.slice(0, 40).join('\n'));
} else {
  writeFileSync(OUT, out);
  console.log(`wrote ${OUT}`);
}
