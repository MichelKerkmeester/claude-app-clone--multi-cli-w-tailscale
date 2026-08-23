---
title: "Takeover prompt — roadmap execution"
description: "The kickoff prompt for a fresh session inheriting the post-cutover queue: first actions, the execution loop, reporting cadence, and stop conditions."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration"
    last_updated_at: "2026-08-23T15:30:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Takeover prompt authored for a fresh orchestrator session."
    next_safe_action: "Hand both prompts to the new session."
    blockers: []
    completion_pct: 0
---

# Takeover — Pi Remote roadmap execution

You are taking over an in-flight programme as **orchestrator**. Planning is finished; building is
not. Nine packets are scoped, approved and validating. None has started. Your job is to execute the
roadmap end to end.

Spec folder is **pre-approved** — `specs/003-pi-remote-design-system/005-sveltekit-spa-migration/`.
Do not stop to ask which folder to document in.

---

## First three actions, in order

**1. Read the ground truth.** In this folder: `handover.md`, then `roadmap.md`, then
`goal-prompt.md`. The handover lists eleven traps that have each already cost a session. Do not touch
a file before you have read them — four of those traps fail *silently*, which means your gates will
report green while the work is wrong.

**2. Confirm the board matches the handover.** Run `git log --oneline -5`, `git status -sb`, and
`validate.sh` on the parent packet **through its realpath** — through the `.opencode` symlink it exits
0 with no output and a failing packet reads as green. Expect 20 folders PASSED / 0 FAILED, and a clean
tree apart from untracked `specs/context/`. If reality disagrees with the handover, say so before
proceeding; do not quietly adapt.

**3. Open both lanes.** They share no files and are meant to run concurrently:
- **Relay lane:** `016/001-projection-integrity` and `016/002-route-authority` in parallel.
- **Client lane:** `015-test-lanes` first — it is the precondition, and nothing downstream is
  provable until it lands — then `012/001-grammar-and-manifest`.

Start with `016/001`. It is a verified live silent data loss on a first-party path: a cached sequence
counter desyncs from a store that drops control-plane projections without consuming a sequence, the
resulting throw is relabelled as a parse failure, and it is handed to an error listener nobody ever
registered. A user sees a block referenced in the transcript and never rendered, with no error
anywhere. It ships with a regression test that fails against today's code.

---

## The loop

For each node: read its `spec.md`, `plan.md` and `tasks.md` → dispatch the executor one directory at a
time with explicit ALLOWED WRITE PATHS → **verify independently, outside the executor's sandbox** →
run the node's gate → commit atomically → advance to the next unblocked node.

A dispatch's own report of success is a hypothesis. Confirm it against real command output before the
barrier. Every packet's `checklist.md` is the sign-off; mark items `[x]` only with evidence.

Commit as you go. A live-follow daemon restores the working tree to HEAD a minute or two after an edit
lands, with no reflog trace, so the write, the `git add` and the `git commit` go in **one** command.

---

## Reporting

Report at barriers, not at every edit. A barrier report is: what landed, the gate output with exit
statuses, what you verified yourself versus what a dispatch claimed, and the next unblocked node.

Verdict first, then receipts. Separate **confirmed** from **inferred**, and say what would confirm the
inferred. If a check failed, say so with the output. If you skipped something, say that.

---

## Stop conditions

Stop and escalate on exactly three things:

1. **A broken invariant** — a rendered value moved, a security or a11y contract changed, a route
   changed, or the backend suite went red.
2. **A red gate that survives one bounded repair attempt.** One attempt, then escalate; do not grind.
3. **A destructive or irreversible act** — anything that would rewrite history, force-push, mass-delete,
   or touch the five read-only research repos under `specs/context/`.

Escalation carries the conflicting facts, a one-sentence root cause where you have one, and the
decision needed — not a workaround that quietly changes scope.

Four questions are the operator's and are already recorded in their packets with recommendations. Do
not decide them yourself: whether to ship the client close-code classification without its harness,
whether epoch rotation is worth its retention obligation, and the two `011` candidates.

Everything else: proceed.
