# Repo Rules — Pi Remote (Mobile CLI)

> Per-repository companion to `AGENTS.md`. That file carries rules true in every repository; this one carries what is true only here — the gates, the baselines, the traps. Its verification commands bind exactly as `AGENTS.md`'s do.
>
> When this file and `AGENTS.md` disagree about a *rule*, `AGENTS.md` wins. About a *path, command or number*, this file wins.

---

## 1. THE SURFACE SKILL

Design-system and source-convention evidence for this app lives in the **`sk-code-mobile-cli`** skill,
under `.opencode/skills/sk-code/sk-code-mobile-cli/`. It is read-only evidence: it supplies the
contract, the acting workflow applies it.

`references/` is grouped into purpose-named folders, most with a `<folder>/<folder>.md` entry that
routes by what you are doing. Load the entry, not the whole folder:

| Folder | Read first | For |
|---|---|---|
| `design-system/` | `design-system.md` | Changing a colour, spacing, radius, class name, or where a rule lives |
| `verification/` | `verification.md` | Proving a change preserved every frozen value |
| `storybook/` | `storybook.md` | The catalog and the screenshot archive; `running-storybook.md` to start it for someone |
| `conventions/` | `conventions.md` | Comment grammar, `Do not edit` fences, folder docs |
| `svelte/` | `svelte.md` | `$effect` self-invalidation, and the bits-ui accessibility contract |
| `setup/` | `setup.md` | Tailscale Serve, enrollment; `device-preview.md` for emulator and phone preview |
| `operations/`, `release/`, `standards/`, `quality/` | `operations.md`, `setup.md`, — | Running, shipping, and the rules a change must hold |

`verification/` and `svelte/` hold **merged documents, not routers** — their subjects were small
enough that a router above two files cost more than it saved.

**The feature catalog and the manual testing playbook are here, not in the skill:**
`feature-catalog/` and `manual-testing-playbook/`, 44 documents each across 8 subject folders. The
skill deliberately does not mirror them so the evidence cannot drift from the shipped app.

---

## 2. THE VERIFICATION LADDER

Behaviour gates, from the repository root:

```bash
npm run typecheck                    # all five workspaces
npm run test:web                     # both web suites — svelte, then logic
npm test                             # protocol, relay, extensions, release
npm run build                        # dependency order
```

Presentation gates. **The behaviour gates cannot see whether a surface renders correctly** — a
component mounts, passes its tests, and still shows text in its own background colour:

```bash
node scripts/token-identity.mjs verify app-mobile/src/app.css   # 39 frozen goldens, light + dark + system
npm run story:coverage                                          # every renderable component has a story
npm run build-storybook -w @pi-remote/web                       # the catalog compiles
node scripts/catalog-smoke-cdp.mjs                              # every story renders both themes, zero throws
node scripts/catalog-state-visibility.mjs                       # no invisible state, no inert control, no impossible age
node scripts/token-override-check.mjs                           # the playground still retunes other stories
node scripts/css-comment-integrity.mjs                          # no swallowed rules, no leaked markup comments
node scripts/ui-audit.mjs                                       # contrast, clipping, collision, touch targets — BOTH themes
npm run story:shots                                             # re-capture the archive
```

**`npm run test:web` pipes badly.** `npm run test:web | tail` reports *tail's* exit status, not
vitest's. Verify by content — both suite summaries present — or capture `RC=$?` before piping.

**The archive is captured in one theme.** `ui-audit.mjs` is the only gate that sees the other. An
entire defect class once existed only in dark.

---

## 3. THE DESIGN SYSTEM

**`scripts/token-identity.mjs` is the only authority on a token value.** 39 goldens across light,
dark and system. A change that moves one without updating the goldens is a regression no test reports.
The catalog's token playground deliberately writes no stylesheet for this reason — it hands back a
`:root` block to paste.

Three layers, edited highest-first: primitive → semantic role → component token. Edit the highest
layer that still isolates the change; retinting a primitive moves everything downstream.

**CSS ownership.** The app has exactly **one** `.css` file — `app-mobile/src/app.css` — and **95**
component-scoped `<style>` blocks. Svelte scoped CSS reaches only the component that declares it, so
a rule needed by two renderers, by a `class` prop, or across a parent/child boundary belongs in
`app.css`, usually behind `:global()`. Putting it in the wrong file is the most common way a change
renders as nothing at all, and a byte-identical screenshot is what exposes it.

**Class grammar is `block--element`, with `is-*` as a single-dash state prefix.** A mechanical rename
once broke rendering four separate ways through dynamically constructed class names; only a
before/after image diff caught it.

**The CSP forbids reading values from a browser.** The web app ships `default-src 'self'` and the
relay serves `default-src 'none'; frame-ancestors 'none'`, so headless Chrome renders the app
unstyled. Resolve token chains to final literals instead of screenshotting them. Screenshots remain
the right tool for layout, legibility, and whether two states actually look different.

---

## 4. STORYBOOK AND THE SCREENSHOT ARCHIVE

```bash
npm run storybook        # storybook dev -p 6006 → http://localhost:6006
```

**Start it in the background and hand back the URL.** It is a server, not a task; a foreground start
blocks until killed and reads as a hang.

**One build directory, one writer.** Every gate that needs a built catalog reads
`app-mobile/storybook-static`. Two concurrent builds corrupt it — sequence them.

The archive is `screenshots/`, one image per story, tracked in git, rebuilt whole rather than patched.
`MANIFEST.json` records every story including the ones that render nothing visible. Current state:
**337 stories, 311 captured, 26 visually empty.**

**The archive is not byte-stable, and the size of the gap is measured.** Six capture runs compared
against the first differed in **five of five** comparisons; the same experiment against a pre-change
capture gave the same answer. The flake lives in a handful of stories — a sandboxed diagram frame
dominates — not in any recent change.

Two rules follow. **Never conclude determinism from one pair of runs**; that sample has produced a
wrong call here in both directions. And **a moved shot is a flake only after it returns** — re-capture,
and if the bytes match the committed version again it flaked. Restore it rather than committing churn:
`git checkout HEAD -- screenshots/<path>` (that stages, so `git restore --staged` after).

**The capture clock is pinned to `2026-08-28T12:00:00.000Z`** in `capture-screenshots.mjs`,
`ui-audit.mjs` and `catalog-state-visibility.mjs`. **Change all three together or none.** Re-pinning
was measured and rejected: moving it fixes the todo panel's age but breaks the review countdown from
`05:00 remaining` to `14573:00` and collapses the attention inbox's three distinct ages to "just now"
three times. Past-event and future-deadline fixtures pull in opposite directions, so no single clock
satisfies both — migrate a stranded fixture instead.

---

## 5. FAIL-CLOSED AND FROZEN SEAMS

This client is **host-authoritative and fail-closed**: it owns no editable session truth.

**Never invent a host field.** A surface that needs data the relay does not send is built inert behind
a capability check, and the request is appended to the host-requests packet under
`specs/006-orca-nodeterm-ux-mining/007-host-requests/`.

**No production API may exist to serve a story.** A prop, slot or export added only to make a story
render is a defect; compose the real component in an allowlisted story host instead.

`Do not edit — <why>` marks a load-bearing line with its reason inline. The one worth knowing by
heart: `app-mobile/src/pages/chat/chrome/session-composer.svelte:599` fences the mutation path —
submit, steer, stop, snapshot, slash-draft, attachment flow. **No presentation change crosses it.**

---

## 6. KNOWN BASELINES — NOT REGRESSIONS

Confirm against these before calling anything a regression.

- **Flaky screenshots under concurrent capture:** `sandboxed-diagram--valid` (dominant),
  `plan-mode-button--*`. Restore rather than commit.
- **`auth.test.ts`** in the relay suite is timing-flaky (201 vs 403).
- **`app-mobile/tests/menu-plan-mode.svelte.test.ts`** has a keyboard-activation case that flakes at baseline. Confirm flake-versus-regression
  with a scoped stash and **at least eight runs**, never a single one.
- **eslint** carries a standing baseline in `sheet-model-effort.svelte` and `+layout.svelte`; `.svelte.ts`
  files fail eslint parsing repo-wide (a config gap, not a defect). Judge your **delta**, not the total.
- **Never widen a vitest positional to a bare `tests`.** The root `npm test` names five explicit
  directories for a reason: a bare positional greedily sweeps the protected context repos and reports
  hundreds of phantom failures. This was fixed — do not reintroduce it.

---

## 7. GIT, SPECS AND THE PROTECTED REPOS

**`specs/context/` holds five untracked research repositories** — OGAM-main, mobilecli-main,
nodeterm-main, openclaude-android-main, remote-for-opencode-master. They are read-only inputs.
**Never `git add specs/`, `git add .`, `git clean`, or `git stash -u`** — any of those stages or
destroys thousands of files. Stage explicit packet paths; recover with
`git restore --staged specs/context/`.

**`specs/` is symlinked into the Public monorepo as `specs/app-mobile-cli`.** Edit it here.

Pushing to `origin` requires `SPECKIT_ALLOW_REMOTE_PUSH=1`, and a pre-push hook enforces the policy.
The `git-live-follow --live main` daemon is ff-only and non-destructive — do not stop it on the
assumption that it reverts edits. Commit promptly anyway: dispatched executors cannot commit for
themselves, so **executors never run git; the orchestrating session commits.**

### Spec-kit traps

**Scripts silently no-op through the `.opencode` symlink.** Always invoke via realpath with the
symlink guard, and verify by *content* rather than exit code:

```bash
NODE_PRESERVE_SYMLINKS=1 bash "$(realpath .opencode)/skills/system-spec-kit/scripts/spec/validate.sh" <folder> --strict
```

**The validator can refuse to run entirely** — `compiled validation orchestrator is stale`, exit 3,
and **no rule output at all**. A sweep that only looks for `RESULT: FAILED` reads that silence as a
clean pass. Always require an explicit `RESULT: PASSED`. Fix with:

```bash
cd "$(realpath .opencode)/skills/system-spec-kit/mcp-server" && npm run build
```

**Validating a phase parent recurses into its children**, so the exit code and the output tail
describe the last child, not the folder you asked about. Take the *first* `RESULT:` line for a
folder's own verdict, and validate children individually.

After any spec-doc edit, regenerate `description.json` and `graph-metadata.json` or
`GENERATED_METADATA_INTEGRITY` fails; editing a child also staleness the parent's metadata.
