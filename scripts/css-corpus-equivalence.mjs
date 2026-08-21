#!/usr/bin/env node
// Independent corpus-equivalence proof for the app.css carve — the non-token completeness gate.
//
// token-identity proves custom-property IDENTITY but is blind to every rule that only USES tokens
// (layout, colour application, react-aria interaction state). build-app-css.mjs is complete-by-
// construction, but a gate must not trust the thing it checks. This re-derives from the FINAL files:
// it asserts that every (selector, @media, property) declaration in the pre-migration style.css is
// reproduced with an identical value by the union of app.css + every component scoped <style>.
// Exit 0 = every original declaration survives the split. Exit 2 = something was dropped or changed.

import { readFileSync, readdirSync } from 'node:fs';
import postcss from 'postcss';

const STYLE = 'app-mobile/src/style.css';
const APP = 'app-mobile/src/app.css';

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

// effective decl map (media||selector -> Map(prop->value)), later-declaration-wins.
function effectiveMap(css, label, into = new Map()) {
  const root = postcss.parse(css, { from: label });
  root.walkRules((rule) => {
    const media = mediaOf(rule);
    const decls = [];
    rule.walkDecls((d) => decls.push([d.prop.toLowerCase(), declValue(d)]));
    if (decls.length === 0) return;
    for (const rawSel of rule.selectors) {
      const key = `${media}||${normSelector(rawSel)}`;
      let props = into.get(key);
      if (!props) { props = new Map(); into.set(key, props); }
      for (const [p, v] of decls) props.set(p, v);
    }
  });
  return into;
}

function scopedBodies() {
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
  for (const f of files) {
    const text = readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const bodies = [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
    if (bodies.length === 0) continue;
    try { effectiveMap(bodies.join('\n'), f, map); } catch (e) { console.log(`skip ${f}: ${e.message}`); }
  }
  return map;
}

const orig = effectiveMap(readFileSync(STYLE, 'utf8'), STYLE);
const app = effectiveMap(readFileSync(APP, 'utf8'), APP);
const scoped = scopedBodies();

// present-in-union: app.css OR any scoped block carries (key, prop) with the exact value.
function present(key, prop, val) {
  return app.get(key)?.get(prop) === val || scoped.get(key)?.get(prop) === val;
}

const missing = [];
const changed = [];
let checked = 0;
for (const [key, props] of orig) {
  for (const [prop, val] of props) {
    checked += 1;
    if (present(key, prop, val)) continue;
    const [media, sel] = key.split('||');
    const where = media ? `${sel} @[${media}]` : sel;
    const appVal = app.get(key)?.get(prop);
    const scopedVal = scoped.get(key)?.get(prop);
    if (appVal === undefined && scopedVal === undefined) missing.push(`MISSING ${where} { ${prop}: ${val} }`);
    else changed.push(`CHANGED ${where} { ${prop} } original=${val} app=${appVal ?? '-'} scoped=${scopedVal ?? '-'}`);
  }
}

console.log(`css-corpus-equivalence: checked ${checked} declarations across ${orig.size} (selector,media) keys`);
console.log(`  union sources: app.css ${app.size} keys, scoped corpus ${scoped.size} keys`);
if (missing.length === 0 && changed.length === 0) {
  console.log('PASS: every style.css declaration is reproduced by app.css + scoped styles.');
  process.exit(0);
}
console.log(`FAIL: ${missing.length} missing, ${changed.length} changed`);
for (const m of missing.slice(0, 60)) console.log(`  ✗ ${m}`);
for (const c of changed.slice(0, 60)) console.log(`  ✗ ${c}`);
process.exit(2);
