<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 14 — State vocabulary, interaction & motion

## Summary

This grandchild unifies the cross-cutting state vocabulary and motion into design-system primitives:
one documented state/badge system for the status enumerations currently scattered across surfaces,
and formalized motion tokens, focus-visible treatment, and reduced-motion behaviour. It ships late
(Layer D), after the surfaces are migrated, so it can harmonize the state seams they declared. It is
value-preserving: it documents and consolidates the presentation of states the app already renders.

## Problem & Goal

The app expresses "state" in many private enumerations: connection phases (`state.ts`), runtime
presentation kinds (`PlanModeButton.tsx`), artifact resource statuses (`useArtifactResource.ts` /
`ArtifactStatus.tsx`), slash-panel open states (`ComposerCommandAutocomplete.tsx`), and file-preview
availability (`state.ts`). Each styles its own idle/loading/error/stale badges, and motion is a set
of ad-hoc `--duration-*`/`--ease-*` reads plus scattered `prefers-reduced-motion`,
`prefers-contrast`, and `forced-colors` blocks. A designer cannot see "how a loading state looks" or
"how fast things move" in one place. The goal is one `@ds state:`-labelled status/badge vocabulary
mapped over the existing enums, and motion/focus/reduced-motion as documented design-system
primitives — without changing what any surface renders.

## Scope

### In scope

- A unified status/badge vocabulary: map the shared status families (idle, loading, stalled, ready,
  empty, offline, stale, denied, expired, missing, error) onto one `@ds surface: status` set with
  `@ds state:` blocks, consumed by the surfaces that today roll their own.
- Motion primitives: formalize the motion tokens (`--duration-fast` 120ms, `--duration-state` 220ms,
  `--ease-out`, `--ease-out-interface`) as the design-system motion scale with an `@ds edit: tokens`
  label, and document which surfaces read them.
- Interaction primitives: the `:focus-visible` treatment and the `prefers-reduced-motion`,
  `prefers-contrast`, and `forced-colors` behaviour, fenced and documented as system-wide primitives.
- Catalog registration of the status vocabulary and the motion/focus/reduced-motion primitives.

### Out of scope

- Changing any surface's actual state machine, status text, or transition timing — this grandchild
  consolidates presentation, it does not re-time or rename states.
- Re-implementing the per-surface status logic (owned by each surface's grandchild); this one only
  provides the shared presentation vocabulary they map onto.
- Any change to the frozen source values or the read-only-by-default security posture.

## User-facing behavior + states

No behaviour change. Every status badge, focus ring, and transition looks and times exactly as
before in light and dark, including under reduced-motion, increased-contrast, and forced-colors. The
observable change is authoring: the status vocabulary and the motion/focus/reduced-motion primitives
now live in one `@ds`-labelled place a designer can edit.

## Acceptance criteria

- A unified `@ds surface: status` vocabulary exists in `src/style.css` with `@ds state:` blocks for
  the shared status families, mapped over the existing enums; each mapped surface renders its badges
  identically to before.
- The motion tokens are formalized as the design-system motion scale with an `@ds edit: tokens`
  label, and the `:focus-visible`, `prefers-reduced-motion`, `prefers-contrast`, and `forced-colors`
  behaviours are fenced and documented as primitives, unchanged in effect.
- No surface's state machine, status text, or transition timing changes.
- The catalog registers the status vocabulary and the motion/focus/reduced-motion primitives.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; true-390px light/dark
  captures of representative states are visually unchanged from the pre-migration baseline.

## Security & Redaction

Styling and documentation only. This grandchild touches no state computation, transport, redaction,
ticket, plan-mode, or host-file path; it only consolidates how already-computed states are
presented. Status text that could carry sensitive detail is unchanged and still sourced from the
existing redacted paths. No new dependency is added.

## Dependencies & affected areas

- Status sources (read-only reference for the mapping): `apps/pi-remote-web/src/state.ts`
  (connection phases, file-preview availability), `apps/pi-remote-web/src/PlanModeButton.tsx`
  (`ModePresentationKind`), `apps/pi-remote-web/src/artifacts/useArtifactResource.ts` and
  `artifacts/ArtifactStatus.tsx` (`ArtifactResourceStatus`), and
  `apps/pi-remote-web/src/ComposerCommandAutocomplete.tsx` (`SlashPanelOpenState`).
- Motion + interaction source: `apps/pi-remote-web/src/style.css` (the `--duration-*` / `--ease-*`
  tokens, the `:focus-visible` rules, and the `prefers-reduced-motion`, `prefers-contrast`, and
  `forced-colors` `@media` blocks).
- Catalog registration: the catalog surface from grandchild 15.
- Baseline evidence: `scripts/design-system-cdp.mjs` capturing representative status badges and a
  reduced-motion state.
