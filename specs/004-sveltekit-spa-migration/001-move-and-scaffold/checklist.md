---
title: "Child 001 checklist — move and scaffold sign-off"
description: "Barrier sign-off for the workspace relocation and the SvelteKit skeleton, with evidence per item."
trigger_phrases:
  - "move and scaffold verification checklist"
  - "move and scaffold packet"
  - "verification checklist"
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

# Verification Checklist: Child 001 — folder move and SvelteKit scaffold

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

The oracle for this child is the **unchanged React suite**, which knows nothing about SvelteKit and
therefore cannot be fooled by it. Every item is evidenced by a command result or by the current
on-disk state, which is itself durable evidence: every later child builds on what landed here.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] Token baseline captured before anything moved, since afterwards it is no longer a baseline. [evidence: `007-verify-and-cutover/baseline/token-identity-baseline.json`, 3 theme states]
- [x] **CHK-PRE-02** [P1] Pre-move suite counts recorded so "green after" means the same as "green before". [evidence: `npm test` and `npm run test:web` counts captured at L0]
- [x] **CHK-PRE-03** [P1] Path-literal set enumerated by grep rather than estimated, since package-name references need no change. [evidence: every `apps/pi-remote-` literal listed before editing]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Build clean after the move, still React. [evidence: `npm run build` exit code 0]
- [x] **CHK-CQ-02** [P0] Type check clean after the move. [evidence: `npm run typecheck` exit code 0]
- [x] **CHK-CQ-03** [P0] Scaffold compiles and serves an empty page. [evidence: `svelte-check` and `vite build` both exit 0]
- [x] **CHK-CQ-04** [P1] Both workspaces stay exactly two levels deep so the shared tsconfig extends keep resolving. [evidence: `app-mobile/` and `app-relay/` at repo root, `workspaces` array in `package.json`]
- [x] **CHK-CQ-05** [P1] `vite.config.ts` ported with the load-bearing options intact. [evidence: relay proxy with `ws: true`, `preview.allowedHosts` for `.ts.net`, `worker.format` set to es, `pdfjs-dist` excluded]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] React suite green after the move, proving the relocation changed no behaviour. [evidence: `npm test` and `npm run test:web` both exit code 0 post-move]
- [x] **CHK-TEST-02** [P0] Structural gate clean after the move. [evidence: `node scripts/design-system-cdp.mjs` pass]
- [x] **CHK-TEST-03** [P1] Move landed as a single atomic restructure-only commit, so the before and after states are directly comparable. [evidence: one `git mv` commit containing only renames and path-literal edits, 0 source-logic lines changed]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] Zero broken references after the sweep. [evidence: no surviving `apps/pi-remote-` literal; `@pi-remote/*` imports unchanged]
- [x] **CHK-FIX-02** [P1] Lockfile and workspace symlinks regenerated. [evidence: `npm install` run as part of the move commit]
- [~] **CHK-FIX-03** [P2] Service-worker shell path handled differently from the plan. [deferred: rather than rewriting `/assets/` to `/_app/immutable/`, the precache shell was reduced to navigational entries and hashed assets left to the runtime fetch strategy — recorded in `implementation-summary.md`]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] Frozen CSP directives preserved rather than loosened for the framework. [evidence: `kit.csp` hash mode in `svelte.config.js` — `default-src self`, `script-src self`, `object-src none`, `base-uri none`]
- [x] **CHK-SEC-02** [P0] Relay needed zero serving changes, so no security boundary moved. [evidence: Tailscale Serve is the reverse proxy; `adapter-static` keeps emitting `dist/`]
- [x] **CHK-SEC-03** [P1] Backend suite green across the move, confirming nothing leaked into the relay or protocol. [evidence: `npm test` exit code 0 post-move]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P2] Config decisions carry their rationale inline where a future reader would otherwise wonder. [evidence: `svelte.config.js` comments explain the `dist/` choice and hash-mode CSP]
- [x] **CHK-DOC-02** [P2] Route-level rendering posture documented at the point of declaration. [evidence: `src/routes/+layout.ts` comment explains why there is nothing to render on a server]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Package names kept so cross-package imports need no edit. [evidence: `@pi-remote/*` names unchanged across roughly 160 import sites]
- [x] **CHK-ORG-02** [P1] `public/` became `static/` per SvelteKit convention. [evidence: `app-mobile/static/` holds the manifest, icon, fonts and service worker]
- [x] **CHK-ORG-03** [P2] Dependencies installed once here so later parallel dispatches can be banned from `package.json`. [evidence: Svelte, SvelteKit, adapter-static, Bits UI, svelte-virtual, Storybook and testing-library all added at L0]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Both barriers were green: the React suite passed on both sides of the move, and the scaffold compiled
and served an empty page. The layout, CSP posture and dependency set established here are still in
force across the whole program.

Two deviations from the spec are recorded rather than hidden: the final workspace names
(`app-mobile/`, `app-relay/` rather than `src/mobile-app`, `src/relay`) and the service-worker shell
strategy.
<!-- /ANCHOR:summary -->
