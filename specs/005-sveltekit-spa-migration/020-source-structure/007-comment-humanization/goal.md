# GOAL — Comment humanization (retire @ds, human-voice comments)

**Objective.** Make the Mobile CLI client readable and editable by a non-engineer: retire the `@ds` marker grammar for natural, concise, human-voice comments **everywhere it appears** — `.svelte` (1018 lines / 95 files), `app.css` (605 lines), and `.ts` (9 lines / 3 files) — and teach the new convention in the surface skill. Comment-only in source (every `@ds` is a comment). Approved reference: `app-mobile/src/pages/chat/screen-chat.svelte`.

**The convention.** Keep the `MODULE:` banner and the numbered ALL-CAPS box-drawing section banners (`// 1. IMPORTS` … 67-dash). Add: a plain-English header on each `<script module>` island; an `<!-- section -->` label on each markup region; a one-line human-voice purpose comment on each function, effect, and rule. Replace `@ds guardrail: do-not-edit` with a natural, consistent, still-greppable "Do not edit — <why>" note. Retire all other `@ds` markers (surface/slot/state/variant/edit/catalog/theme) to plain prose, keeping load-bearing semantics as durable WHY.

**Write authority (Gate 3 pre-resolved — never ask A/B/C/D/E).**
- Comment work: `specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization/{001-skill-convention,002-svelte-refactor,003-skill-reverify}`.
- Scripts-ownership doc: new phase under `specs/004-sk-code-mobile-cli-mode`.
- `.vscode` removal + tests→release: Mobile CLI `main`.

**Executor policy.** Implementation dispatches to luna 5.6 (gpt-5.6-luna) xhigh, normal speed, via `cli-codex` (`AI_SESSION_CHILD=1`, `NODE_PRESERVE_SYMLINKS=1`). Claude owns the plan/barrier docs, all verification, the Public skill landing, and every git push. Pushes to Mobile CLI `main` (source/docs) and Public `skilled/v4.0.0.0` (skill) are authorized under this goal.

**Phases — sequential, barrier-verified between each.**
1. **Skill first** — Update `sk-code-mobile-cli`: rewrite `comment-grammar.md`, retire `ds-grammar.md`, restate `editability-guardrails.md` around the greppable do-not-edit note; strip `@ds` authoring from every live reference/asset; update `SKILL.md` §2b/§3b + `README.md`; changelog + version bump. Land via isolated Public worktree (three pre-push gates, `SPECKIT_ALLOW_REMOTE_PUSH=1`). Barrier: `scan-skill-references` broken:0, router-sync bijection, drift-guard packet-delta 0, skill loads.
2. **Refactor all** — Apply the convention to every `.svelte` file, `app.css`, and the 3 `.ts` files, comment-only (1632 `@ds` lines). Convert `app.css`'s `@ds edit`/`@ds theme`/`@ds surface` seams to natural notes and every `@ds guardrail: do-not-edit` to the greppable "Do not edit — <why>" note. Re-anchor `scripts/naming/scan-comments.mjs` onto the new marker so the frozen-seam fence count is preserved, not lost. Barrier per file: non-comment content byte-identical (comment-span strip + hash). Suite: `@ds` count 0 in `.svelte`/`.css`/`.ts`; banners intact; do-not-edit fences ≥ prior 277; token-identity 0-diff (65 tokens × 3 themes); `test:web` green.
3. **Reverify skill** — Re-read the skill against the shipped `.svelte` reality and the edge cases phase 2 surfaced; fix drift; bump version if changed.

**Queued (autonomous).**
- Push the `.vscode` removal (commit `7c080e6`) to Mobile CLI `main`.
- Document the scripts-ownership decision as a new phase under `004-sk-code-mobile-cli-mode`: `scripts/` stays in the app repo (a read-only skill can't own executable tooling; the scripts operate on the app tree + CI; the skill references them). Analysis only — no move.
- Move `tests/` → `release/tests/`; update every referencing path (package.json, configs, CI, imports); prove the moved suite still runs.

**Invariants (all phases).** Comment-only in source; no rendered value / a11y / routing / security change; banners never removed; no frozen seam becomes editable; no spec path or artifact id in any comment; `specs/context/**` never touched; each packet passes `validate.sh <folder> --strict` (via realpath) before any completion claim.

**Autonomy.** Proceed through all phases and queued items without asking. Escalate only on a true logic-sync conflict (spec vs code) or an authoritative gate that resists the bounded remediation loop.
