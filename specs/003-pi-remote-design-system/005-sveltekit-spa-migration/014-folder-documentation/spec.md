---
title: "Child 014 — Folder documentation on the sk-doc templates"
description: "Rewrite the 16 barebones folder READMEs and 7 CODE files onto sk-doc's feature and code-folder templates, and add the ones that are missing, so each folder explains what the feature does and how its logic is arranged."
trigger_phrases:
  - "folder readme sk-doc template"
  - "code folder documentation svelte"
  - "feature readme structure logic"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/014-folder-documentation"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet scoped from measured README and CODE inventory."
    next_safe_action: "Wait for the 012 tree to settle, then convert one folder as the reference pair."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 014 — Folder documentation on the sk-doc templates

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../013-comment-grammar/spec.md |
| **Successor** | ../015-test-lanes/spec.md |
| **Level** | 2 |
| **Layer** | post-cutover editability — documentation pass |
| **Writer** | executor (folder docs) + Claude (template conformance, gates, git) |
| **Barrier** | every source folder documented on template + `validate.sh --strict` |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Sixteen `README.md` files exist under `app-mobile/src/`. Four of them are five lines. The median is
nineteen. Seven `CODE.md` files exist alongside them, between fifteen and forty-one lines.

None follows a template. They were written freehand during the earlier editability pass, which is why
they vary from a single paragraph to a decent orientation depending on who wrote them and when.

sk-doc already ships the two templates this split needs, and their section models are far richer than
what is currently written: the code-folder template asks for architecture, package topology, a
directory tree, key files, boundaries and flow, entrypoints and validation; the feature template asks
for overview, structure, configuration, usage and troubleshooting.

The gap is not formatting. It is that the current files answer *what is in this folder* and stop
short of *what this feature does for a user* and *how the logic is arranged*. Those are the two
questions a newcomer actually has.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:**
- **Rewrite the 16 `README.md` files** onto sk-doc's feature template: what the feature is for, what a
  user does with it, how it is configured, and what commonly goes wrong.
- **Rewrite the 7 `CODE.md` files** onto sk-doc's code-folder template: overview, architecture,
  directory tree, key files, boundaries and flow, entrypoints, validation.
- **Add the missing pair** for every source folder that has neither, including `pages/chat/attachments`,
  `pages/home`, `pages/inbox`, `pages/review`, `pages/enrollment`, `shared/chrome` and `routes`, plus
  the two route directories that hold source and no documentation at all.
- **Cover the folders 012 creates.** The `shared/` split turns three folders into roughly thirteen, and
  each new folder needs its pair. This is the reason the packet is sequenced after 012.
- **Root `README.md`** re-pointed at the final tree.

**Out of scope:** any source change; any comment change, which belongs to 013; spec-folder
documentation; the sk-doc templates themselves.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Every source folder under `app-mobile/src/` carries both documents: a feature README
  answering what and why, and a CODE file answering structure and logic. A folder with source and no
  documentation returns zero on the coverage scan.
- **REQ-002** — Each document follows its sk-doc template's section model. Sections that genuinely do
  not apply are omitted deliberately rather than filled with filler, and the template's own guidance
  on when to include a section governs that call.
- **REQ-003** — Documentation describes the shipped tree. Every filename, path and component name
  referenced must exist, which is checkable and therefore checked.
- **REQ-004** — No document carries an ephemeral artifact pointer. The same hygiene rule that governs
  code comments governs these files, because they rot the same way.
- **REQ-005** — Content is written from the reader's side: what the feature does for someone using the
  app, then how the code is arranged. A file listing is not an explanation, and the current documents
  are mostly file listings.
- **REQ-006** — The root README orients a newcomer to the final tree in one screen, and links to the
  per-folder pairs rather than duplicating them.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. Coverage scan: zero source folders lacking either document.
2. Template conformance: every document's headings match its sk-doc template's model.
3. Reference integrity: every path and component name mentioned resolves to a file that exists.
4. Hygiene: zero ephemeral artifact pointers across all documentation.
5. `validate.sh … --strict` exit 0, invoked through the script's realpath.
6. The nine program gates are untouched — this packet changes no source, so any gate movement means
   something leaked out of scope.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Documentation written against a moving tree.** 012 renames every file and 013 rewrites every
  comment. Writing these documents first guarantees rewriting them twice, which is why this packet is
  last.
- **Template conformance without substance.** The failure mode is a document with all nine headings
  and nothing under them worth reading. Section counts are a floor, never the goal.
- **Reference rot on day one.** A document naming a component that was renamed in 012 is wrong
  immediately. The reference-integrity check exists specifically for that.
- **Volume tempting generation.** Roughly forty-six documents across twenty-three folders is enough
  that filling a template mechanically becomes attractive; that produces exactly the barebones files
  this packet exists to replace.
- Depends on 012 and 013 both landing first.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

1. **Keep the two-file split, or merge into one README per folder?** The split — feature README plus
   CODE file — came from the earlier pass and matches sk-doc's two templates, which is a real argument
   for keeping it. The argument against is that twenty-three folders times two files is forty-six
   documents to keep true, and a single well-sectioned README could carry both. Recommendation: keep
   the split, because the audiences genuinely differ. Operator's call.
2. **Do the `routes/` directories need the full pair?** They hold one file each and their content is
   routing glue. Proposed: one short CODE file for `routes/` as a whole, no per-directory pair. Not
   blocking.
<!-- /ANCHOR:questions -->
