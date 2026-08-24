# Implementation Summary — 003 Phase 4 (sk-code Mobile-CLI mode design plan, plan-only)

## Final state — COMPLETE (plan-only; no skill files authored)

Phase 4 plans — does not build — a dedicated `sk-code-mobile-cli` SURFACE packet under the `sk-code`
parent hub, so future code work on `apps/pi-remote-web/` auto-loads this app's token library, `@ds`
inline-comment grammar, and editability guardrails instead of routing nowhere. The deliverable is a
plan document grounded in **both** the live `sk-code` hub contract **and** the `sk-create-skill`
mode-creation standards/templates; **no file under `.opencode/skills/` was authored**, and no app
source, source value, or security posture changed. This is documentation/architecture work — Claude's
own authority; no external-model dispatch was needed.

## Alignment with `sk-create-skill` (verification pass)

The plan was audited against the canonical mode-creation standards and corrected to align perfectly:

- **Grounding widened** — now cites `parent-skills-nested-packets.md` (the canonical parent-hub
  method), `skill-root-metadata-contract.md` (the two-class matrix; `sk-code` is class **H**),
  `packet-skill-scaffold.md` (the packet SKILL.md template), and `compiled-routing-lockstep-surfaces.json`
  (`sk-code` is a lockstep compiled-routing hub) — alongside the live hub files.
- **Confirmed correct:** `folder == packetSkillName`, `grandfatheredFolderMismatch: false`, the
  hub-prefixed surface name, and **no packet-level advisor metadata** (the metadata contract makes a
  nested `graph-metadata.json`/`description.json` a `NESTED_IDENTITY` violation caught by the fleet gate
  `ci-skill-root-metadata.cjs`).
- **Corrections applied to the plan:**
  1. Packet `changelog/` is **required and real** (a `v1.0.0.0.md`, never symlinked) — the scaffold
     draft had wrongly listed it optional.
  2. The packet `SKILL.md` now follows `packet-skill-scaffold.md` — frontmatter (`name`, `description`
     ≤130, **read-only** `allowed-tools: [Read, Bash, Grep, Glob]`, `version`) + the 7-section body;
     never a separate advisor identity.
  3. `hub-router.json` wiring made precise against the verified structure: `routerSignals` keyed by the
     full `sk-code-mobile-cli`; `vocabularyClasses` `code-mobile-cli-{aliases,runtime}` (the `code-…`
     prefix, not `sk-code-…`); `tieBreak` append; sk-code's **compositional** vocab strategy.
  4. The active root `ROUTER.md` (`router_state: active`) is accounted for (conditional equal-key leaf
     entries; never synthetic intents).
  5. The mandatory regenerate/gate steps added: `ci-skill-root-metadata.cjs --fix` then the gate at
     exit 0, and a compiled-route manifest re-mint + freshness (required because `sk-code` is lockstep).

## The gap, proven

`node .opencode/bin/compiled-route.cjs --hub sk-code --prompt "code work on apps/pi-remote-web design
system"` returns `action: "defer"`, `targets: []` — the hub has no surface for this app, so its design
conventions are not auto-loaded. Per `shared/references/stack-detection.md`, `apps/pi-remote-web/` (a
Vite/React app with no WEBFLOW markers, outside `.opencode/`) resolves to **UNKNOWN**. The planned
surface closes this gap.

## What the plan specifies (`mode-design-plan.md`, 9 sections)

1. **Grounding** — the live hub files + the four `sk-create-skill` standards + the reproducible
   `compiled-route.cjs` "defer" evidence.
2. **Packet identity + SKILL.md** — `folder == packetSkillName`, no packet-level advisor metadata, and
   the packet `SKILL.md` per `packet-skill-scaffold.md` (read-only tools, 7-section body).
3. **`mode-registry.json` entry** — the exact surface JSON with every required `modes[]` field +
   `surface-axis.surfaces`; aliases lowercase + unique.
4. **`hub-router.json` wiring** — `routerSignals["sk-code-mobile-cli"]`, `vocabularyClasses`
   `code-mobile-cli-{aliases,runtime}`, `tieBreak` append; compositional vocab strategy.
5. **Root `ROUTER.md`** — conditional stage-two leaf entries (active router).
6. **Surface-detection marker** — PI_REMOTE, precedence OPENCODE > PI_REMOTE > WEBFLOW > UNKNOWN, guard
   + TEST CASE rows.
7. **Folded workflow doctrine** — the three `references/workflow-*.md` symlinks to `../../shared/`.
8. **Companion files + encoded conventions** — required real `changelog/`, README, references/assets;
   the three-layer token model, the `@ds` grammar, the guardrail fences, the verification command set,
   and the resulting `surfaceBundle` behavior.
9. **Out-of-scope + build-packet checklist** — the exact new packet files, edited hub files, and the
   mandatory regenerate/gate/manifest steps a follow-on build phase would run.

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
