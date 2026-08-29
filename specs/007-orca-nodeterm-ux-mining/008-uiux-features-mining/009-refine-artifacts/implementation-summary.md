---
title: "Phase 9 implementation summary — refine artifacts (COMPLETE)"
description: "Reading the artifacts shots one at a time found defects no gate in this repo could see, and they turned out to share three root causes rather than being ninety-one separate problems: an ink token that flips paired with a surface token that does not, tint colours chosen for a light surface sitting on an always-dark well, and three stories that were one picture under three names. A browser-measuring audit was built to make the class findable rather than the instance."
trigger_phrases:
  - "refine artifacts implementation summary"
  - "refine artifacts phase"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/009-refine-artifacts"
    last_updated_at: "2026-08-29T07:30:43.148Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Fixed the artifacts defects and built the audit that finds their class."
    next_safe_action: "Operator reviews; the archive and the audit are the evidence."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 9 implementation summary — refine artifacts

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | 91 artifacts screenshots |
| **Commits** | `50198e2`, `211c5fc`, `1d8ad32` |
| **Executors** | Grok 4.6 xhigh via Cursor and GPT-5.6 Luna xhigh via Codex, on disjoint files |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **The dark theme stopped hiding its own text.** `--surface-code` is deliberately the same dark tone
  in both themes and is frozen as a golden; `--ink-inverse` is the page tone and flips. Seven rules
  paired them, so in dark theme ink and ground both resolved to `#24221f` — 1.00:1, invisible. A new
  invariant `--on-code` gives that surface an ink that cannot flip.
- **A changed diff line became readable.** The add/remove tints were light-theme colours painted on
  that always-dark well, so a changed line was near-white on pale pink at 1.16–1.39:1. The tints are
  now invariant, which as a side effect made add distinguishable from remove in dark theme, where both
  had previously been the same brown.
- **The line-number gutters cleared AA.** Both wells painted a light-theme muted grey on the dark
  surface — the diff gutter through a flipping token, the code gutter through a hardcoded literal that
  failed in both themes. An invariant `--on-code-muted` takes the worst case, a gutter cell crossing a
  tinted row, from 2.58:1 to 4.92:1.
- **The Markdown preview got its dark ink and its find highlighting.** It hardcoded a light-theme ink
  with no dark counterpart, unlike every sibling in its own file, and went 1.00:1 on the dark page
  tone. It also accepted a `findTerm` and only wrote it to a data attribute, so find silently did
  nothing while it worked in the text, code and diff previews.
- **Three diff stories stopped being one picture.** `Add`, `Remove` and `Context` passed identical
  args; each now isolates the row kind it is named for.
- **The empty-preview notice got its card back** — see the sibling phase for the malformed comment
  that had deleted the rule.
- **`scripts/ui-audit.mjs`** renders every story in both themes and measures contrast, clipping,
  control collision, text occlusion and touch targets, so this class of defect is findable next time
  rather than depending on someone noticing.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Per-shot review first, then measurement, then fixes on disjoint files, then verification by an
adversarial reviewer that never saw the implementer's reasoning. The order matters: the first three
verdicts taken from downscaled contact sheets were all WRONG — a 398x679 shot squeezed into a 250px
tile invented a control collision that did not exist and hid a real one. Contact sheets were kept for
triage and disqualified as evidence; every verdict after that came from a full-resolution read or a
browser measurement.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **Fixed at the token, not per surface.** The same mistake — an ink or tint that flips paired with a
  surface that does not — produced 127 invisible-text findings across 40 stories. Fixing it per
  surface group would have meant making the same repair six times and leaving the seventh instance for
  whoever added the next code well.
- **Three identical-looking states were left identical.** The verified-image privacy cover, two
  image-status pairs and code follow-tail versus highlight render the same because the components
  genuinely render them the same. Manufacturing a difference would have misrepresented the component;
  the sameness is recorded instead.
- **Find highlighting was added to the Markdown preview but confined to parsed text nodes.** The
  renderer is a sanitization boundary. Marking only the text nodes the allowlist parser already
  produced adds no raw-HTML path and leaves links and images inert.
- **The unwrapped text preview is not a defect.** It sets `white-space: pre` with `overflow: auto` and
  a Wrap control in its toolbar, so its clipped look is a pan affordance, not lost content.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `node scripts/ui-audit.mjs` — 668 story-runs (334 stories in two themes): the invisible-text class
  goes from 127 findings across 40 stories to 0, and dark-theme contrast failures from 146 to 0. No
  high or medium finding remains anywhere in the archive.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` — `PASS: all 39 goldens`. The new
  `--on-code` is pinned in all three theme states; reverting it to a flipping value fails the gate
  with exit 2, which was checked rather than assumed.
- `npm run typecheck -w @pi-remote/web` — 1250 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — exit 0; 114 files / 782 passed + 3 skipped, and 83 files / 772 passed.
- `node scripts/story-coverage.mjs` — PASS.
- `npm run story:shots` — 308 captured, 0 unstable, 0 failed, of 334.
- Measured per fix: the diff well goes 1.00:1 to 14.92:1 in dark; the add row 1.36:1 to 13.09:1 and
  the remove row 1.39:1 to 13.61:1 in light; the worst gutter cell 2.58:1 to 4.92:1.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The audit was wrong twice before it was right, and both times it read as clean.** Its colour
  parser could not read the `oklch()` values this stylesheet uses and silently produced an inverted
  colour, and its theme switch was reverted by the app's own theme controller, so both passes measured
  the light theme under two labels. Neither failure announced itself. The lesson is that a measuring
  tool needs its own negative control before its green means anything.
- **The audit cannot see semantic defects.** It found no contrast or geometry problem in the rich
  cards while they rendered a CSS comment as visible body text, because garbage text has perfect
  contrast. Reading the pictures remains necessary.
- **Touch targets were not raised.** 98 controls sit between 24px and 38px. They clear WCAG 2.5.8 at
  AA but not the 44px the project asserts elsewhere. Raising the composer, the mode toggles and the
  theme options is a density change across the app's chrome, not a refinement, so it is recorded here
  rather than done quietly.
- **A pre-existing keyless `{#each}` remains** in `card-artifact.svelte`; the sibling this phase
  touched was fixed, and the original is left alone as out of scope.
- **The archive is not perfectly reproducible, and an earlier claim that it was came from too small a
  sample.** Two consecutive runs agreeing was read as determinism; three runs show a low-rate flake in
  a few async media stories, where a player or a sandboxed frame loses a load race under concurrent
  capture. It reproduces with the capture reverted, so it is pre-existing rather than introduced, and
  a wait for media metadata now removes one of its sources. The rest of the archive is byte-stable.
- **Two states cannot be told apart in isolation, for a reason worth naming.** The verified-image
  privacy cover is a real branch — `showPixels` excludes `privacy-covered` — but no image resource
  resolves inside a story, so the default and covered shots both fall to the same no-pixels
  fallback. The archive therefore records the component's isolated behaviour rather than its live
  behaviour here, and no amount of story work fixes that without a loadable resource.
<!-- /ANCHOR:limitations -->
