---
title: "Child 009 plan — Storybook experience"
description: "How the catalog was turned from a thing that exists into a thing that stays complete: an enforcing coverage gate, a scaffold command, and a render test that closes the smoke gate's blind spot."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/009-storybook-experience"
    last_updated_at: "2026-08-23T11:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed; coverage at 74/74."
    next_safe_action: "Install addon-vitest to close REQ-002."
    blockers: []
    completion_pct: 90
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 009 plan — Storybook experience

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

006 built a catalog. This child makes it **stay** built.

A catalog decays by default: someone adds a component, does not add a story, and coverage silently
drops. The fix is not discipline, it is enforcement — a gate that fails when a renderable component
has no story, and a scaffold command that makes complying cheaper than skipping.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result |
|---|---|
| Story coverage | 74/74 renderable components, 22 allowlisted with reasons |
| `build-storybook` | exit 0 |
| Catalog smoke, both themes | 0 throws |
| `svelte-check` | 0 errors, 1123 files |
| Story-render test — real decorator pipeline | pass |
| Backend and migration board | green |
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**The coverage gate has an allowlist, and the allowlist requires reasons.** Every renderable component
must have a story or an entry naming why it does not. That turns each exclusion into a decision
somebody wrote down — "compositional sub-part, no standalone render", "context provider, renders no
visual of its own" — rather than an absence nobody notices. 22 entries carry reasons today.

**One command, and it is the root command.** `npm run storybook` at the repo root delegates into the
web workspace. A non-technical user should not have to know which workspace a tool lives in.

**The render test closes the smoke gate's blind spot.** `catalog-smoke-cdp.mjs` treats an empty frame
as a pass by design, so a story that renders nothing is green. `story-render.svelte.test.ts` uses
`composeStories` to run Storybook's *real* decorator pipeline and asserts specific roles are present —
which is what catches a decorator-ordering mistake.

**Decorator order is the trap this child had to learn.** `decorateStory` reduces the decorator array
starting from the story, so the **last** decorator is the **outermost** wrapper. Ordering a provider
and a host as `[Provider, Host]` mounts the host outside the provider, the context lookup returns its
empty default, and the story renders nothing — without throwing. Both gates were green on exactly that
bug before the render test existed.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Launch and addons — Done

Root `storybook` script, the a11y, themes and designs addons, autodocs via per-story tags, and
`STORYBOOK.md` as the plain-language quickstart.

### Phase 2: Coverage to complete — Done

Author the missing stories and stand up the enforcing gate with its reasoned allowlist. Coverage
reached 74/74.

### Phase 3: Self-maintenance — Done

`npm run story:new` scaffolds a story for a component.

### Phase 4: Close the render blind spot — Done

`story-render.svelte.test.ts`, after reproducing a silently-empty story caused by decorator ordering.

### Phase 5: addon-vitest — Open

Running the stories as interaction tests through the Vitest browser provider. Not installed.
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Three instruments with deliberately different reach. The **coverage gate** answers "does every
component have a story", and its negative control is real — adding a component without a story makes
it fail. The **catalog smoke** answers "does every story render without throwing", in both themes. The
**render test** answers "does the story actually produce the component", which neither of the others
can, because a blank frame throws nothing.

Adding the third was not optional once the decorator-ordering bug was found: it had passed both other
gates. A gate that cannot fail on a real defect is not evidence.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- 006 for the catalog itself and the smoke gate.
- 007-EXT's React-completion, which unblocked this child by removing the dead React halves.
- The page-centric layout from 007, since stories are co-located with their components.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Gates, scripts, stories and one test file — all outside the shipped bundle. Reverting removes
enforcement and returns the catalog to 006's state without touching the app.

The one thing to preserve on any revert is the allowlist's reasons. They are decisions, and
re-deriving them costs more than the file.
<!-- /ANCHOR:rollback -->

---

<!-- ANCHOR:dependency-graph -->
## 8. DEPENDENCY GRAPH

```
007 cutover ──┐
              ├─→ page-centric layout ──→ stories co-located
007-EXT X0.2 ─┘   (React removed)         │
                                          ├─→ coverage gate ──→ 74/74 enforced
                                          │        │
                                          │        └──→ story:new scaffold
                                          │
                                          └─→ catalog smoke (from 006)
                                                   │
                                                   └──→ render test (closes empty-frame gap)

008 sk-code surface ──✗ unmerged ──→ REQ-004's executor instruction (written, not in force)
```

The one broken edge is deliberate and tracked: the executor-instruction half of REQ-004 lives in the
`sk-code` surface, which sits on 008's unmerged branch.
<!-- /ANCHOR:dependency-graph -->

---

<!-- ANCHOR:critical-path -->
## 9. CRITICAL PATH

007-EXT's React removal → stories authored to complete coverage → the coverage gate → the render test.

Everything else is off the path. The addons, `STORYBOOK.md` and the scaffold could each have landed in
any order; the gate could not exist before coverage was complete, since a gate that fails on day one
gets disabled rather than satisfied. The render test had to come last, because its reason for existing
was a bug the earlier instruments could not see.
<!-- /ANCHOR:critical-path -->

---

<!-- ANCHOR:milestones -->
## 10. MILESTONES

| Milestone | Definition of done | State |
|---|---|---|
| M1 — Launchable | `npm run storybook` works from the repo root; `STORYBOOK.md` exists | Done |
| M2 — Complete | Coverage reaches 74/74 with every exclusion reasoned | Done |
| M3 — Enforced | The gate fails on a component without a story; the scaffold fixes it | Done |
| M4 — Honest | A story that renders nothing fails a gate | Done |
| M5 — Tested | Stories run as interaction tests via `@storybook/addon-vitest` | Open |
<!-- /ANCHOR:milestones -->
