---
title: "Phase G plan — comment brevity, proven comment-only by AST re-print"
description: "How the verbose inline comments in the backend and shared code are trimmed and how the comment-only claim is proven: a CLI executor shortens the prose, then an AST re-print with comments removed is diffed per file, plus the fence count, typecheck and the suites."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/007-comment-brevity"
    last_updated_at: "2026-08-25T03:30:44.319Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Plan executed; comments trimmed and proven comment-only by AST re-print."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase G plan

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Shorten over-long inline comment descriptions across `app-relay` and the repo-root code to a concise
durable-WHY style. A CLI executor does the trimming; the orchestrator proves it changed no code by
re-printing each file's AST with comments removed and diffing it against HEAD.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

Per file, the AST re-printed with `removeComments` is identical before and after — the comment-only
proof. The guardrail fence count stays 277, the comment-line count drops, and typecheck plus the
app-relay and root suites stay green from the final state.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

A line- or raw-token diff is not a safe comment-only proof here: the standalone TypeScript scanner
mis-spans template literals, so a comment removed between two template strings reads as a token change
when nothing real moved. The reliable check parses each file to an AST and re-prints it with
`removeComments: true`; comments are trivia and absent from the AST, so a comment-only edit re-prints
byte-identical, while any code change survives the re-print. The `@ds` fences are kept verbatim so the
277 count is a second independent guard, and the suites are the third.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1 · app-relay
Trim the 37 `app-relay/src` files; verify AST-identical, fences 277, typecheck and the relay suite.

### Phase 2 · root code
Trim the 47 repo-root code files; verify AST-identical, typecheck and the root suites.

### Phase 3 · barrier
Confirm the whole backend and shared surface is comment-only and green from the final state.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

No new tests — a comment trim keeps behaviour. The AST re-print is the oracle for "no code changed"; the
suites confirm behaviour is unchanged; the fence count confirms no guardrail was trimmed. All run from
the final state before the phase closes.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- The `app-relay/src` and repo-root code file lists (the banner-pass surfaces).
- An AST re-print comparator over the TypeScript compiler API for the comment-only proof.
- cli-cursor at composer-2.5 — the live executor route.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

The pass is comment-only and isolated to the listed files. `git checkout -- <files>` restores them;
nothing else depends on the change, and there is no migration or irreversible step.
<!-- /ANCHOR:rollback -->
