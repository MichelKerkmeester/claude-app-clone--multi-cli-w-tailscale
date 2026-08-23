---
title: "Child 002 implementation summary — verbatim ports and shared a11y primitives"
description: "What landed at L1, the patterns it established for every later child, and the verification bar that was too low to catch the accessibility losses 007 later found."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/002-ports-and-primitives"
    last_updated_at: "2026-08-23T09:50:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 implementation summary

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | Complete — with one requirement satisfied later, in 007 |
| Requirements shipped | REQ-001, REQ-003, REQ-004 here; REQ-002 completed in 007 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

**The ports.** Every framework-agnostic file copied with import-path edits only: `relay.ts` whole,
including `openSyncSocket` and the ticket, attachment and transcript surfaces; `state.ts` with
`connectionReducer`, `sessionListReducer` and `transcriptReducer`; `cache.ts`, `auth.ts`, `effort.ts`,
`demo.ts`; the pure halves of `runtime.ts` and `commands.ts`; and both workers.

**The primitive layer.** Twenty files under `shared/primitives/`. `Button.svelte` plus compound
wrappers over Bits UI — `Sheet` with `SheetContent`, `SheetTitle` and `SheetClose`; `Menu` with
`MenuTrigger`, `MenuContent` and `MenuItem`; `ToggleGroup`, `RadioGroup`, `Collapsible` — and
`interactions.ts`, the shared `use:` actions that keep hover, press and focus-visible state selectors
working after react-aria is gone.

**The reference pattern.** A plain `.ts` file for pure logic and a sibling `*.svelte.ts` factory for
the runes wrapper. Five factories follow it today, and every later child copied the shape.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

Executor-written in parallel disjoint units — the ports and the primitives share no file, which is
what made concurrency safe on a single worktree — with Claude verifying each independently before the
barrier.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

**Ports are verified by diff, not by test.** A copied file's correctness question is "did anything
change", and a diff answers that directly. Writing tests to confirm unchanged logic would have been
an indirect answer to a direct question.

**Primitives wrap rather than reimplement.** Bits UI supplies dialog and menu behaviour; these files
supply only the project's attribute contract, because the CSS state selectors depend on specific
attribute names surviving. Re-solving focus management locally would have been both more work and
less correct.

**Compound primitives are split into composable parts.** `Sheet` is four files rather than one wrapper
threading slots through. Consumers compose the parts they need, which keeps each file small enough to
read in one screen — the whole point of the migration.

**`Switch` was deliberately not built.** It has exactly one consumer, and `PushSettings.svelte`
hand-rolls `role="switch"` instead. A shared wrapper over a single call site is an abstraction with
nothing to abstract over.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|---|---|
| `svelte-check` across new files | clean |
| `npm run typecheck` | 0 |
| Primitive smoke stories, light and dark | pass, no throw |
| Attribute contract per primitive | asserted |
| Claude diff review of the ports | no logic drift |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

**The verification bar here was too low, and it mattered.** Smoke stories asserted that each attribute
the CSS depends on was present. That says nothing about whether focus is trapped inside a dialog,
whether the background is hidden from assistive technology, or whether interact-outside dismissal
works. Those behaviours came free with react-aria and did not come free with Bits UI.

The consequence surfaced only in 007: **3 P0 and 7 P1 accessibility regressions**, plus roughly 10 P2
items, all originating in this layer's swap. Among them the `Sheet` losing `ariaHideOutside`, menus
letting Tab escape, `ToggleGroup` losing `role="radiogroup"`, and model search losing
`aria-activedescendant` virtual focus, which breaks iOS VoiceOver. None of them were visible to
token-identity, CDP or the backend suite, and none of them were visible to a smoke story either.

REQ-002 is therefore satisfied **as of 007**, not as of this child. Recording it that way is the
point: the layer shipped green against a bar that could not see what it needed to see.

**The `Button` estimate was well off.** The spec projected roughly 176 call sites; the primitive is
used at 47 sites across 17 files, with 52 native `<button>` elements elsewhere. The estimate counted
React call sites that did not all become primitive consumers. No harm done, but the number should not
be quoted forward.
<!-- /ANCHOR:limitations -->
