<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 13 — Plan/todo & ask-question surfaces

## Summary

This grandchild migrates the one task-list surface that exists today — the `plan`-kind transcript
block's ✓/○ todo checklist — onto the token library and the `@ds` inline-comment grammar, and
scaffolds the design-system seams for the two related surfaces that do not yet exist in `main`: the
ask-question prompt UI and a first-class todos list. It is value-preserving for the existing
checklist and preparatory (seams only) for the pending surfaces.

## Problem & Goal

In `main` the only "todo" UI is the `plan` block rendered by `Block` in `App.tsx`: a ✓/○ checklist
of plan items. There is **no** dedicated ask-question component and **no** first-class todos
surface — those are pending on the sibling `002` packet's features `009-ask-question` (terminal-style
prompt UI) and `010-todos` (Manus/Claude-grade task list). The goal is to bring the existing
plan/todo checklist onto the system now, and to define the `@ds surface:` / `@ds state:` seams the
ask-question and todos surfaces will slot into when those features land, so they arrive already
designer-editable rather than needing a later retrofit.

## Scope

### In scope

- Migrate the `plan`-kind block's todo checklist (the ✓/○ items) onto semantic + component tokens
  and the `@ds` grammar, with `@ds state:` blocks for a done (✓) item and a pending (○) item.
- Scaffold the design-system seams (a documented `@ds surface:` contract and placeholder `@ds state:`
  set) for the future ask-question prompt UI and the future todos list, marked clearly as pending
  and gated on the sibling `002` features.
- Register the migrated plan/todo checklist in the catalog; register the two future surfaces as
  declared-but-pending entries.

### Out of scope

- Building the ask-question prompt UI or the todos list — those are the sibling `002` packet's
  features `009-ask-question` and `010-todos`; this grandchild only prepares the seams.
- Any change to how plan items are computed, delivered, or gated, and any change to plan-mode
  enforcement or the mutation/ticket path.
- Any change to the frozen source values or the read-only-by-default security posture.

## User-facing behavior + states

The plan/todo checklist looks and behaves exactly as before — done items show ✓, pending items show
○ — in light and dark. No new user-visible surface appears: the ask-question and todos surfaces
remain absent from `main`; only their design-system seams are scaffolded (invisible until the
features that populate them land).

## Acceptance criteria

- The `plan`-kind block's todo checklist reads semantic + component tokens and is `@ds surface:`
  labelled, with `@ds state:` blocks for done (✓) and pending (○) items; it renders identically to
  before in both themes.
- A documented `@ds surface:` seam contract exists for the future ask-question prompt UI and the
  future todos list, each marked pending and gated on the sibling `002` features, adding no visible
  surface.
- The catalog registers the migrated plan/todo checklist and lists the two future surfaces as
  declared-but-pending.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark capture of the plan/todo block is visually unchanged from the pre-migration baseline.

## Security & Redaction

Styling-only for the existing checklist; seam scaffolding only for the pending surfaces. This
grandchild touches no plan-item computation, no plan-mode enforcement, no transport, redaction,
ticket, or host-file path. The ask-question surface, when later built, is a mutation surface and is
hard-gated by an adversarial review in its own feature packet — this grandchild adds no mutation and
must not pre-empt that gate. No new dependency is added.

## Dependencies & affected areas

- Existing todo surface: the `plan`-kind branch of `Block` in `apps/pi-remote-web/src/App.tsx`
  (the ✓/○ checklist) and its rules in `apps/pi-remote-web/src/style.css`.
- Plan data (read-only reference, not changed): `apps/pi-remote-web/src/state.ts` /
  `apps/pi-remote-web/src/turns.ts` plan block model.
- Pending surfaces (declared, not built here): the sibling packet
  `../../../002-pi-remote-mobile-ui-ux-features/009-ask-question/` and `010-todos/`.
- Catalog registration: the catalog surface from grandchild 15.
- Baseline evidence: `scripts/design-system-cdp.mjs` capturing the plan/todo block.
