---
title: "Phase F checklist — root folder docs barrier"
description: "Barrier sign-off for the four missing folder READMEs: each describes its real folder, the container maps link every child, and no code changed."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/006-root-folder-docs"
    last_updated_at: "2026-08-25T03:30:44.019Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All barrier items proven; four READMEs written, no code touched."
    next_safe_action: "Proceed to 007-comment-brevity."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F checklist

<!-- ANCHOR:protocol -->
## VERIFICATION PROTOCOL

Each item is a barrier: it blocks the phase closing until it holds with evidence. A README is proven by
checking each claim against the folder it documents.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## PRE-IMPLEMENTATION

- [x] **CHK-PRE-01** [P1] The four gaps were confirmed before writing. [evidence: `packages/README.md`, `extensions/README.md`, and the `pi-remote-inbound-media` and `pi-remote-plan` READMEs were missing; `pi-remote-approval` had one]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## CODE QUALITY

- [x] **CHK-CQ-01** [P0] The two extension READMEs name the real package and entry point. [evidence: `@pi-remote/inbound-media-extension` / `createInboundMediaHostAdapter` and `@pi-remote/plan-extension` / `piRemotePlan` drawn from source]
- [x] **CHK-CQ-02** [P0] Each extension README's behaviour matches its source. [evidence: inbound-media allowlist + capability gate, and plan read-only/mutation classification + lease, taken from each `src/index.ts`]
- [x] **CHK-CQ-03** [P1] The container maps list every child and link its README. [evidence: `extensions/README.md` maps `3` extensions; `packages/README.md` links `pi-rpc-protocol`]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## TESTING

- [x] **CHK-TEST-01** [P1] The affected suites are unaffected by this doc-only phase. [evidence: `vitest run` for the extension packages green at phase E's final run]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## FIX COMPLETENESS

- [x] **CHK-FIX-01** [P1] Every repo-root code folder is now reachable from a README. [evidence: `packages`, `extensions` and all three extensions plus `scripts`, `release`, `tests` have a README]
- [x] **CHK-FIX-02** [P2] The new READMEs follow the repo's `pi-remote-approval` pattern. [evidence: frontmatter + `## 1. OVERVIEW` … `## 8. RELATED` structure mirrored]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## SECURITY

- [x] **CHK-SEC-01** [P0] No code, comment or behaviour changed — only four README files were added. [evidence: `git status` shows four added `README.md` files, no `.ts`/`.mjs` modified]
- [x] **CHK-SEC-02** [P1] Nothing under `specs/context/**` touched. [evidence: no change under `specs/context/`]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## DOCUMENTATION

- [x] **CHK-DOC-01** [P1] `validate.sh --strict` exit 0 through its realpath. [evidence: `validate.sh <packet> --strict` exit 0, run through its realpath]
- [x] **CHK-DOC-02** [P1] The container maps' links resolve to real README files. [evidence: `extensions/README.md` and `packages/README.md` link paths that exist on disk]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## FILE ORGANIZATION

- [x] **CHK-ORG-01** [P1] Each new README lives in the folder it documents. [evidence: the two extension READMEs in their package roots; the two container maps at `extensions/` and `packages/`]
- [x] **CHK-ORG-02** [P2] The maps link out rather than duplicating the leaf READMEs. [evidence: `extensions/README.md` links each extension's own README instead of repeating it]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## VERIFICATION SUMMARY

The four missing folder READMEs are written from their real folders, every root code folder is reachable
from a README, and no code changed.
<!-- /ANCHOR:summary -->
