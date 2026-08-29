---
title: "Phase 15 implementation summary — Storybook designer adjustability"
description: "A designer could read every surface in the catalog and change almost nothing about it. Three additions close that: a playground that retunes the design system and moves every story at once, derived controls that reach the state hidden behind object props, and a reference that reads the system's own record of what may be changed. Measuring first showed one planned item was already done and did not need building."
trigger_phrases:
  - "adjustability summary"
  - "catalog state visibility gate"
  - "check classification visible"
  - "streaming state inert control"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability"
    last_updated_at: "2026-08-29T15:05:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Closed the four control defects; added the negative-controlled visibility gate."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 15 implementation summary — Storybook designer adjustability

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | The catalog: 337 stories across 101 components |
| **Commits** | `822b436`, `9b8af0e`, `500a4da` |
| **Executors** | Grok 4.6 xhigh via Cursor and GPT-5.6 Luna xhigh via Codex, on disjoint story files |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **A token playground.** Every custom property the stylesheets declare on `:root`, read from the
  CSSOM so the list cannot drift, grouped and editable. A change applies to every story, not just the
  page that made it, and persists for the browser. It writes no stylesheet: the export is a `:root`
  block to paste, so the token gate stays the one authority on what a token is.
- **A warning the playground gives for free.** A token whose light and dark values differ is
  labelled, because an override pins it flat across both. That is the exact shape of the defect that
  made a whole theme render text in its own background colour earlier in this packet.
- **Derived state controls on every page view.** Home, SessionCard, TranscriptList, Chat, Review,
  AttentionInbox, Enrollment and the SessionComposer expose plain args — roster and queue state,
  counts, streaming state, attachments, plan mode, capability flags — that the story maps onto the
  real props. The components never learn those args exist.
- **A reference for what may be changed.** The design system already records its editable seams and
  frozen rules as comments beside the code. A page now reads those markers out of the components and
  the stylesheet at build time: 100 seams across layout, tokens, contrast, surface and motion, and
  185 frozen notes over 58 files.
- **A gate for the defect class this phase kept finding.** `scripts/catalog-state-visibility.mjs`
  asserts three things no other gate can express: that each check classification paints differently
  from the others, that a control renders a difference at the block count its own stories use, and
  that no story reports an age the pinned clock makes impossible. Every one of its checks exists
  because that exact failure shipped green through typecheck, both suites, story coverage and the
  render gate.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Measurement before construction, which changed the plan. The intent had been to write typed controls
into every story file. Reading the catalog first showed that unnecessary: across 101 components, every
prop that can carry a control already had one, derived from the prop types, and the 482 without
controls are callbacks and snippets that correctly get none. Writing those files would have duplicated
an inference that already works and would have rotted against it. The same measurement found the real
gap — 142 props resolve to a raw object editor — which is what the derived controls address.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The catalog is the editor; no external service.** A hosted visual editor cannot work here and the
  reason is structural rather than preferential: the policy is `default-src 'self'` with a release
  check asserting it, and the relay serves `frame-ancestors 'none'`, which is exactly the mechanism
  such an editor depends on.
- **Tooling lives outside `src`.** The playground and the reference sit in the catalog's own folder,
  so nothing reaches the app bundle and the coverage scan is untouched.
- **Story hosts, never production API.** A first attempt added a prop to one component and a slot to
  another whose comment marks its wiring frozen. Both were reverted and replaced with allowlisted
  wrappers that compose the real components.
- **The reference is one page, not per-story autodocs.** Generated text in a hundred story files rots
  against the source; a page that reads the source at build time cannot.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- A retune reaches other stories: `--accent` in `views-header--default` reads `#d97757`, then
  `#00ff00` with an override stored, then `#d97757` once cleared.
- That check is persisted as `scripts/token-override-check.mjs`, so the mechanism keeps being proven
  rather than having been proven once. It is end-to-end by construction: it stores the override the way
  the playground does, navigates to a different story, and reads the computed value there.
- The gate is negative-controlled. Deleting the preview's `beforeEach` hook and rebuilding makes it
  report `NOT APPLIED` and exit 1; restoring the hook and rebuilding returns `APPLIED` and exit 0. The
  green therefore means the hook, not something incidental. That hook is the whole mechanism and
  nothing else in the repository fails when it is removed — typecheck, both suites, story coverage and
  the token gate all stay green while a designer's retune silently stops reaching other surfaces.
- Controls are proven behavioural, not merely present: roster ready to empty takes rendered cards
  2/0, session count 1 to 4 gives 1/2, block count 1 to 6 grows the transcript 194/698 characters.
- `npm run typecheck -w @pi-remote/web` — 1250 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — exit 0; 114 files / 782 passed + 3 skipped, and 83 files / 772 passed.
- `node scripts/story-coverage.mjs`, `node scripts/css-comment-integrity.mjs` and
  `node scripts/token-identity.mjs verify app-mobile/src/app.css` all pass.
- `git status --porcelain screenshots` reports only the pages this work adds and the seven shots the
  state fixes below intentionally move. Each of those reproduced byte-identically across two full
  captures; the only shots that differed between the two runs were `plan-mode-button--build` and
  `sandboxed-diagram--valid`, the known pre-existing flake families, and both were restored.
- `node scripts/catalog-state-visibility.mjs` passes over all 337 stories, and is negative-controlled
  three ways: deleting the classification rules turns it red on paint, disabling the streaming
  append turns it red on the inert control, and reverting one fixture timestamp turns it red on
  three todo-panel stories. Restoring all three returns it to green.
- `node scripts/ui-audit.mjs` over 670 story-runs: 134 findings, all low or info (98 touch-target,
  22 clip-clamped, 14 overlap). Zero high, zero medium.

### The four control defects this phase's own tooling found

- **A published state no rule consumed.** `check-summary.svelte` emitted the host's classification as
  a data attribute that no CSS read. Measured, `passing` and `failing` were identical in background,
  border AND ink in both themes — a failing build read exactly like a passing one. The attribute is
  now load-bearing. Adding a tinted fill for `failing` immediately failed the audit at 4.48:1 against
  the 4.5:1 floor, so the fill was dropped and the state carries on border and value ink instead.
- **Story-only controls handed straight back to the component.** Both `screen-chat.stories.ts` and
  `transcript-list.stories.ts` stripped their synthetic controls and then re-added the same four keys.
  Neither component declares them and neither spreads rest props, so they were dropped at render;
  the strip is now honest.
- **A control that was inert exactly where it was used.** `streamingState: 'token'` produced DOM
  identical to `'fixture'` at the block count every story sets, while differing at small counts no
  story uses. The first diagnosis of this was wrong and produced an inert fix: the cause was not the
  tail bail-out but the append path, which finds an unused assistant block and, at the full count,
  has none left. `'token'` now always appends a truncated copy of a real assistant block.
- **Fixtures stranded ten days from the pinned clock.** The todo panel reported "Updated 243 hours
  ago" and a *running* session card reported "240d ago". Both now read plausibly, and the age sweep
  in the new gate makes that permanent.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The composer's enrollment control covers two phases, not every state the screen can reach.** The
  screen renders more than `unenrolled` and `authenticating`; the control exposes the branches the
  component actually has a story path for, and the rest stay reachable only through the real host.
- **There are no design links, by decision rather than by omission.** The operator confirmed no design
  file exists for this app, possibly one in future. The addon stays installed and unwired; `STORYBOOK.md`
  records that no story declares a `design:` parameter, so the gap cannot later be misread as coverage.
- **Two themes cannot be shown side by side.** All seventeen dark rule groups are scoped to `:root`,
  so a container cannot switch theme. The toolbar toggle and the two-theme audit cover the need;
  panes would require rewriting theme selectors, which the token gate governs.
- **An override is deliberately blunt.** It outranks the theme blocks, so an overridden token stops
  flipping between themes. The playground says so rather than leaving it to be discovered, but it
  remains a property of the mechanism rather than a bug to fix.
- **`pending` and `failing` separate weakly, and the palette is why.** Measured as CIELAB deltaE,
  `failing` against `passing` is 58.6 in light and 54.4 in dark, but `failing` against `pending` is
  only 8.6 and 11.6, because `--warning` resolves to the app's rust accent, which sits near
  `--danger` in hue. The two are distinguishable side by side and their labels differ, but the
  colour alone is thin. Widening it needs a token the palette does not have, and tokens change only
  through their own gate, so this is recorded rather than invented around.
- **The streaming edge is not visible in the archive.** The transcript overflows the phone viewport
  at every block count from one upward and the list is virtualised, so the tail is never rendered
  and no screenshot can show a mid-stream reply. A story that claimed to show it was removed rather
  than kept; the control is proven in the DOM by the state-visibility gate instead.
- **The capture clock stays pinned where it is, and that is a decision rather than an oversight.**
  Re-pinning it near the demo fixtures was measured and rejected: it fixes the todo panel's age but
  breaks the review countdown from "05:00 remaining" to "14573:00 remaining" and collapses the
  attention inbox's three distinct ages to "just now" three times. No single clock satisfies all of
  them, because past-event and future-deadline fixtures pull in opposite directions. The pin is
  correct and the stranded fixtures were migrated to it instead.
- **One claim in the open-work list did not survive measurement.** The `SessionCard` `source` control
  was recorded as unreachable through URL args. All three of its values render distinct DOM when set
  that way, so there was nothing to fix.
<!-- /ANCHOR:limitations -->
