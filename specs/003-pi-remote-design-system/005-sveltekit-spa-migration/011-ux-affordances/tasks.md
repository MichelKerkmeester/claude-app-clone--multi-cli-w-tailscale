---
title: "Child 011 tasks — post-migration UX affordances"
description: "Task ledger for operator-requested visual affordances on the shipped Svelte app."
contextType: "implementation"
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 1 -->

# Child 011 tasks

---

## R1 — Glass scroll-to-latest control

- [x] **T1.1** Confirm the affordance already exists rather than building a second one.
      Found at `TranscriptList.svelte:260` — 2.75rem circular button, down-chevron, centred above
      the composer, revealed on `!atLiveEdge` (96px threshold), unread badge, hidden while the
      slash palette is open, `followToBottom()` on tap.
- [x] **T1.2** Identify the app's established glass idiom instead of inventing one.
      `Header.svelte:83` and `SessionHeader.svelte:282` both use
      `color-mix(in oklch, <surface> 90–91%, transparent)` + `backdrop-filter: blur(12px)`.
- [x] **T1.3** Append the `@supports`-guarded glass layer, leaving the opaque base rule intact.
- [x] **T1.4** Append the `prefers-contrast: more` opaque fallback with the `--line-strong` carry.
- [x] **T1.5** Verify the frozen token set is untouched — `token-identity.mjs verify`: 35 goldens
      matched across light/dark/system.
- [x] **T1.6** Verify behaviour did not move — diff is 29 insertions / 0 deletions.
- [x] **T1.7** Board: build RC 0, typecheck 0 errors, Svelte suite 530 passed.

## Deferred

- [ ] **T1.8** Confirm the glass reads correctly on device. The CDP gate screenshots the built
      preview at 390px and can show the control's rendered surface, but "does this look like the
      Claude app" is an operator judgement, not a machine check.
