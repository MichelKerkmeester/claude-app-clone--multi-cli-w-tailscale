# Iteration 3 — Failure archaeology from git history

Failure modes that already happened in this repository, ranked by recurrence. Each
proposed rule is something an agent starting cold would not get from `REPO RULES.md`
today. Claims are from commit bodies and from files that still encode the lesson.

## Method

Read-only git inspection on this repository (no writes, no `git add` / `stash` /
`clean`). Commands:

- `git log --oneline -200`
- `git log --oneline --all --grep='<keyword>'` for revert, flake, restore, stale,
  silently, phantom, no-op, broke, fingerprint, self-invalidat, positional, race
- `git show -s` / `git show --stat` on the clusters below

No commit whose subject is `Revert` exists. The closest explicit reversal is
`57c14ec` folding co-located `.css` files back into `<style>` blocks after
`f94855c` extracted them. One-off product bugs with a single fix and no second
occurrence are listed at the end and dropped.

`REPO RULES.md` was read in full before any proposal. Several of the strongest
history lessons are already the origin of paragraphs there; those are recorded
as receipts, not re-proposed.

---

## Already in `REPO RULES.md` — do not re-propose

These recurred in history and are already stated. The commits are the evidence
the current wording came from.

| Failure | Commits | Where it lives now |
|---|---|---|
| Bare vitest positional `tests` sweeps `specs/context/` and reports hundreds of phantom failures | `17b99ba` (629 failed files), `a783936` (second occurrence, same cause) | §6 “Never widen a vitest positional” |
| Validator “compiled validation orchestrator is stale”, exit 3, silence read as a pass | `a5e2d8c` (sweep treated 87 packets as passing) | §7 Spec-kit traps |
| CSS comments that never close swallow live rules; markup comments leak as visible text | `1d8ad32` (7 comments, ~47 declarations; 3 leaked into rich cards) | §2 `css-comment-integrity.mjs`; §3 CSS ownership |
| Archive is not byte-stable; a three-run sample produced a wrong determinism claim | `500a4da` (n=6, five of five differed) | §4 “Never conclude determinism from one pair” |
| Capture clock pin; re-pinning fixes todo age and breaks review countdown + inbox ages | `2718a69` | §4 clock pin; §6 stranded fixtures |
| BEM rename of dynamically constructed class names broke four surfaces only a screenshot diff caught | `cc95a24` (402 of 499 classes; 4 dynamic-class regressions) | §3 class grammar |
| Dark-only / contrast defects the one-theme archive cannot see | `50198e2`, `211c5fc`, `8eb1ea4` | §2 “The archive is captured in one theme”; `ui-audit.mjs` |
| Invisible catalog states that pass typecheck, suites, story coverage, and render-smoke | `2718a69` | §2 `catalog-state-visibility.mjs` |
| Scoped CSS on the wrong component renders as nothing; `currentColor` + `color` on the same element paints surface on surface | `d0879ba` | §3 “Putting it in the wrong file is the most common way a change renders as nothing” |
| PlanModeMenu keyboard-activation flake (~62% under load) | `de4704b`, `db017fd` | §6 `menu-plan-mode.svelte.test.ts`, eight runs |
| Generated metadata must be regenerated after spec-doc edits | `e3312b5` and the fingerprint cluster | §7 last paragraph |
| Host-authoritative / fail-closed | `d61ee3f` (stale phone-asserted “foreground” ORed with live sockets) | §5 |

The CSS extract-then-fold-back (`f94855c` → `57c14ec`) confirms §3’s “exactly one
`.css` file plus component-scoped `<style>` blocks” and should not be restated
as a new trap.

---

## Recurring traps not in `REPO RULES.md`

### 1. `$effect` self-invalidation crashes, and the documented ladder cannot see them

**Recurrence.** Five separate committed instances during the Svelte cutover, then
a dedicated gate because the existing ones stayed green on crashing code:

| Commit | What it hit |
|---|---|
| `020ec75` | `+layout.svelte`: auth never stuck, session roster oscillated loading↔loaded. “masked in the real app only because network latency outruns the race; demo mode's instant resolve exposes them.” |
| `89d1391` | Session view `effect_update_depth_exceeded`. “a class of runtime self-invalidation the static gates (svelte-check, decl-equivalence, token-identity) cannot see.” Three more components in the same commit. |
| `45756da` | AskQuestionCard: same crash on terminal/error lifecycle. Explicitly “the 7th” class member by the next commit. |
| `67d148e` | `useRuntime`: fetch twice on mount, Retry-After timer cleared. Negative control: pre-fix `toBe(1)` failed with “received 2”. |
| `a8f9989` | `useHostCommandCatalog` mount + reconnect: duplicate fetch. |
| `96655f5` | Adds `scripts/runtime-smoke-cdp.mjs` / `npm run test:web:runtime` because “The static gates cannot see the effect_update_depth_exceeded self-invalidation class.” |

The class is still in the tree: `untrack(` appears in 25 `app-mobile` files,
including `app-mobile/src/routes/+layout.svelte:247-248` and `:312-313` with the
WHY inline.

**Covered today?** Partly. §1 points at `svelte/svelte.md` for “`$effect`
self-invalidation”. The verification ladder in §2 does **not** list
`npm run test:web:runtime`, even though `package.json:27` still defines it and
`scripts/runtime-smoke-cdp.mjs:7-9` still says static gates miss these crashes.

**Rule that would have prevented it.** After any `$effect` that dispatches into
`$state`, run `npm run test:web:runtime`. `typecheck`, `test:web`, and
`token-identity` all passed on code that threw `effect_update_depth_exceeded`.

---

### 2. `fileParallelism: false` is load-bearing in two suites, independently

**Recurrence.** Two different suites, two different symptoms, same mistaken
“the suite is slow, parallelise it” fix:

- `db017fd` — Svelte suite: PlanModeMenu keyboard-activation failed only under
  parallel-file load. bits-ui menus schedule floating-ui + presence on
  rAF/microtasks; CPU saturation stalls past user-event waits. Proven
  jsdom-under-load, not a component bug. Fix: `fileParallelism: false`.
- `de4704b` — same test ~62% flake from bits-ui BodyScrollLock leaking
  `pointer-events` onto `<body>` plus async initial-focus. Test-only stabilize;
  “Not a product defect”.
- `bb9fda6` — relay suite: adding a 55th file made the pinned-Pi probe fail
  every run, asserting image bytes reached stdout. “A serial run of the same 55
  files passes, so what it reported was its capture racing other workers rather
  than a leak.” Backend suite serialized; cost ~nine seconds.

Still pinned:

```29:35:vitest.web.svelte.config.ts
    fileParallelism: false,
```

```27:35:vitest.config.ts
    // The pinned-Pi integration probe ...
    fileParallelism: false,
```

The same Svelte config also inlines bits-ui (and `@storybook/svelte`) because
vitest otherwise externalizes `node_modules` and rejects raw `.svelte` there
(`vitest.web.svelte.config.ts:31-38`). Removing that “unusual” inline is the
same class of config cleanup that reintroduces a false failure.

**Covered today?** §6 names the PlanModeMenu flake and the eight-run rule. It
does not say the serial setting is the reason the flake is contained, or that
the relay suite has the same constraint for a different probe.

**Rule that would have prevented it.** Do not set `fileParallelism: true` in
`vitest.config.ts` or `vitest.web.svelte.config.ts`. Parallel workers in this
repo have produced false product failures that isolation cannot reproduce —
bits-ui menus under jsdom load, and the pinned-Pi probe racing other files.

---

### 3. A mechanical path rewrite that only understands `import` will lie

**Recurrence.** After `0141c67` shipped the rename manifest and applier, eight
follow-up fixes each discovered another path kind the first pass could not see.
Then a ninth for allowlists. Then a tenth for a rule that was not idempotent.

| Commit | What the first pass missed | Silent failure |
|---|---|---|
| `69f3fd2` | Resolve relatives against the file’s *original* folder; `.svelte.ts` on disk vs `.svelte.js` in specifiers | Rewrite skips the runes modules |
| `1ab9ef7` | `new URL(..., import.meta.url)` worker addresses | “nothing would fail at build time, because the string is only resolved when the worker is constructed” |
| `1791d85` | `vi.mock('...')` module paths (32 survivors) | “stops replacing anything while the suite keeps passing against the real module. That is the quietest way for a rename to lie.” |
| `10c72c2` | `.tsx` logic suites (walked `.svelte`/`.ts`/`.js` only) | Nine imports never visited |
| `f0ac55c` | `vi.importActual<typeof import('...')>('...')` — generic between name and paren | Rewrites the type, leaves the runtime path pointing at a file that no longer exists; “reads as correct” |
| `6c367bb` | Scan scoped to the tree being renamed | Relay test deep-imports a client reducer; suite fails to collect. Quiet version: a test double pointing at nothing |
| `a4c0dad` | Source paths read as files, not imported | Fails late as “missing file”, and only if that assertion is reached |
| `b538a2b` | Bare strings in arrays with no call around them | Relay security test named seven moved client components |
| `968a72f` | Story-coverage allowlist (18 stale paths) | “An allowlist entry that resolves to nothing does not exempt anything, so the gate would have started demanding stories for components that deliberately have none.” |
| `ff33fa0` | Kind rule recognised only PascalCase | Second pass saw nothing to do; partial kebab-case could not be finished |

Separately, this filesystem swallows a case-only rename:

- `0141c67`: “a whole-path case change goes through a temporary name because
  this filesystem can otherwise swallow it”
- `0eeb251`: five chrome components, “including two whose names differ only by
  case — the rename this filesystem can record as nothing at all.” Proved on
  ten files via a temporary name so it would not have to be discovered on 148.

§3 already covers the CSS-class analogue (dynamic `class` construction). It does
not cover source-path rewrites.

**Rule that would have prevented it.** A rename is not done when imports
compile. Sweep `vi.mock`, `vi.importActual` generics, worker `new URL`,
file-read strings, allowlists, and every workspace that can name the moved
module. Run the rewriter twice — a second pass that still finds work means the
first was partial. A case-only rename on this volume must go through a
temporary name or git records it as nothing.

---

### 4. Packet rename/renumber writes metadata that looks complete and is still wrong

**Recurrence.** Three mechanical metadata failures in the same renumber wave,
plus a fourth on the next packet move:

- `8640263` — The 004/005 renumber recomputed `source_fingerprint` but wrote it
  at the **top level** of `graph-metadata.json`. The integrity gate reads
  `derived.source_fingerprint`, “so every one of the 45 packets reported
  `SOURCE_FINGERPRINT_MISMATCH` while carrying a stray top-level key that
  nothing consumes.”
- `ad26ff0` — The same rewrite set `children_ids` to `[]` on every direct
  child. Three of those children are themselves phase parents
  (`012-naming-and-structure`, `016-relay-correctness`, `020-source-structure`)
  and lost the 13 grandchildren they index. Child-drift caught it.
- `3f7b81b` — (a) Frontmatter backfill added `importance_tier` and
  `trigger_phrases` **as a pair**, so a document already carrying one kept its
  gap (131 and 126 remaining). (b) “All 421 references lived inside the packet
  itself … including the research lineage logs and lock files that a
  markdown-only sweep would have missed.”
- `a5e2d8c` — `packet_pointer` / `description.specFolder` still carried an
  `app-mobile-cli/` prefix from the Public monorepo symlink, “so every
  generated path claim disagreed with the folder it described.” (The symlink
  itself is already in §7; the prefix trap is not.)

Current shape, still nested:

```16:16:specs/004-sveltekit-spa-migration/012-naming-and-structure/graph-metadata.json
  "derived": {
```

```94:94:specs/004-sveltekit-spa-migration/012-naming-and-structure/graph-metadata.json
    "source_fingerprint": "sha256:d304b084bed0d75e473ac0467897662ed3ec68e4aa0e7ec954fd0fe6b200a0a1",
```

`children_ids` is a sibling of `derived`, not inside it
(`graph-metadata.json:6-10` on that same file).

**Covered today?** §7 says regenerate `description.json` and
`graph-metadata.json` or `GENERATED_METADATA_INTEGRITY` fails, and that editing
a child staleness the parent. It does not say a hand-placed fingerprint at the
document root is invisible to the gate, or that a one-level-deep rewrite zeros
nested phase parents.

**Rule that would have prevented it.** After a packet rename or renumber, do
not hand-place `source_fingerprint` at the document root — the gate reads
`derived.source_fingerprint`. Rebuild `children_ids` from the folders on disk
for every nested phase parent, not only the folder you renamed. Treat
frontmatter fields independently (a pair-write leaves the field that was
already present gapped). A markdown-only reference sweep misses lock files and
lineage logs.

---

### 5. Catalog smoke “0 throws” is not “the story shows its subject”

**Recurrence.** Three independent ways a story was wrong while the render gate
stayed green:

- `0e524b9` — Storybook composes decorators **last-outermost**. Listing the
  attachment provider first mounted the seeding host above it: “the host
  resolved the inert empty context, staged nothing, and both surfaces rendered
  an empty frame without throwing — invisible to the render smoke gate.”
- `04f92d0` — Follow-up assertions because “The CDP smoke gate only fails on a
  throw and treats an empty frame as a pass.” Still true:
  `scripts/catalog-smoke-cdp.mjs:203-224` flags `error-overlay`, exceptions, and
  console errors, then prints `0 throws`.
- `90b8579` — `parseDisplayBlock` called single-arg, so its default provenance
  `relay` overwrote each fixture tag and “silently routing the one optimistic
  fixture down the wrong normalization path.” Caught by a faithfulness review,
  not by smoke.
- `1d8ad32` (second half) — default Home stories rendered “Relay returned HTTP
  404.” because the story never answered the push-config call, “so the
  archive's picture of a healthy home screen was an error state.”

§2 already has `catalog-state-visibility.mjs` for *invisible state inside a
rendered story*. These are *empty or wrong stories that do not throw*.

§2’s ladder line currently reads as if smoke proves rendering: “every story
renders both themes, zero throws”. The script only proves the third clause.

**Rule that would have prevented it.** `catalog-smoke-cdp.mjs` reporting 0
throws does not mean the story rendered its subject. Storybook composes
decorators last-outermost — listing a provider first mounts the seeder above
it and the frame is empty without throwing. A story that never answers a host
call archives an error state as the healthy picture.

---

### 6. This repository’s path contains a space; `URL.pathname` is not a filesystem path

**Recurrence.** One commit, standing trap: the workspace is still named
`Mobile CLI`.

`c13fa47`: “The vitest resolve.alias used `new URL(...).pathname`, which
URL-encodes the space in the 'Mobile CLI' path to `%20` → a nonexistent dir →
51 svelte test files failed to resolve `$shared` (build/typecheck use
`kit.alias`, so were unaffected).”

Still the required form:

```13:16:vitest.web.svelte.config.ts
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { $shared: fileURLToPath(new URL('./app-mobile/src/shared', import.meta.url)) } },
```

Typecheck staying green while the Svelte suite cannot resolve `$shared` is the
false conclusion.

**Covered today?** No.

**Rule that would have prevented it.** Vitest aliases must use
`fileURLToPath`. `new URL(...).pathname` encodes the space in this
repository’s directory name; `$shared` then points at a path that does not
exist, and `npm run typecheck` will not catch it.

---

### 7. App documents that name directories rot, and no behaviour gate notices

**Recurrence.**

- `25f30e6` — stale React/`apps/` paths in onboarding docs after the SvelteKit
  migration.
- `fa0ab46` — purge 86 stale `style.css` comment refs.
- `672db66` — `ARCHITECTURE.md` / `STORYBOOK.md` still described
  `apps/pi-remote-web/`, `src/style.css`, and a `docs/` folder the migration
  had removed. “A map that names directories that do not exist is worse than
  no map.”
- `934f374` — adds `scripts/naming/scan-skill-references.mjs` because path
  claims have to be resolved against the tree, not inspected.
- `0e19b45` — folder docs repointed at the shipped tree after the same class
  of drift.

**Covered today?** No. §7 says edit `specs/` here because of the monorepo
symlink. It does not say README / ARCHITECTURE / STORYBOOK path claims are
ungated.

**Rule that would have prevented it.** After any layout or migration change,
resolve README / `ARCHITECTURE.md` / `STORYBOOK.md` / skill path claims against
the tree (`node scripts/naming/scan-skill-references.mjs`). Typecheck and
`npm test` will not fail when those documents name directories that no longer
exist.

---

### 8. `token-identity` must unwrap `:global(...)` or it reports 68 false diffs

**Recurrence.** One fix, standing in the resolver that §3 already names as
authority.

`516b86e`: scoped `<style>` writes `:global(:root[data-theme='dark']) .x`.
`classify()` only matched the bare `:root[data-theme='dark'] .x` prefix, “so
every scoped override landed at a separate context key (spurious ADDED) and
never overrode its base value (spurious CHANGED) — 68 false diffs against the
L0 baseline.”

Still the first thing `normalizeSelector` does:

```58:84:scripts/token-identity.mjs
// Unwrap :global(...) so themed overrides match baseline context keys.
function unwrapGlobal(sel) {
```

An agent “simplifying” the resolver, or comparing selectors by string equality
with the `:global()` wrapper still on, will report a regression that is not
one.

**Covered today?** §3 says the script is the only authority on a token value.
It does not say the authority itself lies if `:global()` is left on the key.

**Rule that would have prevented it.** Do not remove or bypass
`unwrapGlobal` in `scripts/token-identity.mjs`. Scoped dark overrides are
written as `:global(:root[data-theme='dark']) …`; matching the bare prefix
instead reports every one as ADDED and the base as CHANGED.

---

## Bits-ui / a11y ports — covered by skill pointer, not by a command

A dense restore cluster during cutover (`888c3b9`, `83433b5`, `6fcd0d5`,
`f2da878`, `f8359a6`, `c780925`, `ae6a5dd`, `263b2a1`, …) dropped
`ariaHideOutside`, focus-trap, radiogroup, virtual focus, and `aria-pressed`
when React-aria surfaces moved to bits-ui or to a hand-rolled
`<div role="dialog">`. §1 already routes that to `svelte/svelte.md` (“bits-ui
accessibility contract”). No additional `REPO RULES.md` sentence is needed
beyond keeping that pointer; unlike finding 1, there is no missing command on
the ladder.

---

## One-offs ignored (no second occurrence, no general repo trap)

| Commit | What happened | Why dropped |
|---|---|---|
| `50bf878` | Restarted host kept publishing under the dead predecessor’s epoch | One lifecycle bug, now tested in `epoch-rotation.test.ts` |
| `2e71b45` / `3052336` | Projection batch allocated sequences locally; declined control-plane residue desynced the next block; framing layer relabelled it as a parse error | One integrity bug, now tested |
| `bb9fda6` (product half) | Four silent suspends exhaust the per-device socket allowance | Product test exists; the *suite-racing* half is finding 2 |
| `d61ee3f` | Phone-asserted foreground ORed with observed sockets | Instance of §5 host-authoritative |
| `0c0d309` | Stop hidden while a draft sat in the composer | One UX bug |
| `93eeb68` | Comment scanner counted wrapped lines as sentence starts (700 vs real 16) | One measurement bug inside one packet |
| `0ed67bd` / `2e8e68b` / `782ede3` | Story typing recipes (type from the component, annotate `Meta`, `Object.freeze<T>`) | Real, but a Storybook typing recipe, not a repo trap that recurs outside that packet |
| `28725f4` | ThemeControl 390px overflow | One layout bug |
| Composer visual cascade (`c7d08a5` then `ef1ba64` … `03f2209`) | Full-width composer needed five presentation follow-ups | Exactly why §2’s presentation ladder exists |

---

## Suggested additions, shortest form

If `REPO RULES.md` takes only the traps that would change an agent’s next
command or next conclusion:

1. **Ladder:** add `npm run test:web:runtime` (`scripts/runtime-smoke-cdp.mjs`).
   Static gates cannot see `effect_update_depth_exceeded`.
2. **Vitest:** `fileParallelism: false` in both `vitest.config.ts` and
   `vitest.web.svelte.config.ts` is load-bearing. Do not re-enable it.
3. **Rename:** sweep non-import path kinds; run twice; case-only names need a
   temporary path on this volume.
4. **Spec metadata:** fingerprint lives at `derived.source_fingerprint`;
   nested phase parents keep `children_ids`; don’t pair-write frontmatter;
   don’t markdown-only-sweep.
5. **Catalog smoke:** 0 throws ≠ visible subject; decorators are last-outermost;
   unanswered host calls archive an error as healthy.
6. **Aliases:** `fileURLToPath`, because this repo’s path contains a space.
7. **Docs:** resolve README / ARCHITECTURE / STORYBOOK paths against the tree.
8. **Token identity:** keep `unwrapGlobal`; `:global()` on a selector is not a
   different token.

Items 1, 2, 5, and 6 are the ones that produce a *false pass* on a green
command an agent already knows to run.
