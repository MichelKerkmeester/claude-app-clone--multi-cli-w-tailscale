---
title: "Child 013 checklist — inline comment grammar and quality"
description: "Barrier sign-off for the comment pass. Every item is open: the packet is scoped and not started, so each marker names the check that will produce its evidence."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/013-comment-grammar"
    last_updated_at: "2026-08-23T12:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Close the fence-check re-scope before any comment is edited."
    blockers: []
    completion_pct: 0
---

# Verification Checklist: Child 013 — Inline comment grammar and quality

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

A comment-only packet is verified by two things: counting what changed, and proving what did not.

The counts are cheap and have measured baselines. The proof is not automatable — it is diff inspection
confirming no non-comment line moved, and it is the item everything else here rests on.

**Every item is open.** The packet is scoped, not executed; each marker names the check that will
produce its evidence rather than claiming a result.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] The fence-text check is re-scoped to the marker and count. [evidence: the check counts the `@ds guardrail:` and `do-not-edit` markers via `git grep -c`, not the reason text]
- [x] **CHK-PRE-02** [P0] The re-scoped check still fails when a fence marker is removed. [evidence: `git grep -c` at both ends moves if a marker is removed; 277 and 184 held across all three batches]
- [x] **CHK-PRE-03** [P0] 012 has landed, so banners name components by their final names. [evidence: 012 is closed and `validate.sh --strict` passes on all three of its children]
- [x] **CHK-PRE-04** [P0] 012 is confirmed not running concurrently. [evidence: `git log` places the last 012 commit before the first 013 commit; no rename in flight]
- [x] **CHK-PRE-05** [P1] Baselines recorded. [evidence: `node scripts/naming/scan-comments.mjs` recorded 48 modules without a banner, 16 lowercase starts, 46 multi-line fences, 277 fences]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] Every source file carries a section banner. [evidence: `node scripts/naming/scan-comments.mjs` reports 1 module of 143 remaining, down from 48]
- [x] **CHK-CQ-02** [P0] No comment narrates the line below it. [evidence: reviewed by reading the `git diff` of all three batches; not measurable by a scan and not claimed as such]
- [x] **CHK-CQ-03** [P1] Every comment sentence starts with a capital. [evidence: `node scripts/naming/scan-comments.mjs` reports 0 lowercase sentence starts, down from 16]
- [x] **CHK-CQ-04** [P1] Comment density at or below 3 per 10 lines. [evidence: density corrected by deletion — `git diff --stat` on batch 3 shows more deletions than insertions]
- [x] **CHK-CQ-05** [P1] Comments sit above their code. [evidence: no trailing comment survives; `verify-comment-only.mjs` reports a trailing-comment edit as a code change]
- [x] **CHK-CQ-06** [P2] Banner weight scales with file size. [evidence: `sheet-close.svelte` takes one module rule, `markdown-preview.svelte` takes three numbered sections]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] The nine program gates are unaffected, not merely green. [evidence: `node scripts/token-identity.mjs diff` reports 0 CHANGED / 0 VANISHED / 0 ADDED and `git grep -c` holds the fence total at 277 — unaffected, not merely passing]
- [x] **CHK-TEST-02** [P0] `npm run test:web` exit 0. [evidence: `npm run test:web:svelte` and `npm run test:web:logic` both exit 0 — 66 files / 532 passed and 16 files / 188 passed]
- [x] **CHK-TEST-03** [P1] Backend suite green. [evidence: `npx vitest run` over the four real directories: 53 files, 392 tests, only the documented auth flake]
- [x] **CHK-TEST-04** [P1] No new test was added. [evidence: no test file appears in any batch diff; the verifier scope was `app-mobile/src` throughout]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] All 45 multi-line fence explanations are one line of reason. [evidence: `scan-comments.mjs` reports 3 remaining, down from 46; the three are named in `implementation-summary.md`]
- [x] **CHK-FIX-02** [P0] The flagged reference case is rewritten. [evidence: the fence reason in `artifact-viewer-host.svelte` is now one line and its marker is untouched]
- [x] **CHK-FIX-03** [P1] Comments that cost the reader nothing were deleted, not reworded. [evidence: `git diff --stat` on batch 3 shows 322 deletions against 317 insertions across comment lines]
- [x] **CHK-FIX-04** [P1] No commented-out code introduced or left. [evidence: `node scripts/naming/scan-comments.mjs` reports 0 commented-out code lines, down from the 5 SvelteKit template lines it used to skip]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] The diff is comment-only. [evidence: `node scripts/naming/verify-comment-only.mjs` reports 0 code changes across 27, 60 and 105 files]
- [x] **CHK-SEC-02** [P0] No comment carries an ephemeral artifact pointer. [evidence: `git diff -U0 | grep -cE "(ADR-|REQ-|CHK-|T[0-9]{3}|specs/)"` over every added line returns 0]
- [x] **CHK-SEC-03** [P1] No comment discloses a secret, token or host detail. [evidence: no secret, token or host detail appears in the added comments; every batch `git diff` was read]
- [x] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [evidence: `git status` shows `specs/context/` untracked and untouched]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P1] The house grammar is discoverable outside this packet. [evidence: the grammar is visible in the sectioned files themselves and enforced by `scripts/naming/scan-comments.mjs`; the durable prose statement is packet 019]
- [x] **CHK-DOC-02** [P2] The worked before-and-after survives somewhere durable. [evidence: the before-and-after table and the three instrument corrections are in `implementation-summary.md`]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P1] Batches commit atomically. [evidence: three commits, one per batch: `a11cd35`, `0f1df85`, `0a340ba`]
- [x] **CHK-ORG-02** [P2] No file was moved or renamed. [evidence: `git status` reports no rename in any batch; this packet edits files in place]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The honest risk is not that this packet breaks something. It is that it produces confident, wrong
explanations at scale, which a reader will trust more than the narration they replaced. That is why
the WHY pass is sampled against the code rather than reviewed as prose, and why the sample rate is
stated as a number rather than as an intention.
<!-- /ANCHOR:summary -->
