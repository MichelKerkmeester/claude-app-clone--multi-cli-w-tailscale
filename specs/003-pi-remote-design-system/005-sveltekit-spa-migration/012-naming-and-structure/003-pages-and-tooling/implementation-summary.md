---
title: "Child 003 implementation summary — pages rename and tooling catch-up"
description: "Continuity anchor. Nothing is implemented yet: this records the per-folder file counts and the one gate that fails silently."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/003-pages-and-tooling"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Scoped from the per-folder file inventory; no files moved."
    next_safe_action: "Wait for children 001 and 002."
    blockers: ["depends on children 001 and 002"]
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 003 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `012-naming-and-structure` |
| Level | 2 |
| Status | **Scoped, not started** — blocked on children 001 and 002 |
| Requirements shipped | none yet; REQ-001 … REQ-007 all open |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Nothing has moved. The measured surface this child acts on:

| Folder | Files |
|---|---|
| `app-mobile/src/pages/chat/artifacts/` | 24 |
| `app-mobile/src/pages/chat/chrome/` | 17 |
| `app-mobile/src/pages/chat/rich-content/` | 12 |
| `app-mobile/src/pages/chat/features/ask-question/` | 12 |
| `app-mobile/src/pages/chat/transcript/` | 10 |
| `app-mobile/src/pages/chat/attachments/` | 9 |
| Screen components, taking the `screen-` prefix | 5 |

Tooling still pointing at the pre-rename tree: the three `$shared` alias definitions, the Storybook
globs, the 009 coverage allowlist, both vitest web configs, the cwd-relative `readFileSync` paths in
several web tests, and the CSS-corpus builder's glob.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

One dispatch per feature folder, largest first, each committed atomically. Then the tooling in one
pass, then the conventions stop-gap through an isolated Public worktree, then the barrier. The
executor performs the renames; Claude owns the configs, the cross-repo edit, verification and git.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Tooling lands once, at the end.** Updating a glob while the tree is still moving means updating it
twice; leaving it until the tree has settled means one edit against a known final state.

**The coverage allowlist is regenerated, not hand-edited.** After a hundred-file rename, hand-editing
is transcription, and transcription is where a silent omission enters.

**The conventions edit is a stop-gap, not a refresh.** One section — kebab-case, the closed prefix
list, the `routes/**` exemption with its reason. The full rewrite is 019's, after every convention has
shipped. Two documents attempting the same rewrite is two places to disagree.

**Screens take the `screen-` prefix.** Leaving five files bare was the first proposal and was
overruled on search: a contributor hunting for a screen types the same prefix they would type for any
other kind. The side effect is that every component in the tree carries a kind, which removes the "is
this a kind or a screen" judgement entirely.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Completeness scan | not run |
| `npm run build` / `npm run typecheck` | not run |
| `npm test` / `npm run test:web` | not run |
| Token-identity over a confirmed non-empty corpus | not run |
| Contrast and `@ds guardrail:` fence count | not run |
| CDP structural gate at 390px, both themes | not run |
| Catalog smoke, both themes | not run |
| `validate.sh --strict` via realpath | not run |

No completion claim is made or implied.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**One gate in this child's barrier can pass for the wrong reason.** The token-identity gate reads a
CSS corpus assembled by a glob. If the glob is stale the corpus is empty, the diff is zero, and the
load-bearing proof of the entire naming pass reports success over nothing. Non-emptiness has to be
confirmed separately; the gate cannot confirm it for itself.

**Story identity churn is total**, so the catalog smoke and the coverage gate both re-baseline in the
same commit. That means a red gate immediately afterwards is ambiguous between a regression and a
missed re-baseline, and has to be read rather than trusted.

**The stop-gap has a shelf life.** It is correct only until 019 rewrites the surrounding document, and
a stop-gap nobody replaces becomes the convention by default.
<!-- /ANCHOR:limitations -->
