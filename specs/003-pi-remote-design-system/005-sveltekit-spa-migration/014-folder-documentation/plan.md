---
title: "Child 014 plan — folder documentation on the sk-doc templates"
description: "Which template answers which question, the reference-pair-first approach, the folder order, and how reference integrity is checked."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/014-folder-documentation"
    last_updated_at: "2026-08-23T21:06:15Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Plan authored with template mapping and folder order."
    next_safe_action: "Convert one folder as the reference pair and get it approved."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 014 plan — folder documentation on the sk-doc templates

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Two documents per source folder, each on its own sk-doc template. Convert one folder first, get that
pair approved as the reference, then apply the pattern folder by folder.

Doing the reference pair first is the whole plan. Forty-six documents written against an unapproved
example is forty-six documents to redo.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Three checks, none of which is a test suite.

**Coverage** — no source folder lacking either document. **Conformance** — headings match the
template's model. **Reference integrity** — every path and component name mentioned resolves to a file
that exists, which is the check that catches documentation written against yesterday's tree.

The fourth gate is human and cannot be automated: does a section say something a reader could not get
from the file listing? A conforming document with nothing under its headings passes the first three
checks and fails the packet.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

sk-doc ships two templates, and the split maps cleanly onto the two questions a newcomer has.

**`readme-template.md` → `README.md`, the feature document.** Its model is Overview, Key Statistics,
Quick Start, Features, Requirements, Structure, Configuration, Usage Examples, Troubleshooting, FAQ,
Related Resources — with explicit guidance that each section is included only when it earns its place.
For a folder in this app the load-bearing sections are Overview, Features, Structure and
Troubleshooting. This document answers *what does this part of the app do for someone using it*.

**`readme-code-template.md` → `CODE.md`, the developer document.** Its model is Overview,
Architecture, Package Topology, Directory Tree, Key Files, Boundaries and Flow, Entrypoints,
Validation, Related. This answers *how is the logic arranged, and what must I not break*.

Measured against those models, the current files are thin: sixteen READMEs between five and
seventy-five lines, seven CODE files between fifteen and forty-one. Four READMEs are five lines — a
title and a sentence. The templates ask for materially more, and more importantly they ask for
different content: boundaries, flow and entrypoints appear nowhere in the current CODE files.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 0: The reference pair

Convert one folder completely — `pages/chat/transcript` is the best
candidate, since its current README is among the better ones and its logic is genuinely worth
explaining. Get both documents approved before writing another.

### Phase 1: `shared/`

The folders 012 creates, roughly thirteen of them, each needing a pair from
scratch. Largest single block of new writing.

### Phase 2: `pages/chat/` feature folders

`artifacts`, `transcript`, `rich-content`, `chrome`,
`attachments`, `features/ask-question`. These have the most existing material to build on.

### Phase 3: Screen folders

`home`, `inbox`, `review`, `enrollment`. Currently the thinnest, three
of them at five lines, so effectively new writing.

### Phase 4: `routes/` and root

Routing glue plus the root README, re-pointed at the final tree and
linking rather than duplicating.

### Phase 5: Barrier

Coverage, conformance, reference integrity, hygiene, and `validate.sh`.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No source changes, so no suite exercises this packet. Verification is scanning plus reading.

The reference-integrity scan is worth building properly rather than eyeballing: extract every
backticked path and component name from the documentation, resolve each against the filesystem, and
report the misses. It is a few lines of script and it is the only mechanical defence against
documentation that describes a tree which no longer exists.

The nine program gates are run once at the end, and should be untouched. Any movement means a source
file was edited, which is out of scope here.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 012 must land first — documentation naming pre-rename files is wrong the day it is written.
- 013 should land first, so comment text and folder documentation agree.
- sk-doc's two templates are the contract; if they change, conformance is re-checked against the new
  model rather than against this plan's summary of it.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Per-folder commits, independently revertable. Nothing here executes, so a bad document is a bad
document and not a broken build — the cost of getting one wrong is that a reader is misled, which
argues for careful review rather than for careful rollback.

The root README is the one document worth reverting rather than patching if it goes wrong, since it is
the first thing a newcomer reads and a confused orientation is worse than none.
<!-- /ANCHOR:rollback -->
