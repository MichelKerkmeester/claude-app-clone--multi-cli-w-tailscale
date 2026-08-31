---
title: "Rule: First-command traps"
description: "Three commands in this repository destroy or mislead before any design decision is made: a wide git stage, a widened vitest positional, and a piped test run whose exit status is the pipe's."
trigger_phrases:
  - "git add"
  - "git add ."
  - "git clean"
  - "git stash -u"
  - "stage the changes"
  - "specs/context"
  - "run the tests"
  - "vitest positional"
  - "npm test"
  - "test:web"
  - "hundreds of failures"
  - "phantom failures"
  - "tail the output"
  - "pipe the test output"
  - "exit status of the pipe"
  - "did the suite actually pass"
importance_tier: important
contextType: reference
version: 1.0.0.0
---

# Rule: First-command traps

> Routed from [`REPO RULES.md`](../REPO%20RULES.md). Load it before staging anything or running a test command here. These fire before any design decision.
> Expands `AGENTS.md`, never overrides it — where they appear to disagree, `AGENTS.md` wins and this file is wrong. Say so.

## Fires when

- Staging, cleaning or stashing anything.
- Running a test command, or widening one.
- Piping a test run and reading its result.

## The rule

**Stage explicit packet paths, name test directories explicitly, and never read an exit status through a pipe.**

---

## 1. NEVER STAGE WIDE

`specs/context/` holds six untracked research repositories: `OGAM-main`, `mobilecli-main`, `nodeterm-main`, `openclaude-android-main`, `orca-main`, `remote-for-opencode-master`. They are read-only inputs.

**Never `git add specs/`, `git add .`, `git clean`, or `git stash -u`.** Any of those stages or destroys thousands of files.

Stage explicit packet paths. Recover a mistake with:

```bash
git restore --staged specs/context/
```

**The failure this prevents:** a single wide stage burying a real change under thousands of vendored files, or destroying them outright.

---

## 2. NEVER WIDEN A VITEST POSITIONAL

The root `npm test` names five explicit directories deliberately. **A bare `tests` positional greedily sweeps the context repositories** and reports hundreds of phantom failures.

**The failure this prevents:** hours spent debugging failures that belong to vendored code you were never changing.

---

## 3. A PIPE HIDES THE EXIT STATUS

```bash
npm run test:web | tail     # reports tail's status, not vitest's
```

Verify by content — both suite summaries present — or capture `RC=$?` before piping.

**The failure this prevents:** reporting a suite as green when it failed and the pipe returned zero.

---

## 4. SELF-CHECK

- [ ] Every staged path was named explicitly; no `.`, no bare `specs/`.
- [ ] No test command was widened to a bare positional.
- [ ] Any piped run was judged by content, or by an `RC` captured before the pipe.
