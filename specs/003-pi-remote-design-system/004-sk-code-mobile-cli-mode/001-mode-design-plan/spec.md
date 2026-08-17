<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# sk-code Mobile-CLI mode — design plan (plan-only)

## Summary

This phase **plans, but does not build**, a new mode under the `sk-code` parent hub, purely for
Mobile-CLI app work (`apps/pi-remote-web/` and its siblings), so future code work on this app
auto-loads the design-system and designer-editability conventions this packet establishes. The
plan uses the hub's real conventions: it defines a new SURFACE evidence packet
`sk-code-mobile-cli`, its `mode-registry.json` entry, its `graph-metadata.json` identity, its
surface-detection marker, and its verification commands. No skill files are authored in this packet.

## Problem & Goal

`sk-code` is a two-axis hub: WORKFLOW modes act (`sk-code-quality`, `sk-code-review`) and SURFACE
packets carry read-only domain evidence bundled alongside a workflow mode (`sk-code-webflow`,
`sk-code-opencode`). Today, code work on `apps/pi-remote-web/` detects the `WEBFLOW`/frontend
surface generically and does not auto-load this app's token library, `@ds` inline-comment grammar,
or editability guardrails. The goal is a plan for a Mobile-CLI-specific surface packet so the
router recognizes this app and the acting agent applies its conventions — without building the
mode here.

## Scope

### In scope

- A plan for `sk-code-mobile-cli` as a **surface** packet (`packetKind: "surface"`,
  `backendKind: "evidence-base"`, `routingClass: "metadata"`, read-only `toolSurface`
  `[Read, Bash, Grep, Glob]`, `mutatesWorkspace: false`, folder == `packetSkillName`).
- Its `mode-registry.json` entry and its listing under `extensions.surface-axis.surfaces`.
- Its `graph-metadata.json` advisor-identity file (required at a standalone/mode root;
  `description.json` / `mode-registry.json` / `hub-router.json` stay hub-only on the parent).
- A new surface-detection marker (e.g. `PI_REMOTE` / `MOBILE_CLI`) in the hub's `shared/` layer that
  recognizes `apps/pi-remote-web/` work, with precedence relative to `OPENCODE`/`WEBFLOW` defined.
- How the packet folds in the shared implement → debug → verify workflow doctrine (symlinked from
  `shared/references/workflow_*.md`, as the existing surfaces do).
- How the packet encodes this packet's outputs: the token library layering, the `@ds` inline-comment
  grammar, the editability guardrails, and the verification command set
  (`npm run typecheck` / `npm test` / `npm run test:web` / `npm run build`, web-scoped variants, and
  the true-390px light/dark CDP capture).

### Out of scope

- Authoring any skill file, registry edit, or graph-metadata under `.opencode/skills/sk-code/` —
  this phase produces a plan only.
- Changing the existing `sk-code` modes or surfaces, or any hub-level routing.
- Any change to the Mobile-CLI app source, the frozen source values, or the security posture.

## User-facing behavior + states

None. The audience is a future engineer or dispatched model doing code work on this app; the
deliverable is a plan document, not a running surface.

## Acceptance criteria

- The plan names the real hub conventions — the two-axis model, the surface-packet contract, the
  `mode-registry.json` schema, the `graph-metadata.json` identity requirement, the `shared/`
  surface-detection layer, and the verification command set — and cites `sk-code/SKILL.md` §2.
- The plan maps each convention to a concrete section of the future `sk-code-mobile-cli` packet
  (identity, registry entry, surface marker, folded workflow doctrine, encoded conventions).
- The plan explains how the packet encodes the token library, the `@ds` grammar, and the
  editability guardrails so future app code work auto-loads them.
- The plan states explicitly that building the mode is out of scope for this packet and lists the
  exact files a follow-on build packet would create.

## Security & Redaction

Planning only; no code, skill, or registry file is written. The plan must note that the future
surface packet is **read-only evidence** (it never mutates the workspace) and that it must not
encode anything that weakens the app's read-only-by-default security posture. No dependency is added.

## Dependencies & affected areas

- Read-only references (grounding, not changed): `.opencode/skills/sk-code/SKILL.md` (§2 Smart
  Routing), `.opencode/skills/sk-code/mode-registry.json`, `.opencode/skills/sk-code/ROUTER.md`,
  `.opencode/skills/sk-code/shared/`, and an existing surface packet (`sk-code-webflow` or
  `sk-code-opencode`) as the structural template.
- Inbound: this packet's Phase 1 decision and Phase 2 token library + `@ds` grammar are the
  conventions the planned mode encodes.
- Outbound: a future, separate build packet would create `.opencode/skills/sk-code/sk-code-mobile-cli/`.
