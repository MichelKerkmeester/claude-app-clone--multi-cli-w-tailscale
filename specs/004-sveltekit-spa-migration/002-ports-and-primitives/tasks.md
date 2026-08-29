---
title: "Child 002 tasks — verbatim ports and shared a11y primitives"
description: "Task ledger for the framework-agnostic TypeScript ports and the Bits UI primitive layer."
trigger_phrases:
  - "ports and primitives task ledger"
  - "ports and primitives packet"
  - "task ledger"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/002-ports-and-primitives"
    last_updated_at: "2026-08-23T09:50:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 tasks — verbatim ports and shared a11y primitives

---

<!-- ANCHOR:notation -->
## TASK NOTATION

`[x]` complete · `[ ]` open · `[~]` deferred or superseded with a stated reason.
Written by the executor in parallel disjoint units; verified independently by Claude. Evidence is the
current on-disk state, which every later child depends on.
<!-- /ANCHOR:notation -->

---

<!-- ANCHOR:phase-1 -->
## PHASE 1: SETUP

- [x] **T1.1** Confirm the L0 barrier is green before dispatching, since parallel units on one
      worktree are only safe once the shared foundation is fixed.
- [x] **T1.2** Partition the work into disjoint file sets so no two parallel units can touch the same
      file. The ports and the primitives share nothing.
- [x] **T1.3** Enumerate the attribute contract the CSS state selectors depend on, so the primitives
      have a concrete target rather than "match react-aria".
<!-- /ANCHOR:phase-1 -->

---

<!-- ANCHOR:phase-2 -->
## PHASE 2: IMPLEMENTATION

### Verbatim `.ts` ports

- [x] **T2.1** `relay.ts` — the WebSocket client, ported whole. `openSyncSocket` survives at
      `shared/data/relay.ts:1612`, alongside the ticket, attachment and transcript surfaces.
- [x] **T2.2** `state.ts` — the pure reducers. Three live here: `connectionReducer`,
      `sessionListReducer` and `transcriptReducer`. The fourth, `runtimeReducer`, stays in
      `runtime.ts:188` where it belongs with its own types.
- [x] **T2.3** `cache.ts`, `auth.ts`, `effort.ts` and `demo.ts` ported with import-path edits only.
- [x] **T2.4** Pure halves of `runtime.ts` and `commands.ts` kept as plain `.ts`; their React hook
      halves were left behind for later removal rather than rewritten here.
- [x] **T2.5** Both workers ported verbatim — `highlight.worker.ts` and `attachment-hash.worker.ts`.
- [x] **T2.6** Establish the runes-split reference pattern: a plain `.ts` file for pure logic and a
      sibling `*.svelte.ts` factory for the runes wrapper. Five factories now follow it —
      `app-state`, `hostCommandCatalog`, `useRuntime`, `useSyncSocket`, `useVisualViewportAnchor`.

### Shared a11y primitives

- [x] **T2.7** `Button.svelte` — `onPress` becomes `onclick`, and the `data-*` and `aria-*` attribute
      contract the CSS depends on is preserved.
- [x] **T2.8** `Sheet` on Bits UI Dialog, split into `Sheet`, `SheetContent`, `SheetTitle` and
      `SheetClose` so consumers compose rather than pass slots through one wrapper.
- [x] **T2.9** `Menu` on Bits UI DropdownMenu, split into `Menu`, `MenuTrigger`, `MenuContent` and
      `MenuItem`.
- [x] **T2.10** `ToggleGroup` and `ToggleGroupItem`.
- [x] **T2.11** `RadioGroup` and `RadioGroupItem`.
- [x] **T2.12** `Collapsible`.
- [~] **T2.13** `Switch` was **not** built as a shared primitive. The one consumer, the push toggle,
      hand-rolls `role="switch"` in `pages/home/PushSettings.svelte:79`. A single-consumer wrapper
      would have been an abstraction with nothing to abstract over.
- [x] **T2.14** `interactions.ts` — the shared `use:` actions carrying hover, press and focus-visible
      state, which is what keeps the `[data-hovered]` and `[data-focus-visible]` selectors working
      after the react-aria swap.
<!-- /ANCHOR:phase-2 -->

---

<!-- ANCHOR:phase-3 -->
## PHASE 3: VERIFICATION

- [x] **T3.1** `svelte-check` clean across every new file.
- [x] **T3.2** Each primitive renders a smoke story in the catalog, light and dark, without throwing.
- [x] **T3.3** Independent diff review by Claude confirms no logic drift in the ports — the ports are
      verified by diff rather than by test, because "did anything change" is a diff question.
- [x] **T3.4** Attribute contract asserted per primitive: `[data-pressed]`, `[aria-pressed]`,
      `[data-focus-visible]`, `[aria-selected]`, `[aria-disabled]`.
- [~] **T3.5** Full behavioural a11y parity was **not** verified at this layer. The smoke-story bar
      checks attribute presence, not focus trapping, background hiding or dismissal. The gap was
      found and closed in 007 — see `../007-verify-and-cutover/a11y-parity-findings.md`.
<!-- /ANCHOR:phase-3 -->

---

<!-- ANCHOR:completion -->
## COMPLETION CRITERIA

The barrier passed and the layer shipped: every later component composes these primitives and imports
these ports, which is the strongest available evidence they work.

One requirement was only partly met at the time. REQ-002 asks each primitive to expose the same a11y
surface its react-aria counterpart did; the verification actually performed checked attributes, not
behaviour, and 007 later found real losses behind that gap. The requirement is satisfied **as of
007**, not as of this child.
<!-- /ANCHOR:completion -->

---

<!-- ANCHOR:cross-refs -->
## CROSS-REFERENCES

- `spec.md` — scope, requirements and the barrier definition.
- `plan.md` — the pure-versus-runes split and where the real risk sat.
- `checklist.md` — sign-off with evidence.
- `implementation-summary.md` — what shipped and what the smoke bar missed.
- `../007-verify-and-cutover/a11y-parity-findings.md` — the parity gap and its resolution.
- Program goal: `../goal.md`.
<!-- /ANCHOR:cross-refs -->
