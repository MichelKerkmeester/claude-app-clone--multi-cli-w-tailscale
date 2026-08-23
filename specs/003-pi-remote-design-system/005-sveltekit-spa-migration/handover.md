---
title: "SvelteKit SPA migration — handover"
description: "Everything a fresh agent needs to take over the post-cutover queue: what shipped, what is scoped, who writes what, the nine gates, and the eleven traps that have each already cost a session."
contextType: "handover"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration"
    last_updated_at: "2026-08-23T15:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Handover authored for the nine-packet post-cutover queue."
    next_safe_action: "Start 015 and the 016 relay lane in parallel."
    blockers: []
    completion_pct: 0
---

# Handover — SvelteKit SPA migration

Read this first, then `roadmap.md` for the order of play. The plan of record is `goal.md`; its
status and open-work sections are superseded by this file.

---

## 1. WHERE THINGS STAND

The migration itself is **done**. Svelte is the only runtime, React is fully deleted, the cutover
passed all nine gates and is on `origin/main`. Children `001`–`007` are complete.

What remains is a queue of nine packets that came out of two sources: three editability complaints
the operator raised directly (naming, comments, folder docs), and eleven ranked recommendations from
a five-repo research sweep that an Opus-5 council then synthesised. Every one of those eleven is
homed in a packet. None of the nine has started.

| Packet | Level | State |
|---|---|---|
| `011-ux-affordances` | 1 | code shipped at 90%; one operator device-confirmation outstanding |
| `012/001-grammar-and-manifest` | 2 | **shipped** — manifest, applier, scan; primitives and chrome moved |
| `012/002-shared-tree-split` | 2 | **shipped** — `shared/data/` dissolved into seven folders |
| `012/003-pages-and-tooling` | 2 | next in the client lane; consumes the manifest and the kind overlay |
| `013-comment-grammar` | 2 | scoped; blocked on 012 (same source files) |
| `014-folder-documentation` | 2 | scoped; blocked on 012 and 013 |
| `015-test-lanes` | 2 | **shipped** — glob lane, real virtualizer, Svelte lint, reducer coverage |
| `016/001-projection-integrity` | 2 | projection, framing and retention **shipped**; epoch half held for the operator |
| `016/002-route-authority` | 2 | in progress — steps 1 and 2 of 5 shipped |
| `016/003-connection-lifecycle` | 2 | scoped; carries an operator question |
| `017-ask-question-activation` | 2 | scoped; blocked on 016 |
| `018-transcript-affordances` | 2 | scoped; blocked on 012, 015, 011 |
| `019-surface-skill-refresh` | 2 | scoped; last — describes what shipped |

Twenty spec folders validate `--strict` at 0 errors / 0 warnings.

---

## 2. THE INVARIANTS — BREAK ONE, STOP AND ESCALATE

These are frozen. They are not preferences, and a change that touches one is out of scope regardless
of how good the reason looks.

- **Tokens.** Every `--pi-*`, semantic and component token resolves to the same value in all three
  theme states. The token-identity gate reports 0 CHANGED / 0 VANISHED / 0 ADDED, or the work does
  not land.
- **Security.** Loopback relay, tailnet-only Serve with Funnel disabled, foreground authority,
  redaction, fail-closed ticketed mutations, host plan mode, content-free push. The phone never gets
  full-access mode.
- **Accessibility.** Roles, focus order and trap, `aria-*`, ≥44px hit targets, `prefers-reduced-motion`
  and `forced-colors` all survive. The a11y contract already regressed once in this programme when
  react-aria was swapped for Bits UI, and **none of the nine gates can see it** — three P0 and seven
  P1 findings are recorded in `007-verify-and-cutover/a11y-parity-findings.md`.
- **Routing.** `/`, `/session/[id]`, `/attention/[lookupId]`. Review and Inbox are overlay booleans;
  Enrollment is an auth branch. In SvelteKit the route tree *is* the URL contract, which is why
  `routes/**` is excluded from the rename.
- **Backend green throughout.** The relay suite is framework-independent, so it is the leak detector:
  a client change that reaches outside the web workspace shows up there first.

---

## 3. WHO WRITES WHAT

**The orchestrator owns:** every spec-folder document, all git, the barrier and shared files
(`app.css`, `+layout.svelte`, `src/routes/*`, `svelte.config.js`, `vite.config.ts`, `package.json`,
test configs), every `npm install`, all cross-repo work, and **independent verification of every
dispatch** outside the executor's sandbox.

**The executor writes app source** under `app-mobile/src/**`, one directory per dispatch. Its
prompt carries the pre-approved spec folder, the ALLOWED WRITE PATHS, and the banned list: no
`npm install`, no config or shared-file edits, no token, security, routing or a11y change, no deletes
outside scope.

**Source fixes go back to the executor.** A defect that verification catches in executor-written app
source is repaired by the executor, not by the orchestrator. The orchestrator owns barrier files and
verification; taking over source repair blurs that line and has caused rework before.

**Executor ladder — try in order, fall through on auth wall, rate limit or empty output:**

1. **Primary — GPT-5.6 Luna at xhigh, fast variant.** Reachable three ways: `cli-codex`,
   `cli-opencode` (`--model openai/gpt-5.6-luna-fast`) and `cli-pi`. Pick whichever surface suits the
   dispatch; they are the same model behind three CLIs, so a refusal on one is worth retrying on the
   next before dropping a tier.
2. **Fallback — Gemini 3.7 Flash at high, via `cli-devin`.**
3. **Final fallback — GLM-5.2 at high, via `cli-devin`** (free tier).

Every dispatch composes `{resolved agent persona + task prompt}` — inline the persona from
`.claude/agents/<name>.md` (`code` for source, `review` for audit, `markdown` for docs); a
persona-less leaf silently loses its tool-scope and verification contract. Non-interactive
`opencode run` needs `</dev/null`, `NODE_PRESERVE_SYMLINKS=1`, `SYSTEM_SPEC_GATE_ENFORCE=0` and
`AI_SESSION_CHILD=1`, and never a top-level `--agent general`.

---

## 4. THE NINE GATES

Run whole from the final state, never as the subset that was failing.

1. `npm run build` — exit 0
2. `npm run typecheck` — `svelte-check`, exit 0
3. `npm test` — backend, green throughout
4. `npm run test:web` — exit 0
5. **Token identity** — 0 diffs across all three theme states
6. **Contrast** — every WCAG pair at threshold, `@ds guardrail:` fence count preserved
7. **CDP structural** — 390px, zero horizontal overflow, both themes
8. **Catalog smoke** — every component-backed surface renders in both themes without throwing
9. `validate.sh <spec-folder> --strict` — exit 0

---

## 5. THE ELEVEN TRAPS

Each of these has already cost a session. They are not hypothetical.

**1. The `.opencode` symlink silently defeats the spec-kit scripts.** `validate.sh` and the `dist/`
generators exit 0 with zero output when invoked through the symlink — so a failing packet reads as
green. **Always invoke through the realpath**, and verify by content rather than exit status:

```
/Users/michelkerkmeester/MEGA/Development/Code_Environment/Public/.opencode/skills/system-spec-kit/scripts/spec/validate.sh
.../scripts/dist/spec-folder/generate-description.js <folderAbs> <baseAbs> --level N
.../scripts/dist/graph/backfill-graph-metadata.js <folderAbs>
```

**2. A live-follow daemon reverts uncommitted edits.** `git-live-follow.sh --live main` restores the
working tree to HEAD a minute or two after an edit lands, with no reflog trace. Staging alone does not
protect. Make edits durable atomically — the write, the `git add` and the `git commit` in **one**
command.

**3. `npm test` sweeps a protected research repo.** Its bare `tests` positional greedily reaches into
`specs/context/OGAM-main`, producing ~628 failed files that are not regressions. Run the four real
backend test directories explicitly to see the truth.

**4. Piping to `tail` hides the exit status.** `npm run test:web | tail` reports the *pipe's* exit
code, not vitest's. Verify by content — both suite summaries present — or capture `RC=$?`.

**5. `specs/context/**` is read-only and protected.** Five research repos live there: `OGAM-main`,
`mobilecli-main`, `nodeterm-main`, `openclaude-android-main`, `remote-for-opencode-master`. Never
`git clean`, `stash -u`, `add -A` or `git add .` against them.

**6. The shared Public checkout has another session's files staged.** Its git index holds thousands of
them. Cross-repo skill edits land through an **isolated worktree only** — never staged or committed in
the shared checkout. Branches come from the sk-git allocator under a lock, never hand-named. Three
pre-push gates apply: commit-message shape, branch naming, and metadata-manifest regeneration.
`SPECKIT_ALLOW_REMOTE_PUSH=1` is required per push.

**7. Case-only renames are silently swallowed.** On this filesystem `git mv Button.svelte
button.svelte` can succeed and record nothing. Use the two-step through a temporary name, verify with
`git status` before committing, and `git log --follow` after.

**8. A stale glob makes a gate pass by reading nothing.** The token-identity gate assembles its CSS
corpus from a glob. After a rename, an un-updated glob produces a zero-diff result over an empty
corpus — a false green on the programme's load-bearing proof. Confirm the corpus is non-empty first.

**9. Ported `useEffect` → `$effect` self-invalidates.** Seven incidents across six files so far, with
nineteen hand-placed `untrack()` calls across eleven files. A `$effect` that dispatches into the same
`$state` it reads re-invalidates itself, and the cleanup cancels the in-flight work. Audit every
ported effect by tracing what its API methods do, not by grepping for a literal `dispatch(`.

**10. Known flakes, not regressions.** `PlanModeMenu.svelte.test.ts` "Enter activates" is ~62% flaky
at baseline. `auth.test.ts` is timing-flaky (201 vs 403) — measured at 3/8 and 1/8 across two arms of
the same change, failing on the identical assertion in both. `integration/pinned-pi-image-probe.test.ts`
is load-sensitive (`expected true to be false`); it probes the installed Pi binary, and passed 3/3 both
with and without a change under test. A bits-ui body-scroll-lock timer can throw `document is not
defined` after teardown while every test passes. Confirm flake-versus-regression with a scoped stash —
`git stash push -- <paths>`, never `reset --hard` — and at least eight runs, never a single run.

**10b. A backgrounded dispatch outlives its shell wrapper.** `cmd & sleep N` returns when the compound
command exits, not when the executor does, so a "completed" notification can be false and a log tail is
not a final report. Poll `pgrep -f "opencode run"` until it clears. **Never reset or revert the working
tree while a dispatch is live** — doing so silently clobbers its work, including work that was correct.

**11. Comment hygiene is a hard block.** Never put a spec path, ADR id, REQ id, CHK id or task id in a
code comment. Write the durable WHY instead. A pre-commit gate enforces it.

---

## 6. DECISIONS ALREADY MADE — DO NOT REOPEN

- **Kebab-case for every file and folder** under `app-mobile/src/`, `routes/**` excepted. This
  deliberately leaves Svelte's PascalCase ecosystem convention; the import identifier is chosen at the
  import site, so nothing breaks.
- **Kind first in a component name**, from a closed list: `sheet-`, `menu-`, `dialog-`, `card-`,
  `button-`, `toggle-`, `radio-`, `screen-`. Screens carry the prefix so a prefix search reaches them,
  which also removes the "is this a kind or a screen" boundary case entirely.
- **`shared/` splits by reason to change.** `transport/` and `state/` stay separate rather than merging
  into one `session/` folder: the wire contract and the reducers change for different reasons.
- **No Svelte lint rule for the runes doctrine.** Standing up a lint lane — parser, first-pass triage
  over 148 files, 27 pre-existing errors, a custom rule no upstream plugin expresses, then a tenth
  permanent gate — was judged too expensive. The doctrine lives as prose in the conventions authority
  instead, which is packet 019's job.
- **No relay-side approval risk classifier.** A wrong risk label is worse than none, because a
  confirmation you learn to tap through no longer confirms anything.
- **The full conventions refresh belongs to 019**, after every convention has shipped. Packet 012
  lands only a one-section naming stop-gap to cover the window.

---

## 7. OPERATOR DECISIONS — ALL FOUR ANSWERED

Nothing in this queue is waiting on a decision any more.

1. **Client close-code classification.** **Do both halves.** Asking why the credential expires so
   quickly reframed the problem: the fifteen-minute session life is not a login timeout, because the
   device key never expires and re-authenticating is silent. So refresh at roughly four fifths of the
   session's life — the expiry path is then normally never reached — and classify the close correctly
   as the safety net for a sleeping phone or a lost network. Raising the fifteen minutes was rejected:
   it hides the defect and lengthens the window a stolen session cookie stays useful.
2. **Epoch rotation.** **Ship it, retaining ten ended epochs.** Rotation and cross-epoch collection
   ship together; rotation alone makes storage strictly worse. Ten keeps several restarts inspectable
   while debugging one.
3. **The two misleading runtime strings.** **Not selected.** Still available, nothing depends on it.
4. **Aborting a turn without discarding the draft.** **Do it.** The earlier recommendation against
   this was wrong about the expectation: losing typed text on abort surprises people whether or not
   an interrupt path exists.

The conventions-authority stop-gap is also settled: **land the minimal one-section correction now**,
with the full rewrite still belonging to the last packet.

---

## 8. STANDING RULES

**Autonomous graph-loop.** Finish a node, pass its gate, advance to the next unblocked node. Run
independent nodes in parallel. Do not hold for per-step approval — proceed, verify, commit, push.
Stop and escalate only on a broken invariant, a red gate that resists bounded repair, or a
destructive or irreversible act.

**Research approval.** Research findings may create or update phases, but every recommendation is
presented to the operator first. Nothing is scaffolded without explicit approval. The nine packets in
the queue have already been through this and are approved.

**Verification is not delegated.** A dispatch's own report of success is a hypothesis. Confirm it
against real command output, read outside the sandbox, before the barrier.
