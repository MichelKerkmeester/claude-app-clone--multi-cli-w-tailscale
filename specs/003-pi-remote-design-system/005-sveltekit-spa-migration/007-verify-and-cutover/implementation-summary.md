---
title: "Child 007 implementation summary — verification migration and cutover"
description: "What shipped in the cutover, what the verification actually caught, and the two lessons worth carrying: a green suite is not evidence, and no objective gate can see accessibility."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/007-verify-and-cutover"
    last_updated_at: "2026-08-23T09:10:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Cutover shipped; 007-EXT sectioning complete at 95 files."
    next_safe_action: "Close XB.3 styling wayfinding, then XE.1 hook enforcement."
    blockers: []
    completion_pct: 92
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 007 implementation summary

---

<!-- ANCHOR:metadata -->
## Metadata

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 2 |
| Status | Cutover complete and shipped; 007-EXT substantially complete, two items open |
| Requirements shipped | REQ-001 … REQ-006 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## What Was Built

**The instruments, then the cutover.**

`app.css` was carved out of the 7,932-line `style.css` down to 3,153 lines, removing a rule only when
every one of its selectors was reproduced by a component's scoped `<style>`. Two independent oracles
confirm it: token-identity at 0/0/0 across three themes, and a non-token corpus check that all 4,343
declarations survived.

317 behaviour tests across 31 React-rendering files were ported to `@testing-library/svelte` in eight
clusters, each verified before the next began. `lib/` was then dissolved into `pages/` and `shared/`
by deterministic codemod — 191 files moved, 480 imports rewritten — and the whole board re-verified
from the new layout.

With all nine gates green, an adversarial deep-review returning zero defects, and an explicit operator
go-ahead, the React runtime was deleted: 60 `.tsx` files, `style.css`, 53 retired oracle tests, and —
in the completion pass — the dead hook halves and 5 React dependencies, taking 21 node_modules
packages with them.

The 007-EXT pass then made the byte-identical app editable: 95 files carry numbered sections, every
one of 96 `.svelte` files carries an `@ds` marker, all four onboarding docs were rewritten to Svelte
reality, per-folder READMEs landed, and a single `$shared` alias replaced 219 deep-relative
specifiers across 91 files.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## How It Was Delivered

The executor wrote `app-mobile/**` tests and comment, doc and config edits. Claude owned the barrier
files, git, folder moves and every verification, and diff-inspected each batch before trusting any
gate. Sonnet subagents ran independent faithfulness passes against the React oracle.

Mechanical sweeps were done with deterministic Node codemods rather than model edits, and committed
atomically — script, `git add` and `git commit` as one command — because a `git-live-follow` daemon
restores the working tree to HEAD and silently erases any edit left uncommitted.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## Key Decisions

**A green suite is not evidence.** Ported tests passed repeatedly *because their assertions had been
weakened* — an exact count softened to `>=1`, `mockRejectedValueOnce` widened to `mockRejectedValue`,
a gutted Retry-After test, a `getAllByRole('radio')` filtered to drop the failing element. Each was
caught by comparing counts against the oracle, not by running the suite. Two of those masks were
concealing genuine source regressions, so faithfulness verification became a standing separate step
rather than an occasional audit.

**The irreversible act goes last and needs a human.** C5 removes the only independent reference for
what the app used to do. A green board authorises it; it does not decide it. The delete waited for a
fresh board, a zero-defect review and an explicit go-ahead with screenshots shown.

**Harness-side adaptation, never source-side guards.** `@testing-library/svelte`'s `rerender`
re-fires an unchanged prop where React's `renderHook` would skip it. The absorption belongs in an
equality-checked intermediate `$state` in the harness — putting that guard in the source would
change the product to suit the test.

**Comment work needs its own oracle.** token-identity is blind to comments, whitespace and fence
content, which is exactly what 007-EXT edits. A per-file unchanged-fence-**text** diff was added, so
the comment pass is provably comment-only rather than assumed to be.

**Deletions and installs stop for a yes.** XA.4's editor config landed because it is passive and
unshipped; its file removals and its `prettier-plugin-svelte` install did not, and are still held.
Format-on-save was deliberately left **off** — a save-time reflow would break byte-identity.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## Verification

| Gate | Result |
|---|---|
| `npm run build` | 0 |
| `npm run typecheck` (`svelte-check`) | 0 |
| `npm test` (backend leak detector) | 365/366 — known `auth.test.ts` timing flake |
| `npm run test:web` | 528 Svelte + 182 logic |
| token-identity, 3 themes | 0 / 0 / 0 |
| CSS corpus + contrast | 4,343 declarations · 77/77 pairs |
| `@ds guardrail:` fences | 277 present, floor 76; 200 across 63 files byte-identical to `4796234` |
| CDP 390px, both themes | pass, zero horizontal overflow |
| catalog smoke | 404 frames, 0 throws |
| deep-review (C3) | 4 adversarial verifier groups, 0 defects |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## Known Limitations

**No objective gate can see accessibility.** The react-aria→Bits/Melt swap silently dropped 3 P0 and
7 P1 a11y behaviours — AT-tree hiding, focus traps, roles, dismissal, `aria-activedescendant` virtual
focus — and token-identity, CDP and the backend suite are all structurally incapable of noticing. The
gap was found by a dedicated audit and closed by adversarial verification, not by a gate. Roughly 10
P2 items remain deferred as amendment candidates. Anything similar in future will need the same
manual attention.

**Two jsdom limitations are skipped, not solved.** bits-ui focus-trap redirect and interact-outside
dismissal cannot run under jsdom; the React oracle passed those same tests vacuously. Real focus and
dismissal behaviour is covered only by the CDP gate.

**Gate 9's historical results are unmeasured.** `validate.sh` invoked through the `.opencode` symlink
prints nothing and exits 0 even on a failing packet, so every gate-9 result recorded before that was
isolated is worthless. Gates 1 through 8 are unaffected — they were always run directly. This packet's
own documentation gap was one of the things that false green concealed.

**Two 007-EXT items remain open.** XB.3 styling wayfinding and XE.1 hook enforcement. Neither gates
the cutover, and both are comment- or tooling-only.
<!-- /ANCHOR:limitations -->
