# Iteration 5 — Adversarial accuracy audit of `REPO RULES.md`

**Target:** `/Users/michelkerkmeester/MEGA/Development/Mobile CLI/REPO RULES.md` (205 lines, read in full before any claim below).
**Method:** Every path, command, number and load-bearing sentence was checked against the tree or a read-only command. A claim that is only plausible is not marked CONFIRMED.
**Constraint:** no git; no builds; no test suites; no captures; no reads under `specs/context/` (top-level directory names only). `npx eslint` on three named files was run as a read-only diagnostic of the standing-baseline claim, not as a suite.
**Date of measurement:** 2026-08-29.

**Verdict:** The design-system numbers (39 goldens, one source CSS, 95 scoped styles, 337/311/26, clock pin, composer:599, CSP strings, named `scripts/*.mjs`) match the tree. The document is **not** accurate as a cold-start contract. The failures that would waste an agent's time or produce a false conclusion are: **six** context repos not five, **six** workspace packages not five, **three** dual-theme gates not one, a garbled skill-folder row, a **missing** pre-push hook in this checkout, and a **clean** `+layout.svelte` that the document still calls an eslint baseline.

---

## 1. Falsifications (WRONG / STALE)

These are the claims that do not survive measurement. Ordered by how badly a cold agent would be misled.

### F1 — WRONG: `specs/context/` holds five repositories

**Claim (L169–170):** "five untracked research repositories — OGAM-main, mobilecli-main, nodeterm-main, openclaude-android-main, remote-for-opencode-master."

**Measured:** six top-level directories. Names only (`ls -1 specs/context`); no file inside any of them was read.

```
OGAM-main
mobilecli-main
nodeterm-main
openclaude-android-main
orca-main
remote-for-opencode-master
```

`ls -ld specs/context/*` (2026-08-29): all six are directories, none are symlinks. `orca-main` mtime Aug 24 09:01 — newer than several of the named five.

The five names that *are* listed exist. The count is wrong. The omitted name is `orca-main`.

**"Untracked"** is UNVERIFIABLE in this iteration (no git). Repo `.gitignore` force-includes specs (`!/specs`, `!/specs/**` at `.gitignore:33-35`). Global `~/.gitignore_global` ignores `/specs` at a repo root. Whether git treats the six trees as untracked nested checkouts was not checked.

### F2 — WRONG: `npm run typecheck` is "all five workspaces"

**Claim (L42):** `npm run typecheck  # all five workspaces`

**Measured workspace packages** (`ls -d packages/*/ app-mobile app-relay extensions/*/`):

| Path | `package.json` `name` | has `typecheck` script |
|---|---|---|
| `packages/pi-rpc-protocol` | `@pi-remote/pi-rpc-protocol` | yes |
| `app-mobile` | `@pi-remote/web` | yes |
| `app-relay` | `@pi-remote/relay` | yes |
| `extensions/pi-remote-approval` | `@pi-remote/approval-extension` | yes |
| `extensions/pi-remote-inbound-media` | `@pi-remote/inbound-media-extension` | yes (`tsc -p tsconfig.json --noEmit`) |
| `extensions/pi-remote-plan` | `@pi-remote/plan-extension` | yes |

**Six** workspace packages. Root `package.json:22` typechecks five of them and **omits** `@pi-remote/inbound-media-extension`. Root `build` (`package.json:13`) omits it too. Root `test` (`package.json:23`) omits `extensions/pi-remote-inbound-media/tests` (that tree has `tests/publish.test.ts` and `tests/publisher-boundary.test.ts`).

A cold agent that treats "all five workspaces" as complete will ship inbound-media untyped and untested.

### F3 — WRONG: `ui-audit.mjs` is the only gate that sees the other theme

**Claim (L66–67):** "The archive is captured in one theme. `ui-audit.mjs` is the only gate that sees the other."

**Measured:**

| Gate | Themes it actually drives |
|---|---|
| `scripts/capture-screenshots.mjs` | **one**, the Storybook default. URL is `iframe.html?id=…&viewMode=story` with no `globals=theme` (`capture-screenshots.mjs:370`). Default is `system` (`app-mobile/.storybook/preview.ts:30`). |
| `scripts/ui-audit.mjs` | `['light', 'dark']` (`ui-audit.mjs:461`) |
| `scripts/catalog-smoke-cdp.mjs` | `['light', 'dark']` (`catalog-smoke-cdp.mjs:32`, header comment L5: "Render every Storybook story in light and dark") |
| `scripts/catalog-state-visibility.mjs` | `for (const theme of ['light', 'dark'])` (`catalog-state-visibility.mjs:154`) |

Three presentation gates walk both light and dark. The archive is the odd one out, and it is captured in **system**, not light. Framing "the other" as a single missed theme is also wrong: the archive never records light or dark.

The first sentence ("archive is captured in one theme") is CONFIRMED. The second sentence is WRONG.

### F4 — WRONG: skill `references/` last table row

**Claim (L26):**

`| operations/, release/, standards/, quality/ | operations.md, setup.md, — |`

**Measured** against `.opencode/skills/sk-code/sk-code-mobile-cli/references/` and the skill's own map (`SKILL.md:49–61`):

| Folder | `<folder>/<folder>.md`? | Actual read-first |
|---|---|---|
| `operations/` | yes — `operations.md` | `operations.md` (content document, no "PICK BY" table) |
| `setup/` | yes — `setup.md` | already has its own row on L25. `setup.md` is **not** the entry for release/standards/quality |
| `release/` | **no** `release.md` | `release-verification.md`, `ai-deploy-playbook.md` |
| `standards/` | **no** `standards.md` | `code-standards.md`, `security.md`, `platform-support.md` |
| `quality/` | **no** `quality.md` | `doc-quality-gate.md`, `pi-remote-full-access-runtime-baseline.md` |

`setup.md` on that row is a copy-paste error. The skill's own table uses `—` for standards/release/quality and keeps `setup.md` on the setup row. REPO RULES compressed four folders into one row and attached the wrong entry file.

Related imprecision on L15–16 ("most with a `<folder>/<folder>.md` entry that routes by what you are doing"):

| Folder | Entry exists | Routes (has a pick table)? |
|---|---|---|
| `design-system/` | yes | yes — `design-system.md:46` "PICK BY WHAT YOU ARE CHANGING" |
| `conventions/` | yes | yes — `conventions.md:43` "PICK BY WHAT YOU ARE DOING" |
| `storybook/` | yes | yes — sibling table at `storybook.md:73-75` |
| `verification/` | yes | **no** — merged, as L28–29 says |
| `svelte/` | yes | **no** — merged, as L28–29 says; only file in the folder |
| `setup/` | yes | **no** — install/serve prose, no pick table, no link to `device-preview.md` |
| `operations/` | yes | **no** — operations prose, no pick table |

L28–29 correctly exempts `verification/` and `svelte/`. It should also exempt `setup/` and `operations/`.

### F5 — STALE: eslint standing baseline includes `+layout.svelte`

**Claim (L159–160):** "eslint carries a standing baseline in `sheet-model-effort.svelte` and `+layout.svelte`; `.svelte.ts` files fail eslint parsing repo-wide."

**Measured** (read-only `npx eslint` on the three named surfaces):

```
app-mobile/src/pages/chat/chrome/sheet-model-effort.svelte
  156:7  error  Prefer using writable $derived instead of $state and $effect
  626:9  error  The value assigned to 'next' is not used in subsequent statements
  662:9  error  The value assigned to 'next' is not used in subsequent statements

app-mobile/src/shared/state/app-state.svelte.ts
  14:13  error  Parsing error: Unexpected token {

(+layout.svelte: no findings)
```

`sheet-model-effort.svelte` still has a 3-error baseline. `+layout.svelte` is clean. `.svelte.ts` parse failure CONFIRMED on `app-state.svelte.ts:14` (`import type { … }` — `eslint.config.js` feeds `**/*.{js,mjs,ts,tsx}` to typescript-eslint and never hands `*.svelte.ts` to `svelte-eslint-parser`; 19 `*.svelte.ts` files exist under `app-mobile/`).

An agent that subtracts "the two-file baseline" from a dirty lint will invent a `+layout.svelte` regression that is not there.

### F6 — WRONG (this checkout): a pre-push hook enforces `SPECKIT_ALLOW_REMOTE_PUSH=1`

**Claim (L177):** "Pushing to `origin` requires `SPECKIT_ALLOW_REMOTE_PUSH=1`, and a pre-push hook enforces the policy."

**Measured:**

- `.git/hooks/` contains only `*.sample` files. There is no executable `pre-push`.
- `.git/config` has no `core.hooksPath`.
- `find` for `pre-push` / `.husky` / `*live-follow*` under this repo (excluding `specs/context` and `.git`) returned nothing installed as a hook.
- The **script** exists in the shared tree: `.opencode/scripts/git-hooks/pre-push` documents `SPECKIT_ALLOW_REMOTE_PUSH=1` at L24 and says `Install: bash .opencode/scripts/install-git-hooks.sh` (L26). `.opencode/scripts/install-git-hooks.sh` exists. It has not been run in this checkout.

A push from this repository is not hook-gated. The policy text is true of the shared skill; the enforcement sentence is false here.

### F7 — WRONG: phase-parent validate exit code "describes the last child"

**Claim (L199–201):** "Validating a phase parent recurses into its children, so the exit code and the output tail describe the last child, not the folder you asked about. Take the *first* `RESULT:` line for a folder's own verdict."

**Measured** in `validate.sh`:

- Auto-recursion CONFIRMED: if the folder has phase children and the caller did not pass `--no-recursive`, it sets `RECURSIVE=true` (`validate.sh:350-352`).
- Parent is validated first, then each child (`validate.sh:321-334`).
- First `RESULT:` is the parent's own verdict — CONFIRMED (`orchestrator.ts:1035` / `1051` emit `RESULT: …` per folder; parent runs first).
- Exit code is **not** the last child's. It is the running maximum: `(( child_rc > rc )) && rc=$child_rc` (`validate.sh:333`). A last child that passes (0) after an earlier child that failed (2) exits 2.

"Output tail describes the last child" is CONFIRMED. "Exit code describes the last child" is WRONG.

### F8 — STALE / imprecise: `git-live-follow --live main`

**Claim (L178):** "The `git-live-follow --live main` daemon is ff-only and non-destructive."

**Measured:** the binary is `.opencode/bin/git-live-follow.sh`, not `git-live-follow`. Flag `--live` exists (`git-live-follow.sh:27,47`). Fast-forward-only and dirty-tree refusal are in the script header (`git-live-follow.sh:12-16`). Whether a daemon is running in this checkout was not checked (UNVERIFIABLE without process inspection).

---

## 2. Priority numbers — measured, not agreed

### 39 goldens

**Claim (L52, L73):** "39 frozen goldens, light + dark + system."

**Measured** from `scripts/token-identity.mjs:283-306` (`const GOLDENS`). Themes array is `['light', 'dark', 'system']` (`token-identity.mjs:41`).

| Theme | Key count |
|---|---|
| light | 15 |
| dark | 15 |
| system | 9 |
| **total entries** | **39** |

Light/dark keys: `::--canvas`, `::--surface`, `::--ink`, `::--ink-muted`, `::--accent`, `::--accent-strong`, `::--accent-ink`, `::--accent-soft`, `::--focus`, `::--action-bg`, `::--action-fg`, `::--success`, `::--danger`, `::--surface-code`, `::--on-code`.
System omits `::--accent`, `::--accent-soft`, `::--action-bg`, `::--action-fg`, `::--success`, `::--danger`.

Pass line computes the same sum (`token-identity.mjs:368`). Unique token names across themes: 15, not 39. The claim is about entries, and it matches.

**CONFIRMED.**

### One `.css` file

**Claim (L81):** "The app has exactly **one** `.css` file — `app-mobile/src/app.css`."

**Measured** (`find` pruned `node_modules`, `.git`, `specs/context`, `app-mobile/.svelte-kit`, `app-mobile/dist`, `app-mobile/storybook-static`):

```
./app-mobile/src/app.css
```

`ls -la app-mobile/src/app.css` — present, 111039 bytes, mtime Aug 29 04:46.

Generated CSS exists under `app-mobile/.svelte-kit/output/` (12 hashed files). Those are build output, not authored source. The ownership claim is about authored CSS. **CONFIRMED** for source.

### 95 scoped `<style>` blocks

**Claim (L81–82):** "**95** component-scoped `<style>` blocks."

**Measured:** `rg -c --glob '*.svelte' '^<style>'`

| Scope | Count |
|---|---|
| `app-mobile/src` | **95** |
| `app-mobile` including `.storybook/` | 97 (`editable-seams.svelte`, `token-playground.svelte`) |

No `<style …>` with attributes under `app-mobile/src`. 33 `app-mobile/src/**/*.svelte` files have no `<style>` block (primitives, route shells, story hosts).

**CONFIRMED** for `app-mobile/src` (the app). The two Storybook-only blocks are outside that count.

### 44 documents × 2 trees × 8 folders

**Claim (L32–33):** "`feature-catalog/` and `manual-testing-playbook/`, 44 documents each across 8 subject folders."

**Measured:**

| Tree | Subject folders (8) | md in folders | root index | total md |
|---|---|---|---|---|
| `feature-catalog/` | approval-and-mutation 6, auth-and-boundary 6, command-and-push 3, design-system 4, mobile-ui-features 10, pwa 4, release 4, transport-and-state 6 | **43** | `feature-catalog.md` | **44** |
| `manual-testing-playbook/` | same 8 folder names, same per-folder counts | **43** | `manual-testing-playbook.md` | **44** |

44 is the markdown file count **including** the root index. The 8 folders hold 43 each. **CONFIRMED** if "44 documents" means the whole tree; slightly loose if "across 8 subject folders" is read as "44 files live in those folders."

Skill does not contain `feature-catalog/` (`ls` → no such directory). Skill **does** contain its own `manual-testing-playbook/` with **27** markdown files (skill-testing scenarios, not the app playbook). The "does not mirror" sentence (L33) is true of the app catalog/playbook. The shared directory name is a trap the document does not name.

### 337 / 311 / 26

**Claim (L112):** "337 stories, 311 captured, 26 visually empty."

**Measured** from `screenshots/MANIFEST.json`:

| | Header fields | Independent count of `entries[]` |
|---|---|---|
| total / `entries.length` | 337 | 337 |
| captured / `ok && !visuallyEmpty` | 311 | 311 |
| visuallyEmpty | 26 | 26 |
| failed | 0 | 0 |

`find screenshots -name '*.png' | wc -l` → **311**. Header, array, and files agree.

**CONFIRMED.**

### Composer mutation fence at `:599`

**Claim (L145–146):** "`app-mobile/src/pages/chat/chrome/session-composer.svelte:599` fences the mutation path — submit, steer, stop, snapshot, slash-draft, attachment flow."

**Measured** (`session-composer.svelte:599`):

```
  // Do not edit — Mutation path — Submit / steer / stop / snapshot / slash-draft / attachment flow; presentation may not reach past here.
```

`function submit(): void` begins at L600. **CONFIRMED.** Same file also fences other seams at 697, 770, 1068, 1331; the cited line is the mutation-path fence.

### Clock pin `2026-08-28T12:00:00.000Z`

**Claim (L124–125):** pinned in `capture-screenshots.mjs`, `ui-audit.mjs` and `catalog-state-visibility.mjs`. "Change all three together or none."

**Measured** (`rg FIXED_CLOCK|2026-08-28T12:00:00.000Z scripts/`):

| File | Line |
|---|---|
| `scripts/catalog-state-visibility.mjs` | 45 `const FIXED_CLOCK = new Date('2026-08-28T12:00:00.000Z');` |
| `scripts/capture-screenshots.mjs` | 50 same |
| `scripts/ui-audit.mjs` | 33 same |

No other file under `scripts/` defines this pin. **CONFIRMED** — the three named scripts are exactly the set.

The 05:00 / 14573:00 / "just now" re-pin anecdote (L126–128) was not re-measured (no captures). **UNVERIFIABLE** in this pass. `catalog-state-visibility.mjs:16-17` records a related real failure ("Updated 243 hours ago") as the reason the gate exists.

### CSP strings

**Claim (L91–92):** web app ships `default-src 'self'`; relay serves `default-src 'none'; frame-ancestors 'none'`.

**Measured:**

Web app — `app-mobile/svelte.config.js:22-33`:

```
'default-src': ['self'],
'script-src': ['self'],
'style-src': ['self'],
'img-src': ['self', 'blob:'],
'connect-src': ['self'],
'object-src': ['none'],
'frame-src': ['none'],
'base-uri': ['none'],
```

`app-mobile/src/app.html` has **no** CSP meta tag (L1–22). The quoted `default-src 'self'` is present as one directive of a larger policy. **CONFIRMED** as a substring. Incomplete as a description of what the app ships.

Relay — exact string at `app-relay/src/http/server.ts:706` (artifact responses) and `app-relay/src/http/server.ts:2481` (JSON responses):

```
'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
```

**CONFIRMED.**

"Headless Chrome renders the app unstyled" was not opened in a browser. `style-src 'self'` would block `page.addStyleTag` injection (`capture-screenshots.mjs:375` does that against **storybook-static**, not the app). **UNVERIFIABLE** as an observed fact; the directive that would block injected styles is CONFIRMED.

---

## 3. Paths and commands — claim by claim

### §1 Surface skill

| Claim | Status | Evidence |
|---|---|---|
| Evidence lives in `sk-code-mobile-cli` under `.opencode/skills/sk-code/sk-code-mobile-cli/` | CONFIRMED | directory exists; `SKILL.md` name `sk-code-mobile-cli`. `.opencode` is a symlink to `/Users/michelkerkmeester/MEGA/Development/Code_Environment/Public/.opencode`. `.claude/skills/sk-code/sk-code-mobile-cli` is a separate real directory with the same mtime. |
| Folders `design-system/`, `verification/`, `storybook/`, `conventions/`, `svelte/`, `setup/` have the named entry files | CONFIRMED | all six `references/<folder>/<folder>.md` exist |
| `running-storybook.md`, `device-preview.md` exist | CONFIRMED | `references/storybook/running-storybook.md`, `references/setup/device-preview.md` |
| Feature catalog / playbook live at repo root, not in the skill | CONFIRMED | `feature-catalog/`, `manual-testing-playbook/` at repo root; skill has no `feature-catalog/`. Skill **does** have a differently-purposed `manual-testing-playbook/` (27 files). |

### §2 Verification ladder — behaviour gates

Root `package.json` scripts:

| Claimed command | Status | Actual |
|---|---|---|
| `npm run typecheck` | CONFIRMED name; WRONG "all five" (F2) | `package.json:22` — five `-w` packages, inbound-media omitted |
| `npm run test:web` | CONFIRMED | `package.json:24` = `test:web:svelte` then `test:web:logic` |
| `npm test` | CONFIRMED name and five directories | `package.json:23`: `packages/pi-rpc-protocol/tests` `app-relay/tests` `extensions/pi-remote-approval/tests` `extensions/pi-remote-plan/tests` `release/tests`. Comment on L44 says "protocol, relay, extensions, release" — "extensions" is two of three. |
| `npm run build` | CONFIRMED name; same inbound-media omission as typecheck | `package.json:13` |

`test:web` pipe trap (L63–64): no repo script sets `pipefail` on that pipeline. In zsh/bash without `pipefail`, `npm run test:web | tail` is tail's status. **CONFIRMED** as shell semantics. Not re-demonstrated by running the suite.

### §2 Presentation gates — every `scripts/*.mjs` and npm script

| Claimed invocation | File exists? | Status |
|---|---|---|
| `node scripts/token-identity.mjs verify app-mobile/src/app.css` | `scripts/token-identity.mjs`; `verify` is a real subcommand (`token-identity.mjs:11,361`) | CONFIRMED |
| `npm run story:coverage` | `package.json:16` → `node scripts/story-coverage.mjs`; file exists | CONFIRMED |
| `npm run build-storybook -w @pi-remote/web` | `app-mobile/package.json:13` `build-storybook`; workspace name `@pi-remote/web` | CONFIRMED |
| `node scripts/catalog-smoke-cdp.mjs` | exists | CONFIRMED |
| `node scripts/catalog-state-visibility.mjs` | exists | CONFIRMED |
| `node scripts/token-override-check.mjs` | exists | CONFIRMED |
| `node scripts/css-comment-integrity.mjs` | exists | CONFIRMED |
| `node scripts/ui-audit.mjs` | exists | CONFIRMED |
| `npm run story:shots` | `package.json:18` = `build-storybook -w @pi-remote/web && node scripts/capture-screenshots.mjs` | CONFIRMED |

### §3 Design system

| Claim | Status | Evidence |
|---|---|---|
| `scripts/token-identity.mjs` is the only authority on a token value | CONFIRMED as the gate that encodes goldens | goldens live only in that file |
| Catalog token playground writes no stylesheet | CONFIRMED | `app-mobile/.storybook/token-playground.svelte:15` "This writes no stylesheet." |
| Class grammar `block--element` with `is-*` | CONFIRMED as the written contract | `references/design-system/css-class-naming-bem.md:19-21` |

### §4 Storybook / archive

| Claim | Status | Evidence |
|---|---|---|
| `npm run storybook` → `storybook dev -p 6006` → `http://localhost:6006` | CONFIRMED | root `package.json:15`; `app-mobile/package.json:12` `storybook dev -p 6006` |
| One build directory `app-mobile/storybook-static` | CONFIRMED as the path every listed gate reads | `capture-screenshots.mjs:31`, `ui-audit.mjs:21`, `catalog-state-visibility.mjs:39`, `token-override-check.mjs:39`, `catalog-smoke-cdp.mjs:31`. `app-mobile/.storybook/main.ts` does not set `outputDir`; Storybook default is `storybook-static` beside the app. Directory exists locally. `.gitignore:4` ignores `storybook-static/` — a cold clone will not have it. |
| Two concurrent builds corrupt it | UNVERIFIABLE | not re-run |
| Archive is `screenshots/`, one image per story, `MANIFEST.json` includes empty stories | CONFIRMED | `screenshots/` exists; MANIFEST lists empty stories (e.g. L13-19 `artifacts-artifactdetails--closed`) |
| Archive tracked in git | UNVERIFIABLE | no git; `screenshots/` is not in `.gitignore` |
| Archive not byte-stable; five-of-five flake experiment | UNVERIFIABLE | would need captures |
| `git checkout HEAD -- screenshots/<path>` stages | UNVERIFIABLE | no git. That is `git checkout <tree-ish> -- <path>` documented index update, not re-checked |

### §5 Fail-closed seams

| Claim | Status | Evidence |
|---|---|---|
| Host-requests packet at `specs/006-orca-nodeterm-ux-mining/007-host-requests/` | CONFIRMED | folder exists with `spec.md`, `plan.md`, `tasks.md`, `checklist.md`, `implementation-summary.md`, metadata |
| Composer fence `:599` | CONFIRMED | F-section above |

### §6 Known baselines

| Claim | Status | Evidence |
|---|---|---|
| `sandboxed-diagram--valid` exists in the archive | CONFIRMED as an id | `MANIFEST.json:2004` `rich-content/sandboxed-diagram--valid.png`. That it flakes is UNVERIFIABLE |
| `plan-mode-button--*` exists | CONFIRMED | MANIFEST rels at 1502, 1510, 1518, 1526 |
| `auth.test.ts` in the relay suite is timing-flaky (201 vs 403) | UNVERIFIABLE | `app-relay/tests/auth.test.ts` exists and asserts both 201 and 403 as **expected** statuses (e.g. L73, L137). No comment in-file about flake. Not re-run |
| `app-mobile/tests/menu-plan-mode.svelte.test.ts` keyboard-activation flake | UNVERIFIABLE | file exists; several `user.keyboard` cases (L178–225); one **unrelated** skip at L158. Not re-run |
| eslint baseline `sheet-model-effort.svelte` | CONFIRMED | 3 errors, see F5 |
| eslint baseline `+layout.svelte` | STALE | 0 errors, see F5 |
| `.svelte.ts` fail eslint parsing repo-wide | CONFIRMED | `app-state.svelte.ts:14` parse error; config gap in `eslint.config.js:37` vs `57` |
| Never widen vitest to bare `tests` | CONFIRMED as the written reason | `vitest.config.ts:9-23` excludes `specs/context/**` **and** runtime symlinks (`.opencode/**`, `.pi/**`, …). REPO RULES names only the context repos. The symlink trees are a second copy of the same trap |

### §7 Git, specs, protected repos

| Claim | Status | Evidence |
|---|---|---|
| Five named context repos | WRONG count / STALE list | F1 — six directories |
| `specs/` is symlinked into the Public monorepo as `specs/app-mobile-cli`; edit it here | CONFIRMED | `ls -ld /Users/michelkerkmeester/MEGA/Development/Code_Environment/Public/specs/app-mobile-cli` → symlink to `/Users/michelkerkmeester/MEGA/Development/Mobile CLI/specs`. This repo's `specs/` is a real directory (`drwxr-xr-x`) |
| `SPECKIT_ALLOW_REMOTE_PUSH=1` + pre-push hook | script CONFIRMED; enforcement in this checkout WRONG | F6 |
| `git-live-follow --live main` ff-only | script CONFIRMED under `.opencode/bin/git-live-follow.sh`; command name slightly off; daemon presence UNVERIFIABLE | F8 |
| validate via `realpath` + `NODE_PRESERVE_SYMLINKS=1` | path CONFIRMED; env var UNVERIFIABLE | `ls -l "$(realpath .opencode)/skills/system-spec-kit/scripts/spec/validate.sh"` exists (15851 bytes). `NODE_PRESERVE_SYMLINKS` does **not** appear in `validate.sh` or in `system-spec-kit/SKILL.md` / `references/workflows`. Silent-no-op-through-symlink was not reproduced |
| Stale orchestrator message + exit 3 | CONFIRMED | `validate.sh:282-285`: `ERROR: validate.sh compiled validation orchestrator is stale.` then `exit 3`. Quoted fragment matches. Rebuild line in the script is `cd .opencode/skills/system-spec-kit/mcp-server && npm run build` (`validate.sh:284`). REPO RULES wraps that in `realpath`. `mcp-server/package.json:21` has `"build"` |
| Phase-parent recursion | CONFIRMED auto-recurse; WRONG exit-code story | F7 |
| `GENERATED_METADATA_INTEGRITY` fails if metadata not regenerated | CONFIRMED rule exists | `generated-metadata-integrity.ts:18` exports `GENERATED_METADATA_INTEGRITY`. "Editing a child also staleness the parent's metadata" was not independently traced to a parent-fingerprint that includes child docs in this pass — treat the child→parent half as UNVERIFIABLE here (sibling rule `GRAPH_METADATA_CHILD_DRIFT` is about `children_ids`, not content fingerprints) |

---

## 4. Contract / audience sentences (not path-claims)

The opening contract (L3–5: AGENTS.md wins rules; this file wins paths/commands/numbers) is a policy statement, not a tree fact. `AGENTS.md` is a symlink to `/Users/michelkerkmeester/MEGA/Development/Code_Environment/Public/AGENTS.md`. `CLAUDE.md` points at the same file.

Host-authoritative / fail-closed / "never invent a host field" / "no production API to serve a story" are rules. Not falsified; not confirmed by a count.

---

## 5. What a cold agent would get wrong if it trusted this file

1. It would treat `orca-main` as outside the protected set and could `git add` / clean / stash it.
2. It would skip `@pi-remote/inbound-media-extension` on typecheck, build, and `npm test`, then report the repo green.
3. It would treat a dark-only **throw** or **invisible-state** failure as something only `ui-audit.mjs` can see, and skip `catalog-smoke-cdp.mjs` / `catalog-state-visibility.mjs` already covering those themes.
4. It would capture or compare against "the other theme" as if the archive were light; the archive is **system**.
5. It would open `references/release/release.md` (does not exist) or `setup.md` as the release/standards/quality entry.
6. It would blame itself for eslint noise in `+layout.svelte` that is no longer there, and miss that `.svelte.ts` is still a parser gap.
7. It would believe a push from this checkout cannot land without `SPECKIT_ALLOW_REMOTE_PUSH=1`. Nothing in `.git/hooks` stops it.
8. It would read a phase-parent validate **exit code** as the last child's verdict. It is the worst code in the walk.

---

## 6. Inventory of statuses

| Status | Count of load-bearing claims |
|---|---|
| CONFIRMED | 39 goldens; 1 source CSS; 95 src `<style>` blocks; 44/44 md trees (1+43); 8+8 folders; 337/311/26; clock in exactly three scripts; composer:599; both CSP strings; all named `scripts/*.mjs`; all named npm script names; storybook `:6006`; `storybook-static` path; host-requests folder; skill root path; token-playground "writes no stylesheet"; BEM grammar doc; `test:web` svelte-then-logic; five `npm test` directories; validate.sh stale/exit 3 and auto-recurse; Public `specs/app-mobile-cli` symlink; `.svelte.ts` parse gap; `sheet-model-effort.svelte` eslint baseline; flake **ids** present in MANIFEST |
| WRONG | five context repos; five workspaces; ui-audit sole other-theme gate; skill table last row; pre-push enforcement in this checkout; validate exit code = last child |
| STALE | `+layout.svelte` eslint baseline; `git-live-follow` command name (script is `.sh`) |
| UNVERIFIABLE | archive flake experiment; clock re-pin numbers; screenshot byte-stability; auth 201/403 flake; menu-plan-mode flake; concurrent-build corruption; `git checkout` stages; context "untracked"; live-follow daemon running; `NODE_PRESERVE_SYMLINKS` necessity; symlink no-op; headless Chrome unstyled; child-edit staleness of parent metadata; "tracked in git" for `screenshots/` |

A PLAUSIBLE claim was not marked CONFIRMED. Every CONFIRMED number above is a count or a string that was read, not an agreement with the document.
