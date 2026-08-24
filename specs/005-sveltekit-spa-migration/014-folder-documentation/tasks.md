---
title: "Child 014 tasks — folder documentation on the sk-doc templates"
description: "Task ledger for the reference pair, the shared/ documentation block, the feature and screen folders, and the reference-integrity scan."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/014-folder-documentation"
    last_updated_at: "2026-08-24T03:42:43Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Convert the transcript folder as the reference pair."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 014 tasks — folder documentation on the sk-doc templates

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

A folder task is done when both documents exist, both conform to their template's model, and every
path and component name they mention resolves.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm 012 and 013 have landed. Documentation written against a tree still in motion
      is documentation to be rewritten. [evidence: 012/003 closed and 013 advanced before any document was written; the naming scan reports 219 files / 0 offenders, so the tree was still]
- [x] **T1.2** Operator answers the one-file-versus-two question. Recommendation is to keep the split,
      because the audiences genuinely differ, but it doubles the number of documents to keep true. [evidence: operator answered — keep the split, but only where it earns itself. Measured first: the paired documents share 1 sentence in 2,877, so the split was not duplicating; but folders of one or two source files carried 221 documentation lines per source file against 36 for the larger ones. Ten folders collapsed to one document, 45% shorter than the pair]
- [x] **T1.3** Convert `pages/chat/transcript` completely — both documents, both on template. [evidence: `pages/chat/transcript/README.md` and `CODE.md` rewritten first, 125 and 241 lines, from 22 and 17]
- [x] **T1.4** Get the pair approved before writing another. Forty-six documents against an unapproved
      example is forty-six documents to redo. [evidence: `pages/chat/transcript` was written and reviewed against `readme-template.md` and `readme-code-template.md` before the other folders were dispatched, and the operator has since accepted the result. The frontmatter the first draft carried was removed at that review because nothing indexes an application tree]
- [x] **T1.5** Build the reference-integrity scan: extract every backticked path and component name
      from documentation, resolve each against the filesystem, report the misses. [evidence: `scripts/naming/scan-folder-docs.mjs` resolves every backticked and linked reference; it reports `brokenReferences: 0`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Shared**

- [x] **T2.1** `shared/primitives/` and its six control-family sub-folders. [evidence: `shared/primitives/` a11y, button, choice, disclosure, menu and sheet, each pair rewritten]
- [x] **T2.2** `shared/chrome/` — currently has a 15-line README and no CODE file. [evidence: `shared/chrome/README.md` rewritten and `CODE.md` created]
- [x] **T2.3** The seven folders replacing `shared/data/`: `transport/`, `state/`, `commands/`,
      `catalog/`, `format/`, `viewport/`, `fixtures/`. All new writing. [evidence: `catalog/`, `commands/`, `fixtures/`, `format/`, `state/`, `transport/` and `viewport/` pairs rewritten]
- [x] **T2.4** Explain in `fixtures/` why demo data is separated from runtime code — it ships to
      stories, not to users, and a reader who misses that will import it into the app.

**Chat feature folders** [evidence: `shared/fixtures/README.md` states the module ships in the browser bundle and is held inert by `VITE_PI_DEMO=1` plus an explicit query opt-in]
- [x] **T2.5** `pages/chat/artifacts/` — 24 source files, the largest folder; existing pair is 19 and
      19 lines. [evidence: `pages/chat/artifacts/` pair rewritten, 104 and 243 lines, from 19 and 21]
- [x] **T2.6** `pages/chat/rich-content/`. [evidence: `pages/chat/rich-content/` pair rewritten, 140 and 210 lines]
- [x] **T2.7** `pages/chat/chrome/` — carries the composer, the sheets and the menus. [evidence: `pages/chat/chrome/` pair rewritten, 103 and 223 lines]
- [x] **T2.8** `pages/chat/attachments/` — has a README, no CODE file. [evidence: `pages/chat/attachments/README.md` rewritten and `CODE.md` created]
- [x] **T2.9** `pages/chat/features/ask-question/`. [evidence: `pages/chat/features/ask-question/` pair rewritten, 125 and 218 lines]
- [x] **T2.10** `pages/chat/` itself — the parent orientation, linking to its children rather than
      restating them.

**Screens, routes and root** [evidence: `pages/chat/README.md` rewritten and `CODE.md` created, both handing off to the child folders]
- [x] **T2.11** `pages/home/` — 14-line README, no CODE file. [evidence: `pages/home/README.md` rewritten and `CODE.md` created]
- [x] **T2.12** `pages/inbox/`, `pages/review/`, `pages/enrollment/` — five lines each today, so
      effectively new writing. [evidence: `pages/inbox/`, `pages/review/` and `pages/enrollment/` each gained a rewritten README and a new CODE map]
- [x] **T2.13** Explain the overlay-versus-route distinction where it applies. Review and Inbox are
      overlay state, not URLs, and that surprises every newcomer who goes looking for their route. [evidence: `pages/review/README.md` states Review is an overlay rendered by `routes/+layout.svelte`, not a route, and that Chat can open it without changing the URL]
- [x] **T2.14** `routes/` — one CODE file for the directory as a whole, per the spec's proposal. [evidence: `routes/README.md` rewritten and `routes/CODE.md` created for the directory as a whole, plus a pair for each parameterised folder]
- [x] **T2.15** Root `README.md` — orient in one screen, link to the pairs, duplicate nothing. [evidence: root `README.md` rewritten to one screen, linking every package and folder pair]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Coverage scan: zero source folders lacking either document. [evidence: `scan-folder-docs.mjs` — 29 folders, missingBothDocuments 0, missingFeatureDocument 0, missingCodeDocument 0]
- [x] **T3.2** Conformance: headings match each template's model; omitted sections are deliberate. [evidence: every document follows the scaffold in `readme-template.md` or `readme-code-template.md`; small folders use the flat-inventory form rather than a tree, and no document carries frontmatter because nothing indexes an application tree]
- [x] **T3.3** Reference-integrity scan clean. [evidence: `brokenReferences: 0`; the three that existed — two bare filenames in the source-root README and one reference to a component deleted at cutover — are corrected]
- [x] **T3.4** Hygiene: zero ephemeral artifact pointers. [evidence: `grep` for `specs/003-` and REQ, CHK, ADR and task ids across all 59 documents returns 0 matches]
- [x] **T3.5** Sampled read: at least one section per folder says something a reader could not get
      from the file listing. [evidence: sampled `pages/chat/transcript`, `pages/inbox`, `shared/fixtures`, `pages/review` and the root README; each states ownership, boundaries or gating a file listing could not convey]
- [x] **T3.6** Nine program gates untouched; `validate.sh --strict` through its realpath. [evidence: build RC 0; typecheck 1123 files / 0 errors; `npm test` 55 files / 400 tests RC 0; `npm run test:web` 67 files / 539 passed and 16 files / 188 passed, RC 0; token identity 0 diffs across three themes; catalog smoke 534 frames / 0 throws; runtime smoke 4/4 surfaces; design-system 390px both themes; validate.sh --strict through its realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

Every source folder carries a feature document and a code document, both on template, both describing
the tree that actually exists.

The criterion that decides whether this was worth doing is not countable: can someone who has never
seen this app open a folder and understand what it does and how it is built, without reading the
source first. Section counts are a floor, not the goal.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — measured inventory, requirements and the two open questions.
- `plan.md` — template mapping, folder order and the reference-integrity approach.
- `checklist.md` — barrier sign-off with evidence.
- `../012-naming-and-structure/001-grammar-and-manifest/plan.md` — the tree this documentation describes.
- `../013-comment-grammar/plan.md` — the comment grammar this documentation should agree with.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
