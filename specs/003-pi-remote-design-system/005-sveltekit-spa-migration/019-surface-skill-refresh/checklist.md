---
title: "Child 019 checklist — surface skill refresh"
description: "Barrier sign-off for the conventions authority refresh and the merge. Every item is open: the packet is scoped and not started."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/019-surface-skill-refresh"
    last_updated_at: "2026-08-23T13:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Checklist authored; all items open pending execution."
    next_safe_action: "Wait for the three editability packets to land."
    blockers: []
    completion_pct: 0
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

- [ ] **CHK-PRE-01** [P0] 012, 013 and 014 have all landed. [deferred: pending execution — this packet describes their result; writing it earlier means writing it twice]
- [ ] **CHK-PRE-02** [P0] The audit lists every claim in the skill that no longer holds. [deferred: pending execution — detection, routing, standards, verification, checklists, onboarding]
- [ ] **CHK-PRE-03** [P0] An isolated worktree is in use. [deferred: pending execution — the shared checkout's index holds another session's staged files]
- [ ] **CHK-PRE-04** [P1] The branch was allocated, not hand-named. [deferred: pending execution — naming goes through the allocator under a lock]
<!-- /ANCHOR:pre-impl -->

---

<!-- ANCHOR:code-quality -->
## Code Quality

- [ ] **CHK-CQ-01** [P0] No reference to the superseded divider grammar survives. [deferred: pending execution — the specific reason the branch has never merged]
- [ ] **CHK-CQ-02** [P0] The naming grammar is documented with its enumerated prefix list. [deferred: pending execution — an open list degrades into taste within a few contributions]
- [ ] **CHK-CQ-03** [P0] The routing exemption is documented **with its reason**. [deferred: pending execution — an unexplained inconsistency invites a fix that changes a URL]
- [ ] **CHK-CQ-04** [P1] The runes doctrine is expressed as the failure it prevents. [deferred: pending execution — a rule without its failure gets optimised away by the next reader]
- [ ] **CHK-CQ-05** [P1] The shared workflow documents are untouched. [deferred: pending execution — symlinked into two surfaces that are not Svelte]
<!-- /ANCHOR:code-quality -->

---

<!-- ANCHOR:testing -->
## Testing

- [ ] **CHK-TEST-01** [P0] Reference-integrity scan clean. [deferred: pending execution — every path the skill names resolves in the shipped tree]
- [ ] **CHK-TEST-02** [P0] The skill's own document validation passes. [deferred: pending execution — including the house heading format its validator enforces]
- [ ] **CHK-TEST-03** [P0] A dispatch loads the merged surface and produces the right shape. [deferred: pending execution — the only check that tests meaning rather than form]
- [ ] **CHK-TEST-04** [P1] A grep is not accepted as a review. [deferred: pending execution — verbatim absence of old text does not prove the new text is correct]
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:fix-completeness -->
## Fix Completeness

- [ ] **CHK-FIX-01** [P0] The stranded branch is merged. [deferred: pending execution — until it merges, nothing loads either this work or the earlier refactor]
- [ ] **CHK-FIX-02** [P0] All three editability conventions are taught. [deferred: pending execution — naming, comments, folder documentation]
- [ ] **CHK-FIX-03** [P1] The version is bumped with a changelog entry. [deferred: pending execution — so a dispatch that loaded the old guidance can tell it moved]
- [ ] **CHK-FIX-04** [P1] The design-system contracts are carried unchanged. [deferred: pending execution — tokens, guardrail grammar and contrast are framework-agnostic]
<!-- /ANCHOR:fix-completeness -->

---

<!-- ANCHOR:security -->
## Security

- [ ] **CHK-SEC-01** [P0] Nothing is staged in the shared checkout. [deferred: pending execution — `git add` there would sweep another session's files into a commit]
- [ ] **CHK-SEC-02** [P0] The three pre-push gates pass. [deferred: pending execution — commit-message shape, branch naming, metadata manifest regeneration; each has failed a previous attempt]
- [ ] **CHK-SEC-03** [P1] The security posture the skill teaches still matches reality. [deferred: pending execution — a conventions file that misstates the trust boundary is worse than one that omits it]
- [ ] **CHK-SEC-04** [P1] Nothing under `specs/context/**` is touched. [deferred: pending execution — five read-only research repos live there]
<!-- /ANCHOR:security -->

---

<!-- ANCHOR:docs -->
## Documentation

- [ ] **CHK-DOC-01** [P0] Every convention taught matches what shipped, not what was planned. [deferred: pending execution — the packet exists because those two diverged before]
- [ ] **CHK-DOC-02** [P1] Reference-document headings follow the house format. [deferred: pending execution — the skill's own validation enforces it]
- [ ] **CHK-DOC-03** [P2] The changelog entry says what moved, not that something moved. [deferred: pending execution — a reader needs the delta, not the fact of a delta]
<!-- /ANCHOR:docs -->

---

<!-- ANCHOR:file-org -->
## File Organization

- [ ] **CHK-ORG-01** [P0] All work lands through the isolated worktree, which is removed afterwards. [deferred: pending execution — the same discipline the earlier refactor used successfully]
- [ ] **CHK-ORG-02** [P1] The merge is a separate commit from the rewrite. [deferred: pending execution — they revert independently and for different reasons]
<!-- /ANCHOR:file-org -->

---

<!-- ANCHOR:summary -->
## Verification Summary

Not yet verified — the packet is scoped, not executed.

The risk that matters is stopping at the last edit. A refreshed authority sitting on an unmerged
branch would mean two packets have now produced work that nothing loads, which is the exact failure
this one exists to end.
<!-- /ANCHOR:summary -->
