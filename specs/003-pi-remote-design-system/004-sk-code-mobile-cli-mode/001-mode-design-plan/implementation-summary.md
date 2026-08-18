# Implementation Summary — 003 Phase 4 (sk-code Mobile-CLI mode design plan, plan-only)

## Final state — COMPLETE (plan-only; no skill files authored)

Phase 4 plans — does not build — a dedicated `sk-code-mobile-cli` SURFACE packet under the `sk-code`
parent hub, so future code work on `apps/pi-remote-web/` auto-loads this app's token library, `@ds`
inline-comment grammar, and editability guardrails instead of routing nowhere. The deliverable is a
grounded plan document; **no file under `.opencode/skills/sk-code/` was authored**, and no app source,
source value, or security posture changed. This is documentation/architecture work — Claude's own
authority; no external-model dispatch was needed.

## The gap, proven

`node .opencode/bin/compiled-route.cjs --hub sk-code --prompt "code work on apps/pi-remote-web design
system"` returns `action: "defer"`, `targets: []` — the hub has no surface for this app, so its design
conventions are not auto-loaded. Per `shared/references/stack-detection.md`, `apps/pi-remote-web/` (a
Vite/React app with no WEBFLOW markers, outside `.opencode/`) resolves to **UNKNOWN**. The planned
surface closes this gap.

## What the plan specifies (`mode-design-plan.md`)

1. **Grounding** — cites `sk-code/SKILL.md` §2, `mode-registry.json`, `hub-router.json`,
   `stack-detection.md`, and the `sk-code-webflow` surface template (all read directly), plus the
   reproducible `compiled-route.cjs` "defer" evidence.
2. **Packet identity** — folder `sk-code-mobile-cli` (folder == `packetSkillName`), with the
   **grounding correction** that surface packets carry no packet-level advisor metadata (the real
   webflow/opencode packets have none; the surface is advisor-invisible under the hub's single
   `sk-code` identity).
3. **`mode-registry.json` entry** — the exact surface JSON (`packetKind: "surface"`, `backendKind:
   "evidence-base"`, read-only `toolSurface`, `routingClass: "metadata"`) + `surface-axis.surfaces`.
4. **Surface-detection marker** — a new PI_REMOTE branch matching the pi-remote paths/workspaces;
   precedence OPENCODE > PI_REMOTE > WEBFLOW > UNKNOWN, with a guard and TEST CASE rows.
5. **Folded workflow doctrine** — the three `references/workflow-*.md` symlinks to `../../shared/`.
6. **Encoded conventions** — the three-layer token model, the `@ds` grammar, the guardrail fences, and
   the verification command set (typecheck/build/test:web + the browser-free resolvers + catalog mount
   check), pointing at the live `tokens.md` / `designer-guide.md` / `catalog.html`.
7. **Bundling behavior** — the resulting `surfaceBundle` (e.g. `[sk-code-quality, sk-code-mobile-cli]`).
8. **Out-of-scope + build-packet file list** — the exact new packet files and edited hub files a
   follow-on (non-plan-only) build phase would create.

## Verification (documentary gate — plan-only)

- **Grounding check ran:** the `compiled-route.cjs` command above executed and its `defer`/empty-target
  output is recorded verbatim in the plan.
- **Contract quoted accurately:** SKILL.md §2, `mode-registry.json`, `hub-router.json`, and
  `stack-detection.md` were read directly and their real fields/precedence cited; the `sk-code-webflow`
  packet was inspected as the structural template (confirming no packet-level advisor metadata).
- **Scope:** the only writes are this phase's spec docs — `git status` shows nothing under
  `.opencode/skills/sk-code/`, nothing under `apps/`, no dependency change.
- **User-flagged safety:** `specs/context/` (the two untracked repos) re-confirmed `?? … untouched`.

## Continuation

Phase 4 (sk-code Mobile-CLI mode design plan) is complete — **epic 003 is now fully delivered across
all four phases** (P1 architecture/tokens, P2 the 15-child component-library migration, P3 the
editability audit + designer guide, P4 this plan). Frozen design and security contracts held throughout;
no token value or security boundary changed. The one carried-forward item is the pre-existing, flaky
epic-002 `viewer-history` test (unrelated to epic 003) — a separate epic-002 test-hardening task.

A follow-on (non-plan-only) phase can build the `sk-code-mobile-cli` surface from §8 of the plan.
