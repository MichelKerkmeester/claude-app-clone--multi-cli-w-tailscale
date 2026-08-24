---
title: "Phase C plan — attachments README"
description: "How the attachments README is written and checked: read the eight files and their call graph, write the flow and ownership table from what they actually do, then verify the only src change is the README."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/003-attachments-readme"
    last_updated_at: "2026-08-24T21:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Plan executed; README written from the real subsystem."
    next_safe_action: "Proceed to 004-folder-ownership-map."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Write `app-relay/src/attachments/README.md` for the eight-file inbound-media subsystem so a first reader
learns the decode → bound → normalize → deliver → project → reap flow and which file owns each step.
Every claim is drawn from the real files; no code changes.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

The README names all eight files with roles that match their `// MODULE:` headers and exports; the flow
matches the order `AttachmentService` runs the steps; and the only change under `app-relay/src` is the
new `README.md`, confirmed by `git status`.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

The subsystem's files only make sense in the order the service runs them, so the README is built as a
flow, not a file list. `AttachmentService` is the orchestrator; `attachment-types` and
`attachment-limits` are the shared foundation; `attachment-decoder` and `attachment-normalizer` are the
security-critical transforms; `pi-image-bridge` delivers; `attachment-transcript-projector` redacts for
the transcript; `attachment-reaper` cleans up on retention. Each README claim maps to a named file so a
future reader can check it against source.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · read
Read all eight `src/attachments` files and their exports and call graph.

### Phase 2 · write
Write the README: purpose, the decode→reap flow, a per-file ownership table, the decode-vs-normalize
security boundary, and a starting-point guide for common changes.

### Phase 3 · verify
Confirm each named file and flow step against the source and that the only src change is the README.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

This is a documentation-only phase, so the check is accuracy, not a new test: every named file and flow
step is confirmed against the actual source. The app-relay suite is not expected to change and is proven
green by the packet-wide `vitest run tests` final run.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The eight `app-relay/src/attachments` files and the shared media policy the limits re-export.
- The web client's folder-README form (`app-mobile/src/**/README.md`) as the shape reference.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

A single added file. `git rm app-relay/src/attachments/README.md` removes it with no other effect.
<!-- /ANCHOR:rollback -->
