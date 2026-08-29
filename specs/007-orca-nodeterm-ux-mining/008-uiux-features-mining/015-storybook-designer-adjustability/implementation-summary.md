---
title: "Phase 15 implementation summary — Storybook designer adjustability (IN PROGRESS)"
description: "A designer could read every surface in the catalog and change almost nothing about it. Three additions close that: a playground that retunes the design system and moves every story at once, derived controls that reach the state hidden behind object props, and a reference that reads the system's own record of what may be changed. Measuring first showed one planned item was already done and did not need building."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/015-storybook-designer-adjustability"
    last_updated_at: "2026-08-29T08:58:21.995Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Shipped the playground, controls on every page view, and the seams reference."
    next_safe_action: "Obtain Figma file and frame URLs from the operator to wire design links."
    blockers: ["Design links need Figma file and frame URLs the repository does not carry."]
    completion_pct: 85
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
| **Status** | In Progress |
| **Scope** | The catalog: 336 stories across 101 components |
| **Commits** | `822b436`, `9b8af0e` |
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
- That mechanism is negative-controlled: with the preview hook removed and Storybook rebuilt, the same
  check reports the override NOT APPLIED, so the green means the hook and not something incidental.
- Controls are proven behavioural, not merely present: roster ready to empty takes rendered cards
  2/0, session count 1 to 4 gives 1/2, block count 1 to 6 grows the transcript 194/698 characters.
- `npm run typecheck -w @pi-remote/web` — 1250 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — exit 0; 114 files / 782 passed + 3 skipped, and 83 files / 772 passed.
- `node scripts/story-coverage.mjs`, `node scripts/css-comment-integrity.mjs` and
  `node scripts/token-identity.mjs verify app-mobile/src/app.css` all pass.
- `git status --porcelain screenshots` reports only the pages this work adds.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The composer's enrollment control covers two phases, not every state the screen can reach.** The
  screen renders more than `unenrolled` and `authenticating`; the control exposes the branches the
  component actually has a story path for, and the rest stay reachable only through the real host.
- **Design links are blocked on information the repository does not hold.** The addon is installed and
  unused; the Figma file and frame URLs have to come from the operator, and inventing them would put
  a wrong link beside every component.
- **Two themes cannot be shown side by side.** All seventeen dark rule groups are scoped to `:root`,
  so a container cannot switch theme. The toolbar toggle and the two-theme audit cover the need;
  panes would require rewriting theme selectors, which the token gate governs.
- **An override is deliberately blunt.** It outranks the theme blocks, so an overridden token stops
  flipping between themes. The playground says so rather than leaving it to be discovered, but it
  remains a property of the mechanism rather than a bug to fix.
<!-- /ANCHOR:limitations -->
