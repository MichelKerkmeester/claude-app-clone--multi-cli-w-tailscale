---
title: "Backend and shared source structure — section banners, file headers, and folder documentation"
description: "Phase parent for making the non-web source read the same way the web client does: numbered section banners, a module header on the files that lack one, and folder documentation. It began on app-relay (children 001-004) and extends to the repo-root shared code — packages, scripts, extensions, release and root tests (children 005-006). Comment and documentation only — no behaviour changes."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure"
    last_updated_at: "2026-08-25T03:30:43.724Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Added child 007 comment-brevity across the backend and root code."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Backend and shared source structure — phase parent

> The folder is named `006-relay-source-structure` because the work began on app-relay; it has since
> grown to cover the repo-root shared code. The name is kept to preserve packet identity and history.

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | (top-level spec) |
| Mode | Phase parent |
| Children | `001-source-section-banners`, `002-bare-file-headers`, `003-attachments-readme`, `004-folder-ownership-map`, `005-root-source-banners`, `006-root-folder-docs`, `007-comment-brevity` |
| Status | In Progress |
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

The same unevenness holds for the code at the repo root that both apps depend on — the shared
`pi-rpc-protocol` package, the build and gate `scripts`, the three Pi `extensions`, the `release` tooling
and the root `tests`. Forty-seven of those files have a `// MODULE:` header but no interior section
banners or none at all, and four folders (the `packages` and `extensions` containers, and two of the
three extensions) have no README. Children 005 and 006 finish the same alignment there.

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
| E | `005-root-source-banners` | Ensure every repo-root code file has a `// MODULE:` header and numbered section banners — 47 files across `packages`, `scripts`, `extensions`, `release` and root `tests`. Comment-only; the non-comment source stays byte-identical. |
| F | `006-root-folder-docs` | Fill the missing folder READMEs: the two undocumented Pi extensions, and the `packages` and `extensions` container maps. Documentation only. |
| G | `007-comment-brevity` | Trim over-long inline comment descriptions across app-relay and the repo-root code to a concise durable-WHY style, keeping banners and fences. Comment-only, proven by an AST re-print. |
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:invariants -->
## 4. INVARIANTS

Non-negotiable across every phase:

- No behaviour change. The relay and the shared code behave identically. The banner and header phases
  (A, B, E) touch only comments; the documentation phases (C, D, F) add only documentation files.
- The affected test suites stay green from the final state — the app-relay suite for A-D, and the
  root/package/extension suites plus typecheck for the shared code the root phases touch.
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
