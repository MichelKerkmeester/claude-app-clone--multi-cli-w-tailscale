---
title: "Phase 4 implementation summary — composer / input (planned)"
description: "Planned stub for the composer phase (recs 4.1–4.8). Implementation is deferred until the operator says go: image-or-text send with a never-disabled textarea and exact-draft-restore, line-leading slash + suggestion cap, a device-local prompt-history recall sheet, paste-image classification into the existing attachment lease, on-device dictation as an editable draft, action-row option pickers, and the model/effort reconciliation bug-fixes; the ⚠️ @-file search and paste enablement are planned against 007-host-requests. No completion claims."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/004-composer"
    last_updated_at: "2026-08-26T05:54:46.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Planned composer recs 4.1–4.8 against real files; implementation deferred."
    next_safe_action: "Await operator go, then implement Phase 2 per rec, then prove Phase 3 barriers."
    blockers:
      - "rec 4.2 @-file search needs a host file-search RPC (requested in 007-host-requests)."
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 4 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `007-orca-nodeterm-ux-mining` |
| Level | 2 |
| Status | Planned |
| Requirements | REQ-001 … REQ-008 (all planned; none shipped) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing yet — implementation is deferred until the operator says go. When built, this phase will land the
eight Angle-4 composer recommendations over the real composer files. The ✅ set will ship as pure view state
/ interaction: image-or-text send with the `<textarea>` never disabled on a transient lock and the exact raw
draft restored when the host rejects a send (rec 4.1); the line-leading slash rule confirmed and the
suggestion list capped at 12, sourced from the host catalog (rec 4.3); a device-local prompt-history recall
sheet of this session's sent prompts (rec 4.4); on-device dictation as an editable local draft with a
fail-closed setup sheet (rec 4.6 fallback); the model/effort pickers reachable from the composer action row
with send disabled during a host option dispatch (rec 4.7); and the model/effort-sheet reconciliation
bug-fixes — refuse to commit with an unknown baseline, never revert a staged pick on an identical re-report
(rec 4.8). The ⚠️ set will ship inert behind a host capability: paste-image classification into the existing
attachment lease (rec 4.5, gated on `mediaCapability.enabled`) and the `@`-file mention UI shape over a new
host file-search RPC (rec 4.2, deferred to `007-host-requests`).
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The shared stateless seams will be extracted first — the device-local prompt-history filter in
`shared/state/state.ts` (beside the existing `readComposerShiftTabPreference` pattern) and the `@`-mention
trigger predicate in `shared/commands/` (a pure sibling to `deriveSlashTrigger`) — each with a canonical
differential test, and the composer token-identity + test:web baseline captured. Each recommendation will
then land on its cited file around the composer's existing mutation seam without crossing it: the send gates
already carry every lock, so rec 4.1 only narrows the `disabled` predicate, rec 4.3 only adds a cap to an
already host-sourced list, rec 4.5 reuses the whole existing chips + media-lease pipeline, and rec 4.8 adds
two guards to `canCommit`. The set will be proven by fail-closed inertness checks (the authoritative gate),
token-identity on the existing composer CSS, test:web with the reconciliation regression tests, and
a11y-parity — all from the final state.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Keep the textarea editable through transient locks (rec 4.1).** Today the composer disables the
`<textarea>` on `sendingPrompt`, `slashSubmitting`, and `attachmentSubmission.busy`; on iOS that yanks the
keyboard mid-send. The plan moves those transient locks OFF the textarea and keeps them only on the send
gate, so editing survives a send while sending itself stays correctly gated.

**Reject orca's typed-`/model`-into-the-TUI; keep our host-RPC sheet (rec 4.8).** orca's option rows are a
terminal remote-control pattern; our `sheet-model-effort.svelte` is already the portable host-RPC equivalent.
Only the reconciliation *bugs-to-avoid* are adopted — refuse to commit with no known baseline
(`current === null`), and never revert a staged pick on an identical host re-report.

**⚠️ items ship inert, never invented on the client.** `@`-file search performs no device filesystem walk and
stays inert until a host file-search RPC lands; paste-image routes only through the existing media lease and
does nothing when the host media capability is off; on-device dictation is an editable local draft the user
confirms before send, never host truth. The host fields are tracked in `007-host-requests`.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Planned result |
|---|---|
| Fail-closed inertness (authoritative) | Every ⚠️ affordance does nothing without its host capability — pending |
| Pure-seam differential + boundary tests | Prompt-history filter + `@`-trigger predicate vs canonical — pending |
| Token identity (composer CSS) | 0 diffs on existing surfaces from the final state — pending |
| test:web | Green, incl. send-gating, slash-panel, attachment, and rec 4.8 reconciliation suites — pending |
| a11y-parity | Live regions, listbox aria, sheet dialog semantics, focus return preserved — pending |
| Traceability | Every task → a rec number (4.1–4.8) — defined |
| `validate.sh --strict` | exit 0 via realpath — pending |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

This is a plan, not an implementation — no code has been written and no completion is claimed. Two
recommendations are host-blocked: rec 4.2 (`@`-file mentions) cannot function until the host publishes a
file-search RPC, and rec 4.5 paste-upload only works when `mediaCapability.enabled` is on; both ship inert
behind their capability rather than being invented on the client. rec 4.6 host STT stays ⚠️ — only the
on-device editable-draft fallback ships. All three host dependencies are recorded in `007-host-requests`.
Implementation is deferred until the operator says go.
<!-- /ANCHOR:limitations -->
