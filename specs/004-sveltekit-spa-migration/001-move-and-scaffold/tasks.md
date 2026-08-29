---
title: "Child 001 tasks — folder move and SvelteKit scaffold"
description: "Task ledger for the workspace relocation, the SvelteKit skeleton and the L0 baseline capture."
trigger_phrases:
  - "move and scaffold task ledger"
  - "move and scaffold packet"
  - "task ledger"
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

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 001 tasks — folder move and SvelteKit scaffold

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.
Evidence sits inline. Claude owned every task here — this is infrastructure and config, not app
logic, so no dispatch was involved.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Capture the L0 token-identity snapshot from the pre-migration `style.css`, resolving
      every token in all three theme states. Taken first, because after anything moves it is no longer
      a baseline. Evidence: `007-verify-and-cutover/baseline/token-identity-baseline.json`.
- [x] **T1.2** Record the pre-move `npm test` / `npm run test:web` / CDP counts, so "green after"
      means the same thing as "green before" rather than merely "not red".
- [x] **T1.3** Enumerate every `apps/pi-remote-` filesystem-path literal by grep, since package-name
      references need no change and would otherwise inflate the work.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

### The move

- [x] **T2.1** Relocate both workspaces, keeping each exactly two levels deep so the
      `../../tsconfig.base.json` extends keep resolving, and keeping the `@pi-remote/*` package names
      so cross-package imports need no edit. **Deviation from spec:** the final names are
      `app-mobile/` and `app-relay/` at the repository root, not `src/mobile-app` and `src/relay`.
      The depth property that made the plan safe holds either way.
- [x] **T2.2** Update the finite path-literal set: `package.json` workspaces and the `test`
      positional, `vitest.config.ts`, `vitest.web.config.ts`, `eslint.config.js` globs plus `.svelte`,
      `scripts/release-verify.mjs`, `scripts/rollback-drill.mjs`,
      `scripts/verify-full-access-runtime.mjs`, `release/threshold-gate.mjs`,
      `tests/rollback-drill.test.ts` and the web test files that `readFileSync` a source path.
- [x] **T2.3** `npm install` to regenerate the lockfile and workspace symlinks.
- [x] **T2.4** Land the move as a single atomic "restructure only" commit, with the React suite green
      on both sides of it.

### The scaffold

- [x] **T2.5** `svelte.config.js` — `adapter-static` emitting `dist/` with `fallback: index.html`,
      preserving the directory the release gate and `vite preview` already expect.
- [x] **T2.6** `kit.csp` in hash mode carrying the frozen directives, so the SPA fallback's inline
      bootstrap is hashed rather than the policy being loosened.
- [x] **T2.7** `src/routes/+layout.ts` — `ssr = false`, `prerender = false`.
- [x] **T2.8** `vite.config.ts` ported nearly verbatim: the `/api` and `/health` relay proxy with
      `ws: true` kept (the WebSocket depends on it), `preview.allowedHosts` for `.ts.net`,
      `worker.format: 'es'`, `optimizeDeps.exclude: ['pdfjs-dist']`, `@tailwindcss/vite`;
      `plugin-react()` swapped for `sveltekit()`; the manual `rollupOptions.input` dropped.
- [x] **T2.9** `src/app.html` carrying the head, meta, manifest and theme-color from `index.html`.
- [x] **T2.10** `public/*` moved to `static/*`; `CACHE_NAME` bumped to `pi-remote-shell-v6`.
      **Deviation from spec:** rather than rewriting the shell path from `/assets/` to
      `/_app/immutable/`, the precache shell was reduced to the navigational entries
      (`/`, `/index.html`, `/manifest.webmanifest`, `/icon.svg`) and hashed build assets are left to
      the runtime fetch strategy. This sidesteps the hashed-filename problem the plan had flagged as
      the one real PWA break, instead of solving it.
- [x] **T2.11** `src/app.css` — verbatim move of the foundation region plus the global guardrail
      media queries and the shared convention surfaces. No value edited.
- [x] **T2.12** Install every dependency for the whole program here, once, so later parallel
      dispatches can be banned from touching `package.json`.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Post-move barrier, still React: `npm run build` · `npm run typecheck` · `npm test` ·
      `npm run test:web` · `node scripts/design-system-cdp.mjs` all exit 0.
- [x] **T3.2** Post-scaffold barrier: `svelte-check` and `vite build` green with an empty page.
- [x] **T3.3** Confirm zero broken references — no surviving `apps/pi-remote-` literal, and
      `@pi-remote/*` imports untouched.
- [x] **T3.4** Confirm the relay needed no serving change, since Tailscale Serve rather than the relay
      is the reverse proxy.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

All five requirements hold and both barriers were green. The layout, the SvelteKit skeleton, the CSP
posture and the dependency set established here are still in force — every later child builds on them
unchanged, which is the strongest available evidence that this one landed correctly.

Two documented deviations stand: the final workspace names, and the service-worker shell strategy.
Both are recorded rather than reconciled backwards into the spec.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and the barrier definition.
- `plan.md` — sequencing rationale and the architecture decisions.
- `checklist.md` — sign-off with evidence.
- `implementation-summary.md` — what shipped, including the deviations.
- `../007-verify-and-cutover/` — holds the L0 baseline this child captured.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
