<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Phase 3 — Live delta updates, accessibility, visual, and iPhone/PWA release hardening

## Summary

This phase completes revision-safe live updates and release hardening for the read-only todo projection. It preserves valid data across refreshes and gaps while adding focused updates, polite announcements, reduced motion, RTL, dynamic text sizing, safe-area behavior, cache boundaries, compatibility checks, and final release verification. The phone remains a view-only client throughout.

## Problem & Goal

A static projection can become misleading when revisions arrive out of order, refreshes fail, or the layout is used with assistive technology and constrained mobile dimensions. The goal is to apply only valid host deltas, preserve the last valid view during recovery, and make the panel reliable across accessibility settings, themes, PWA boundaries, older clients, and true iPhone-sized viewports.

## Scope

### In scope

- Apply snapshots and deltas with plan, projection, and task revision safety.
- Ignore stale deltas and refresh read-only after gaps or base mismatches.
- Update affected rows and derived counts without remounting unaffected rows.
- Add concise polite announcements, exact timestamps, reduced-motion behavior, RTL, dynamic text sizing, and no-auto-scroll guarantees.
- Verify redacted data does not enter browser or service-worker persistence.
- Preserve content-free push and older-client compatibility.
- Complete relay security, web, build, and true 390px light/dark release checks.

### Out of scope

- Any task mutation, approval, ticket, plan-mode change, or `--full-access` change.
- A second synchronization channel or a mutable refresh endpoint.
- Rendering malformed, stale, unredacted, or unsupported projection data.
- Persisting raw task detail, transcript content, paths, secrets, or diagnostic payloads.
- New status colors, celebration UI, automatic transcript scrolling, or a separate task surface.

## User-facing behavior + states

Valid deltas update only affected rows and derived progress while preserving unaffected row identity. Stale or malformed deltas leave the last valid projection visible; a base-revision mismatch starts a read-only snapshot refresh without exposing transport details or sending a mutation. A background update does not auto-scroll or move focus.

A concise polite announcement identifies the redacted title and localized new state. All-done rendering is quiet and restores grouped sections when a new task arrives. Reduced motion, RTL, increased text size, safe-area insets, light and dark themes, screen-reader output, and older-host compatibility remain supported without adding mutable controls.

## Acceptance criteria

- A valid delta changes only the affected row, relevant group counts, header count, and progress hairline while preserving unaffected DOM identities.
- A stale delta is ignored without changing rendered task content or the current revision.
- A wrong `baseRevision` preserves the last valid view and starts a read-only snapshot refresh.
- Malformed or unsupported projections never reach rendered state.
- A state change produces one concise polite announcement containing the redacted title and localized status.
- Reduced motion disables update pulses and layout transitions, and background deltas do not auto-scroll the transcript.
- All-done rendering and restoration after a new pending, active, or blocked task are correct.
- Screen-reader output exposes provenance, title, state, group count, disclosure state, refresh name, and exact timestamps.
- RTL, text scaling, safe-area padding, 44pt controls, and wrapped titles remain usable without horizontal overflow; both themes meet WCAG AA with clay as the only todo accent.
- Content-free push, redaction, browser-cache, service-worker, transcript-JSON, diagnostic-log, older-client, and older-host compatibility checks pass, and the complete release gate exits 0.
