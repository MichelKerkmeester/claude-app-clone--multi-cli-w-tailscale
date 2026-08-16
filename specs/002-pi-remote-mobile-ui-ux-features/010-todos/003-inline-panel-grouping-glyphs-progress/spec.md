<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Phase 2 — Inline todo panel, grouping, state glyphs, and progress

## Summary

This phase renders the validated host projection as a calm inline transcript panel. It adds normalized web state, host-ordered grouping, static rows, state glyphs, progress, local disclosure, and read-only refresh behavior. The panel uses the frozen ink-on-parchment design system and remains visible when routine activity is collapsed.

## Problem & Goal

A validated projection is not useful until it can be understood quickly in the existing transcript without appearing to be a task-management surface. The goal is to provide provenance, four-state grouping, progress, and static task information while preserving host order and making every available control explicitly view-only.

## Scope

### In scope

- Normalize snapshots into a separate web todo read model and state store.
- Render `TodoProjectionBlock` beside routine activity content.
- Render pending, active, done, and blocked sections with counts.
- Preserve host order and render optional host groups as subheadings.
- Add static rows, decorative glyphs, progress count, and clay hairline.
- Add local section collapse and read-only refresh affordances.
- Apply existing typography, parchment, ink, focus, radius, separator, safe-area, and motion tokens.
- Add protocol, relay, component, state, integration, contrast, and responsive coverage.

### Out of scope

- Full revision-safe live delta hardening beyond established state boundaries.
- Any checkbox, switch, link, drag handle, row action, or task mutation.
- New cards, modals, drawers, floating shadows, icon families, or status colors.
- Client-side sorting or task-state inference.
- A separate task screen, global navigation surface, or cross-session task manager.
- Browser or service-worker persistence hardening beyond the existing cache boundary.

## User-facing behavior + states

A valid snapshot renders an inline panel with Pi provenance, a `doneCount/totalCount` count, state sections, optional host group subheadings, static task rows, and a clay progress hairline. Unsupported or unavailable projections render no fabricated checklist and leave the transcript unchanged; empty plans do not show misleading progress. All-done projections replace the task body with `All done · N/N`.

Section disclosure changes only local visibility, and refresh re-subscribes through the existing read-only synchronization path. The panel remains visible when surrounding `ActivityGroup` content is collapsed, and task rows expose state text without interactive mutation affordances.

## Acceptance criteria

- The eight-task, three-done fixture renders `3/8` and a clay progress hairline.
- All four state groups render with correct localized headings and counts for non-empty groups.
- Host order is preserved, with no title, timestamp, completion, or client-side group sorting.
- Optional host groups render as subheadings without changing task order.
- The panel remains visible when surrounding activity is collapsed.
- Task rows are static and contain no checkbox or mutation affordance.
- Disclosure and refresh controls expose correct accessible names and meet 44pt target requirements.
- The all-done fixture renders only `All done · N/N` for the task body.
- Light and dark rendering uses only the frozen accent and existing typography and parchment tokens.
- A true 390px CDP pass shows no clipped titles, horizontal overflow, or unsafe control placement.
