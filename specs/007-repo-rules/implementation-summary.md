---
title: "Repo rules implementation summary"
description: "REPO RULES.md went from a five-line stub to the per-repository agent contract, then five independent research passes falsified six of its claims and found four operational facts it was missing."
trigger_phrases:
  - "repo rules implementation summary"
  - "repo rules packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-repo-rules"
    last_updated_at: "2026-08-29T19:45:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Folded five research passes in; moved the spec-kit universals to the shared file."
    next_safe_action: "Packet closed; no follow-up owed inside this phase."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Repo rules implementation summary

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | `REPO RULES.md`, and five research passes over it |
| **Executor** | Grok 4.6 xhigh-fast via the Cursor CLI, five parallel passes |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **A per-repository agent contract.** `REPO RULES.md` was a five-line stub declaring its own purpose.
  It now carries seven sections of paths, commands, numbers and traps — what is true only here.
- **Five research passes**, each with a distinct lens and its own report under `research/`: the build
  and tooling surface, what the skill and specs know that the rules do not, failure archaeology from
  git history, structure and scannability for an AI reader, and an adversarial accuracy audit.
- **A trap-first structure.** The document now opens with the commands that destroy the tree or
  produce a silent false pass, because those fire before any design decision is made.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Write from measurement, then try to falsify. The document was first built only from facts checked
against the tree, and two claims carried from memory were already wrong at that stage — a line number
and a test filename. Five research passes then ran in parallel against the written document, one of
them briefed purely to falsify it. That pass found six more errors the author had not suspected,
which is the argument for running it at all.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **Restructured rather than rewritten.** The structure pass judged the file small enough to read
  whole and identified the real defect as heading-skip: the two sentences that destroy the tree or
  produce a silent false pass sat at lines 171 and 192 of 204. They now open the document.
- **The skill routing table was cut.** Seven rows restated the skill's own `SKILL.md` byte for byte,
  which this packet's spec forbids. Three lines remain: where the skill is, load the entry document,
  and the catalogs live at the repository root.
- **Spec-kit universals were moved out, not deleted.** The validator-silence, symlink no-op,
  phase-parent recursion and metadata-regeneration rules are harness properties rather than
  Mobile-CLI facts. `AGENTS.md` carried none of them, so deleting them here would have lost knowledge
  that had already cost real time; they were added to the shared file under its completion rule
  instead, and removed from this one.
- **Unverifiable findings were not folded in.** Several research claims could not be checked
  read-only — whether a daemon is running, whether two concurrent builds actually corrupt the output.
  They are recorded in the reports and kept out of the document.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- Every path in the document resolves against the tree; the only unmatched token is `.svelte.ts`,
  a file-extension glob rather than a path.
- All seven npm scripts cited are defined in the root or `app-mobile` `package.json`.
- The six context repository names in the document are identical to the six directories on disk,
  compared with `diff` rather than by eye.
- Counts re-measured: 39 token goldens, one `app.css` against 95 scoped `<style>` blocks, and
  337 stories / 311 captured / 26 visually empty from `MANIFEST.json`.

### What the research falsified

Six claims were wrong or stale and are corrected:

| Claim | Reality |
|---|---|
| `specs/context/` holds **five** repositories | **Six** — `orca-main` was missing from the list that exists to say "never touch these" |
| `npm run typecheck` covers "all five workspaces" | The repository has **six** workspaces; `@pi-remote/inbound-media-extension` is never typechecked |
| eslint baseline spans two files | `+layout.svelte` is clean; the baseline is exactly three errors in `sheet-model-effort.svelte` |
| `ui-audit.mjs` is the only gate that sees the other theme | `catalog-smoke-cdp.mjs` also renders both themes |
| The phase-parent exit code describes the last child | The printed output continues past the folder; the exit code claim was unfounded |
| A pre-push hook enforces the push env var here | That policy and hook belong to `AGENTS.md` and `sk-git`, not to this repository |

### What the research added

Four operational facts the document was missing:

- **`playwright` is declared nowhere** — not in `package.json`, not in `package-lock.json` — yet
  `ui-audit`, `catalog-state-visibility`, `token-override-check` and `capture-screenshots` all require
  it. The copy in `node_modules` is an undeclared leftover, so `npm ci` removes it and four
  presentation gates then fail with a module error even though Chrome is installed.
- **`catalog-smoke-cdp.mjs` is macOS-only**, shelling a hardcoded `Google Chrome.app` path with no
  `CHROME_PATH` fallback, and exiting as a harness failure rather than a story failure without it.
- **Node and npm floors live in `scripts/boot.mjs`**, not in `package.json`. There is no `engines`
  field and no `.nvmrc`, so a tree that installs cleanly can still refuse to boot.
- **The typecheck coverage gap**, above — a green typecheck is not whole-tree coverage.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The document can decay silently.** Every claim is a re-runnable measurement, but nothing gates it,
  so a moved path or a changed count makes it confidently wrong until someone checks. Two open
  questions in `spec.md` record the candidate fixes: generate the counts, or guard the path claims the
  way the surface skill's paths are guarded.
- **Some research findings remain unverified rather than rejected.** Whether two concurrent catalog
  builds actually corrupt the output, and whether the archive's flake reproduces today, would each
  need a run that writes to the tree. They stayed out of the document and stayed in the reports.
- **The rules file now depends on a shared-file change landing.** The four spec-kit invocation traps
  live in `AGENTS.md` as of the change that removed them here. Until that lands, a reader of this
  repository alone has no copy of them.
<!-- /ANCHOR:limitations -->
