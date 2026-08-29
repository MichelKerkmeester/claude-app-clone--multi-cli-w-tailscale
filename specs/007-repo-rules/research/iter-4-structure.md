# Iteration 4 — Structure and scannability

Lens: judge `REPO RULES.md` as an artifact an AI agent reads under context pressure.
Date: 2026-08-29. Source file measured at 204 lines, 1,601 words, 11,433 characters.

---

## Verdict

A **modest restructure is warranted. A rewrite is not.**

The file is small enough to read whole (~2.8k tokens). Length is not the problem. Heading-skip and first-screen bias are. The sentences that destroy the tree or produce a silent false pass sit at lines 171 and 192 of 204. The first 36 lines are a skill routing table the skill already carries, and that this packet's own spec forbids duplicating.

Do not add a table of contents, an index, or new narrative. Reorder, rename two headings, and cut what the skill or `AGENTS.md` already says.

---

## How work actually arrives

`AGENTS.md:153` sends a cold agent here before it acts. Work then arrives as one of:

1. A first git or test command (`git add .`, `npm test`, `npm run test:web`).
2. A feature that may need host data it does not have.
3. A rendering or token change (this repository's main surface).
4. A claim that a gate passed, or that a screenshot moved.
5. A spec-doc edit, then `validate.sh`.

Current order serves (3) and (4) early and buries (1), (2) and (5). That fails REQ-008 (`specs/007-repo-rules/spec.md:90` — "Section order matches how work arrives, so an agent reads the deciding sentence early") and the plan's placement rule (`plan.md:56-58` — a fact belongs here only if the agent needs it *before* it knows to open the skill).

---

## Current shape (measured)

| Lines | Section | What a heading-scan decides |
|------:|---------|-----------------------------|
| 8 | Preamble | Keep. Precedence is the only sentence that resolves a conflict. |
| 28 | 1. THE SURFACE SKILL | "UI conventions live in a skill." An agent doing git, protocol, or specs skips it — and that is correct, except the section is occupying first-read position. |
| 34 | 2. THE VERIFICATION LADDER | "I am about to prove a change." Right idea, late traps. |
| 27 | 3. THE DESIGN SYSTEM | "I am changing how it looks." Glance-decidable. |
| 35 | 4. STORYBOOK AND THE SCREENSHOT ARCHIVE | Longest body. Clock and flake sit after the census. |
| 17 | 5. FAIL-CLOSED AND FROZEN SEAMS | Heading is jargon. An agent adding a chat field will not know this section applies. |
| 17 | 6. KNOWN BASELINES — NOT REGRESSIONS | Best heading in the file. The bare-`tests` landmine does not belong under it. |
| 38 | 7. GIT, SPECS AND THE PROTECTED REPOS | Three audiences, one heading. The spec-kit false-pass is a subsection after push policy. |

Bold lead-ins (`**…**`) are already the real scan mechanism — 30 of them. Headings are weaker than those leads. Improve the headings so a skip is a decision, not an accident.

---

## Proposed section order

Same facts. Different doors. One-line rationale each.

0. **Preamble (unchanged)** — Conflict rule. An agent that reads nothing else still knows which file wins on a path.

1. **FIRST-COMMAND TRAPS** — These fire before any design decision: `specs/context/` and `git add .` / `git clean` / `git stash -u` (`REPO RULES.md:169-173`); bare `tests` positional (`:161-163`); `test:web` pipe (`:63-64`); validator silence / require `RESULT: PASSED` (`:190-193`). Extract, do not restate later.

2. **HOST DATA AND STORY SEAMS** (today's §5) — Shapes whether the work is allowed. "Never invent a host field" (`:137`) must precede the design-system section, not follow it.

3. **THE SURFACE SKILL** (four lines, not a table) — Path plus "load the entry, not the folder" plus "catalogs live at repo root." Depth stays in the skill. Satisfies REQ-003 (`spec.md:82`).

4. **THE VERIFICATION LADDER** (today's §2, traps already lifted) — Proof-before-implementation. Keep the two command blocks. Put any remaining warning on the command it applies to, not after the whole list. `test:web` is on line 43; its pipe warning is on line 63 — twenty lines and the entire presentation list later.

5. **THE DESIGN SYSTEM** — Only after the agent knows it may not invent host data, and only if the work changes look.

6. **STORYBOOK AND THE SCREENSHOT ARCHIVE** — Lead with the two traps (archive is not byte-stable; clock is pinned in three scripts), then the start command, the one-writer rule, and the census. Intra-section reorder only.

7. **KNOWN BASELINES — NOT REGRESSIONS** — Named flakes and the eslint delta. The vitest positional moves to §1.

8. **SPEC-KIT INVOCATION** — What remains after landmines leave §7: realpath + `NODE_PRESERVE_SYMLINKS=1` (`:184-188`); phase-parent recurse (`:199-201`); child-edit stales parent metadata (`:203-204`). Heading now matches the reader who is about to run `validate.sh`.

What this is not: eight new essays. Seven of eight already exist. §1 is a lift from sentences already in §2, §6 and §7.

---

## CUT list

Each cut is something an agent can lose from *this* file without losing a decision. Destination named where the fact must survive.

| Cut | Where now | Why |
|-----|-----------|-----|
| The seven-row `references/` table (`:19-26`) | §1 | Byte-level restatement of `sk-code-mobile-cli/SKILL.md:49-61`. REQ-003 and `plan.md:56-58` say this file points; the skill explains. The last row is also *worse* than the skill: it tells the reader to open `setup.md` for `operations/`, `release/`, `standards/` and `quality/`. |
| "merged documents, not routers" (`:28-29`) | §1 | Same claim, same wording, at `SKILL.md:67-69`. Does not change a first action. |
| "44 documents each across 8 subject folders" (`:32`) | §1 | Count verified (44 markdown files, 8 subject dirs in both trees) but it does not change a decision, and `spec.md:134` already flags counts as decay. Keep one sentence: the catalogs live at this repository root, not in the skill. |
| Folder-routing preamble (`:15-16`) | §1 | Skill already teaches `<folder>/<folder>.md`. Keep only "Load the entry, not the whole folder." |
| Second "39 goldens" | §2 command comment (`:52`) vs §3 (`:73-74`) | State the number once, on the authority sentence in the design-system section. The ladder line can name the script without repeating the count. |
| "Start it in the background…" (`:104-105`) *if* `npm run storybook` is dropped from this file | §4 | Already at `references/storybook/running-storybook.md:58-61` and `:112`. If the start command stays here, the trap stays beside it — do not cut the trap and keep the command. |
| "One build directory, one writer." (`:107-108`) *same rule* | §4 | Already at `running-storybook.md:90-91`. Keep iff the `build-storybook` command stays in the ladder. |
| "Pushing to `origin` requires `SPECKIT_ALLOW_REMOTE_PUSH=1`, and a pre-push hook enforces the policy." (`:177`) | §7 | `AGENTS.md:282-284` already owns ask-before-push and the hook. The env-var name lives in `sk-git`. Git work is already routed there. Keep only the local trap: do not stop `git-live-follow --live main` on the assumption it reverts edits (`:178-179`). |
| "Its verification commands bind exactly as `AGENTS.md`'s do." (preamble `:3`) | Preamble | Restates `AGENTS.md:153`. The next sentence (precedence) is the one that decides. |

### Not a cut — structurally `AGENTS.md`, keep until absorbed

These are spec-kit-universal, not Mobile-CLI-unique. They are **absent** from `AGENTS.md` today (confirmed: no `RESULT: PASSED`, no `NODE_PRESERVE_SYMLINKS`, no phase-parent recurse, no `GENERATED_METADATA_INTEGRITY`). Cutting them here opens a hole.

- Validator silence / require `RESULT: PASSED` (`:190-193`).
- Phase-parent recurse; take the *first* `RESULT:` (`:199-201`). Not found in `system-spec-kit` markdown either.
- Child-edit stales parent metadata (`:203-204`).

Move them to `AGENTS.md` beside `validate.sh` (`AGENTS.md:235`) in a later packet. Do not drop them in this pass.

### Not generic advice — keep

"Start it in the background" looks like server hygiene. It is an agent hang that `running-storybook.md` already had to write down. Same for "Never conclude determinism from one pair of runs" (`:119`). Both have already cost a wrong call here.

---

## Three sentences to read first

Quoted from the current document. These are the ones that should become the new §1.

1. **`REPO RULES.md:171`** — "**Never `git add specs/`, `git add .`, `git clean`, or `git stash -u`** — any of those stages or destroys thousands of files."
   Omitting it breaks the tree on the first staging command. `specs/context/` exists as a directory (listed, contents not read).

2. **`REPO RULES.md:192-193`** — "A sweep that only looks for `RESULT: FAILED` reads that silence as a clean pass. Always require an explicit `RESULT: PASSED`."
   Omitting it produces a false completion. `AGENTS.md:235` already names exit 3 as a system error; it does not name the silent-stdout reading error.

3. **`REPO RULES.md:48`** — "**The behaviour gates cannot see whether a surface renders correctly** — a component mounts, passes its tests, and still shows text in its own background colour."
   Omitting it makes a green `typecheck` / `test:web` / `test` / `build` look like a finished rendering change. That is this repository's main false-done.

Close fourth, not in the three: "**Never invent a host field.**" (`:137`). It shapes design rather than firing on the first command or forging a green gate. It should still move up with today's §5.

---

## Heading glance test

| Current heading | Glance verdict | Better door |
|-----------------|----------------|-------------|
| THE SURFACE SKILL | Pass | Keep, once it is four lines. |
| THE VERIFICATION LADDER | Pass | Keep. |
| THE DESIGN SYSTEM | Pass | Keep. |
| STORYBOOK AND THE SCREENSHOT ARCHIVE | Weak | Add the clock to the heading or lead the body with it. An agent pinning a date fixture will not guess this section. |
| FAIL-CLOSED AND FROZEN SEAMS | Fail | Rename to **HOST DATA AND STORY SEAMS** or **NEVER INVENT A HOST FIELD**. |
| KNOWN BASELINES — NOT REGRESSIONS | Pass | Keep. |
| GIT, SPECS AND THE PROTECTED REPOS | Fail | Split: landmines in §1, remainder **SPEC-KIT INVOCATION**. |

---

## Redundancy inventory

**Stated twice inside this file**

- 39 goldens: command comment at `:52` and authority at `:73-74`. Cut one (see CUT list).
- Screenshot flake: measured non-determinism at `:114-122` and named stories at `:154-155`. **Not a duplicate.** §4 is the rule (never conclude from one pair; restore after it returns). §6 is the roster. Keep both.
- One-theme archive (`:66-67`) is not restated in §4. Keep it in the ladder; it is why `ui-audit.mjs` exists.

**Restates `AGENTS.md`**

- Verification must be observed, not assumed — Iron Law / `AGENTS.md:207`. This file's value is the *local* commands and the two ways they lie (pipe, validator silence). Do not restate the Iron Law.
- Ask-before-push and pre-push hook — `AGENTS.md:282-284`. Cut the restatement (`:177`).
- `validate.sh --strict` — `AGENTS.md:235`. Keep only the repo-specific invocation (`realpath`, `NODE_PRESERVE_SYMLINKS=1`) and the silent-pass trap.
- Live-sync exists — `AGENTS.md:283`. Keep only "do not stop `git-live-follow --live main`."

**Restates the surface skill**

- Entire §1 table and merged-docs paragraph — `SKILL.md:49-69`.
- Feature-catalog location — `SKILL.md:75-77`.
- Storybook background-start and one-writer — `running-storybook.md:58-61, 90-91`. Keep beside any command this file still lists.

**Carries no decision**

- "It is read-only evidence: it supplies the contract, the acting workflow applies it" (`:12-13`) — also `SKILL.md:42-43`. The path on the line above is the decision.
- The grab-bag last table row (`:26`) — cannot decide which file to open.

---

## What I would not change

- The two-block ladder (behaviour, then presentation, with why the second exists). That split *is* the rendering-gate lesson.
- Bold-lead sentences as the scan pattern. Do not wrap them in a new taxonomy.
- Known-baselines as its own section. The heading already does the job.
- Numbers next to the command that produced them (goldens, story census, capture clock).
- The file remaining a single page. 204 lines is a full read. Splitting it would hide the landmines again.

No new sections of advice. No TOC. The work is: lift four landmine sentences to the top, rename two headings, cut the skill table, move fail-closed above design-system.
