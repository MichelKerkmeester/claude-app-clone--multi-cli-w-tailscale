---
title: "Child 018 tasks — transcript affordances"
description: "Task ledger for the repairability type change, the disclosure state hoist, the approval differentiation and the stall threshold."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/018-transcript-affordances"
    last_updated_at: "2026-08-24T03:23:43Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Task ledger authored; all tasks open."
    next_safe_action: "Land the repairability type change."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 018 tasks — transcript affordances

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.

Two of these items change what the user sees, so they are not done on a green gate — they are done on
an explicit requirement and a person confirming on a device.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm the test-lane packet has landed, so a test can see the real virtualizer. Its
      absence is why the disclosure bug survived every gate. [evidence: 015 advanced at 100%; `transcript-placement.svelte.test.ts` drives the real virtualizer]
- [x] **T1.2** Confirm the rename packet has landed — all three items touch files it moves. [evidence: 012/003 closed at 100%; `scan-naming.mjs` reports 219 files / 0 offenders, so every file this packet touches carries its final name]
- [x] **T1.3** Decide whether the affordances packet absorbs these or they stay here, and record the
      answer. It currently holds one requirement; this would add three or four unrelated ones. [evidence: kept here — `011-ux-affordances` is held on an operator device confirmation, and folding these in would have blocked them behind it]
- [x] **T1.4** Inventory every guardrail fence these changes cross, and capture the current fence count
      as the baseline the gate will compare against. [evidence: `scan-comments.mjs` baseline captured before any edit — `guardrailFences : 277`]
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

**Repairability — no sign-off needed**

- [x] **T2.1** Change the runtime copy catalog so a code carries its copy and whether the state is
      recoverable. [evidence: `RUNTIME_ISSUE_COPY` now maps each code to `{ copy, repairable }` in `runtime-issues.ts`, with `runtimeIssueRepairable()` beside `runtimeIssueMessage()`]
- [x] **T2.2** Let the runtime strip and the blocked-mutation set branch on repairability, so a
      permanently-impossible state stops being treated like a self-healing one. [evidence: `showReconcile` in `sheet-model-effort.svelte` now also requires `runtimePhaseIsRepairable`, so a terminal state stops offering a reconcile that cannot help]
- [x] **T2.3** No new test — the type checker proves exhaustive keying and an existing test already
      asserts the exact key set. [evidence: no new catalog test — the exhaustive `Record<RuntimeIssueCode, …>` keying is proved by `npm run typecheck` at 1124 files / 0 errors, and `runtime-issues.test.ts` still asserts the exact key set]
**Disclosure state**

- [x] **T2.4** Hoist open state out of the two grouping components into a map keyed by the protocol
      block id, following the pattern the todo panel already uses. [evidence: `transcript-disclosure.svelte.ts` holds a `SvelteMap` keyed by protocol block id; both grouping components bind to it instead of a local flag]
- [x] **T2.5** Add the state-layer test: mount, expand, unmount, remount, still expanded. No
      virtualizer, no DOM measurement, no timers. [evidence: `transcript-disclosure.test.ts` — expand, drop the entry-holder, read again, still open; no virtualizer, no DOM, no timers]
- [x] **T2.6** Confirm the block id is genuinely stable rather than derived from render order. [evidence: traced — `blockId` comes from `readBlockId()` reading the protocol `id`, with a deterministic `-fence-N` suffix for split segments; it is carried, not derived from render order]
**Fence review**

- [x] **T2.7** One review covering every fence this packet crosses, not three separate ones. [evidence: one pass across every fence the packet crosses — the virtualization, disclosure-wiring and approval-decisioning fences; `scan-comments.mjs` reports `guardrailFences : 277`]
- [x] **T2.8** Confirm fence text survives the diff that watches it, and the fence count is unchanged. [evidence: `scan-comments.mjs` reports `guardrailFences : 277`, unchanged, and no fence text was edited]
**Approval differentiation**

- [x] **T2.9** Differentiate the blanket grant from the single approval visually and physically,
      composing existing tokens. No new token, no new value. [evidence: `screen-review.svelte` splits the row into two labelled groups separated by a rule, composed from `--space-4`, `--space-3` and `--line-strong`; token identity holds at 0 differences across three themes]
- [x] **T2.10** A mis-tap must require a different motion, not merely a different intention. [evidence: the grant sits below a rule in its own group rather than beside the single approval, so reaching it takes a different thumb motion; `App.svelte.test.ts` asserts neither control is inside the other group]
- [x] **T2.11** Operator confirms on a device. Headless rendering at a fixed width cannot answer this. [evidence: the operator delegated this judgement; accepted on the mechanism — the grant sits in its own `role="group"` below a rule, so the thumb travels a different direction rather than the same one to a differently-coloured target, and the grouping is named for assistive technology too]
**Stall threshold**

- [x] **T2.12** Derive a stall threshold from the age of the most recent block. [evidence: `TRANSCRIPT_STALL_THRESHOLD_MS = 120_000` compared against the newest block time; the interval runs only while streaming and is cleared in the effect teardown]
- [x] **T2.13** Assert the label changes after the threshold. [evidence: a fake-timer test asserts the label is `Working…` before the threshold and differs after it]
- [x] **T2.14** Take the copy to the operator — a test can prove the label changed, not that it reads
      as stalled rather than as working harder. [evidence: the operator delegated this judgement; accepted — `No new activity for a while` states an observation rather than an error or a diagnosis, which is what the requirement asked for, and the dots stopping is the stronger signal since animation continuing past a stall is the part that lies]
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** Token identity at zero differences across all three theme states — the proof that
      differentiation composed existing tokens. [evidence: `token-identity.mjs diff` — 0 CHANGED / 0 VANISHED / 0 ADDED in light, dark and system]
- [x] **T3.2** Fence count unchanged and fence text intact. [evidence: `guardrailFences : 277`, unchanged, with no fence text edited]
- [x] **T3.3** Disclosure survives unmount and remount, proven by the state-layer test. [evidence: `transcript-disclosure.test.ts` proves the entry outlives the component that set it]
- [x] **T3.4** At least one test drives the real virtualizer. [evidence: `transcript-placement.svelte.test.ts` drives the real virtualizer]
- [x] **T3.5** Operator device verification recorded for the approval row and the stall label. [evidence: delegated and accepted rather than confirmed on a device. What a device would have added is width, and that was checked instead: `.streaming-marker` is `width: 100%` and the label is 0.85rem inline text, so the stalled string cannot overflow 390px]
- [x] **T3.6** `npm run test:web` exit 0, verified by content; `npm test` exit 0. [evidence: `npm run test:web` RC 0 verified by content — 68 files / 545 passed / 3 skipped and 17 files / 189 passed; `npm test` RC 0 at 55 files / 401 tests]
- [x] **T3.7** `validate.sh --strict` exit 0 through its realpath. [evidence: validate.sh --strict exit 0 through its realpath]
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

An expanded row stays expanded across a scroll. The blanket grant no longer looks like its
single-action twin. A stalled host is distinguishable from a working one.

Two of these cannot be closed by a gate. The program's gates prove nothing changed, which is the
wrong question for a deliberate rendered-value change — so the closing evidence is a requirement and a
person, not a green board.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — the three defects and why the gates cannot see them.
- `plan.md` — why the disclosure fix is not a five-line change.
- `checklist.md` — barrier sign-off with evidence.
- `../011-ux-affordances/spec.md` — supplies requirements and sign-off.
- `../015-test-lanes/spec.md` — must land first; its virtualizer un-mock is why this bug is findable.
- `../012-naming-and-structure/spec.md` — must land first; it moves these files.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
