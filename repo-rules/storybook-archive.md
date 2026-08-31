---
title: "Rule: Storybook and the screenshot archive"
description: "The archive is measurably not byte-stable, the capture clock is pinned in three files that move together, and no gate sweeps the docs pages."
trigger_phrases:
  - "screenshot moved"
  - "did you look at the capture"
  - "empty capture"
  - "visually empty"
  - "add a component"
  - "story coverage"
  - "is this a flake"
  - "byte stable"
  - "re-capture"
  - "commit the screenshot"
  - "capture clock"
  - "pinned clock"
  - "re-pin the clock"
  - "story shots"
  - "storybook"
  - "start storybook"
  - "storybook-static"
  - "docs page"
  - "props table"
  - "docgen coverage"
  - "theme-specific defect"
  - "MANIFEST.json"
importance_tier: important
contextType: reference
version: 1.0.0.0
---

# Rule: Storybook and the screenshot archive

> Routed from [`REPO RULES.md`](../REPO%20RULES.md). Load it before judging a changed capture, re-pinning the clock, or starting the catalog.
> Expands `AGENTS.md`, never overrides it. Where they appear to disagree, `AGENTS.md` wins and this file is wrong. Say so.

## Fires when

- A capture changed and you are deciding whether it is a defect.
- Changing the capture clock.
- Starting Storybook, or building the catalog.
- Reading a docs page as evidence.

## The rule

**A moved shot is a flake only after it returns, and one pair of runs never establishes determinism.**

---

## 1. CURRENCY: A CAPTURE IS NOT EVIDENCE UNTIL YOU LOOK AT IT

Re-capture with `npm run story:shots` after any change that renders, then **open the changed
PNGs and look at them**. The command exiting zero and the file having bytes are both true of a
blank image, and this archive ships **26 visually empty captures out of 337** by design, so an
empty frame is indistinguishable from a defect without a human eye on it.

**A new component registers its story in the same change.** `npm run story:coverage` fails when
a renderable component has no story, so an uncaptured surface cannot pass quietly. Adding the
component and adding the story are one change, not two.

**What the archive is not.** It is one theme only and it renders the catalog, not the running
app under its real CSP. A surface that looks wrong in a capture may be a gap in the story host
or the token stand-ins rather than a defect. Check which before filing it, and use the
two-theme gates in [`verification-ladder.md`](verification-ladder.md) for anything
theme-specific, because a screenshot diff will never show it.

---

## 2. THE ARCHIVE IS NOT BYTE-STABLE, AND THE GAP IS MEASURED

Six capture runs compared against the first differed in **five of five** comparisons; the same experiment against a pre-change capture gave the same answer. The flake lives in a handful of stories, a sandboxed diagram frame dominating, not in any recent change.

Two rules follow. **Never conclude determinism from one pair of runs** that sample has produced a wrong call here in both directions. And **re-capture before believing a diff**: if the bytes match the committed version again, it flaked.

Restore rather than commit churn:

```bash
git checkout HEAD -- screenshots/<path>    # this also stages
git restore --staged screenshots/<path>
```

---

## 3. THE CLOCK IS PINNED IN THREE FILES

`2026-08-28T12:00:00.000Z`, in `capture-screenshots.mjs`, `ui-audit.mjs` and `catalog-state-visibility.mjs`. **Change all three together or none.**

Re-pinning was measured and rejected: it fixes the todo panel's age but breaks the review countdown from `05:00 remaining` to `14573:00`, and collapses the attention inbox's three distinct ages to "just now" three times. Past-event and future-deadline fixtures pull in opposite directions, so **no single clock satisfies both** migrate a stranded fixture instead.

---

## 4. THE ARCHIVE IS ONE THEME ONLY

`ui-audit.mjs` and `catalog-smoke-cdp.mjs` both render light and dark, so a theme-specific defect is caught by those and **never** by a screenshot diff. An entire defect class once existed only in dark.

---

## 5. HALF THE DOCS CAN ROT

Every component carries a docs page beside its stories, 100 against 337 stories. The **props table is generated** on every build from the component's own `$props()` runes and types, so it cannot drift. The **prose is written** and it can. Trust the table; check the prose against the source. The **Source** panel sits first in the story view and shows the real `.svelte` file.

`node scripts/docgen-coverage.mjs` ranks all 100 pages and writes a generated, uncommitted JSON, re-run it rather than reading a stale copy. It **exits 0 with thin pages present**: a low score is the finding, not an error.

**No gate sweeps the docs pages.** All four presentation gates filter `entry.type === 'story'`. That was a deliberate call, taken because all 100 render with zero page errors.

---

## 6. RUNNING THE CATALOG

```bash
npm run storybook        # dev server on :6006
```

**Start it in the background and hand back the URL.** It is a server, not a task; a foreground start blocks until killed and reads as a hang.

**One build directory, one writer.** Every gate needing a built catalog reads `app-mobile/storybook-static`, and two concurrent builds corrupt it.

The archive is `screenshots/`, one image per story, rebuilt whole rather than patched. `MANIFEST.json` records every story including those rendering nothing visible: **337 stories, 311 captured, 26 visually empty.**

---

## 7. SELF-CHECK

- [ ] A changed capture was re-captured before being called a defect.
- [ ] No determinism claim rests on a single pair of runs.
- [ ] Any clock change moved all three files, or none.
- [ ] A theme-specific defect was looked for in the two-theme gates, not the archive.
- [ ] Docs prose was checked against source; the generated table was trusted.
- [ ] Storybook was started in the background, with one writer to the build directory.
- [ ] Every changed capture was opened and looked at, not just regenerated.
- [ ] A new component got its story in the same change.
