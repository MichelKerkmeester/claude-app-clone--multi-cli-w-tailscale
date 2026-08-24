---
title: "Child 011 implementation summary — post-migration UX affordances"
description: "What shipped in the UX-affordances packet, how it was verified, and what remains an operator judgement rather than a machine check."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/011-ux-affordances"
    last_updated_at: "2026-08-24T17:58:13.688Z"
    last_updated_by: "claude-opus-5"
    recent_action: "REQ-001 glass scroll-to-latest shipped; board green."
    next_safe_action: "Operator confirms the glass on a device (T3.4)."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 011 implementation summary

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 1 |
| Status | Complete |
| Requirements shipped | REQ-001, REQ-002 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

**REQ-001 — the scroll-to-latest control now uses the app's glass idiom.**

The affordance itself was already shipped and correct: a circular chevron above the composer,
revealed once the reader leaves the live edge, carrying an unread-count badge and hiding itself while
the slash palette is open. Only its surface was solid.

Three cascade layers now govern that surface:

1. the original opaque `var(--surface-raised)` rule, untouched, acting as the fallback;
2. an `@supports (backdrop-filter: blur(12px))` block applying
   `color-mix(in oklch, var(--surface-raised) 88%, transparent)` plus the blur;
3. a `@media (prefers-contrast: more)` block restoring an opaque surface with the `--line-strong`
   border.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

A single append-only edit to the scoped `<style>` in
`app-mobile/src/pages/chat/transcript/TranscriptList.svelte`, plus this packet. The change was made
directly rather than dispatched, because styling and token composition sit outside the executor's
permitted surface.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

**The glass rules are guarded by `@supports`, and the opaque rule stays as the base.** Without a real
backdrop blur, a translucent button would sit over unblurred transcript text and hurt the legibility
of both — worse than the solid control it replaced. The guard makes the degraded case the *original*
case rather than a broken one.

**High contrast gives up the glass entirely.** Translucency lowers the chevron's effective contrast
against whatever scrolls behind it, so `prefers-contrast: more` returns an opaque surface and the
stronger border, matching what the app already does for its other raised surfaces.

**88%, not the headers' 90–91%.** A small floating control needs slightly more translucency than a
full-width bar to read as glass at that size. This is the one value most likely to need an operator
adjustment.

**The change is append-only by design.** The control's reveal logic sits behind a
`@ds guardrail: do-not-edit` fence, so appending rather than editing makes "behaviour did not move"
provable from the diff shape alone.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Check | Result |
|---|---|
| `token-identity.mjs verify` | PASS — 35 `--pi-*` goldens matched across light/dark/system |
| `npm run build -w @pi-remote/web` | RC 0 |
| `npm run typecheck -w @pi-remote/web` | 0 errors, 1123 files |
| Svelte component suite | 65 files, 530 passed, 3 skipped |
| Catalog smoke (CDP, both themes) | 267 stories × 2 = 534 frames, 0 throws |
| Diff shape | 29 insertions, 0 deletions — the structural proof for success criterion 2 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

**Success criterion 1 was closed by a person, not a machine.** Whether the control *reads* as glass —
and whether 88% is right at this size — is an operator judgement on a real device, and the operator
has now made it. The CDP gate proves the page renders at 390px without overflow; it never could
adjudicate whether the surface looks correct, which is why the packet stayed open after every gate
was already green.

**No automated regression protects the glass itself.** Asserting a computed `backdrop-filter` string
under jsdom would test the stylesheet rather than the product, so the protection here is the
surrounding behaviour suite plus the zero-deletions diff, not a new assertion.
<!-- /ANCHOR:limitations -->
