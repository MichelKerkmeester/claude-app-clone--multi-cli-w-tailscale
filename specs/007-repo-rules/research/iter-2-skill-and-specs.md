# Iteration 2 — What the skill and specs know that REPO RULES does not

Read-only pass. Compared `REPO RULES.md` (205 lines) to
`.opencode/skills/sk-code/sk-code-mobile-cli/` (`SKILL.md` + `references/`) and
the `KNOWN LIMITATIONS` sections of spec `implementation-summary.md` files
under `specs/` (not `specs/context/`). Claims below are from a file read or a
read-only command. Historical limitations that later packets superseded are
listed only to stop them being copied.

Boundary used throughout: **REPO RULES** = a fact an agent needs cold, before
it knows to open the skill. **Stay in the skill** = reachable once routed,
one click away. **Stay in the spec** = a packet-local leftover, not a
standing repo contract.

---

## 1. Contradictions

### 1.1 Primitive retint — REPO RULES teaches the edit the skill forbids

`REPO RULES.md:78-79` says edit highest-first, primitive → semantic →
component, and that "retinting a primitive moves everything downstream."
`design-system.md:63-66` says the same: retinting a primitive is "sometimes
exactly right."

The surface contract forbids that edit:

- `SKILL.md:173-174` — "Retint a **semantic role** or a **component token**,
  never a `--pi-*` value."
- `token-library.md:48-49, 68-69, 102-103` — Layer 1 is "**No — frozen
  contract**"; "Never change a value here."
- `app-mobile/src/app.css:80`, `:192`, `:269` — each primitive block is
  fenced `Do not edit — frozen source.`

The goldens `token-identity.mjs` verifies are semantic roles
(`::--canvas`, `::--ink`, …), not `--pi-*` names
(`scripts/token-identity.mjs:283-306`). Changing a primitive without
updating those goldens fails `verify`. Changing one *and* updating goldens
still violates the fence.

**Belongs in REPO RULES.** An agent that only read §3 would retint
`--pi-clay` as the "highest isolating layer." One sentence: primitives are
frozen; retint a semantic role or a component token; the blast-radius
example in `token-library.md:89-91` is a measurement, not permission.
`design-system.md:63-66` is the skill line that should be amended to match
`token-library.md`.

### 1.2 Parent surface detector still describes a React + Tailwind app

`stack-detection.md:87` (parent hub, not the surface packet): "the Pi Remote
web app is React 19 + Vite + Tailwind." `stack-detection.md:32` still names
"`@ds` grammar."

The surface packet and the tree disagree:

- `SKILL.md:17-21` — SvelteKit, Svelte runes, component-scoped styles.
- `app-mobile/svelte.config.js:4-18` — `@sveltejs/adapter-static`, SPA
  fallback `index.html`.
- Zero `*.test.tsx` under `app-mobile/` (glob). `vitest.web.config.ts` is
  gone; only `vitest.web.svelte.config.ts` and `vitest.web.logic.config.ts`
  remain.

Path detection still works (`app-mobile/` → PI_REMOTE). The prose would send
an agent to React conventions *before* it opened `sk-code-mobile-cli`.

**Belongs in REPO RULES** as one cold line: this app is SvelteKit + runes,
not React; the parent detector's PI_REMOTE rationale paragraph is stale.
The detector file itself stays a skill/hub fix.

### 1.3 "Controls stay ≥44px" vs shipped chrome

`SKILL.md:183` — "controls stay ≥44px." Spec limitations record the
measured exception and say not to "fix" it as a refinement:

- `009-refine-artifacts/implementation-summary.md:134-137` — 98 controls
  between 24px and 38px; they clear WCAG 2.5.8 AA, not the project's 44px
  assertion.
- `010-refine-chrome/implementation-summary.md:111-113` — mode toggles,
  theme options, composer input, same range.
- `011-refine-transcript/implementation-summary.md:106-107` — turn actions
  73×32 and 77×32.
- `012-refine-views/implementation-summary.md:115-116` — theme options
  38×36, composer 38px tall.

**Belongs in REPO RULES** as a known-baseline trap: chrome and transcript
actions sit under 44px on purpose; raising them is a density change, not a
drive-by a11y fix. The 44px rule stays in the skill as the *new-control*
floor.

### 1.4 `catalog.html` is still named as the live catalog

`SKILL.md:82` — "`app-mobile/catalog.html` (the live catalog — every
migrated surface in every state, light and dark)."

`README.md:48-50` already replaced that with `npm run storybook`.
`016` task T2.7 recorded the same replacement.

The file exists. Its script is
`/src/design-system/catalog/main.tsx` (`catalog.html:18`). That path is
absent (`test -f` → ABSENT). `#catalog-root` (`catalog.html:17`) is what
`verification.md:88` still names as a structural mount target.

**Not a REPO RULES pointer** — REPO RULES already uses Storybook. **Skill
stale pointer.** Stay in the skill: drop `catalog.html` from `SKILL.md:82`
and retarget `verification.md:88` at the Storybook catalog.

---

## 2. Stale, garbled, or missing pointers inside REPO RULES

### 2.1 The operations / release / standards / quality row is wrong

`REPO RULES.md:26`:

> `operations/`, `release/`, `standards/`, `quality/` |
> `operations.md`, `setup.md`, — |

`setup.md` is not in those folders. Skill table (`SKILL.md:56-61`):

| Folder | Read first | Actual files |
|---|---|---|
| `operations/` | `operations.md` | `operations.md`, `incident-playbooks.md`, `rollback.md` |
| `setup/` | `setup.md` | already listed on the line above |
| `standards/` | — | `code-standards.md`, `security.md`, `platform-support.md` |
| `release/` | — | `ai-deploy-playbook.md`, `release-verification.md` |
| `quality/` | — | `doc-quality-gate.md`, `pi-remote-full-access-runtime-baseline.md` |

There is no `quality.md`, `release.md`, or `standards.md`. `operations.md`
and `setup.md` are the documents themselves, not pick-by-task routers
(unlike `design-system.md` / `conventions.md` / `storybook.md`).
`SKILL.md:64-66` calls `operations/` and `setup/` routers; they do not
open with a routing table.

**Belongs in REPO RULES** as a pointer fix: split `setup/` onto its own
row; mark `standards/`, `release/`, `quality/` as "no router — open the
named file." Do not duplicate their contents.

### 2.2 Two different trees named `manual-testing-playbook/`

`REPO RULES.md:31-33` — the feature catalog and playbook "are here, not in
the skill," 44 documents each across 8 subject folders.

Confirmed at repo root: 44 markdown files each; 8 folders
(`approval-and-mutation`, `auth-and-boundary`, `command-and-push`,
`design-system`, `mobile-ui-features`, `pwa`, `release`,
`transport-and-state`). The 44 includes the index file.

The skill *also* has
`.opencode/skills/sk-code/sk-code-mobile-cli/manual-testing-playbook/`
with a different 7-folder set (`cross-cli-dispatch`, `holdout`,
`intent-detection`, `resource-loading`, `surface-detection`,
`token-cost-baseline`, `unknown-fallback`). That playbook tests the skill,
not the app.

**Belongs in REPO RULES** as one clause: the app playbook is the repo-root
tree; the skill's same-named folder is skill-routing evidence. Opening the
wrong one wastes a session.

### 2.3 Numbers that still match (do not "update" them)

Verified this pass:

| Claim in REPO RULES | Evidence |
|---|---|
| 39 goldens, light + dark + system | `token-identity.mjs:283-306` — 15 + 15 + 9 = 39 |
| One `.css` file | `app-mobile/src/**/*.css` → only `app.css` |
| 95 scoped `<style>` blocks | 95 `.svelte` files under `app-mobile/src` contain a real `<style>`; two extra `rg` hits are a string in `sandboxed-diagram.svelte:176` and a comment in `rich-block-frame.svelte:45` |
| 337 / 311 / 26 stories | `screenshots/MANIFEST.json:6-9` |
| Capture clock `2026-08-28T12:00:00.000Z` | `capture-screenshots.mjs:50`, `ui-audit.mjs:33`, `catalog-state-visibility.mjs:45` |
| Composer fence at `:599` | `session-composer.svelte:599` |
| Host-requests packet | `specs/006-orca-nodeterm-ux-mining/007-host-requests/` exists |
| Presentation scripts named in §2 | all present under `scripts/` (see command inventory below) |

`npm run typecheck` is **five** workspaces
(`package.json:22`: protocol, relay, web, approval-extension,
plan-extension). That number is right for the script and wrong as "the
whole repo" — see 3.2.

---

## 3. Facts an agent needs before it knows to open the skill

These are not inferable from a tree listing, and they bite before
`sk-code-mobile-cli` is in context.

### 3.1 Advisor will not name this surface

`SKILL.md:42-43` — `routingClass: metadata`, advisor-invisible, never a
primary. The hub bundles it behind `sk-code-quality` / `sk-code-review`
when CWD or targets sit under `app-mobile/`, `app-relay/`, or
`packages/pi-rpc-protocol/` (`SKILL.md:28-30`).

Precedence: **OPENCODE > OBSIDIAN > PI_REMOTE > WEBFLOW > UNKNOWN**
(`stack-detection.md:40`). A mixed edit that includes `.opencode/`
resolves OPENCODE (`stack-detection.md:149`).

**Belongs in REPO RULES.** One line: app work is PI_REMOTE via `sk-code`;
the surface packet does not appear in advisor output; a `.opencode/`
target wins and drops the app evidence.

### 3.2 `npm test` / `typecheck` / `build` omit inbound-media

`package.json:6-10` workspaces: `packages/*`, `app-mobile`, `app-relay`,
`extensions/*`. That glob includes three extensions.

`extensions/` contains `pi-remote-approval`, `pi-remote-plan`, and
`pi-remote-inbound-media`. The inbound-media package has its own
`typecheck` and `test` (`extensions/pi-remote-inbound-media/package.json:8-10`).

Root scripts do not call it:

- `typecheck` — five names, no inbound-media (`package.json:22`)
- `build` — same five (`package.json:13`)
- `test` — protocol, relay, approval, plan, `release/tests`
  (`package.json:23`)

`005-relay-source-structure/005-root-source-banners/implementation-summary.md:102-103`
already recorded this. Still true.

**Belongs in REPO RULES** next to "never widen vitest to a bare `tests`":
green `npm test` / `typecheck` / `build` do not cover
`extensions/pi-remote-inbound-media`. Run that package's scripts when it
changed.

### 3.3 Four logic-lane tests are excluded on purpose

`vitest.web.logic.config.ts:27-39` quarantines:

- `app-mobile/tests/highlight.worker.test.ts`
- `app-mobile/tests/submitSlashDraft.test.ts`
- `app-mobile/tests/submitSlashDraftTransport.test.ts`
- `app-mobile/tests/relay-runtime-transport.test.ts`

`015-test-lanes/implementation-summary.md:131-134` said these were still
not running and named the worker's unicode-flag regex as a source defect.
The exclude is still in the config. `highlight.worker.ts:360-363` still
builds `TOKEN_PATTERN` with the `'gu'` flag. `submitSlashDraft.test.ts:15`
now imports `vitest` — the comment "lost its vitest import" no longer
describes that file, but the exclude remains. I did not run the suite
(this pass forbids test runs), so "would pass if included" is UNKNOWN.

**Belongs in REPO RULES** known baselines: those four files are not in
`test:web`. Absence from the run is not coverage. Do not delete them as
dead.

### 3.4 Svelte test harness traps that look like product bugs

`vitest.web.svelte.config.ts:29` — `fileParallelism: false`, because
bits-ui menus flake under parallel jsdom load
(`vitest.web.svelte.config.ts:22-28`).
`vitest.web.svelte.config.ts:39` — bits-ui / `@storybook/svelte` must be
`deps.inline` or Node rejects raw `.svelte` in `node_modules`.

`svelte.md:110-115` — `@testing-library/svelte` `rerender` re-fires
unchanged props; absorb that in the harness, never with a source guard.
`003-home-switcher-nav-search/implementation-summary.md:120-121` —
`rerender(Component, { props })` was silently ignored by this
testing-library version, which made a constraint test vacuous.

`verification.md:101-103` — `viewer-history.svelte.test.ts` is
timing-sensitive (`setTimeout(0)` focus restore). The file still exists
and still documents that wait (`viewer-history.svelte.test.ts:6-7`).
Not in REPO RULES §6.

**REPO RULES** should carry the one-liners an agent hits before opening
`svelte.md`: bits-ui tests need the existing svelte vitest config (inline
+ serial files); do not add a source guard to paper over `rerender`;
`viewer-history` flakes are a known timing case. The four interaction
actions and `untrack` doctrine stay in the skill.

### 3.5 Relay restart wipes enrollment

`operations.md:111` — "Relay restart clears all enrolled-device and
session state. Generate a new startup enrollment payload and enroll each
intended device again after restart."
`setup.md:47` — health does not distinguish live Pi from fixture replay.
`setup.md:32, 45-46` — mutation off by default; `--full-access` is
host-selected, never enableable from the phone.

**Belongs in REPO RULES** as an operations trap: restarting the relay
during a UI session is not a no-op; the phone must re-enroll. The env-var
table stays in the skill.

### 3.6 Naming and `$shared` before the first new file

`SKILL.md:209-213` — kebab-case everywhere under `app-mobile/src/` except
`routes/**` (SvelteKit reserved names). `svelte.config.js:8` — `$shared`
→ `src/shared`. Creating `FooBar.svelte` or a `../../../shared/` import
fails the naming scan / breaks the house alias.

**Belongs in REPO RULES** as two short rules. The closed kind-prefix list
and `CODE.md` threshold stay in the skill.

### 3.7 CSP is `style-src 'self'`, not only `default-src`

`REPO RULES.md:91-93` — web app ships `default-src 'self'`. True, and
incomplete. `app-mobile/svelte.config.js:22-33` also sets
`style-src: ['self']` with no `'unsafe-inline'`. That is why headless
Chrome is unstyled (`verification.md:54-58`). Relay matches REPO RULES
(`app-relay/src/http/server.ts:706` —
`default-src 'none'; frame-ancestors 'none'`).

**Belongs in REPO RULES** as a one-word fix on the existing CSP sentence
(`style-src 'self'` is the mechanism). Resolver doctrine stays in the
skill.

---

## 4. Spec-only limitations that change how an agent works

REPO RULES already states fail-closed and "never invent a host field"
(`REPO RULES.md:135-139`). What it does not name are the **shipped
surfaces that look broken and are not**. An agent that has not opened
`007-host-requests` will "fix" them.

### 4.1 Inert or empty by design (current; re-confirmed)

| Looks like a bug | What is actually true | Evidence |
|---|---|---|
| `New session` is disabled / does not create | No host session-create RPC; control is present and inert | `screen-home.svelte:614, 632`; `screen-home.svelte.test.ts:351-367`; `002-list-organization/implementation-summary.md:116-119` |
| `host-too-old` never appears | Relay publishes no capability/version marker; that case stays `error-retry` | `session-list-seams.test.ts:366-371`; `001-list-behavior/implementation-summary.md:138-140` |
| Unread section empty | Needs host `attention`; grouping uses existing `status` | `session-list-seams.ts:360-364`; `001-list-behavior/implementation-summary.md:140-143` |
| Home search misses titles / `repo:` `path:` return nothing | Host `title` / `cwd` / `branch` not published | `002-list-organization/implementation-summary.md:116-118`; `003-home-switcher-nav-search/implementation-summary.md:116-117` |
| Card fields blank (title, preview, agent, model, …) | Fail-closed until host keys land; listed in `007-host-requests` | `003-card-polish/implementation-summary.md:131-134` |
| Inbox / live-activity / usage / source-control mostly dark | 12/13 inbox, 8/13 live-activity, 16/21 usage findings dormant | `005-host-inbox-notifications:121-123`; `007-host-liveactivity-fields:116-118`; `006-host-usage-search-review:119-121` |
| `@`-file mentions and host STT missing | Not built; need external Pi FS walk / host STT. Device STT (browser) already ships | `004-composer/implementation-summary.md:152-153`; `007-host-requests/implementation-summary.md:143-144` |
| Session rename / bare file-links / find-across-history incomplete | Host RPCs; client stays inert | `003-chat-message/implementation-summary.md:133-137` |
| Follow-navigation / load-earlier pagination | Need `navigationIntent` and a `hasMore` token (client already loops `nextSeq`) | `006-navigation/implementation-summary.md:203-206`; `007-host-requests/implementation-summary.md:141-142` |
| Per-host diagnostics always "unavailable" | Heartbeat takes no host argument | `004-a11y-onboarding/implementation-summary.md:131-132` |
| Path miss shows nothing | Fail-closed; no toast | `006-host-usage-search-review/implementation-summary.md:126-128` |

`007-host-requests/implementation-summary.md:134-148` also records what
must **not** be built ahead of a consumer: `agent`, `resumable`, pin RPC,
read-ack, attention sub-kinds, `stateEnteredAt`. Image paste-upload and
typed approval are already implemented.

**Belongs in REPO RULES** as a short "looks broken, is fail-closed" list
plus the existing pointer to `007-host-requests`. The field-by-field
request table stays in that packet.

### 4.2 Silent data-loss on text artifact previews (still in code)

`016-relay-correctness/001-projection-integrity/implementation-summary.md:136-141`
— `isFilePreviewContent` treats `firstLine` as required, then as optional;
a host text artifact without `firstLine` is refused and the projector
throws.

Current code still does this:

```
packages/pi-rpc-protocol/src/guards.ts:1931
  (!hasOnlyKeys(value, ['kind', 'text', 'firstLine']) && value.kind === 'inline-text')
```

`hasOnlyKeys` (`guards.ts:2244-2245`) requires every listed key.
`firstLine` missing → early `false`. The later check
(`guards.ts:1940`) marks `firstLine` optional and is never reached.

**Belongs in REPO RULES** known baselines: a missing inline-text
`firstLine` is a known refuse, not a new regression. The fix belongs in a
scoped packet, not a drive-by.

### 4.3 `rate-limited` vs `rate_limited` (still both)

`016-relay-correctness/002-route-authority/implementation-summary.md:134-136`
— runtime reconcile answers `rate-limited`; every other refusal answers
`rate_limited`.

Still true: `app-relay/src/http/server.ts:1018` sends `{ error: 'rate-limited' }`;
neighbouring 429s send `rate_limited` (`server.ts:459, 491, 615, …`).
Client maps both (`app-mobile/src/shared/transport/relay.ts:1298, 1380`).

**Belongs in REPO RULES** as a grep trap. Do not "normalise" one spelling
in a UI pass.

### 4.4 Presentation gates that are green over a real defect

From spec limitations, still the reason those extra scripts exist:

- **CSS comments can render as body text** with perfect contrast.
  `ui-audit.mjs` cannot see it
  (`013-refine-rich-content-ask-question/implementation-summary.md:106-109`;
  `009-refine-artifacts/implementation-summary.md:131-133`).
  `css-comment-integrity.mjs` is the dedicated gate. REPO RULES lists the
  command (`REPO RULES.md:58`) and not the failure mode.
- **`OCCLUDES_TEXT` ignores a transparent control over text** — words show
  through, pointer is still stolen
  (`014-refine-source-control-and-small-surfaces/implementation-summary.md:113-115`).
- **Two themes cannot sit side by side** — dark rules are `:root`-scoped
  (`015-storybook-designer-adjustability/implementation-summary.md:163-165`).
- **Streaming edge is not in the archive** — virtualised list, tail never
  painted (`015-…:175-178`). A story that claimed to show it was removed.
- **`pending` vs `failing` colour delta is thin** (CIELAB 8.6 / 11.6)
  because `--warning` is rust, near `--danger` (`015-…:169-174`). Do not
  invent a token around it.
- **Full-screen shots are 382×2009 strips**, not a phone view
  (`008-screenshot-archive-integrity/implementation-summary.md:128-129`).
- **Determinism must hash `MANIFEST.json` too** — PNG-only hashing missed
  a reorder (`008-…:117-120`). REPO RULES discusses shot flake, not
  manifest flake.
- **No Figma / no `design:` parameter**
  (`015-…:160-162`; `STORYBOOK.md:135-137`). The addon is installed and
  unwired.
- **`@storybook/addon-vitest` is not installed** (`STORYBOOK.md:139-141`;
  `009-storybook-experience/implementation-summary.md:118-121`).

**REPO RULES** should add the *why* on `css-comment-integrity` and the
manifest-hash note. The rest stay in `storybook/` / `verification/` once
the agent is on a rendering task.

### 4.5 Story hosts in the app tree are allowlisted scaffolding

`010-refine-chrome/implementation-summary.md:109-110` — story hosts ship
in source. Confirmed: `session-state-icon-story-host.svelte`,
`attachment-draft-story-host.svelte`, `session-header-story-host.svelte`,
`composer-tools-story-host.svelte`, plus
`$shared/fixtures/story-host-fetch.ts`.

This is the concrete form of `REPO RULES.md:141-142` ("no production API
to serve a story"). **Stay in the skill** (`component-story-upkeep.md`),
with the existing REPO RULES sentence as the cold pointer. Do not list
every host filename in REPO RULES.

---

## 5. Stay in the skill (do not lift)

These are real, and they are one router hop away after
`REPO RULES.md:11-26` is followed.

| Fact | Where | Why not REPO RULES |
|---|---|---|
| 8 named `--pi-*` primitives and their light→dark values | `token-library.md:52-66`; `app.css:84-91` | Values belong in the token library; REPO RULES only needs "primitives are frozen" |
| Three-layer recipes, `--pi-clay` → 45 declarations | `token-library.md:87-94`; `retint-recipes.md` | Worked example |
| `$effect` / `untrack` sites and audit steps | `svelte.md:54-105`; `SKILL.md:366-387` | Runtime doctrine; REPO RULES already points at `svelte/` |
| Four interaction actions vs native `:hover` | `svelte.md:135-154` | Same |
| Overlay `hideOutside` does not trap focus | `svelte.md:158-169` | Same |
| Source-gate commands (`scan-naming`, `scan-comments`, `scan-folder-docs`, `scan-skill-references`) | `SKILL.md:447-451` | Run after the agent is in a conventions change |
| `CODE.md` threshold (3+ source files or child folders) | `SKILL.md:342-364`; `conventions.md:69-73` | Folder-docs work |
| Closed kind-prefix list | `SKILL.md:214-220` | Naming work |
| Extra CDP scripts (`design-system-cdp`, `rich-content-cdp`, `file-preview-cdp`, `inbound-media-cdp`, `runtime-smoke-cdp`) | `verification.md:147-154` | Surface-specific; all five files exist under `scripts/` |
| Token playground writes no stylesheet | already in REPO RULES §3 | — |
| Node 22+, Pi 0.84.1, Tailscale Serve, ports 4310 / 4173 | `setup.md:39-43, 79-82` | First-run / deploy |
| Env-var table, retention ceilings, kill-switch steps | `operations.md:45-58, 92-123` | Operate the relay |
| DQI / full-access runtime baseline | `quality/` | Reviewer / operator evidence |
| `ARCHITECTURE.md` release gates (`release:verify`, thresholds, rollout) | `ARCHITECTURE.md:430-436` | Shipping, not feature work. REPO RULES §2 is the feature ladder |
| Checklists under `assets/` | `SKILL.md:391-402` | On-demand |

`ARCHITECTURE.md:438-452` lists seven presentation checkpoints.
`REPO RULES.md:51-60` lists nine (adds `build-storybook` and
`css-comment-integrity`). That is REPO RULES being *more* complete, not
a contradiction. `story:shots` already runs `build-storybook`
(`package.json:18`).

---

## 6. Historical limitations — do not copy into REPO RULES

These were true when written and are now leftover or superseded. Copying
them would recreate a stale map.

| Limitation | Why it is dead |
|---|---|
| `003-css-files` — "CSS is now global, not Svelte-scoped" | Reverted by `004-styles-into-svelte` |
| `001-grammar-and-manifest` — 162 files fail the naming scan | Later children finished the rename |
| `002-shared-tree-split` — prose still names `$shared/data/` | `014` / `013` owned that text; `$shared` now points at `src/shared` |
| `001-skill-convention` — `ds-grammar-routing.md` old name | Renamed; see skill changelog `v0.1.7.1.md:14` |
| `001-tested-seams` — seams unwired | Phases 002–006 consumed them |
| `008-sk-code-svelte-refactor` — unmerged branch, story-upkeep not in force | Salvaged at v1.4.0.0; `SKILL.md:187-191` now requires a story with every component change |
| `009-storybook-experience` — story-upkeep "not in force until 008 merges" | Same supersession |
| `017-ask-question-activation` / `018-transcript-affordances` — packet-size / sequencing notes | Phase-local, not standing traps |

`vitest.web.svelte.config.ts:4-8` still comments that a React suite lives
on `vitest.web.config.ts` (`*.test.tsx`). That config file is gone and
`app-mobile/` has no `*.test.tsx`. An agent who believes the comment will
look for a third web lane that does not exist. **Skill/app comment
hygiene**, not a REPO RULES fact — unless §2 grows a "two web lanes,
svelte then logic, no React lane" clause (cheap, useful).

---

## 7. Skill-internal notes (for the next skill edit, not REPO RULES)

- `SKILL.md:64-66` vs `operations.md` / `setup.md`: those entries are not
  routers. Same class of error as REPO RULES 2.1.
- `storybook.md:124` display text `../verification.md` links to
  `../verification/verification.md` — the target works; the label is the
  old flat path.
- `stack-detection.md:32` still says `@ds` grammar; the source convention
  is now `Do not edit — <why>` (`SKILL.md:176-178`).
- Sibling-surface sweep trap
  (`016-reference-structure-and-doc-accuracy/implementation-summary.md:104-107`):
  a filename rewrite matching `references/comment-grammar.md` also hits
  `sk-code-obsidian`. Stay in the skill / that packet. Only matters when
  editing skill docs.
- Five broken markdown links left on `main` (`016-…:101-103`) were
  recorded, not re-measured this pass. UNKNOWN whether the count still
  holds. Do not put a number in REPO RULES without a fresh run.

The `16` interaction-gated stories that "never mount headless"
(`020-source-structure/006-bem-css/implementation-summary.md:111-112`)
were not re-identified this pass (no current `interaction-gated` token in
`scripts/`). Treat as unverified; do not copy the number.

---

## 8. Recommended REPO RULES deltas (pointers and traps only)

Cold-start additions worth the lines, in priority order:

1. **Primitives are frozen.** Retint semantic / component layers. Resolves
   1.1.
2. **This app is SvelteKit + runes, not React.** Two web lanes (svelte,
   then logic). Resolves 1.2 and the stale vitest comment.
3. **Fix the reference-map row** (2.1) and the two-playbook name collision
   (2.2).
4. **Advisor-invisible + OPENCODE-wins-on-`.opencode/`** (3.1).
5. **Inbound-media is outside the root gates** (3.2).
6. **Four quarantined logic tests** (3.3).
7. **Lookalike fail-closed surfaces** (4.1) + existing host-requests
   pointer.
8. **`firstLine` refuse** (4.2) and **`rate-limited` spelling** (4.3).
9. **Chrome <44px is a known baseline** (1.3).
10. **Relay restart ⇒ re-enroll** (3.5); **kebab-case / `$shared` /
    `routes/**`** (3.6); **`style-src 'self'`** on the CSP sentence (3.7).
11. **Why `css-comment-integrity` exists**, and hash the manifest too
    (4.4).
12. **Svelte vitest config is load-bearing** (inline bits-ui, serial
    files); `viewer-history` timing flake (3.4).

Everything else in §5 stays behind the existing folder table.

---

## Evidence inventory (commands)

Read-only this pass:

- `rg -c '<style' --glob '*.svelte' app-mobile/src` → 97 tag hits / 95
  files; two hits are not scoped blocks (see 2.3).
- `ls feature-catalog` / `ls manual-testing-playbook` → 8 subject folders
  each.
- `ls .opencode/skills/sk-code/sk-code-mobile-cli/manual-testing-playbook`
  → 7 different folders.
- `ls scripts` → `token-identity.mjs`, `catalog-smoke-cdp.mjs`,
  `catalog-state-visibility.mjs`, `css-comment-integrity.mjs`,
  `design-system-cdp.mjs`, `file-preview-cdp.mjs`,
  `inbound-media-cdp.mjs`, `rich-content-cdp.mjs`,
  `runtime-smoke-cdp.mjs`, `token-override-check.mjs`, `ui-audit.mjs`,
  `capture-screenshots.mjs`, `story-coverage.mjs` all present.
- `ls extensions` → `pi-remote-approval`, `pi-remote-plan`,
  `pi-remote-inbound-media`.
- `test -d app-mobile/storybook-static` → EXISTS (build output; one-writer
  rule in REPO RULES §4 still applies).
- `test -f app-mobile/src/design-system/catalog/main.tsx` → ABSENT.
- `node --version` → v26.7.0 (environment only; `package.json` has no
  `engines` field. Skill `setup.md:40` still says Node 22+).

Not run (forbidden this pass): builds, test suites, captures, lint.
Quarantine *reasons* that depend on a live fail are therefore
config-confirmed, not re-executed.
