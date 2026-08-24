---
title: "Phase C checklist — attachments README barrier"
description: "Barrier sign-off for the attachments folder README: every named file and flow step matches the real subsystem, and no code changed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/003-attachments-readme"
    last_updated_at: "2026-08-24T21:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; README written from the real subsystem, no code touched."
    next_safe_action: "Proceed to 004-folder-ownership-map."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A README is proven by
checking each claim against the file it names, not by reading well.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P1] The eight `src/attachments` files were read and their call graph traced before writing. [evidence: exports enumerated per file via `grep -nE '^export'`; roles taken from each `// MODULE:` header]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] The README names all eight `src/attachments` files. [evidence: an `8`-row ownership table names attachment-service, -types, -limits, -decoder, -normalizer, pi-image-bridge, -transcript-projector, -reaper]
- [x] **CHK-CQ-02** [P0] Each file's stated role matches its `// MODULE:` header and exports. [evidence: roles drawn from each file's `// MODULE:` header and `export class`/`export function` lines]
- [x] **CHK-CQ-03** [P1] The decode → bound → normalize → deliver → project → reap flow matches the service call order. [evidence: `AttachmentService` in `attachment-service.ts` orchestrates the steps; the README flow diagram mirrors it]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P1] The app-relay suite is unaffected by this doc-only phase. [evidence: `vitest run tests` 46 files / 307 tests passed at the packet-wide final run]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P1] The README gives a starting point for common changes (a limit, a media type, retention). [evidence: `README.md` "Where to start for a common change" table — `6` change→file rows]
- [x] **CHK-FIX-02** [P2] The decode-vs-normalize separation is explained as a security boundary. [evidence: "Why decode and normalize are separate" section]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] No code, comment or behaviour changed — the only new file under `src/` is the README. [evidence: `git status` shows one added file, `src/attachments/README.md`; no `.ts` changed]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched. [evidence: no change under `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] The README lives beside the code it documents, in `src/attachments/`. [evidence: `src/attachments/README.md` co-located with the eight `.ts` files]
- [x] **CHK-ORG-02** [P2] The README links out to the folder map and the relay README rather than repeating them. [evidence: links to `../README.md` and `../../README.md`]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The README documents the eight-file inbound-media subsystem as a flow with per-file ownership and a
change-starting-point guide, every claim checked against the real files, and no code touched.
<!-- /ANCHOR:summary -->
