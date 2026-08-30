---
title: "Catalog documentation layer — handover"
description: "What shipped in the catalog's docs layer and the review that followed: the two defects that reached main behind green gates, the five verification holes that let them, what is genuinely open, and the traps that each cost real time in this session."
contextType: "handover"
importance_tier: "important"
trigger_phrases:
  - "autodocs handover"
  - "catalog documentation handover"
  - "docs layer handover"
  - "handover"
_memory:
  continuity:
    packet_pointer: "specs/008-storybook-autodocs"
    last_updated_at: "2026-08-30T17:40:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Catalog refreshed; flake set re-measured and recorded"
    next_safe_action: "Pick from open work below; nothing is mid-flight."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: handover | v2.2 -->

# Handover — the catalog's documentation layer

Read this before touching the catalog. It supersedes the status sections of `goal.md` and of the
phase summaries where they disagree.

Nothing is mid-flight. The tree is clean and pushed.

---

## 1. WHERE THINGS STAND

The Storybook catalog gained a documentation layer, then an independent review of that work found two
defects already on `main` and five places where a check reported success without having looked. All
seven are closed.

| Thing | State |
|---|---|
| Docs pages | 100, beside 337 stories |
| Component descriptions | 26, hand-written |
| Props tables | Generated every build from `$props()` types |
| Source panel | First tab in the story view, opens by default |
| Coverage audit | `scripts/docgen-coverage.mjs`, re-runnable |
| Accessibility P2 | 8 of 8 closed — 5 fixed, 1 waived, 2 already correct |
| Packets | `008` (5 folders) and `009` both validate `--strict` clean |

**Two numbers to know.** The catalog is `100 docs + 337 stories`. Typecheck covers `1267` files. Both
are stated in `REPO RULES.md`; if either moves and the rules do not, the rules are wrong.

---

## 2. THE DIVISION THAT GOVERNS EVERYTHING HERE

A docs page has two halves and they have opposite risk profiles.

**Generated — cannot drift.** The props table comes from a TypeScript docgen pass over every
`.svelte` file on each build, reading `$props()` runes. Documenting a prop therefore means writing
JSDoc **on the prop**; there is nowhere else it can come from. If the table disagrees with the
component, the component changed and the table already followed.

**Written — can rot.** `parameters.docs.description.component` in the story meta. 26 of them exist.
**Nothing gates a description against the component it describes.** The audit can tell you a
description exists; it cannot tell you it is still true. This is the single largest liability the
work created, and it was created deliberately.

A description earns its place only by saying what the table and the canvas cannot: behaviour when a
capability is **absent**, which **breakpoint** changes what, or where data comes from when a component
**takes no props**. One that restates the props table is a defect — it costs maintenance and tells the
reader nothing.

---

## 3. THE TWO DEFECTS THAT REACHED MAIN

Both were found by an independent review, not by any gate. Both are fixed. They are recorded because
the shape of each recurs.

**The archive gate stopped executing and nobody noticed.** A comment containing backticks was added
*inside* a template literal in `scripts/capture-screenshots.mjs`, closing the string. The file stopped
parsing, and `npm run story:shots` failed at load for six commits. The damage was not the typo — it
was that three subsequent "zero screenshots moved" readings were **the script failing to start**,
recorded as evidence of a clean archive. Reading silence as a pass.

**The Build/Plan toggle stopped being host-authoritative.** Replacing an `$effect` mirror with a
`$derived` also deleted the line that put the selection back to what the host reports. Clicking Plan
while the host still said build left the control showing a mode never confirmed — in a fail-closed
client, contradicting a `non-optimistic` guarantee written three lines above it inside a `Do not edit`
fence. The covering test was named `keeps Build/Plan behavior separate and host-confirmed` and
asserted only that the request was sent. 787 tests stayed green over a live regression.

**The pattern:** every gate that ran was green, and both defects sat exactly in the gaps — one in a
gate that no longer ran, one behind a test whose name promised an assertion it did not make.

---

## 4. TRAPS THAT EACH COST TIME THIS SESSION

1. **Backticks inside a template literal.** Made twice in one day, in two different scripts. Any
   comment added inside a `` ` ``-delimited string must contain no backticks. `node --check <file>`
   after editing any `scripts/*.mjs`.
2. **`npm install` removes `playwright`.** It was an undeclared leftover; installing anything else
   evicted it and silently broke four gates. It is now a declared root devDependency — keep it that way.
3. **A fixed port measures the wrong application.** Binding the wildcard address succeeds while
   another process holds `127.0.0.1` on the same port, so the browser reaches *that* server. Every
   probe in `specs/006-orca-nodeterm-ux-mining/009-home-balance-and-controls/harness/` uses port 0 for
   this reason. A stale app preview sat on `4173` all session.
4. **`prettier --write .` would have rewritten the vendored research repos.** `specs/` was 22,232 of
   22,719 warnings and there was no exclusion. Now excluded — do not remove those two lines.
5. **The docs Description column holds prose OR the bare type,** never both. Counting non-empty cells
   marks every prop documented; `theme-control` scored 2 of 2 when its real answer is 0 of 2. Classify
   the cell, and check any classifier against a component whose answer you already know.
6. **`create.sh` scaffolds into the wrong repository.** `.opencode` is a symlink, so `REPO_ROOT`
   resolves to the Public monorepo. The packet landed there and had to be moved; the parent `spec.md`
   came out empty. `generate-context.js` is blocked the same way — use
   `refreshGraphMetadataForSpecFolder` from the compiled parser instead.
7. **`validate.sh --strict` is syntactic.** It returned `PASSED` five times while four goal logs read
   "Phase not started" against a packet reporting 100%. It cannot see truth, only shape.

---

## 5. THE SCREENSHOT ARCHIVE

Re-verified at handover: catalog rebuilt, `story:coverage` PASS, `674` frames with 0 throws,
state-visibility PASS, token-override PASS, css-comment-integrity PASS, and the archive captured
clean at **0 churn**.

**The flake set grew today and `REPO RULES.md` now lists it.** `composer-tools--*` joined because the
tools popover gained a background scroll lock: locking the body changes scrollbar-dependent layout,
and **two consecutive captures of the same story now disagree with each other** — measured, not
assumed. `attachment-tile--rejected`, `preview-controls--image` and `review--focused` each moved once
and returned.

The rule that matters: **a moved shot is a flake only after it returns.** Re-capture before believing
any diff. Never conclude determinism from one pair of runs.

---

## 6. DECISIONS ALREADY MADE — DO NOT REOPEN

| Decision | Why |
|---|---|
| All 100 `autodocs` tags stay | The generated half costs nothing to maintain and cannot drift |
| No docs render gate | All 100 pages render with 0 page errors; a gate would protect against nothing observed. Re-ask with the audit if a page ever throws |
| Prose only for 26 pages | Chosen by three measured signals — no-props, viewport-content, capability-gated. A `Do not edit` fence is **not** such a signal; counting it would have pulled the set to 53 |
| `addon-vitest` registered, not exercised | Running stories as tests needs vitest browser mode this repo does not install |
| The coverage report is generated, never committed | A checked-in census is silently wrong the moment a component gains a prop |
| No mass reformat | 488 files do not conform; that diff would move screenshots and deserves its own decision |
| React in `.storybook/manager.ts` is acceptable | Storybook's manager *is* React; it is a declared devDependency, reaches only the manager bundle, and `createElement` keeps the no-`.tsx` property |

---

## 7. OPEN WORK

Nothing is blocked and nothing is mid-flight. In rough order of value:

**26 packets fail `ANCHORS_VALID`** — `003-design-system-library` is 17 of 18, plus 6 in `002`, 2 in
`004`, 1 in `001`. Legacy spec documents predating the anchor convention; `005`–`009` all pass.
Mechanical but not blind: anchors must match the sections they wrap.

**`format:check` fails on 488 files.** Now failing for a real reason rather than 22,617 phantom ones,
but still unusable as a pass/fail signal until the codebase conforms.

**Nothing gates the 26 descriptions.** See §2. The highest-risk item here, and the one this work
deliberately created.

**Three host-gated phases** under `006-orca-nodeterm-ux-mining/008-uiux-features-mining/` — inbox
notifications, usage/search/review, liveactivity fields. Client-side complete; they unblock as relay
fields land. Nothing to start.

**The 49 thin pages recorded as needing no prose** were judged by three signals. A component hiding
its contract another way — a prop that silently switches a mode — would not have been caught.

---

## 8. STANDING RULES FOR WHOEVER PICKS THIS UP

- **Read the exit code, never a piped one.** `npm run test:web | tail` reports *tail's* status.
  Capture `RC=$?` or verify by content that both suite summaries are present.
- **Negative-control every fix.** Revert it, watch the covering test fail, restore it, watch it pass.
  Two defects this session were caught only because someone did that; two shipped because nobody did.
- **An executor's report is a hypothesis.** Both dispatched executors this session reported success
  accurately in substance, and one could not run the audit it claimed to have verified against. Re-measure.
- **Size before scaffolding.** `recommend-level.sh` scored this packet Level 3 from an estimate that
  proved wrong; the functional change was ~600 lines and it received 21 documents. The follow-up
  packet scored 0/50 on phases and got four. Feed it measured scope, not an estimate.
