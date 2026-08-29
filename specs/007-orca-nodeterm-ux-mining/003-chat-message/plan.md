---
title: "Phase 3 plan — chat message/transcript interactions over existing seams"
description: "How the ✅ message-level recs (3.1-3.6, 6.6) plus ND-4.1-4.8 were built as pure interaction/layout over the existing transcript. Proven by fail-closed review, token-identity 0-diff, a11y-parity, and test:web."
trigger_phrases:
  - "chat message plan approach"
  - "chat message packet"
  - "plan approach"
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

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Build the ✅ message-level affordances as pure interaction and layout over the transcript we already render.
Copy-code and the whole-message tint confirm reuse `use-copy-feedback.svelte.ts`. The per-turn scroll arrow
attaches to each turn's lead block and scrolls within `.transcript--scroll`, kept distinct from the
list-level jump-to-latest FAB. Tool runs are recast from a boxed disclosure into flat `▸ ToolName` lines with
call↔result pairing. Selection-copy is scoped to the transcript root. A safe session action sheet dispatches
only existing host slash-commands. File-links route through the existing artifact viewer, inert otherwise.
The ❌ set is recorded, not built. Two ⚠️ edges ship as fail-closed fallbacks pointing at `007-host-requests`.
Proven by a fail-closed review, token-identity 0-diff, a11y-parity, and `test:web` — from the final state.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

- **Fail-closed.** No client-owned session truth: REC 3.6 only dispatches existing host slash-commands via
  `sendSlashDraft`; REC 6.6 routes only host-supplied artifact references and keeps everything else inert;
  no rename/pin/archive/edit writes local session metadata. Selection-copy (3.5) never copies a selection
  anchored outside the transcript root.
- **token-identity 0-diff.** CSS for the new controls and the flat tool-run recast resolves identically to
  baseline across the three themes; no rendered token changes.
- **a11y-parity preserved.** Every new control carries a real label; focus order, disclosure roles, dismissal,
  and the existing live regions are unchanged. The bottom sheet reuses the established sheet a11y pattern.
- **test:web green.** The web suite passes from the final state (verify by content — both suite summaries
  present — not by a piped tail exit code).
- **Traceability.** Every task cites its rec number; the ❌ exclusions are recorded.

All gates run from the final state before the phase closes.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The transcript is a projection of host-published blocks. Each affordance sits on top of that projection
without adding a second source of truth:

- **Copy paths (3.2, 3.3).** `use-copy-feedback.svelte.ts` already gives a fail-closed `copy(unit, source)`,
  a polite announcer, and a `copiedUnit` confirm signal. REC 3.2 adds a Copy control to the fenced blocks
  `safe-markdown.svelte` renders (`.safe-markdown--code`), writing the fence's canonical source. REC 3.3
  keeps the existing prose Copy in `assistant-actions.svelte` but swaps its confirm to a non-shifting tint /
  icon-swap that clears after ~700 ms — the copy input stays the prose `text` the actions row already gets,
  so tool/image content is structurally excluded.
- **Per-turn scroll (3.1).** `transcript-list.svelte` owns the virtual rows and the jump-to-latest FAB;
  `block.svelte` renders the per-block header. The per-turn control lives on the turn's lead block and calls
  `scrollIntoView` (block start) within `.transcript--scroll`; `.block--text` already reserves
  `scroll-margin-block`. It is a separate control from the FAB and does not touch live-edge follow state.
- **Flat tool-run folding (3.4).** Today `normalized-activity-group.svelte` wraps a stack of cards in a boxed
  `.activity--group` disclosure, and `block.svelte` renders tool_call / tool_result through
  `collapsed-evidence.svelte`. The recast keeps the grouping helper (`transcript-helpers.ts`,
  `normalize-transcript-blocks.ts`) but presents each tool as a flat `▸ ToolName` line; call↔result pairing
  marks an unpaired call in-flight; opening a file is a distinct tap routed through the artifact viewer
  (6.6); one control expands/collapses the run. Layout only — no new derived state.
- **Scoped selection-copy (3.5).** A long-press / bottom-sheet action reads `window.getSelection()`, is
  disabled on empty, and copies only when the anchor node is contained within the transcript root
  (`.transcript--frame`, `aria-label="Typed transcript"`). The scope guard is the fail-closed seam.
- **Safe session action sheet (3.6).** A "…" trigger on `session-header.svelte` opens a bottom sheet modelled
  on `sheet-model-effort.svelte`. open / copy-id / refresh are local/host-read actions; copy-id copies the
  opaque id verbatim; refresh calls the existing snapshot refresh. Forwarded slash-commands are dispatched
  through the existing `sendSlashDraft` lane — the same host revalidation path a typed `/command` uses. No
  client PATCH exists in this component.
- **Authorized file-link routing (6.6).** `safe-markdown.svelte` currently renders `[label](dest)` as inert
  plain text (destination dropped) — already fail-closed. The recast makes that inert state explicit
  ("unavailable") and routes a tap to `getOptionalArtifactViewer().openInMemory` / `openDiff` ONLY when the
  host supplies a stable artifact reference (as it already does for file_diff / inbound_image / in-memory
  blocks). A NEW authorized reference for a bare prose path is a host field (⚠️), deferred; the inert state
  is the fallback.

The ❌ set (3.7) is recorded as backlog exclusions with rationale; nothing is implemented for it.

**nodeterm fold (ND-4.x).** Eight message-level findings layer onto the same projection:

- **Find bar — flat index decoupled from the DOM (ND-4.1), load-bearing.** Our list is virtualized
  (`@tanstack/svelte-virtual`), so off-screen matches are NOT in the DOM and browser find cannot reach them.
  The find bar therefore builds a flat `SearchSnippet[]` line index over the loaded snapshot when it opens —
  a model that outlives what is currently mounted — lowercased ONCE per snapshot (not per keystroke), with a
  1-based `matchIndex` / `matchCount` and `next()` / `prev()` wraparound. `next()` scrolls the virtualizer to
  match N and highlights it with the existing `<mark>` primitive (`artifacts/text-preview.svelte` /
  `code-preview.svelte`), rather than relying on the browser's own find. This same
  flat-model-decoupled-from-mounted-rows pattern is the shared substrate for per-turn scroll (3.1) and
  jump-to-latest. Searching beyond the loaded snapshot needs a host search RPC / `hasMore` token (⚠️, ties
  orca 6.4), deferred to `007-host-requests`; snapshot-scoped find ships first. This fills the orca 3.7 gap.
- **Copy receipt + honesty (ND-4.2, ND-4.3).** `use-copy-feedback.svelte.ts` gains a quantified label
  ("Copied N lines" / "N chars", one trailing newline stripped, null on empty) and an explicit one-owner /
  never-green-beside-red invariant, plus a once-per-install `localStorage`-gated "hold to select" coach.
- **Prose links (ND-4.4).** We are the relay-remote (no client fs) case: `safe-markdown.svelte` opens http(s)
  URLs external, keeps file paths inert "unavailable" unless routed through the artifact viewer with a host
  reference (reinforces 6.6), and never resolves a path directly.
- **Markdown (ND-4.5).** Sanitize-always stays; add per-message-text memoization so a turn-finish does not
  re-parse the transcript, and raw-text-until-ready so an async-highlighted block never blanks.
- **Tool folding (ND-4.6).** Native `<details>` one-line folding where a group is a single call+result, null
  result = in-flight — reinforces the 3.4 recast.
- **Load taxonomy (ND-4.7).** `screen-chat.svelte`'s empty/error state becomes the 5-state
  `loading|ok|missing|unsupported|error` split (retryable-or-not); a `missing`/`unsupported`/`error`
  transcript never renders as an empty conversation and a reload never blanks a rendered `ok` thread —
  supersedes orca 5.8.
- **Action menu (ND-4.8).** The long-press menu renders as a body portal (our list is `overflow`-clipped),
  flips away from the bottom edge, and shows disabled rows with a hint — SAFE read-only actions only.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · setup
Confirm the reusable seams (`use-copy-feedback.svelte.ts`, the artifact viewer context, `sendSlashDraft`, the
`sheet-model-effort.svelte` pattern, the `.transcript--frame` / `.transcript--scroll` roots). Capture the
token-identity and `test:web` baselines. Record the REC 3.7 backlog exclusions.

### Phase 2 · implementation
Build recs 3.1-3.6 and 6.6 against the cited files: the per-turn scroll control, the per-fence copy-code, the
non-shifting tint confirm, the flat tool-run recast, the scoped selection-copy, the safe session action
sheet, and the authorized file-link routing with the inert "unavailable" fallback. Keep every ⚠️ edge as a
fail-closed fallback with a pointer to `007-host-requests`.

### Phase 3 · verification
Run the fail-closed review (no client-owned session truth; selection scope; inert-vs-routed links), the
token-identity 0-diff, the a11y-parity check on every new control, and `test:web` — all from the final state.
Confirm every task traces to a rec and the exclusions are recorded.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Behaviour is proven by `test:web` (interaction, copy availability, scope guards, dispatch lane) plus the
component stories that already exist for these surfaces. token-identity is the value oracle for the CSS of
the new controls and the flat recast. a11y-parity is checked per new control (label, focus, dismissal, live
region). The fail-closed review is a manual barrier: it confirms selection scope, the inert-vs-routed link
decision, and that REC 3.6 only dispatches existing host commands. All run from the final state.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- `pages/chat/rich-content/use-copy-feedback.svelte.ts` — copy + polite announcer + `copiedUnit` confirm.
- `pages/chat/artifacts/artifact-viewer-provider.svelte` — `getOptionalArtifactViewer`, `openInMemory`,
  `openDiff` (the only authorized file/artifact route).
- `pages/chat/chrome/session-composer.svelte` — the `sendSlashDraft` host dispatch lane (REC 3.6 forwarding).
- `pages/chat/chrome/sheet-model-effort.svelte` — the bottom-sheet a11y/interaction pattern to reuse.
- The token-identity CSS resolver and the `test:web` suite for the final-state gates.
- `007-host-requests` — the ⚠️ host-title rename RPC and the new authorized artifact reference (non-blocking).
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

All changes land under `app-mobile/src/pages/chat/` (transcript, rich-content, chrome, artifacts). No host,
schema, or data migration is involved. `git checkout -- app-mobile` restores the prior transcript; each rec
is an additive, independently revertible control, so a single affordance can be backed out without disturbing
the others.
<!-- /ANCHOR:rollback -->
