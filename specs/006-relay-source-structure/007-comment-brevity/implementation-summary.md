---
title: "Phase G implementation summary — comment brevity"
description: "Verbose inline comment descriptions across app-relay (37 files) and the repo-root code (47 files) trimmed to a concise durable-WHY style, proven comment-only by an AST re-print with comments removed (0 code changed), fences 277, typecheck across 5 workspaces, and the affected suites green."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/007-comment-brevity"
    last_updated_at: "2026-08-25T03:30:44.319Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Backend and root comments trimmed; AST-identical, fences 277, suites green."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase G implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `006-relay-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Verbose inline comment descriptions shortened to a concise durable-WHY style across the backend and
shared code — 37 `app-relay/src` files and 47 repo-root code files. A four-line JSDoc that narrated what
a method does becomes a one-line comment stating only the non-obvious point; a comment that merely
repeated a name or the next line is gone. The section banners, shebangs and `@ds` guardrail fences are
untouched, so the structure the banner passes added stays and only the prose tightened.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Two cli-cursor (composer-2.5) passes — one over `app-relay/src`, one over the repo-root code — each told
to trim only comments, keep banners and fences, and preserve genuine WHY. The proof that no code changed
is an AST re-print: each file is parsed and re-printed with `removeComments:true`, and the result is
hashed against HEAD. Comments are trivia, absent from the AST, so a comment-only edit re-prints
byte-identical. All 84 touched files came back AST-identical.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Verify with an AST re-print, not a line or token diff.** A first attempt using a raw-scanner token
stream false-positived on eleven files: the standalone scanner mis-spans template literals, so a comment
removed between two template strings read as a token change. Parsing to an AST and re-printing without
comments is immune to that — it is the reliable comment-only oracle.

**Keep the fences as a second guard.** The trim ran over gate scripts including the fence counter and the
token-identity gate. Keeping every `@ds` fence verbatim means the 277 count is an independent check that
no guardrail comment was trimmed, on top of the AST proof.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| AST re-print (comments removed) per file | app-relay 37/37 and root 47/47 AST-identical, 0 code changed |
| Comment-line reduction | app-relay 913 → 770; 32 relay + 28 root files trimmed |
| Guardrail fences | `scan-comments.mjs` 277, unchanged |
| Shebangs / script syntax | 0 shebangs lost; `node --check` on modified scripts, 0 failures |
| Workspace typecheck | `npm run typecheck` across 5 workspaces, 0 errors |
| Affected suites | `npm test` 55 files / 401 tests; app-relay 46 / 307; inbound-media 8 / 8 |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

App-mobile comments are out of scope here and are trimmed in a separate child under the migration packet,
where the `.svelte` files need a comment-only check that spans script, markup and style comment forms.
`tests/auth.test.ts` remains intermittently flaky (201 vs 403), independent of this work.
<!-- /ANCHOR:limitations -->
