<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 5 — Transcript & message blocks

## Summary

This grandchild migrates the virtualized transcript — the list, the per-kind message block
renderer, the Activity grouping, the assistant actions, and the file-preview card — onto the token
library and the `@ds` inline-comment grammar, with per-state seams for every block kind and for the
empty, streaming, and not-at-live-edge states. It is value-preserving and keeps the transcript
virtualized; row heights do not change.

## Problem & Goal

The transcript renders ~9 block kinds plus streaming, empty, and live-edge states with hand-styled
rules inside `App.tsx`. A designer cannot restyle how a tool-error block, a streaming marker, or the
assistant serif prose looks without reading the block-switching and virtualization logic. The goal
is a transcript whose block kinds and states each sit behind an `@ds state:` seam reading from
tokens, so a designer can restyle any block or state while the virtualization, turn-grouping, and
block-normalization logic stay fenced.

## Scope

### In scope

- Migrating `TranscriptList` (the virtualized list, live-edge marker, scroll-to-latest pill with
  new-count badge, and sr-only announcer) onto tokens and layout seams.
- Migrating `Block` — the per-kind renderer — with one `@ds state:` block per kind: `text`
  (user bubble / assistant serif prose), `thinking`, `plan` (todo checklist), `tool_call`,
  `tool_result` (with error styling), `file_diff`, `file_preview`, `usage`, `unknown`.
- Migrating `ActivityGroup`, `CollapsedEvidence`, `AssistantActions` (Copy/Share with the "Copied"
  state), `FilePreviewCard` (ready / withheld / missing / denied / unsupported), and
  `RuntimeStatusRegion`.
- Per-state seams for the empty, streaming (`running` → "Working…"), and not-at-live-edge states.

### Out of scope

- The rich-content command/output, code, and text-artifact cards (grandchild `010` slots into the
  seam this grandchild leaves for them).
- The artifacts viewer shell and previews (grandchild `011`), and the plan cards/sheets
  (grandchild `009`).
- Any change to virtualization, turn-grouping, block-normalization, streaming, or transport logic —
  presentation only; row heights must not change.
- Any security, redaction, ticketing, or plan-mode change.

## User-facing behavior + states

Unchanged. The transcript shows: **empty** ("No transcript blocks yet"); **streaming**
(`running` → `.streaming-marker` "Working…" with a pulsing glyph); **not-at-live-edge** (a
scroll-to-latest pill with a new-count badge); each block kind (user bubble, assistant serif prose,
thinking, plan/todo checklist, tool_call, tool_result with error styling that stays expanded,
file_diff card, file_preview card, usage grid, unknown notice); the Activity disclosure collapsed;
and AssistantActions in default / "Copied". Each renders identically to today in both themes.

## Acceptance criteria

- `TranscriptList`, `Block`, `ActivityGroup`, `CollapsedEvidence`, `AssistantActions`, and
  `FilePreviewCard` declare `@ds surface:` and one `@ds state:` block per kind/state, reading from
  tokens only.
- Every block kind and the empty / streaming / not-at-live-edge states render identically to today
  in both themes.
- The transcript stays virtualized (`@tanstack/react-virtual`); measured row heights are unchanged.
- Virtualization, turn-grouping, normalization, streaming, and transport logic are unchanged and
  fenced with `@ds guardrail`.
- The `Block` renderer leaves a documented seam where the rich-content card group (grandchild `010`)
  will slot in.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of the transcript states are visually identical to the pre-migration baseline.

## Security & Redaction

Styling-only over already-redacted transcript content. No virtualization, transport, redaction,
ticket, plan-mode, or host-file path is touched; the transcript stays read-only. No new dependency
is added.

## Dependencies & affected areas

- Transcript: `apps/pi-remote-web/src/App.tsx` (`TranscriptList`, `Block`, `ActivityGroup`,
  `CollapsedEvidence`, `AssistantActions`, `FilePreviewCard`, `RuntimeStatusRegion`).
- Block model and grouping (read/confirm, not re-architected): `apps/pi-remote-web/src/turns.ts`,
  `apps/pi-remote-web/src/state.ts`.
- Transcript styling: `apps/pi-remote-web/src/style.css` (block, activity, streaming-marker,
  scroll-to-latest, assistant-actions rules).
- Inbound: grandchildren `001`–`003`. Outbound: grandchild `010-rich-content-cards` slots into the
  `Block` seam.
- Baseline evidence: `scripts/design-system-cdp.mjs` with transcript fixtures (empty, streaming,
  each block kind).
