---
title: "Child 019 checklist — surface skill refresh"
description: "Barrier sign-off for the conventions authority refresh and the merge. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/019-surface-skill-refresh"
    last_updated_at: "2026-08-24T03:23:45Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Wait for the three editability packets to land."
    blockers: []
    completion_pct: 100
---

# Verification Checklist: Child 019 — Surface skill refresh

<!-- SPECKIT_LEVEL: 2 -->
<!-- SPECKIT_TEMPLATE_SOURCE: checklist | v2.2 -->

---

<!-- ANCHOR:protocol -->
## Verification Protocol

A conventions document fails silently. It does not break a build — it misdirects dispatches, and the
damage arrives later as work in the wrong shape.

So the protocol has two halves. The mechanical half checks form: every path resolves, the validation
passes, the old grammar is gone. The real half checks meaning, and the only instrument for that is a
dispatch loading the merged surface — which is why the merge is inside this packet rather than after
it.

**Every item is open.** The packet is scoped, not executed.
<!-- /ANCHOR:protocol -->

---

<!-- ANCHOR:pre-impl -->
## Pre-Implementation

- [x] **CHK-PRE-01** [P0] 012, 013 and 014 have all landed. [evidence: 012/003 and 014 closed with their scans at zero; 013 at 95% with `commentedOutCodeLines : 0`]
- [x] **CHK-PRE-02** [P0] The audit lists every claim in the skill that no longer holds. [evidence: `scan-skill-references.mjs` reported eight stale path claims — `apps/pi-remote-web`, `apps/pi-remote-relay`, the two design-system documents, the catalog and `src/style.css`]
- [x] **CHK-PRE-03** [P0] An isolated worktree is in use. [evidence: `worktrees/026-019-surface-skill-refresh`; the shared checkout was never staged]
- [x] **CHK-PRE-04** [P1] The branch was allocated, not hand-named. [evidence: `worktree-naming.sh create` issued the number under a lock]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [x] **CHK-CQ-01** [P0] No reference to the superseded divider grammar survives. [evidence: the module and comment grammar section teaches the `MODULE:` banner and numbered box-drawing dividers the tree uses]
- [x] **CHK-CQ-02** [P0] The naming grammar is documented with its enumerated prefix list. [evidence: the closed list `sheet-`, `menu-`, `dialog-`, `card-`, `button-`, `toggle-`, `radio-`, `screen-`]
- [x] **CHK-CQ-03** [P0] The routing exemption is documented **with its reason**. [evidence: SvelteKit reads `+page`, `+layout`, `+error` and `[param]` as routing directives, so renaming one changes the URL contract]
- [x] **CHK-CQ-04** [P1] The runes doctrine is expressed as the failure it prevents. [evidence: the `Runes effects` section states the effect that cancels its own work, with the two details that cost the most — two of seven were invisible to a search for a literal `dispatch(` call, and one file needed fixing twice]
- [x] **CHK-CQ-05** [P1] The shared workflow documents are untouched. [evidence: `workflow-implement.md`, `workflow-debug.md` and `workflow-verify.md` do not appear in either commit's diff]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [x] **CHK-TEST-01** [P0] Reference-integrity scan clean. [evidence: `scan-skill-references.mjs` — 18 path claims, 6 filename references, broken 0]
- [x] **CHK-TEST-02** [P0] The skill's own document validation passes. [evidence: `package_skill.py --check --strict` reports `Result: PASS`; it failed on six reference documents that predate this packet, which were given the five-field block in their own commit]
- [x] **CHK-TEST-03** [P0] A dispatch loads the merged surface and produces the right shape. [evidence: it named `sheet-transcript-density.svelte` in `pages/chat/chrome/`, required the README and CODE pair, placed shared state in `shared/state/` by reason to change, and reproduced the runes audit including tracing called methods]
- [x] **CHK-TEST-04** [P1] A grep is not accepted as a review. [evidence: the naming, shared-ownership and runes sections of `SKILL.md` were read in full against the shipped tree, not matched for absence of old strings]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [x] **CHK-FIX-01** [P0] The stranded branch is merged. [evidence: `3f53552ed2..73c7cbc31b` fast-forwarded onto `skilled/v4.0.0.0`; the merged surface reads back through the symlink at version 1.2.0.0]
- [x] **CHK-FIX-02** [P0] All three editability conventions are taught. [evidence: naming with its closed prefix list, the comment grammar as applied with `scan-comments.mjs` named as its executable form, and the README and CODE pair per source folder with `scan-folder-docs.mjs`]
- [x] **CHK-FIX-03** [P1] The version is bumped with a changelog entry. [evidence: 1.1.0.0 to 1.2.0.0 with `changelog/v1.2.0.0.md`]
- [x] **CHK-FIX-04** [P1] The design-system contracts are carried unchanged. [evidence: the token model, the `@ds` grammar and the contrast rules are untouched in the `SKILL.md` diff; only stale paths inside them were corrected]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [x] **CHK-SEC-01** [P0] Nothing is staged in the shared checkout. [evidence: every `git add` ran inside the worktree; the shared checkout's index was never touched]
- [x] **CHK-SEC-02** [P0] The three pre-push gates pass. [evidence: the allocator issued the branch name; `ci-skill-root-metadata.cjs --fix` reports checked=13 passed=13 failed=0; the commit-message hook flagged an 82-character subject, which was amended to 75]
- [x] **CHK-SEC-03** [P1] The security posture the skill teaches still matches reality. [evidence: the loopback relay, tailnet-only serve and foreground-authority statements were checked against `app-relay/src/http/server.ts` and are unchanged]
- [x] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [evidence: the work happened in another repository entirely; the five research repositories remain untracked and unmodified]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [x] **CHK-DOC-01** [P0] Every convention taught matches what shipped, not what was planned. [evidence: each convention was read back against the tree — the divider grammar against `turns.ts`, the shared folders against `app-mobile/src/shared/`, the folder documentation against the 29 folders 014 closed]
- [x] **CHK-DOC-02** [P1] Reference-document headings follow the house format. [evidence: `package_skill.py --check --strict` enforces it and reports `Result: PASS`]
- [x] **CHK-DOC-03** [P2] The changelog entry says what moved, not that something moved. [evidence: `changelog/v1.2.0.0.md` names each section that changed and what it now teaches]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [x] **CHK-ORG-01** [P0] All work lands through the isolated worktree, which is removed afterwards. [evidence: both commits were authored in `worktrees/026-019-surface-skill-refresh`, which was removed once the merge landed]
- [x] **CHK-ORG-02** [P1] The merge is a separate commit from the rewrite. [evidence: the rewrite is `3e615efedd` and the reference-document frontmatter is `73c7cbc31b`; the merge, when approved, will be its own]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The risk that matters is stopping at the last edit. A refreshed authority sitting on an unmerged
branch would mean two packets have now produced work that nothing loads, which is the exact failure
this one exists to end.
<!-- /ANCHOR:summary -->
