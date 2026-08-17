<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Grandchild 10 — Rich content cards

## Summary

This grandchild absorbs the Claude-style rich content cards — the Bash Command/Output card, the code
card, and the text-artifact card — into the design system. **These cards do not yet exist on `main`:
they are being built in parallel as feature `006-rich-content-blocks` on a separate worktree branch,
and this grandchild depends on that branch merging into `main` first.** Once merged, it migrates the
cards onto the token layers and the `@ds` grammar as a value-preserving restyle over already-redacted
content, with no new mutation and no host-file read.

## Problem & Goal

The rich content cards render the transcript content `pi` already sends (shell command/output, fenced
code, substantial text) as polished inline cards with unit-level Copy and a full-screen Open into the
shared viewer. They are authored fresh on the parallel branch and will land with their own bespoke
rules and states. The goal is to bring them onto the same token library and `@ds` grammar as every
other surface so a low-code designer can adjust their styling, slots, layout, and each lifecycle state
safely — rather than letting a freshly merged surface diverge from the system.

## Scope

### In scope

- After the `006-rich-content-blocks` branch merges: migrate the command/output, code, and
  text-artifact cards and their shared frame onto the semantic and component token layers.
- Apply the `@ds` grammar: `@ds surface:` per card, `@ds slot:` for the command / output / code /
  label / preview / actions regions, `@ds edit: layout` for the card and preview layout, and one
  `@ds state:` block per lifecycle and copy state.
- Cover every visual state as its own labelled seam: command lifecycle (running-tail, completed-top,
  malformed-fallback); code (plaintext-first, progressively highlighted); copy (success, failure,
  unavailable); and the full-screen Open handoff into the artifacts viewer.
- Fence the safe-Markdown renderer, the clipboard boundary, and the no-fetch/no-ticket wiring behind
  `@ds guardrail: do-not-edit`.

### Out of scope

- Any change to a frozen source value or to Inter + Source Serif 4.
- Building the cards themselves — they are built by feature `006-rich-content-blocks`; this
  grandchild only migrates them onto the system after they merge.
- Any new mutation, host-filesystem read, artifact-resource endpoint, download, or file share, and
  any change to the safe-Markdown sanitization or the exact-copy clipboard behaviour.
- The artifacts viewer shell the cards Open into — that is grandchild `011`; this grandchild reuses it.

## User-facing behavior + states

No behaviour change relative to the merged cards. Each card renders identically after migration: the
same running-tail vs completed-top command presentation, plaintext-first code with optional
highlighting, the same Copy success/failure/unavailable affordances, and the same full-screen Open —
now driven by tokenized, comment-labelled `@ds state:` blocks.

## Acceptance criteria

- The command/output, code, and text-artifact cards read their colours from the semantic and
  component tokens; no raw source value is hard-coded in their rules.
- Each card declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block per
  lifecycle and copy state; the safe-Markdown, clipboard, and no-fetch wiring carries `@ds guardrail`.
- The cards render identically to their as-merged baseline in light and dark across every state.
- The dependency is honoured: this grandchild is not started until `006-rich-content-blocks` has
  merged into `main`.
- `npm run typecheck`, `npm test`, `npm run test:web`, and `npm run build` pass; the true-390px
  light/dark captures of the cards are visually unchanged from their as-merged baseline.

## Security & Redaction

Styling-only, over already-redacted content. The migration adds no mutation, no host-file read, no
artifact endpoint, no download, and no file share, and preserves the safe-Markdown sanitization and
the exact-copy clipboard behaviour; all of that stays behind `@ds guardrail` comments and unchanged.
No new dependency is added. The frozen read-only-by-default posture is preserved verbatim.

## Dependencies & affected areas

- **Hard dependency:** feature `../../../002-pi-remote-mobile-ui-ux-features/006-rich-content-blocks/`
  must be built and merged into `main` first; the cards are absent from `main` today.
- Surface (once merged, anticipated): `apps/pi-remote-web/src/rich-content/CommandOutputCard.tsx`,
  `CodeCard.tsx`, `TextArtifactCard.tsx`, `RichContentRouter.tsx`, `RichBlockFrame.tsx`,
  `SafeMarkdown.tsx`.
- Styles: the rich-content card rules in `apps/pi-remote-web/src/style.css` (added by the merge).
- Consumes: grandchild `011-artifacts-viewer-previews` (the full-screen viewer) and the token library.
- Tests: the rich-content card and safe-Markdown tests under `apps/pi-remote-web/tests/`.
- Baseline evidence: `scripts/design-system-cdp.mjs` with the rich-content fixtures.
