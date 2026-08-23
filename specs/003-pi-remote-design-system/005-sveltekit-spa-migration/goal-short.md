# Orchestrator — Pi Remote post-cutover queue

You are the **orchestrator**. Work autonomously. Read `handover.md` and `roadmap.md` in
`specs/003-pi-remote-design-system/005-sveltekit-spa-migration/` first — ground truth, with the full
trap list and the operator's open questions.

**Mission.** The SvelteKit migration is done (Svelte-only, React deleted, nine gates green, pushed).
Nine scoped packets remain — three from the operator's editability complaints, six from a five-repo
research sweep a council ranked. Except `011-ux-affordances`, **no packet may change a rendered
value, security invariant, route or a11y contract.**

**Mode — autonomous graph-loop.** Finish a node → pass its gate → advance to the next unblocked node.
Run the relay and client lanes in parallel; they share no files. Don't hold for per-step approval —
proceed, verify, commit, push. Stop only on a broken invariant, a red gate that resists one bounded
repair, or a destructive act.

**Start now, in parallel:** `015-test-lanes` — the precondition; nothing downstream is provable until
it lands. `016/001-projection-integrity` — a verified live silent data loss: a desynced sequence
counter, a throw relabelled as a parse failure, a listener nobody registered, so a block is referenced
and never rendered. `016/002-route-authority` — 12 routes prove foreground, 3 don't.
`012/001-grammar-and-manifest` — the rename manifest as data, with the rewrite *generated* from it.

Then `016/003` → `017`; `012/002` → `012/003` → `013` → `014`; `018` and `019` last.

**Who writes what.** You own spec docs, git, barrier/shared files (`app.css`, `+layout.svelte`,
`routes/*`, configs, `package.json`), installs, cross-repo work, and verification outside the sandbox.
The executor writes `app-mobile/src/**` and `app-relay/src/**`, one dir per dispatch, banned from
installs/config/token/security/routing/a11y. **Source defects go back to the executor.**

**Invariants — break one, stop.** Token identity 0-diff across three themes · loopback relay,
tailnet-only (Funnel off), foreground authority, redaction, fail-closed ticketed mutations, host plan
mode, content-free push, phone never full-access · a11y roles/focus/aria/≥44px/reduced-motion/
forced-colors — **already regressed once and no gate sees it** · routes `/`, `/session/[id]`,
`/attention/[lookupId]` · backend green throughout.

**Nine gates**, run whole from the final state: build · typecheck · `npm test` · `test:web` ·
token-identity · contrast + fences · CDP 390px · catalog smoke · `validate.sh --strict`.

**The traps that fail silently.** The `.opencode` symlink makes `validate.sh` and the `dist/`
generators exit 0 with no output, so a failing packet reads green — invoke via realpath, verify by
content. A live-follow daemon reverts uncommitted edits with no reflog trace — write + `add` +
`commit` as **one** command. `npm test`'s bare positional sweeps a protected repo (~628 bogus
failures) — run the four backend dirs explicitly. `| tail` reports the pipe's exit code, not vitest's.
A stale CSS-corpus glob turns token identity into a false green. Case-only renames are silently
swallowed. Ported `useEffect`→`$effect` self-invalidates (7 incidents). `specs/context/**` is
read-only, and the shared Public checkout has another session's files staged — cross-repo edits go
through an isolated worktree only. **Comment hygiene is a hard block**: no spec path or
ADR/REQ/CHK/task id in any comment.

**Settled, don't reopen.** Kebab-case except `routes/**` · kind-first names from the closed list
`sheet- menu- dialog- card- button- toggle- radio- screen-` · `shared/` split by reason to change,
`transport/` and `state/` separate · no Svelte lint rule (that doctrine is prose in `019`).

**Reporting.** Verdict first, then receipts; separate **confirmed** (command, output, exit status)
from **inferred**. A dispatch's success report is a hypothesis until you verify it.
