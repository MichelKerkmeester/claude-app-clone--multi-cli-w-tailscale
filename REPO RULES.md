# Repo Rules — Pi Remote (Mobile CLI)

> Per-repository companion to `AGENTS.md`. That file carries rules true in every repository; this one carries what is true only here — the gates, the baselines, the traps.
>
> When this file and `AGENTS.md` disagree about a *rule*, `AGENTS.md` wins. About a *path, command or number*, this file wins.

---

## 1. FIRST-COMMAND TRAPS

These fire before any design decision. Read them before you run anything.

**`specs/context/` holds six untracked research repositories** — `OGAM-main`, `mobilecli-main`,
`nodeterm-main`, `openclaude-android-main`, `orca-main`, `remote-for-opencode-master`. They are
read-only inputs. **Never `git add specs/`, `git add .`, `git clean`, or `git stash -u`** — any of
those stages or destroys thousands of files. Stage explicit packet paths; recover a mistake with
`git restore --staged specs/context/`.

**Never widen a vitest positional to a bare `tests`.** The root `npm test` names five explicit
directories for a reason: a bare positional greedily sweeps those context repositories and reports
hundreds of phantom failures.

**`npm run test:web | tail` reports *tail's* exit status, not vitest's.** Verify by content — both
suite summaries present — or capture `RC=$?` before piping.

---

## 2. HOST DATA AND STORY SEAMS

This client is **host-authoritative and fail-closed**: it owns no editable session truth. This shapes
whether work is permitted at all, so settle it before designing anything.

**Never invent a host field.** A surface that needs data the relay does not send is built inert behind
a capability check, and the request is appended to the host-requests packet under
`specs/006-orca-nodeterm-ux-mining/007-host-requests/`.

**No production API may exist to serve a story.** A prop, slot or export added only to make a story
render is a defect; compose the real component in an allowlisted story host instead.

`Do not edit — <why>` marks a load-bearing line with its reason inline. The one worth knowing by
heart: `app-mobile/src/pages/chat/chrome/session-composer.svelte:599` fences the mutation path —
submit, steer, stop, snapshot, slash-draft, attachment flow. **No presentation change crosses it.**

---

## 3. THE SURFACE SKILL

Design-system and source-convention evidence lives in the **`sk-code-mobile-cli`** skill, under
`.opencode/skills/sk-code/sk-code-mobile-cli/`. It is read-only evidence: it supplies the contract,
the acting workflow applies it.

`references/` is grouped into purpose-named folders. **Load the folder's entry document, not the whole
folder** — the skill's own `SKILL.md` carries the routing table.

The **feature catalog** and the **manual testing playbook** live at this repository root
(`feature-catalog/`, `manual-testing-playbook/`), not in the skill, so the evidence cannot drift from
the shipped app.

**`specs/` is symlinked into the Public monorepo as `specs/app-mobile-cli`.** Edit it here.

---

## 4. THE VERIFICATION LADDER

Behaviour gates, from the repository root:

```bash
npm run typecheck                    # five of the six workspaces — see the gap below
npm run test:web                     # both web suites — svelte, then logic
npm test                             # protocol, relay, extensions, release
npm run build                        # dependency order
```

**`npm run typecheck` covers five workspaces; the repository has six.**
`@pi-remote/inbound-media-extension` is not in the chain and is never typechecked. Do not read a green
typecheck as whole-tree coverage.

Presentation gates. **The behaviour gates cannot see whether a surface renders correctly** — a
component mounts, passes its tests, and still shows text in its own background colour:

```bash
node scripts/token-identity.mjs verify app-mobile/src/app.css   # the frozen goldens, light + dark + system
npm run story:coverage                                          # every renderable component has a story
npm run build-storybook -w @pi-remote/web                       # the catalog compiles
node scripts/catalog-smoke-cdp.mjs                              # every story renders both themes, zero throws
node scripts/catalog-state-visibility.mjs                       # no invisible state, no inert control, no impossible age
node scripts/token-override-check.mjs                           # the playground still retunes other stories
node scripts/css-comment-integrity.mjs                          # no swallowed rules, no leaked markup comments
node scripts/ui-audit.mjs                                       # contrast, clipping, collision, touch targets — both themes
npm run story:shots                                             # re-capture the archive
```

**Four of those gates need `playwright`, and it is declared nowhere.** `ui-audit.mjs`,
`catalog-state-visibility.mjs`, `token-override-check.mjs` and `capture-screenshots.mjs` all
`require('playwright')` and launch with `channel: 'chrome'`. `playwright` appears in neither
`package.json` nor `package-lock.json` — the copy in `node_modules` is an undeclared leftover, so
**`npm ci` removes it and those four gates then throw `Cannot find module 'playwright'`** even with
Chrome installed. Reinstall it explicitly if a clean install has run.

**`catalog-smoke-cdp.mjs` is macOS-only.** It shells Chrome at the hardcoded
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` with no `CHROME_PATH` fallback, and
exits as a harness failure rather than a story failure when that path is absent.

**Node and npm floors are enforced in `scripts/boot.mjs`, not in `package.json`.** There is no
`engines` field, no `packageManager`, no `.nvmrc`. `boot.mjs` requires Node 22+, npm 10+, a pinned
`pi` version, and `tailscale` on PATH — so a tree that installs fine can still fail to boot.

---

## 5. THE DESIGN SYSTEM

**`scripts/token-identity.mjs` is the only authority on a token value** — 39 goldens across light,
dark and system. A change that moves one without updating the goldens is a regression no test reports.
The catalog's token playground deliberately writes no stylesheet for this reason; it hands back a
`:root` block to paste.

Three layers, edited highest-first: primitive → semantic role → component token. Edit the highest
layer that still isolates the change; retinting a primitive moves everything downstream.

**CSS ownership.** The app has exactly **one** `.css` file — `app-mobile/src/app.css` — and **95**
component-scoped `<style>` blocks. Svelte scoped CSS reaches only the component that declares it, so a
rule needed by two renderers, by a `class` prop, or across a parent/child boundary belongs in
`app.css`, usually behind `:global()`. Putting it in the wrong file is the most common way a change
renders as nothing at all, and a byte-identical screenshot is what exposes it.

**Class grammar is `block--element`, with `is-*` as a single-dash state prefix.** A mechanical rename
once broke rendering four separate ways through dynamically constructed class names; only a
before/after image diff caught it.

**The CSP forbids reading values from a browser.** The web app sets `default-src 'self'` in
`app-mobile/svelte.config.js` and the relay serves `default-src 'none'; frame-ancestors 'none'`, so
headless Chrome renders the app unstyled. Resolve token chains to final literals instead of
screenshotting them. Screenshots remain the right tool for layout, legibility, and whether two states
actually look different.

---

## 6. STORYBOOK AND THE SCREENSHOT ARCHIVE

**The archive is not byte-stable, and the size of the gap is measured.** Six capture runs compared
against the first differed in **five of five** comparisons; the same experiment against a pre-change
capture gave the same answer. The flake lives in a handful of stories — a sandboxed diagram frame
dominates — not in any recent change.

Two rules follow. **Never conclude determinism from one pair of runs**; that sample has produced a
wrong call here in both directions. And **a moved shot is a flake only after it returns** — re-capture,
and if the bytes match the committed version again it flaked. Restore rather than commit churn:
`git checkout HEAD -- screenshots/<path>` (that also stages, so `git restore --staged` after).

**The capture clock is pinned to `2026-08-28T12:00:00.000Z`** in `capture-screenshots.mjs`,
`ui-audit.mjs` and `catalog-state-visibility.mjs`. **Change all three together or none.** Re-pinning
was measured and rejected: it fixes the todo panel's age but breaks the review countdown from
`05:00 remaining` to `14573:00` and collapses the attention inbox's three distinct ages to "just now"
three times. Past-event and future-deadline fixtures pull in opposite directions, so no single clock
satisfies both — migrate a stranded fixture instead.

**The archive is captured in one theme only.** `ui-audit.mjs` and `catalog-smoke-cdp.mjs` both render
light and dark, so a theme-specific defect is caught by those and never by a screenshot diff. An
entire defect class once existed only in dark.

```bash
npm run storybook        # storybook dev -p 6006 → http://localhost:6006
```

**Start it in the background and hand back the URL.** It is a server, not a task; a foreground start
blocks until killed and reads as a hang. **One build directory, one writer** — every gate that needs a
built catalog reads `app-mobile/storybook-static`, and two concurrent builds corrupt it.

The archive is `screenshots/`, one image per story, rebuilt whole rather than patched.
`MANIFEST.json` records every story including those that render nothing visible: **337 stories, 311
captured, 26 visually empty.**

---

## 7. KNOWN BASELINES — NOT REGRESSIONS

Confirm against these before calling anything a regression.

- **Flaky screenshots under concurrent capture:** `sandboxed-diagram--valid` (dominant),
  `plan-mode-button--*`. Restore rather than commit.
- **`app-relay/tests/auth.test.ts`** is timing-flaky (201 versus 403).
- **`app-mobile/tests/menu-plan-mode.svelte.test.ts`** has a keyboard-activation case that flakes at
  baseline. Confirm flake-versus-regression with a scoped stash and **at least eight runs**, never one.
- **eslint** carries a standing baseline of exactly three errors, all in
  `app-mobile/src/pages/chat/chrome/sheet-model-effort.svelte` (`:156`, `:626`, `:662`). `.svelte.ts`
  files fail eslint parsing repo-wide — a config gap, not a defect. Judge your **delta**, not the total.
- **`git-live-follow.sh --live main` is fast-forward-only and non-destructive.** Do not stop it on the
  assumption that it reverts uncommitted edits. Commit promptly anyway: dispatched executors cannot
  commit for themselves, so **executors never run git; the orchestrating session commits.**

---
