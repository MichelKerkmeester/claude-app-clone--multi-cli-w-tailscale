---
title: "Child 001 decision record — naming grammar and shared-tree structure"
description: "Why kebab-case wins over Svelte's PascalCase convention, why the kind comes first in a component name, how shared/ was split, and why routes/ is excluded from the rename."
contextType: "decision"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/012-naming-and-structure/001-grammar-and-manifest"
    last_updated_at: "2026-08-23T14:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "All four decisions accepted; operator confirmed 002 and 003."
    next_safe_action: "Build the rename manifest against the confirmed tree."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 001 decision record

---

<!-- ANCHOR:adr-001 -->
## ADR-001: Kebab-case for every file and folder, including `.svelte` components

**Status:** Proposed — operator-directed.

<!-- ANCHOR:adr-001-context -->
### Context

The tree runs three grammars: 92 PascalCase source files, 22 camelCase, and roughly 34 kebab-case.
The mix is an artefact of the port — React components arrived PascalCase, hook modules arrived
camelCase, and plain modules were written kebab-case. Nothing ever chose.

Svelte's ecosystem convention is PascalCase for component files, because it mirrors the tag name used
in markup. That convention is real, widely held, and this decision leaves it.

The operator asked for kebab-case explicitly, for both files and folders.
<!-- /ANCHOR:adr-001-context -->

<!-- ANCHOR:adr-001-decision -->
### Decision

Kebab-case for every file and folder under `app-mobile/src/`, `routes/**` excepted.

The technical basis for this being safe: in Svelte the imported identifier is chosen at the import
site, not derived from the filename. `import Button from '$shared/primitives/button/button.svelte'`
binds `Button` in markup exactly as before. The filename and the tag name are independent.
<!-- /ANCHOR:adr-001-decision -->

<!-- ANCHOR:adr-001-alternatives -->
### Alternatives considered

**Keep PascalCase for components, kebab for modules.** This is the ecosystem default and the current
majority state. Rejected: it is the status quo that produced the confusion, and it forces every
contributor to hold a rule about *which kind of file* they are naming before they can name it. One
grammar with no exceptions is cheaper to hold than two with a boundary.

**Normalise to camelCase.** Rejected outright — it is the smallest existing group and reads worst in
URLs and shell paths.
<!-- /ANCHOR:adr-001-alternatives -->

<!-- ANCHOR:adr-001-consequences -->
### Consequences

The cost is real and worth naming. Tooling and templates that assume PascalCase components will
disagree with this tree: Storybook's automatic title derivation changes, some editor
component-scaffolding defaults will produce the wrong case, and any contributor arriving from another
Svelte codebase will find this unfamiliar.

The mitigation is that the conventions authority must teach the rule. A minimal naming correction
lands with the rename in child 003; the full refresh is 019's packet. An unwritten deviation is a
trap; a written one is a convention.
<!-- /ANCHOR:adr-001-consequences -->

<!-- ANCHOR:adr-001-five-checks -->
### Five checks

| Check | Answer |
|---|---|
| Is it the simplest option? | Yes — one rule, no exceptions inside the app tree |
| What does it touch? | Every source file; no runtime behaviour |
| Is it solving a real problem? | Yes — three grammars measured in one tree |
| Will a future maintainer understand it? | Only if the conventions file says so, hence the stop-gap |
| Does the complexity match the problem? | Yes — a rename is the whole implementation |
<!-- /ANCHOR:adr-001-five-checks -->

<!-- ANCHOR:adr-001-impl -->
### Implementation note

Case-only renames need the two-step through a temporary name on this filesystem, or git records
nothing. That is a mechanical trap, not a design question, and it is tracked as its own task.
<!-- /ANCHOR:adr-001-impl -->
<!-- /ANCHOR:adr-001 -->

---

<!-- ANCHOR:adr-002 -->
## ADR-002: The kind comes first in a component name

**Status:** Accepted — prefix list confirmed by the operator, with `screen-` added.

<!-- ANCHOR:adr-002-context -->
### Context

`Sheet.svelte`, `SheetContent.svelte` and `LeavePlanSheet.svelte` are one modal family. `PlanModeMenu`
and `CommandPalette` are both menus. You learn this by opening files, not by reading the directory.

The operator's framing was direct: if it is a modal, the name should say modal; if it is a button, the
name should say button.
<!-- /ANCHOR:adr-002-context -->

<!-- ANCHOR:adr-002-decision -->
### Decision

A component that is an instance of a UI kind carries the kind first: `sheet-leave-plan.svelte`,
`menu-plan-mode.svelte`, `dialog-attachment-preview.svelte`, `card-plan-ready.svelte`.

Screens are a kind too and take `screen-`: `screen-chat.svelte`, `screen-home.svelte`,
`screen-review.svelte`. Feature components carry no prefix, because their name already is the thing.
<!-- /ANCHOR:adr-002-decision -->

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives considered

**Kind last — `leave-plan-sheet.svelte`.** Reads more naturally as English, and matches how people say
it aloud. Rejected because a directory listing sorts alphabetically: kind-first groups every sheet
together on screen, which is the entire benefit being bought. Kind-last scatters them.

**No prefix; rely on folders.** A `sheets/` folder would carry the same information. Rejected because
these components live in feature folders by responsibility, and moving them into kind folders would
scatter each feature instead — trading one problem for its mirror image.

**Leave the five screens bare.** Proposed first, on the grounds that a screen's name already is the
thing and five files need no grouping. Overruled by the operator on search: a contributor looking for
a screen should type the same prefix they would type for any other kind, rather than having to
already know the five names. That argument holds for a set of five as well as a set of fifty, and it
is the same argument that justifies every other prefix on the list.
<!-- /ANCHOR:adr-002-alternatives -->

<!-- ANCHOR:adr-002-consequences -->
### Consequences

Names get slightly longer and read less like prose. In exchange, the directory listing becomes a
grouped index, and a newcomer can answer "what kinds of thing does this feature contain" without
opening anything.

With screens on the list, every component in the tree carries a kind, which removes the boundary case
entirely: there is no "is this a kind or a screen" judgement left to drift. The prefix list is
enumerated in the spec rather than left to taste for the same reason.
<!-- /ANCHOR:adr-002-consequences -->

<!-- ANCHOR:adr-002-five-checks -->
### Five checks

| Check | Answer |
|---|---|
| Is it the simplest option? | No — kind-last is simpler to read; kind-first is simpler to scan |
| What does it touch? | Component filenames and their specifiers |
| Is it solving a real problem? | Yes — kind is currently invisible from the listing |
| Will a future maintainer understand it? | Yes, provided the prefix list is enumerated, not inferred |
| Does the complexity match the problem? | Yes |
<!-- /ANCHOR:adr-002-five-checks -->

<!-- ANCHOR:adr-002-impl -->
### Implementation note

The prefix list is closed, not open: `sheet-`, `menu-`, `dialog-`, `card-`, `button-`, `toggle-`,
`radio-`, `screen-`. Adding a kind is a decision, not a convenience, because an open list degrades
back into taste within a few contributions.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->

---

<!-- ANCHOR:adr-003 -->
## ADR-003: Split `shared/` by responsibility, one reason to change per folder

**Status:** Accepted — taxonomy confirmed by the operator as proposed.

<!-- ANCHOR:adr-003-context -->
### Context

`shared/data/` holds 28 source files: the WebSocket client, authentication, the cache, four state
reducers, seven slash-command modules, the model catalog, string formatting, viewport anchoring and
the demo fixtures. It is the folder things go when there is no better folder, and it has been that for
long enough to stop being searchable.
<!-- /ANCHOR:adr-003-context -->

<!-- ANCHOR:adr-003-decision -->
### Decision

Replace it with seven folders grouped by reason-to-change: `transport/`, `state/`, `commands/`,
`catalog/`, `format/`, `viewport/`, `fixtures/`. Split `shared/primitives/` the same way, by control
family rather than as one flat list of 18.

`fixtures/` is deliberately separate from every runtime folder, because `demo.ts` ships to stories and
not to users, and that distinction should be visible without reading the file.
<!-- /ANCHOR:adr-003-decision -->

<!-- ANCHOR:adr-003-alternatives -->
### Alternatives considered

**Group by technical kind — `hooks/`, `stores/`, `utils/`, `types/`.** Familiar, and mechanical to
apply. Rejected: it groups files that change for unrelated reasons and separates files that always
change together. A `utils/` folder is `data/` with a different name.

**Leave `shared/data/` and fix only the naming.** Cheaper, and it would satisfy the letter of the
kebab-case request. Rejected because the operator's complaint was explicitly that the structure is too
flat, and renaming 28 files inside one undifferentiated folder does not address that.

**One `session/` folder instead of `transport/` plus `state/`.** Genuinely arguable — they change
together more often than not. Put to the operator rather than decided unilaterally, and rejected:
`transport/` changes when the wire contract changes and `state/` when a reducer does, and merging
them would hide two triggers behind one name.
<!-- /ANCHOR:adr-003-alternatives -->

<!-- ANCHOR:adr-003-consequences -->
### Consequences

Import paths get one segment longer. Every `$shared/data/…` specifier in the app changes at once,
which is the largest single mechanical impact in the packet.

The lasting risk is that a taxonomy is a prediction about future change, and predictions age. The
mitigation is the grouping rule itself: when a new file has no obvious home, that is evidence the
taxonomy needs a folder, not evidence it needs a `misc/`.
<!-- /ANCHOR:adr-003-consequences -->

<!-- ANCHOR:adr-003-five-checks -->
### Five checks

| Check | Answer |
|---|---|
| Is it the simplest option? | No — leaving it flat is simpler, and is what produced the problem |
| What does it touch? | Every `$shared/data/…` specifier in the app |
| Is it solving a real problem? | Yes — 28 files, six responsibilities, one folder |
| Will a future maintainer understand it? | Yes, if the grouping rule is stated, which `plan.md` does |
| Does the complexity match the problem? | Yes — seven folders for six responsibilities plus fixtures |
<!-- /ANCHOR:adr-003-five-checks -->

<!-- ANCHOR:adr-003-impl -->
### Implementation note

The taxonomy is decided here and executed in child 002, which sits on the critical path because its
specifier impact is the widest. It is also where a partial application is most likely to still
compile, so there the completeness check matters more than the build does.
<!-- /ANCHOR:adr-003-impl -->
<!-- /ANCHOR:adr-003 -->

---

<!-- ANCHOR:adr-004 -->
## ADR-004: `routes/**` is excluded from the rename

**Status:** Accepted — follows from a frozen program invariant.

<!-- ANCHOR:adr-004-context -->
### Context

SvelteKit derives URLs from the filesystem. `routes/session/[id]/+page.svelte` *is* the `/session/:id`
URL, and `+page`, `+layout` and `[param]` are reserved names with meaning to the framework.

The program's frozen invariants include routing: `/`, `/session/[id]` and `/attention/[lookupId]` must
not change.
<!-- /ANCHOR:adr-004-context -->

<!-- ANCHOR:adr-004-decision -->
### Decision

`routes/**` filenames are untouched. The completeness scan excludes SvelteKit reserved names
explicitly, by name, rather than relying on a pattern that happens not to match them.
<!-- /ANCHOR:adr-004-decision -->

<!-- ANCHOR:adr-004-alternatives -->
### Alternatives considered

**Rename inside `routes/` where the name is not reserved.** There is almost nothing to gain — the
route tree is five files — and the risk is that a rename which looks safe changes a URL. Rejected on
the ratio alone.
<!-- /ANCHOR:adr-004-alternatives -->

<!-- ANCHOR:adr-004-consequences -->
### Consequences

`routes/` visibly does not follow the app's naming rule. That inconsistency is correct and should be
stated in the conventions file, because an unexplained exception invites someone to "fix" it later.
<!-- /ANCHOR:adr-004-consequences -->

<!-- ANCHOR:adr-004-five-checks -->
### Five checks

| Check | Answer |
|---|---|
| Is it the simplest option? | Yes — exclude a whole directory |
| What does it touch? | Nothing; it is a boundary, not a change |
| Is it solving a real problem? | Yes — it prevents violating a frozen invariant |
| Will a future maintainer understand it? | Only if the exception is written down |
| Does the complexity match the problem? | Yes |
<!-- /ANCHOR:adr-004-five-checks -->

<!-- ANCHOR:adr-004-impl -->
### Implementation note

The exclusion belongs in the scan command itself, not in a reviewer's memory. A scan that relies on
someone remembering to skip a directory is not a gate.
<!-- /ANCHOR:adr-004-impl -->
<!-- /ANCHOR:adr-004 -->
