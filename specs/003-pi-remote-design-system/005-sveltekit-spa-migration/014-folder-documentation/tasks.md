---
title: "Child 014 tasks — folder documentation on the sk-doc templates"
description: "Task ledger for the reference pair, the shared/ documentation block, the feature and screen folders, and the reference-integrity scan."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/014-folder-documentation"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Convert the transcript folder as the reference pair."
    blockers: []
    completion_pct: 0
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

- [ ] **T1.1** Confirm 012 and 013 have landed. Documentation written against a tree still in motion
      is documentation to be rewritten.
- [ ] **T1.2** Operator answers the one-file-versus-two question. Recommendation is to keep the split,
      because the audiences genuinely differ, but it doubles the number of documents to keep true.
- [ ] **T1.3** Convert `pages/chat/transcript` completely — both documents, both on template.
- [ ] **T1.4** Get the pair approved before writing another. Forty-six documents against an unapproved
      example is forty-six documents to redo.
- [ ] **T1.5** Build the reference-integrity scan: extract every backticked path and component name
      from documentation, resolve each against the filesystem, report the misses.
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Shared**

- [ ] **T2.1** `shared/primitives/` and its six control-family sub-folders.
- [ ] **T2.2** `shared/chrome/` — currently has a 15-line README and no CODE file.
- [ ] **T2.3** The seven folders replacing `shared/data/`: `transport/`, `state/`, `commands/`,
      `catalog/`, `format/`, `viewport/`, `fixtures/`. All new writing.
- [ ] **T2.4** Explain in `fixtures/` why demo data is separated from runtime code — it ships to
      stories, not to users, and a reader who misses that will import it into the app.

**Chat feature folders**

- [ ] **T2.5** `pages/chat/artifacts/` — 24 source files, the largest folder; existing pair is 19 and
      19 lines.
- [ ] **T2.6** `pages/chat/rich-content/`.
- [ ] **T2.7** `pages/chat/chrome/` — carries the composer, the sheets and the menus.
- [ ] **T2.8** `pages/chat/attachments/` — has a README, no CODE file.
- [ ] **T2.9** `pages/chat/features/ask-question/`.
- [ ] **T2.10** `pages/chat/` itself — the parent orientation, linking to its children rather than
      restating them.

**Screens, routes and root**

- [ ] **T2.11** `pages/home/` — 14-line README, no CODE file.
- [ ] **T2.12** `pages/inbox/`, `pages/review/`, `pages/enrollment/` — five lines each today, so
      effectively new writing.
- [ ] **T2.13** Explain the overlay-versus-route distinction where it applies. Review and Inbox are
      overlay state, not URLs, and that surprises every newcomer who goes looking for their route.
- [ ] **T2.14** `routes/` — one CODE file for the directory as a whole, per the spec's proposal.
- [ ] **T2.15** Root `README.md` — orient in one screen, link to the pairs, duplicate nothing.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [ ] **T3.1** Coverage scan: zero source folders lacking either document.
- [ ] **T3.2** Conformance: headings match each template's model; omitted sections are deliberate.
- [ ] **T3.3** Reference-integrity scan clean.
- [ ] **T3.4** Hygiene: zero ephemeral artifact pointers.
- [ ] **T3.5** Sampled read: at least one section per folder says something a reader could not get
      from the file listing.
- [ ] **T3.6** Nine program gates untouched; `validate.sh --strict` through its realpath.
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
