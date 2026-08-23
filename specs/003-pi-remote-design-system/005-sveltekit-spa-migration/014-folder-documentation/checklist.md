---
title: "Child 014 checklist — folder documentation on the sk-doc templates"
description: "Barrier sign-off for the folder documentation pass. Every item is open: the packet is scoped and not started, so each marker names the check that will produce its evidence."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/014-folder-documentation"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Approve the reference pair before writing further documents."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 014 — Folder documentation

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

Three checks are mechanical: coverage, template conformance, and reference integrity. One is not: does
a document say anything a reader could not get from the file listing.

A conforming document with nothing under its headings passes all three mechanical checks and fails the
packet. The sampled read exists for exactly that case.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [ ] **CHK-PRE-01** [P0] 012 has landed. [deferred: pending execution — documentation naming pre-rename files is wrong the day it is written]
- [ ] **CHK-PRE-02** [P1] 013 has landed. [deferred: pending execution — so comment text and folder documentation agree rather than diverge]
- [ ] **CHK-PRE-03** [P0] The one-file-versus-two question is answered. [deferred: pending sign-off — recorded as open question 1 in `spec.md`; the split doubles the documents to keep true]
- [ ] **CHK-PRE-04** [P0] The reference pair is approved. [deferred: pending execution — `pages/chat/transcript` converted first, approved before any other folder starts]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] No source file was edited. [deferred: pending execution — `git diff --stat` must show documentation paths only]
- [ ] **CHK-CQ-02** [P1] Documents are written from the reader's side. [deferred: pending execution — what the feature does first, how the code is arranged second; a file listing is not an explanation]
- [ ] **CHK-CQ-03** [P2] The parent folder documents link to children rather than restating them. [deferred: pending execution — duplicated content is content that will disagree with itself later]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] Reference-integrity scan clean. [deferred: pending execution — every backticked path and component name must resolve against the filesystem]
- [ ] **CHK-TEST-02** [P1] The nine program gates are untouched. [deferred: pending execution — this packet changes no source, so gate movement means something leaked out of scope]
- [ ] **CHK-TEST-03** [P2] The integrity scan is committed, not ad hoc. [deferred: pending execution — it is the only mechanical defence against documentation describing a tree that no longer exists]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] Coverage scan returns zero folders lacking either document. [deferred: pending execution — baseline is 16 `README.md` and 7 `CODE.md` across ~23 source folders]
- [ ] **CHK-FIX-02** [P0] The 13 folders 012 creates under `shared/` are all documented. [deferred: pending execution — all new writing, and the largest single block in the packet]
- [ ] **CHK-FIX-03** [P1] The four five-line READMEs are genuinely rewritten. [deferred: pending execution — `pages/enrollment`, `pages/inbox`, `pages/review` and their peers are effectively new writing, not edits]
- [ ] **CHK-FIX-04** [P1] The two undocumented route directories are covered. [deferred: pending execution — they hold source and have no documentation at all today]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] No document leaks a secret, token, host or tailnet detail. [deferred: pending execution — documentation is the easiest place to write down a real address by accident]
- [ ] **CHK-SEC-02** [P1] The security posture is described accurately where it is described at all. [deferred: pending execution — a document that misstates the trust boundary is worse than one that omits it]
- [ ] **CHK-SEC-03** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P0] Every document conforms to its sk-doc template's section model. [deferred: pending execution — `readme-template.md` for feature docs, `readme-code-template.md` for code docs]
- [ ] **CHK-DOC-02** [P1] Omitted sections are deliberate. [deferred: pending execution — each template states when a section earns its place; omission is a judgement, not an oversight]
- [ ] **CHK-DOC-03** [P0] Zero ephemeral artifact pointers. [deferred: pending execution — no spec paths, packet or phase numbers, ADR, requirement, checklist or task ids]
- [ ] **CHK-DOC-04** [P1] The root README orients in one screen. [deferred: pending execution — it is the first thing a newcomer reads, and a confused orientation is worse than none]
- [ ] **CHK-DOC-05** [P1] The overlay-versus-route distinction is explained where it applies. [deferred: pending execution — Review and Inbox are overlay state, not URLs, which surprises every newcomer]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P1] Both documents sit in the folder they describe. [deferred: pending execution — colocation is what makes them findable at the moment of need]
- [ ] **CHK-ORG-02** [P2] Commits are per folder. [deferred: pending execution — a reviewer reads one coherent folder rather than a 46-file blur]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The honest risk is volume. Roughly forty-six documents across twenty-three folders is enough that
filling templates mechanically becomes attractive, and mechanical filling reproduces exactly the
barebones files this packet exists to replace — only longer. The reference-pair-first sequencing and
the sampled read are the countermeasures, and neither is automatic.
<!-- /ANCHOR:summary -->
