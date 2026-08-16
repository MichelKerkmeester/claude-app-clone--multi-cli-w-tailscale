# Spec 002 — Autonomous Build & Delegation Strategy

> How the 40 build phases get implemented. The **what** lives in each phase's
> `spec.md` / `plan.md` / `tasks.md` / `checklist.md`; this file is the **how**:
> the goal, the model-delegation rule, the dispatch commands, the safety envelope,
> and the per-phase loop. Companion docs: [`roadmap.md`](roadmap.md) (build order +
> gates), [`architecture.md`](architecture.md), [`handover.md`](handover.md).

---

## 1. Goal

Autonomously implement **all 40 build phases** across the 10 features to a verified
finish — in build order, honoring the two frozen contracts and every hard gate,
with each phase proven green before the next starts. Research is complete for all
10; this is the build campaign.

- **Definition of done (campaign):** every feature's build sub-phases are
  implemented and pass their `checklist.md` + the workspace verify gate; the mobile
  chat reaches the Claude/Kimi bar in true-390px light + dark screenshots; no change
  weakens the frozen design or security contracts.
- **Definition of done (per phase):** `npm run typecheck`, `npm run test`
  (+ `npm run test:web` for UI phases), and `npm run build` all exit 0; the phase
  `checklist.md` items are checked with evidence; UI phases have 390px CDP light+dark
  captures; and `implementation-summary.md` records the result.

## 2. The iron rule of delegation

**Claude orchestrates and verifies. External models implement. Claude never writes
application code.**

- Claude: selects the next phase, composes the dispatch prompt from the phase docs,
  dispatches to an external model, then **verifies** (runs the gates, reads output +
  exit codes, checks the checklist). On failure Claude **diagnoses and composes a
  repair prompt** — it does not hand-edit `apps/`, `packages/`, or `extensions/`
  itself. Claude may edit spec-folder docs (`implementation-summary.md`, continuity).
- External models: perform every edit under `apps/pi-remote-web`,
  `apps/pi-remote-relay`, `packages/pi-rpc-protocol`, `extensions/pi-remote-approval`.

## 3. Model roster & dispatch commands

App code lives in **this repo** (`/Users/michelkerkmeester/MEGA/Development/Mobile CLI`).
Set `REPO` to a **git worktree of it** (see §5). Every dispatch runs with the child
envelope `MK_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1` and terminates stdin `</dev/null`.

Preference order: **DeepSeek v4 Flash first** (cheap, fast); escalate as the phase
demands. Use all as needed.

| Priority | Model | When | Command shape |
|:--:|---|---|---|
| **1 (preferred)** | **DeepSeek v4 Flash** via opencode-go | Well-specified, mechanical, or clearly-scoped protocol/UI phases | `opencode run --model opencode-go/deepseek-v4-flash --format json --dir "$REPO" "<prompt>" </dev/null` |
| 2 | **GPT-5.6 SOL — high, fast** via codex | Verification-heavy or security-sensitive phases (007/008/009 lanes); or when DeepSeek output fails review | `codex exec --model gpt-5.6-sol -c model_reasoning_effort="high" -c service_tier="fast" -c approval_policy=never --sandbox workspace-write -C "$REPO" "<prompt>" </dev/null` |
| 3 | **GPT-5.6 Luna — max, fast** via codex (or pi) | Hardest reasoning: complex state machines, cross-surface refactors | `codex exec --model gpt-5.6-luna -c model_reasoning_effort="max" -c service_tier="fast" -c approval_policy=never --sandbox workspace-write -C "$REPO" "<prompt>" </dev/null` |

Notes:
- **DeepSeek v4 Flash is non-reasoning** (`--variant` ignored) — best for phases whose
  `tasks.md` is already explicit. Prepend `MK_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1`.
- **codex sandbox must be `workspace-write`** for implementation (default is read-only,
  which silently no-ops file edits).
- **Luna via pi:** cli-pi is an alternate transport for Luna. Read
  `cli-external-orchestration/cli-pi/SKILL.md` for the exact guarded invocation before
  using it — do not assume a pi command shape.
- **Never dispatch to Claude / cli-claude-code for implementation** (the iron rule).
- Confirm live model slugs with `opencode models opencode-go` / `codex` auth before a
  first dispatch; if a model/auth is missing, ASK — never silently substitute.

## 4. Build order & gates

Implement in the order argued in `roadmap.md`:

`001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010`

Within each feature, phases run in numeric order (`002-…` first; each feature's
`001-research/` is already done). Cross-feature: `005-file-preview` owns the shared
viewer shell that `006` and `008` reuse — build it before them.

**Release-blocking hard gates (do the review before Phase 1 of that feature):**
- `007-media-upload` — adversarial security/redaction review (binary lane).
- `008-inbound-media` — adversarial security/redaction review (binary lane).
- `009-ask-question` — adversarial security/redaction review (new answer-mutation surface).

The gate review is a read/reason step (Claude or human); it is not an implementation
dispatch and must sign off before that feature's build dispatches start.

## 5. Safety envelope (non-negotiable)

A dispatched model with `workspace-write` can delete or corrupt files. Enforce all of:

1. **Isolated git worktree per feature (or per phase).** `$REPO` points at a fresh
   `git worktree`, never the main checkout — a runaway can't touch `main`. Merge back
   only after verification passes.
2. **Baseline commit before dispatch.** Main is clean or committed; record the recovery
   commit hash. `git status` clean before, scoped diff reviewed after.
3. **Literal guardrails in every prompt.** Include `ALLOWED WRITE PATHS` (the specific
   `apps/…`, `packages/…`, `extensions/…` files from the phase `plan.md`) and
   `BANNED OPERATIONS` (no deletes outside scope, no history rewrite, no dependency
   installs unless the phase requires them, no touching the design tokens or security
   boundary).
4. **No blind `--dangerously-skip-permissions`** on a populated worktree. If used, all
   four mitigations above are mandatory (see cli-opencode RM-8 incident).
5. **Frozen contracts travel in the prompt.** Ink-on-parchment (bone `#f8f8f6` / carbon
   ink `#24221f` / clay `#d97757`; Inter + Source Serif 4; light+dark; WCAG AA) and the
   security posture (read-only default; one-use ticketed + revision-checked mutations
   that fail closed; redaction everywhere; host/extension-enforced plan mode; content-free
   push; phone can never enable `--full-access`) — respected, never weakened.

## 6. Per-phase autonomous loop

For each phase, in order:

1. **Gate check.** If the feature is hard-gated (007/008/009) and unreviewed, run/obtain
   the security sign-off first; otherwise proceed.
2. **Compose.** Claude builds the dispatch prompt from the phase `spec.md` + `plan.md` +
   `tasks.md`, the feature `research/research.md`, the frozen contracts, and the §5
   guardrails. Pick the model per §3 (DeepSeek first).
3. **Dispatch.** Run the chosen command against the phase's worktree (`workspace-write`).
4. **Verify (Claude).** `npm run typecheck` → `npm run test` (+ `npm run test:web` for UI)
   → `npm run build`; then the phase `checklist.md`; then, for UI phases, true-390px CDP
   light+dark captures. Read output and exit codes — only real command output counts.
5. **Advance or repair.** All green → check the `checklist.md` with evidence, write the
   phase `implementation-summary.md`, update continuity, merge the worktree, move to the
   next phase. Any red → Claude diagnoses, composes a **repair prompt**, and re-dispatches
   to a model (escalating DeepSeek → SOL → Luna if a phase resists); Claude does not apply
   the fix by hand.
6. **Checkpoint.** After each feature (all its phases green + merged), report status; the
   operator can redirect before the next feature.

## 7. State & resume

Progress is tracked in each feature's build sub-phase `implementation-summary.md` and
`_memory.continuity`, and in the parent `graph-metadata.json`
(`derived.last_active_child_id`). To resume: read the continuity ladder, find the last
green phase, and re-enter the §6 loop at the next one.

## 8. Scope of this document

This file defines the delegation and autonomy **process**. It does not change the frozen
contracts, the build order, or any phase's acceptance criteria — those remain owned by
`roadmap.md` and the per-phase docs.
