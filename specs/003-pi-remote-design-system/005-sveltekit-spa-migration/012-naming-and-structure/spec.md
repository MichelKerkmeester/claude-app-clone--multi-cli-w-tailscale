---
title: "Child 012 — Naming grammar and shared-tree structure"
description: "One naming grammar for the whole app — kebab-case files and folders, kind-first component names — and a shared/ tree deep enough to say what each file is for, replacing the 28-file shared/data grab-bag. Pure rename and move: no rendered value, behaviour, route or a11y contract changes."
trigger_phrases:
  - "kebab case file naming svelte"
  - "shared folder structure taxonomy"
  - "rename components kind prefix"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet scoped from measured file-naming and shared-tree inventory."
    next_safe_action: "Operator confirms the shared/ taxonomy and kind-prefix list, then execute Phase 1."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 012 — Naming grammar and shared-tree structure

---

<!-- ANCHOR:executive-summary -->
## EXECUTIVE SUMMARY

The app currently runs three file-naming grammars at once — 92 PascalCase, 22 camelCase and about 34
kebab-case source files — and nothing in a filename tells you what kind of thing it is. `Sheet.svelte`,
`SheetContent.svelte` and `LeavePlanSheet.svelte` are one modal family, but you only learn that by
opening them.

`shared/` compounds it. It is three flat buckets, and one of them — `shared/data/` — holds 28 source
files spanning transport, state reducers, slash-command handling, model catalogs, formatting helpers
and demo fixtures. A folder that holds everything says nothing.

This child imposes one grammar: **kebab-case for every file and folder**, a **kind-first prefix** for
components that are an instance of a UI kind, and a `shared/` tree split by responsibility. It is a
rename-and-move packet — no rendered value, no behaviour, no route, no a11y contract changes. The
nine program gates prove that, and the token-identity gate is the load-bearing one.

The one genuine deviation is deliberate and recorded: Svelte's ecosystem convention is PascalCase
component files, and this packet leaves it. The import identifier is chosen at the import site, so
nothing breaks — but the conventions authority must be updated in the same breath, or every future
dispatch will be told the opposite of what the tree does.
<!-- /ANCHOR:executive-summary -->

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../011-ux-affordances/spec.md |
| **Successor** | ../013-comment-grammar/spec.md |
| **Level** | 3 |
| **Layer** | post-cutover editability — structural pass |
| **Writer** | executor (`app-mobile/**` renames) + Claude (configs, conventions authority, git) |
| **Barrier** | nine program gates green + rename-completeness scan clean |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

A designer opening this tree cannot answer two basic questions from the filesystem alone: *what kind
of thing is this file*, and *where does this responsibility live*.

Three grammars coexist because the port carried React's PascalCase components, added camelCase hook
files, and used kebab-case for plain modules. Nothing enforced a choice, so all three survived.

`shared/data/` became the default destination for anything not obviously a component. It now mixes the
WebSocket client, four state reducers, seven slash-command modules, the model catalog, string
formatting and the demo fixtures in one flat listing of 28 files.

The purpose here is legibility, not behaviour. Every rendered pixel stays identical.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- **Kebab-case everywhere** under `app-mobile/src/`, except `routes/**` — files and folders alike.
- **Kind-first component names** where the component is an instance of a UI kind:
  `sheet-*`, `menu-*`, `dialog-*`, `card-*`, `button-*`, `toggle-*`, `radio-*`.
- **`shared/` re-tree**: `shared/data/` (28 files) splits into `transport/`, `state/`, `commands/`,
  `catalog/`, `format/`, `viewport/`, `fixtures/`; `shared/primitives/` (18 files) splits into
  `button/`, `menu/`, `sheet/`, `choice/`, `disclosure/`, `a11y/`; `shared/chrome/` stays as one
  folder and is renamed in place.
- **Import rewrite**: 238 `$shared/…` specifiers and 296 local relative specifiers, including their
  `.js` extension suffixes.
- **Config follow-through**: the three `$shared` alias definitions, Storybook globs, both vitest web
  configs, the CSS-corpus builder's glob, and any cwd-relative path in a web test.
- **Conventions authority**: update `sk-code-mobile-cli`'s `references/svelte-conventions.md` to teach
  this grammar — the same file already blocking the 008 branch merge.

**Out of scope:** any token value; any behaviour, routing or a11y change; splitting or merging module
*contents*; `routes/**` filenames; `app-relay/`, `packages/`, `extensions/`.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Every file and folder under `app-mobile/src/`, excluding `routes/**`, is kebab-case.
  A completeness scan for a capital letter in any in-scope path returns zero.
- **REQ-002** — A component that is an instance of a UI kind carries that kind first in its name.
  Feature and screen components carry no prefix, because their name already is the thing.
- **REQ-003** — `shared/` is split by responsibility. No folder under `shared/` holds more than one
  responsibility, and `shared/data/` ceases to exist.
- **REQ-004** — Nothing rendered moves. The token-identity gate stays at 0 CHANGED / 0 VANISHED /
  0 ADDED across all three theme states, which is the only proof that a pure rename stayed pure.
- **REQ-005** — `routes/**` filenames are untouched. In SvelteKit the route tree *is* the URL
  contract, so renaming there would change routing — a frozen program invariant.
- **REQ-006** — The conventions authority teaches the shipped grammar before the packet closes.
  A conventions file that contradicts the tree is worse than none, because dispatches trust it.
- **REQ-007** — Case-only renames are performed so git records them. On this case-insensitive
  filesystem a direct `Button.svelte` → `button.svelte` rename is a silent no-op.
- **REQ-008** — The backend suite stays green throughout, as the leak detector it has been all
  migration: a rename that reaches outside the web workspace shows up there first.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. `npm run build` exit 0.
2. `npm run typecheck` (`svelte-check`) exit 0 — the primary import-integrity proof.
3. `npm test` exit 0, green throughout.
4. `npm run test:web` exit 0.
5. Token-identity 0 diffs across all three theme states.
6. Contrast pairs at threshold and the `@ds guardrail:` fence count preserved.
7. CDP structural gate at 390px, both themes, zero horizontal overflow.
8. Catalog smoke green in both themes after story ids shift.
9. `validate.sh … --strict` exit 0, invoked through the script's realpath.

Plus two packet-specific checks: a rename-completeness scan returning zero non-kebab in-scope paths,
and a `git log --follow` spot-check proving case-only renames were recorded as renames.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Case-insensitive filesystem** — the highest-frequency trap; see REQ-007 and the edge cases below.
- **Story identity churn** — Storybook titles derive from paths, so every story id changes at once.
  The catalog smoke and the 009 coverage gate both re-baseline in the same commit.
- **Collision with 013** — both packets touch all 148 source files. They must not run concurrently.
- **The live-follow daemon** reverts uncommitted edits, so each rename batch commits atomically.
- Depends on 011 landing first only to avoid a merge conflict, not for correctness.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:nfr -->
## 7. NON-FUNCTIONAL REQUIREMENTS

| Attribute | Requirement |
|---|---|
| **Reversibility** | Every step is a `git mv` plus a specifier rewrite. Revert is a branch reset; no data or schema migrates. |
| **Reviewability** | Renames land in per-folder batches, so a reviewer reads one coherent diff rather than a 148-file blur. |
| **Determinism** | The specifier rewrite is scripted from the rename manifest, never hand-edited, so it cannot drift from the moves. |
| **Performance** | No runtime effect. Bundle content is byte-identical apart from module paths. |
| **Discoverability** | The end state is judged by one question: can a newcomer find the file that owns a behaviour without grepping? |
<!-- /ANCHOR:nfr -->

---

<!-- ANCHOR:edge-cases -->
## 8. EDGE CASES

- **Case-only rename on macOS.** `git mv Button.svelte button.svelte` can succeed as a no-op because
  the filesystem considers the names equal. Use the two-step through a temporary name, or
  `git mv -f`, and verify with `git status` that a rename was actually staged.
- **`.js` specifiers pointing at `.ts` files.** Imports read `'$shared/data/view-helpers.js'` while the
  file on disk is `.ts`. The rewrite must preserve the extension convention while changing the stem.
- **Two deep-relative imports remain** (`../../`). They are the only specifiers the `$shared` alias
  does not cover, and they are the easiest to miss.
- **`AttachmentDraftStoryHost.svelte`** is a story-only host living in the source tree; it renames with
  the source, not with the stories.
- **Worker files** (`highlight.worker.ts`, `attachment-hash.worker.ts`) are referenced by URL
  construction, not only by import, so their rename needs a grep beyond import statements.
- **`+layout.ts` / `+page.svelte`** inside `routes/` look like violations of the kebab rule but are
  SvelteKit reserved names. The completeness scan must exclude them explicitly, not incidentally.
- **A folder rename that only changes case** carries the same trap as a file, and affects every
  specifier beneath it at once.
<!-- /ANCHOR:edge-cases -->

---

<!-- ANCHOR:complexity -->
## 9. COMPLEXITY ASSESSMENT

| Dimension | Score | Note |
|---|---|---|
| File count | High | 148 source files, plus stories and tests that reference them |
| Specifier count | High | 238 aliased, 296 relative, 2 deep-relative |
| Logical difficulty | Low | Every individual change is mechanical |
| Coordination difficulty | High | Renames, specifier rewrites and config updates must land together or the tree does not build |
| Blast radius | High | Touches every folder in the app workspace |
| Reversibility | Easy | Branch reset |

The work is not hard; it is wide. The risk lives in partial application, not in any single decision.
<!-- /ANCHOR:complexity -->

---

<!-- ANCHOR:risk-matrix -->
## 10. RISK MATRIX

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Case-only rename silently not recorded | High | Medium | Two-step rename; verify staged renames before commit |
| A missed specifier breaks the build | Medium | Low | `svelte-check` catches it immediately; it cannot reach main |
| Story ids churn and the coverage gate red-lines | High | Low | Re-baseline in the same commit as the renames |
| A rename reaches outside the web workspace | Low | High | Backend suite is the leak detector, run every batch |
| Conventions authority left teaching the old grammar | Medium | High | REQ-006 blocks packet close; already an open item from 008 |
| Taxonomy proves wrong after the move | Low | Medium | Operator confirms the tree before Phase 1 — see open questions |
<!-- /ANCHOR:risk-matrix -->

---

<!-- ANCHOR:user-stories -->
## 11. USER STORIES

- **As a designer**, I want to see from a folder listing which files are modals and which are buttons,
  so I can open the right one without reading five files first.
- **As a returning maintainer**, I want one naming grammar, so I stop guessing whether a module is
  `todoState.ts` or `todo-state.ts` before I can import it.
- **As a dispatched executor**, I want the conventions file to describe the tree I am editing, so I do
  not create the ninety-third file in a grammar the codebase abandoned.
- **As the operator**, I want proof that a wide mechanical change moved nothing visible, which is what
  the token-identity and CDP gates provide.
<!-- /ANCHOR:user-stories -->

---

<!-- ANCHOR:questions -->
## 12. OPEN QUESTIONS

Both are blocking, and both are the operator's call — the tree is a design decision, not a derivation.

1. **Confirm the `shared/` taxonomy.** The proposed split is in `plan.md`. The judgement call is
   whether `state/` and `transport/` are genuinely separate or one `session/` folder.
2. **Confirm the kind-prefix list.** `sheet-`, `menu-`, `dialog-`, `card-`, `button-`, `toggle-`,
   `radio-` is proposed. The open part is whether screen-level components stay bare, as proposed, or
   take a `screen-` prefix.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:related -->
## 13. RELATED DOCUMENTS

- `plan.md` — the proposed tree, the batch order and the rollback.
- `tasks.md` — the per-folder task ledger.
- `checklist.md` — barrier sign-off with evidence.
- `decision-record.md` — kebab-case over PascalCase, kind-first over kind-last, the `shared/` split,
  and the `routes/` exclusion.
- `../013-comment-grammar/spec.md` — must not run concurrently; same 148 files.
- `../014-folder-documentation/spec.md` — consumes the final tree, so it runs after this.
- `../008-sk-code-svelte-refactor/implementation-summary.md` — the conventions authority REQ-006 updates.
- Program goal: `../goal.md`.
<!-- /ANCHOR:related -->
