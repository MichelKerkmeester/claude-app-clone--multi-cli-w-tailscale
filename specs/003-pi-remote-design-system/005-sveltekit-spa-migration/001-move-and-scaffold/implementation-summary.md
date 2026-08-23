---
title: "Child 001 implementation summary — folder move and SvelteKit scaffold"
description: "What landed at L0, the two places reality diverged from the spec, and why the decisions made here are still binding on every later child."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/001-move-and-scaffold"
    last_updated_at: "2026-08-23T09:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 001 implementation summary

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

**The workspace relocation.** Both workspaces moved with `git mv`, each staying exactly two levels
from the root so the shared tsconfig extends keep resolving, and keeping their `@pi-remote/*` package
names so roughly 160 cross-package imports needed no edit at all. Only filesystem-path literals
changed — the workspaces array, the vitest configs, the eslint globs, four release and drill scripts,
and the web tests that `readFileSync` a source path.

**The SvelteKit skeleton.** `adapter-static` emitting `dist/` with an `index.html` fallback;
`kit.csp` in hash mode carrying the frozen directives; `ssr` and `prerender` both off in
`+layout.ts`; `vite.config.ts` ported nearly verbatim with the relay proxy, `.ts.net` preview hosts,
ES worker format and `pdfjs-dist` exclusion intact; `public/` renamed to `static/`; and `app.css` as
a byte-for-byte move of the foundation region.

**The baseline.** Every token resolved in all three theme states from the pre-migration `style.css`.
This snapshot became the correctness oracle for the entire program.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Entirely by Claude, sequentially, with no dispatch. This is infrastructure and config rather than
application logic, and it has the largest blast radius in the program — getting it wrong breaks every
downstream unit — so it was never a candidate for delegation.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

**The move happens while the app is still React.** That is the entire sequencing argument. A suite
that knows nothing about SvelteKit cannot be fooled by SvelteKit, so running the existing React tests
on both sides of an atomic restructure-only commit is a far stronger proof than any check written
after the fact. No `.svelte` file existed until that was green.

**`dist/`, not `build/`.** `adapter-static` was pointed at the directory `release/threshold-gate.mjs`
and `vite preview` already expected. Keeping the output path meant the release tooling and the relay
needed no changes at all — the alternative would have rippled into deployment for no benefit.

**CSP moves into `kit.csp` hash mode rather than being loosened.** The SPA fallback injects an inline
bootstrap script that `script-src 'self'` would block. Hash mode lets SvelteKit hash its own
bootstrap, so the frozen directives survive intact. Relaxing the policy to accommodate the framework
would have traded a security invariant for convenience.

**Every dependency is installed once, here.** That is what makes it possible to ban `npm install` and
`package.json` edits from every later parallel dispatch, which in turn is what makes parallel
dispatch safe on a single worktree.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|---|---|
| `npm run build` post-move, still React | 0 |
| `npm run typecheck` post-move | 0 |
| `npm test` post-move | 0 |
| `npm run test:web` post-move | 0 |
| `node scripts/design-system-cdp.mjs` post-move | pass |
| `svelte-check` + `vite build` post-scaffold | 0, empty page |
| Surviving `apps/pi-remote-` literals | 0 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

**The final workspace names differ from the spec.** They are `app-mobile/` and `app-relay/` at the
repository root, not `src/mobile-app` and `src/relay`. The property that made the plan safe — both
staying exactly two levels deep, so the shared tsconfig extends keep resolving — holds either way, so
this is a naming change rather than a structural one. It is recorded here rather than retrofitted
into the spec.

**The service-worker shell was solved differently than planned.** The spec called the
`/assets/` → `/_app/immutable/` rewrite "the one real PWA break". What shipped sidesteps it: the
precache shell was reduced to the navigational entries — `/`, `/index.html`,
`/manifest.webmanifest`, `/icon.svg` — and hashed build assets are left to the runtime fetch
strategy, with `CACHE_NAME` bumped to `pi-remote-shell-v6`. Precaching hashed filenames would have
required regenerating the shell list on every build; not precaching them removes the problem instead
of maintaining a solution to it.

**This child proves relocation, not equivalence.** A green React suite after a rename says the move
was clean. It says nothing about whether the eventual Svelte app matches — that is what the token
snapshot captured here exists to answer later.
<!-- /ANCHOR:limitations -->
