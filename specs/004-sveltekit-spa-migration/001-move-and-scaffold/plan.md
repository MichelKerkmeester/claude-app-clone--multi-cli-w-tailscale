---
title: "Child 001 plan — folder move and SvelteKit scaffold"
description: "How the two highest-blast-radius infra steps were sequenced so the existing React suite could prove each one, and what the barrier had to show before any .svelte file was allowed to exist."
trigger_phrases:
  - "move and scaffold plan approach"
  - "move and scaffold packet"
  - "plan approach"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/001-move-and-scaffold"
    last_updated_at: "2026-08-23T09:40:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 001 plan — folder move and SvelteKit scaffold

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Two mechanical steps with enormous blast radius, deliberately kept separate so each has its own
oracle: relocate the workspaces, then stand up an empty SvelteKit app beside the still-live React one.

The sequencing is the whole design. The move happens **while the app is still React**, so the existing
suite proves it changed nothing. Only once that is green does a `.svelte` file exist anywhere.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| `npm run build` after the move, still React | 0 |
| `npm run typecheck` after the move | 0 |
| `npm test` after the move | 0 |
| `npm run test:web` after the move | 0 |
| `node scripts/design-system-cdp.mjs` after the move | pass |
| `svelte-check` + `vite build` after the scaffold, empty page | 0 |
| L0 token-identity snapshot captured | 3 theme states resolved and stored |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**Why the move is a rename and not a restructure.** Both workspaces stay exactly two levels from the
root so every `../../tsconfig.base.json` extends keeps resolving, and the `@pi-remote/*` package
names are kept, so all ~160 cross-package imports keep working untouched. Only filesystem-path
literals need updating, and that set is finite and greppable.

**Why the relay needs no serving change.** Tailscale Serve is the reverse proxy; the relay never
served static assets. `adapter-static` is configured to emit `dist/`, the same directory
`release/threshold-gate.mjs` and `vite preview` already expect, so nothing downstream notices.

**Why CSP moves into `kit.csp` hash mode.** The SPA fallback injects an inline bootstrap script that
a plain `script-src 'self'` would block. Hash mode lets SvelteKit hash its own bootstrap, so the
frozen directives survive intact rather than being loosened to accommodate the framework.

**`app.css` is a verbatim move, not a rewrite.** The foundation region — `@theme`, `@font-face`, the
three `data-theme` blocks, resets — carries the frozen token values. It moves byte-for-byte, because
the token-identity gate compares against exactly these values for the rest of the program.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: The move — Done

`git mv` both workspaces, update the finite set of filesystem-path references, `npm install` to
regenerate the lockfile and workspace symlinks, and prove the React suite is green on both sides of a
single atomic "restructure only" commit.

### Phase 2: The scaffold — Done

`svelte.config.js` with `adapter-static` and `kit.csp` hash mode; `+layout.ts` disabling SSR and
prerender; `vite.config.ts` ported nearly verbatim, keeping the relay proxy with `ws: true`, the
`.ts.net` preview hosts, the ES worker format and the `pdfjs-dist` exclusion; `app.html` carrying the
head and manifest; `public/` becoming `static/`; and every dependency installed once, here.

### Phase 3: Baseline capture — Done

Resolve every token in all three theme states from the pre-migration `style.css`. This snapshot is
the correctness oracle for every later layer, so it must be taken before anything moves.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

This child writes no application logic, so it adds no tests. Its correctness argument is entirely
**the unchanged React suite passing on both sides of the move** — a suite that knows nothing about
SvelteKit and cannot be fooled by it.

The one thing the suite cannot check is the reference sweep, because a missed path literal usually
fails loudly at build time but can also fail silently in a script that is not exercised. That is
covered by grepping for every `apps/pi-remote-` literal before committing, rather than trusting the
green board alone.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- Nothing. This child gates everything else.
- All dependency installation for the whole program happens here, once, so that every later parallel
  dispatch can be banned from touching `package.json`.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The move is one atomic commit containing only renames and path-literal edits, so `git revert` restores
the previous layout exactly; `git mv` preserves history, so no blame is lost either way.

The scaffold is additive — new files beside the live React app — and reverting it removes them without
touching anything that was shipping. The only shared-state change is the regenerated lockfile, which
reverts with the commit.
<!-- /ANCHOR:rollback -->
