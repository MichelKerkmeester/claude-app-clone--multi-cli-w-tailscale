---
title: "Phase 3 implementation summary — chat message/transcript interactions (planned)"
description: "PLANNED stub for the message-level chat affordances (recs 3.1-3.6, 6.6) with the 3.7 exclusions: a per-turn scroll arrow, per-fence copy-code, a non-shifting whole-message tint confirm, flat tool-run folding, scoped selection-copy, a safe session action sheet that only dispatches existing host slash-commands, and file-link routing through the existing artifact viewer with an inert fallback. Nothing is implemented; implementation is deferred until the operator says go."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/003-chat-message"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Extended the PLANNED stub with nodeterm ND-4.1-4.8 affordances"
    next_safe_action: "Await operator go, then implement PHASE 1 setup"
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Planned |
| Requirements planned | REQ-001 … REQ-009 |
| State | Implementation deferred until the operator says go |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing yet — this is a plan. When implemented, the phase will add orca's verified message-level affordances
to the transcript: a per-turn "scroll this message to top" arrow (3.1) distinct from the jump-to-latest FAB;
an in-transcript per-fence copy-code button on the prose fences `safe-markdown.svelte` renders (3.2); a
non-shifting tint / icon-swap confirm on the whole-message prose Copy (3.3); tool-run folding recast into
flat `▸ ToolName` lines with call↔result pairing (3.4); scoped selection-copy anchored inside the transcript
root (3.5); a safe session action sheet with open / copy-id / refresh that forwards only existing host
slash-commands (3.6); and file-link routing through the existing artifact viewer with an inert "unavailable"
fallback (6.6). The ❌ set — regenerate, reply/quote, edit-and-resend, reactions, a per-message context menu,
in-conversation search (3.7) — will be recorded as backlog exclusions, not built.

The nodeterm pass (Angle 4) folds eight message-level affordances in beside the orca set. **ND-4.1
(headline)** — a transcript-wide find bar driven by a flat line index decoupled from the virtualized
`@tanstack/svelte-virtual` DOM, lowercased once per snapshot, `{i}/{count}` with wraparound and a role-tagged
snippet, reusing the `<mark>` primitive; it fills the orca 3.7 in-conversation-search gap, and search beyond
the loaded snapshot is a deferred ⚠️ host RPC. **ND-4.2/4.3** — a quantified copy receipt ("Copied N lines" /
"N chars") and a one-owner / never-green-beside-red copy-honesty invariant with a once-per-install coach.
**ND-4.4** — prose links split URL (open external ✅) from file path (inert unless host-referenced ⚠️, never
resolved directly ❌) for our relay-remote (no client fs) case. **ND-4.5** — sanitize-always plus
per-message-text memoization and raw-text-until-ready. **ND-4.6** — native `<details>` folding with null
result = in-flight. **ND-4.7** — a 5-state (`loading|ok|missing|unsupported|error`) transcript load taxonomy
that never renders an empty conversation for a `missing`/`unsupported`/`error` read and never blanks a
reloaded thread, superseding orca 5.8. **ND-4.8** — a body-portal, edge-flipped action menu with
disabled-plus-hint rows, SAFE read-only actions only.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Not yet delivered. The planned approach builds each affordance as pure interaction or layout over the
existing projection so no second source of truth appears. Copy paths reuse `use-copy-feedback.svelte.ts`; the
per-turn scroll uses `scrollIntoView` within `.transcript--scroll`; the flat tool-run recast keeps the
existing grouping helper and only changes presentation; selection-copy gates on
`window.getSelection()` containment within `.transcript--frame`; the session action sheet dispatches through
the existing `sendSlashDraft` host lane and reuses the `sheet-model-effort.svelte` pattern; file-links route
to `getOptionalArtifactViewer().openInMemory` / `openDiff` only for a host-supplied stable reference. Two ⚠️
edges (a real host-title rename RPC, a new authorized artifact reference) will ship as fail-closed fallbacks
with a pointer to `007-host-requests`. Proof will be a fail-closed review, token-identity 0-diff, an
a11y-parity check, and `test:web` — all from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**REC 3.6 dispatches, never mutates.** The session action sheet forwards existing host slash-commands
(`/rename`, `/archive`, `/new`, `/fork`) through the same `sendSlashDraft` lane a typed command uses; copy-id
copies the opaque id verbatim; refresh re-requests the host snapshot. A SvelteKit pencil that PATCHes a local
title is ❌ and out of scope. A real title-rename RPC is requested in `007-host-requests`.

**REC 6.6 routes only host-referenced artifacts.** `safe-markdown.svelte` already renders prose links as
inert plain text; the plan makes that inert state explicit ("unavailable") and routes a tap through the
artifact viewer only when the host supplies a stable reference. A markdown path / local URI / image URL is
never treated as permission; a NEW authorized reference is a host field deferred to `007-host-requests`.

**REC 3.4 is layout only.** The flat tool-run recast keeps the existing grouping and disclosure roles; the
call↔result pairing and in-flight marker derive from the projection, not new state, so token-identity and
a11y-parity are preserved.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Planned result |
|---|---|
| Fail-closed review | No client-owned session truth; selection scoped; file-links inert-or-routed (pending) |
| token-identity (transcript) | 0-diff vs baseline across three themes (pending) |
| a11y-parity | Preserved on every new control — label, focus, dismissal, live regions (pending) |
| `test:web` | Green from the final state (pending) |
| Traceability | Every task → a rec; 3.7 exclusions recorded (pending) |
| `validate.sh --strict` | exit 0 via realpath (pending) |

No check has run — implementation is deferred until the operator says go.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

Two edges cannot be fully closed on the client and are deferred to `007-host-requests`: a real session-title
rename needs a host RPC (REC 3.6 only dispatches the existing command string), and a bare prose file-link
with no host-supplied artifact reference stays inert "unavailable" until the host publishes an authorized
reference (REC 6.6). The ❌ set (REC 3.7) is recorded as backlog exclusions and is out of orca-copy scope —
edit/resend and regenerate would be host operations (new turns / fork identity) needing host RPCs and
reconciliation. From the nodeterm fold, the find bar (ND-4.1) is snapshot-scoped only — searching beyond the
loaded transcript window needs a host search RPC / `hasMore` token (⚠️, ties orca 6.4), deferred to
`007-host-requests`; and a prose file-path link (ND-4.4) stays inert "unavailable" until the host publishes an
authorized artifact reference. This document is a planned stub; no completion is claimed.
<!-- /ANCHOR:limitations -->
