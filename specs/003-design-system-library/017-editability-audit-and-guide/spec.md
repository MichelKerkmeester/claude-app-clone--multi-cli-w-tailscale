<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Editability audit, refinement & designer guide

## Summary

This phase proves the system's central claim: that a designer with low-level code knowledge can
actually and safely adjust styling, markup, layout, and per-state presentation across every
migrated surface — and refines the ergonomics wherever they cannot. It produces editability
evidence (representative edit tasks run end to end) and a designer guide. It changes no source
value and no security boundary.

## Problem & Goal

After Phase 2, every surface is on the token library and the `@ds` grammar, but "a designer can
edit this safely" is an assertion, not a proven fact. Seams may be missing, mislabelled, or leaky;
a guardrail may not actually stop an edit from reaching logic. The goal is to audit the whole
migrated surface against real designer edit tasks, fix the ergonomic and guardrail gaps found, and
ship a designer guide plus the evidence that the claim holds.

## Scope

### In scope

- An **editability audit** against representative designer tasks across the migrated surfaces:
  retint a role token, retint one component, change a card's radius, relabel a state block,
  reorder a slot, change a layout block. Each task is run end to end and its result recorded.
- A **guardrail audit**: confirm a designer edit inside the token/slot/layout/state seams cannot
  reach state computation, the mutation/ticket path, redaction, or plan-mode enforcement.
- A **refinement pass**: fix missing or leaky seams, mislabelled states, and unclear "edit here"
  comments found by the audit.
- A repeat **a11y/contrast** pass over the token layer in both themes.
- A **designer guide**: how to make each class of edit, where the seams are, and where to stop.

### Out of scope

- Any change to the frozen source values or Inter + Source Serif 4.
- Any change to the read-only-by-default security posture, redaction, ticketing, or plan-mode.
- New surfaces or new components — this phase audits and refines what Phase 2 migrated.

## User-facing behavior + states

None new. The end-user app is unchanged; the audience for this phase's output is the **designer**
editing the system. Refinements may adjust comments, seam boundaries, and state-block labels, but
must leave every rendered surface visually identical in both themes.

## Acceptance criteria

- Each representative designer edit task is documented with a before/after and a pass/fail on
  whether a low-code designer could do it safely through the seams alone.
- The guardrail audit confirms no in-seam edit can reach logic or the security boundary; any gap
  found is fixed and re-tested.
- The a11y/contrast checks pass in both themes over the token layer.
- A designer guide exists covering token, slot, layout, and per-state edits and the guardrails.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` stay green, and every
  refined surface is visually identical to its Phase-2 baseline at true-390px light and dark.

## Security & Redaction

Audit and documentation, plus comment/seam refinement. No logic, transport, redaction, ticket,
plan-mode, or host-file path is changed. The guardrail audit is itself a security check: it proves
a designer's edit path cannot cross into the security boundary. No new dependency is added.

## Dependencies & affected areas

- Inbound: every Phase 2 grandchild's migrated surface and the catalog stood up by
  `002-implement-migrate-component-library/015-catalog-docs-preview`.
- Audited/refined: `apps/pi-remote-web/src/style.css` (seam comments and state-block labels only),
  the per-component seams across `apps/pi-remote-web/src/`, and the token reference.
- New: the designer guide (e.g. `apps/pi-remote-web/src/design-system/designer-guide.md`) and the
  editability evidence (recorded under this phase's docs).
- Evidence: `scripts/design-system-cdp.mjs` for before/after captures; `tests/contrast.test.tsx`.
