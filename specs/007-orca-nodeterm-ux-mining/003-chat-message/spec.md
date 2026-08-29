---
title: "Phase 3 — Chat message & transcript interactions"
description: "Shipped orca message-level transcript affordances into the SvelteKit mobile client: per-turn scroll-to-top, per-fence copy, tint confirm, native tool folds, scoped selection-copy, a host-only session action sheet, http(s) vs inert file-path links, snapshot find bar, and five-state load. The ❌ 3.7 set except in-conversation search stays backlog."
trigger_phrases:
  - "chat message spec requirements"
  - "chat message packet"
  - "spec requirements"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/003-chat-message"
    last_updated_at: "2026-08-26T22:10:00.000Z"
    last_updated_by: "cursor-grok-4.6"
    recent_action: "Shipped find bar, five-state load, copy receipts, and native tool folds"
    next_safe_action: "None — snapshot find stays local until a host search RPC lands"
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 — Chat message & transcript interactions

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Research: [`../research/research.md`](../research/research.md) · Prev: `002-home-selection` · Next: `004-composer`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Implemented |
| Recs covered | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7 (exclusions), 6.6; nodeterm ND-4.1-4.8 (ND-4.1 fills 3.7 gap, ND-4.7 supersedes 5.8) |
| Constraint | Host-authoritative, fail-closed — the client owns no editable session metadata |
| Barrier | fail-closed (no client-owned session truth) + token-identity 0-diff + a11y-parity preserved + test:web green + every task → a rec |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Our transcript already renders typed blocks, per-answer Copy/Share, boxed evidence disclosures, a
virtualized list with live-edge follow, and a jump-to-latest pill. The verified research (Angle 3, plus
6.6 from Angle 6) names the message-level gaps orca closes that we do not: no per-turn navigation, copy-code
that lives only in the artifact viewer, a shifting copy confirm, dense tool runs boxed instead of flat, no
scoped selection-copy, no safe session action sheet, and file links with no explicit inert state.

This phase ports the ✅ set of those affordances. Every one operates on bytes already on screen
(`use-copy-feedback.svelte.ts`, the rendered transcript DOM), reuses an existing host command lane
(`sendSlashDraft`), or routes only through the existing artifact viewer — so none makes the client own or
edit session truth. The ❌ set orca itself lacks (regenerate, reply/quote, edit-and-resend, reactions, a
per-message context menu, in-conversation search) is recorded as backlog exclusions, not built. Two
worthwhile edges need a new host field (a real title rename, a new authorized artifact reference); those are
planned as fail-closed fallbacks here and requested in `007-host-requests`, so no task in this phase is
blocked.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope (the ✅ set):**

- **REC 3.1 — per-turn "scroll this message to top" arrow.** A per-turn control on each turn's lead block
  that scrolls that block to the top of `.transcript--scroll`; distinct from the list-level jump-to-latest
  FAB. Touches `pages/chat/transcript/block.svelte`, `pages/chat/transcript/normalized-transcript-block-view.svelte`,
  and `pages/chat/transcript/transcript-list.svelte`.
- **REC 3.2 — in-transcript per-fence copy-code button.** A Copy control on every fenced code block rendered
  in prose (`pages/chat/rich-content/safe-markdown.svelte`, which today renders `.safe-markdown--code` with
  no copy affordance), reusing `pages/chat/rich-content/use-copy-feedback.svelte.ts`. The rich-content code
  card (`pages/chat/rich-content/card-code.svelte`) already carries one; this closes the prose-fence gap.
- **REC 3.3 — whole-message copy with a transient tint confirm.** Adopt a non-shifting tint / icon-swap
  confirm (~700 ms, no toast) on the existing prose Copy in `pages/chat/transcript/assistant-actions.svelte`;
  tool/image blocks stay skipped (the actions row already receives prose text only).
- **REC 3.4 — tool-run folding into flat expandable lines.** Recast the boxed evidence group into flat
  one-line `▸ ToolName` previews with call↔result pairing (an unpaired call reads as visibly in-flight), a
  file-open tap that is independent of expand, and a global expand/collapse. Touches
  `pages/chat/transcript/normalized-activity-group.svelte`, `pages/chat/transcript/collapsed-evidence.svelte`,
  `pages/chat/transcript/block.svelte`, and the grouping in `pages/chat/transcript/transcript-helpers.ts`.
  Opening a file from a tool path routes through the existing artifact viewer only (see REC 6.6).
- **REC 3.5 — scoped selection-copy.** A long-press / bottom-sheet copy of the current selection, disabled on
  an empty selection and scoped to the transcript root (`.transcript--frame`, `aria-label="Typed transcript"`)
  so a selection anchored outside the region cannot be copied as this session's. Read-only; no host field.
- **REC 3.6 — safe session action sheet (safe actions only).** A "…" trigger on
  `pages/chat/chrome/session-header.svelte` opening a bottom sheet (built on the `sheet-model-effort.svelte`
  pattern) with **open / copy-id / refresh**, plus forwarding of the host slash-commands the child already
  understands (`/rename`, `/archive`, `/new`, `/fork`) by dispatching them through the existing
  `sendSlashDraft` lane in `pages/chat/chrome/session-composer.svelte`.
- **REC 6.6 — authorized file-link routing.** Resolve a file/link tap ONLY through the existing artifact
  viewer (`pages/chat/artifacts/artifact-viewer-provider.svelte` — `openInMemory` / `openDiff`) when the host
  supplies a stable artifact reference; otherwise keep the link inert with an explicit "unavailable" state.
  Touches `pages/chat/rich-content/safe-markdown.svelte` (prose links, which today render as inert plain
  text) and the routing in `pages/chat/rich-content/rich-content-router.svelte`.

**In scope (documentation only):**

- **REC 3.7 — record the ❌ exclusions as backlog exclusions:** regenerate, reply/quote, edit-and-resend,
  message reactions, a per-message context menu, and in-conversation search. orca native-chat lacks all six;
  they are our gaps, not ports. Recorded here and in §6; no code.

**In scope (nodeterm fold — ND-4.x, all ✅ with a few ⚠️ sub-cases):**

The nodeterm pass (`../research-nodeterm/`, Angle 4) folds eight message-level findings in beside the orca set:

- **ND-4.1 (HEADLINE, new)** — transcript-wide find bar (search-in-conversation): a flat line index decoupled
  from the virtualized `@tanstack/svelte-virtual` DOM, lowercased once per snapshot, `{i}/{count}` with
  wraparound and a role-tagged snippet, reusing the `<mark>` primitive; `next()` scrolls the virtualizer to an
  off-screen match. **Fills the orca 3.7 gap** — in-conversation search moves from a ❌ backlog exclusion to a
  ✅ shipped bar. Searching beyond the loaded snapshot is a ⚠️ host RPC (ties orca 6.4).
- **ND-4.2** — quantified copy receipt ("Copied N lines" vs "N chars", strip one trailing newline, null on
  empty); improves orca 3.3.
- **ND-4.3** — copy-affordance honesty (one owner per slot, never green beside red, a once-per-install
  `localStorage`-gated "hold to select" coach).
- **ND-4.4** — prose link split: we are the relay-remote (no client fs) case, so http(s) URLs open external
  (✅), file paths stay inert unless routed through the artifact viewer with a host ref (⚠️, reinforces orca
  6.6), and a path is never resolved directly (❌).
- **ND-4.5** — markdown = sanitize always + memoize per message text + raw-text-until-ready (never blank).
- **ND-4.6** — native `<details>` one-line tool folding, null result = in-flight; reinforces orca 3.4.
- **ND-4.7** — 5-state transcript load taxonomy (`loading|ok|missing|unsupported|error`, retryable-or-not; a
  reload never blanks a rendered thread). **Supersedes orca 5.8.**
- **ND-4.8** — portal-with-edge-flip action menu with disabled-plus-hint rows, SAFE read-only actions only.

**Out of scope:**

- Any client-owned session mutation — a SvelteKit pencil that PATCHes a local title, a device rename, pin,
  or archive that edits session truth (❌). REC 3.6 only *dispatches an existing host command string*.
- A real host-title rename RPC and any NEW authorized artifact reference for a prose file-link (⚠️) — those
  are requested in `007-host-requests`; this phase ships their fail-closed fallbacks only.
- Arbitrary local-file open — a markdown path, local URI, or image URL is never treated as permission (❌).
- The ❌ backlog features themselves (REC 3.7) — recorded, not built.
- Home, composer, streaming/ask, and navigation-correctness recs — other phases own those.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** (REC 3.1) — Each turn's lead block exposes a control that scrolls that block to the top of the
  transcript scroll region; it is visually and behaviourally distinct from the list-level jump-to-latest FAB
  and never mutates blocks or scroll follow-state.
- **REQ-002** (REC 3.2) — Every fenced code block rendered in prose exposes an in-transcript Copy that writes
  the block's canonical source to the clipboard, with the same fail-closed availability guard and copy
  announcer as the existing code card. Copy is unavailable (not faked) when the clipboard API is absent.
- **REQ-003** (REC 3.3) — The whole-message prose Copy confirms with a transient tint / icon-swap that does
  not shift layout, clears after ~700 ms, and shows no toast; tool and image content are never copied by it.
- **REQ-004** (REC 3.4) — Tool runs render as flat one-line `▸ ToolName` previews; a call with no result yet
  reads as visibly in-flight; expanding a line and opening its file are independent actions; a single control
  expands/collapses the whole run. No new session truth is derived — the grouping stays a projection.
- **REQ-005** (REC 3.5) — Selection-copy is disabled on an empty selection and copies only when the selection
  is anchored inside the transcript root; a selection outside the region is never copied as this session's.
- **REQ-006** (REC 3.6) — The session action sheet offers open / copy-id / refresh and forwards only host
  slash-commands through the existing dispatch lane. It never edits session metadata on the client; copy-id
  copies the opaque id verbatim; refresh re-requests the host snapshot.
- **REQ-007** (REC 6.6) — A file/link tap opens the existing artifact viewer only when the host supplies a
  stable artifact reference; with no stable reference the link is inert with an explicit "unavailable" state.
  No tap ever reads a local path, URI, or image URL directly.
- **REQ-008** (REC 3.7) — The six ❌ exclusions are recorded as backlog exclusions with their rationale; no
  client-owned message operation is implemented.
- **REQ-009** (invariants) — token-identity resolves 0-diff and `test:web` stays green from the final state;
  the a11y contract (roles, focus order, live regions, dismissal) is preserved; every task traces to a rec.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Recs 3.1-3.6 and 6.6 are each implemented against the cited real files, and 3.7 is recorded as backlog
   exclusions — every task traceable to a rec number.
2. No client-owned session truth is introduced: 3.6 dispatches existing host commands, 6.6 routes only
   host-referenced artifacts, and no rename/pin/archive/edit path writes session metadata locally.
3. token-identity resolves 0-diff and `test:web` is green from the final state; a11y-parity is preserved for
   every new control (labels, focus, dismissal, live regions).
4. The two ⚠️ edges (host-title rename, a new authorized artifact reference) ship as fail-closed fallbacks
   with a pointer to `007-host-requests`; no task is blocked on a host field.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A selection-copy leaks a foreign selection (REC 3.5).** If the scope check is loose, a selection anchored
  outside the transcript could be copied as this session's. Mitigation: gate on `window.getSelection()` anchor
  containment within `.transcript--frame`; disabled on empty selection. Verified by the fail-closed barrier.
- **A file-link tap becomes an arbitrary local-file open (REC 6.6).** A markdown path / local URI / image URL
  is not permission. Mitigation: route ONLY host-supplied artifact references through the viewer; everything
  else stays inert "unavailable". A new authorized reference is a host field (⚠️), deferred to
  `007-host-requests`; the fallback is the shipped behaviour.
- **REC 3.6 drifts into client-owned mutation.** A pencil that PATCHes a local title is ❌. Mitigation: the
  sheet only dispatches existing host slash-command strings through `sendSlashDraft`; a real title rename RPC
  is out of scope and requested in `007-host-requests`.
- **A flat tool-run recast changes rendered values or a11y (REC 3.4).** The recast is layout only. Mitigation:
  token-identity 0-diff, a11y-parity preserved, `test:web` green — the disclosure roles and pairing come from
  the existing grouping, not new state.
- **Dependencies.** `use-copy-feedback.svelte.ts` (copy + announcer), the artifact viewer context
  (`getOptionalArtifactViewer` / `openInMemory` / `openDiff`), the `sendSlashDraft` host lane, and the
  `sheet-model-effort.svelte` bottom-sheet pattern. Two ⚠️ items depend on `007-host-requests` (non-blocking).
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

- **Global expand/collapse placement (REC 3.4).** Whether the whole-run expand/collapse control lives on the
  activity group header or as a transcript-level affordance is a presentation choice to settle at
  implementation; both keep the grouping a pure projection.
- **Selection-copy surface (REC 3.5).** Long-press bottom sheet vs. an inline pill on selection — a UX choice
  that does not change the fail-closed scope rule.

These are presentation choices, not blockers. No host dependency gates this phase.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent (constraint, phase map, invariants).
- `../research/research.md` — Angle 3 (recs 3.1-3.7) and Angle 6 (rec 6.6), the verified synthesis.
- `../007-host-requests/` — the ⚠️ host-title rename RPC and the new authorized artifact reference this phase
  falls back from.
- `../../004-sveltekit-spa-migration/020-source-structure/` — the source/comment conventions new code follows.
<!-- /ANCHOR:cross-refs -->
