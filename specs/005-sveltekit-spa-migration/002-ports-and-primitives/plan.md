---
title: "Child 002 plan — verbatim ports and shared a11y primitives"
description: "Why the framework-agnostic TypeScript and the react-aria replacement were built in the same layer, how the pure-versus-runes split was established here as the reference pattern, and what the barrier had to prove."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "005-sveltekit-spa-migration/002-ports-and-primitives"
    last_updated_at: "2026-08-23T09:50:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 plan — verbatim ports and shared a11y primitives

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

Two bodies of work that share no files, so they run in parallel: the TypeScript that has zero React
imports and therefore ports by copying, and the shared a11y primitives that every later component
composes and that must therefore exist before any of them.

The interesting risk is asymmetric. The ports carry almost none — copied logic either compiles or does
not. The primitives carry nearly all of it, because they are where a framework swap can quietly change
behaviour that still looks correct.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| `svelte-check` across the new files | clean |
| Primitive smoke stories render, light and dark | pass, no throw |
| Claude diff review — no logic drift in the ports | pass |
| `npm run typecheck` | 0 |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**The pure-versus-runes split, established here as the reference.** Files like `runtime.ts` and
`commands.ts` hold two things: a pure reducer or derivation that is framework-agnostic, and a React
hook that wraps it. Only the second half needs rewriting. The pattern adopted here — a plain `.ts`
file holding the pure logic, and a sibling `*.svelte.ts` factory holding the runes wrapper — is what
every later child copies. It also means the pure half stays directly testable without a component.

**Why the primitives are thin wrappers, not reimplementations.** Bits UI supplies the behaviour;
these files supply the project's attribute contract. The CSS state selectors depend on specific
attribute names — `[data-pressed]`, `[aria-pressed]`, `[data-focus-visible]`, `[aria-selected]`,
`[aria-disabled]` — so the wrapper's job is to guarantee those survive, not to re-solve dialogs.

**Where this layer's real risk lives.** A primitive can render correctly, pass a smoke story and still
have dropped an accessibility behaviour that nothing visible depends on. That is exactly what
happened, and it is documented in the limitations rather than smoothed over: the smoke-story bar was
too low to catch it.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Verbatim `.ts` ports — Done

Copy `relay.ts`, `state.ts`, `cache.ts`, `auth.ts`, `effort.ts`, `demo.ts`, the pure halves of
`runtime.ts` and `commands.ts`, and both workers. Adjust import paths only; rewrite nothing.

### Phase 2: Shared a11y primitives — Done

`Button.svelte` plus thin Bits UI wrappers for Sheet, Menu, ToggleGroup, RadioGroup and Collapsible,
each preserving roles, focus behaviour and `aria-*` wiring.

### Phase 3: Barrier — Done

`svelte-check` clean, each primitive rendering a smoke story in both themes, and an independent diff
review confirming the ports did not drift.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

The ports are checked by diff, not by test. A verbatim copy's correctness question is "did anything
change", which a diff answers directly and a test only answers indirectly.

The primitives were checked by smoke stories asserting that each attribute the CSS state selectors
depend on is present. **This bar proved insufficient**, and saying so plainly matters more than the
gates it passed: a story that asserts `[data-pressed]` exists says nothing about whether focus is
trapped, whether the background is hidden from assistive technology, or whether dismissal works. The
full behavioural parity check arrived only in 007, and it found real losses.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 001 for the scaffold and for every dependency, including Bits UI — nothing is installed here.
- Nothing else. The ports and the primitives touch disjoint files, which is what makes them parallel.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Purely additive: new files beside the live React app, which is still the shipping runtime at this
layer. Nothing imports them yet, so reverting removes them with no downstream effect and no risk to
what users are running.
<!-- /ANCHOR:rollback -->
