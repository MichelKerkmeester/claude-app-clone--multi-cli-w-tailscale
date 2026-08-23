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
| `011-ux-affordances` | 1 | open — the one packet allowed to change a rendered value; operator-driven |
| `012-naming-and-structure` | phase parent | scoped; grammar decisions **settled**, three children |
| `013-comment-grammar` | 2 | scoped; blocked on 012 (same 148 files) |
| `014-folder-documentation` | 2 | scoped; blocked on 012 and 013 |
| `015-test-lanes` | 2 | scoped; **executable now** — precondition for everything else |
| `016-relay-correctness` | phase parent | scoped; **executable now**, three children |
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

**Working model routes:** `openai/gpt-5.6-luna` via opencode for a11y-sensitive work; GLM-5.2 via
`cli-devin` (free tier) for bulk generation; `cli-pi` with deepseek-v4-flash at xhigh plus a code
persona for source fixes.

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
at baseline. `auth.test.ts` is timing-flaky (201 vs 403). A bits-ui body-scroll-lock timer can throw
`document is not defined` after teardown while every test passes. Confirm flake-versus-regression with
a scoped stash and at least eight runs, never a single run.

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

## 7. WHAT IS STILL THE OPERATOR'S CALL

Four items are recorded as open questions in their packets and must not be decided unilaterally.

1. **Ship the client close-code classification without a test, or build the harness?** The harness is
   roughly fifteen times the ten-line fix, because `app-mobile/tests/` has no WebSocket-level test at
   all. This is the one place "no ship without a test" genuinely conflicts with proportionality.
   Recorded in `016/003-connection-lifecycle`.
2. **Is epoch rotation worth its retention obligation?** The mechanism is confirmed; the incidence of
   a mid-session host restart is not. Rotation without garbage collection makes storage worse.
   Recorded in `016`.
3. **Reword the two runtime strings that read as terminal but are recoverable?**
   `foreground-required` and `host-unavailable`. Recorded in `011`, recommended yes.
4. **Allow aborting a turn without discarding the draft?** Recorded in `011`, recommended no — the
   user can already interrupt while typing via Steer.

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
