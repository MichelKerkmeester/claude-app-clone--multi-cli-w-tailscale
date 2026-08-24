---
title: "Relay source structure — section banners, file headers, and folder documentation"
description: "Phase parent for making the app-relay backend source read the same way the web client does: numbered section banners in every source file, a module header on the files that lack one, a README for the attachments subsystem, and a reason-to-change map for the top-level source folders. Comment and documentation only — no behaviour changes."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure"
    last_updated_at: "2026-08-24T21:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Phase parent scoped; four children created for the relay source-structure pass."
    next_safe_action: "Run 001-source-section-banners: add numbered section banners to the 36 module files."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Relay source structure — phase parent

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | (top-level spec) |
| Mode | Phase parent |
| Children | `001-source-section-banners`, `002-bare-file-headers`, `003-attachments-readme`, `004-folder-ownership-map` |
| Status | Planned |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

`app-relay` is the Node and TypeScript relay service behind the mobile client. Its source is sound but
uneven to read. Thirty-six source files open with a `// MODULE:` banner yet have no interior section
markers, so a reader scrolls to find where the imports end and the real work starts. Sixteen files —
fifteen test suites and one runtime helper — carry no header banner at all. The `attachments`
subsystem is the largest folder, eight files that decode, bound, normalise and reap inbound media, and
it has no README to orient a first reader. And there is no single map that says which of the sixteen
top-level source folders a change belongs in.

The web client (`app-mobile`) already reads this way: every file has a header, interior sections carry
numbered banners, and folders that earn one have a README. This packet brings the relay source to the
same standard so a maintainer moves between the two surfaces without relearning the layout.

Each concern is a phase because each has a different failure mode and a different proof. A banner pass
is proven by showing the non-comment source is byte-identical and the suite stays green. A new header
on a bare file is the same comment-only proof over a different file set. A README and a folder map are
prose deliverables, proven by review against the real code. Mixing them would blur which check protects
what.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:phases -->
## 3. PHASE DOCUMENTATION MAP

| Phase | Child | Scope |
|---|---|---|
| A | `001-source-section-banners` | Add numbered `// N. SECTION` banners to the 36 source files that already carry a `// MODULE:` header. Comment-only; the non-comment source stays byte-identical. |
| B | `002-bare-file-headers` | Give the 16 files with no banner a `// MODULE:` header and the same numbered sections — 15 test suites and `src/runtime/plan-status.ts`. Comment-only. |
| C | `003-attachments-readme` | Write a README for `src/attachments`, the eight-file inbound-media subsystem, so a first reader learns the decode → bound → normalise → project → reap flow. |
| D | `004-folder-ownership-map` | Write a reason-to-change map for the 16 `src/` folders: for each folder, what it owns and the change that belongs there. One map, not sixteen READMEs. |
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:invariants -->
## 4. INVARIANTS

Non-negotiable across every phase:

- No behaviour change. The relay serves the same responses, the same auth and mutation policy, the same
  attachment handling. Phases A and B touch only comments; phases C and D add only documentation files.
- The app-relay test suite stays green, run on its explicit `tests` directory from the final state.
- Comment-only phases prove the non-comment source is byte-identical before and after.
- Comment hygiene: no spec path, ticket id, or REQ/CHK/task id in any code comment.
<!-- /ANCHOR:invariants -->

---

<!-- ANCHOR:cross-refs -->
## 5. CROSS-REFERENCES

- `../005-sveltekit-spa-migration/020-source-structure/` — the web-client source-structure pass this
  mirrors on the relay.
- `../005-sveltekit-spa-migration/014-folder-documentation/` — the folder-README convention phase D
  follows.
- `app-relay/README.md` — the relay's top-level overview this packet complements.
<!-- /ANCHOR:cross-refs -->
