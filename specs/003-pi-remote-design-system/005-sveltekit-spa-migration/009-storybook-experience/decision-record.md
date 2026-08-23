---
title: "Child 009 decision record — Storybook experience"
description: "The three decisions that shape the catalog's durability: a reasoned allowlist, a render test that closes the smoke gate's blind spot, and declining visual regression."
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

# Decision Record: Child 009 — Storybook experience

<!-- SPECKIT_LEVEL: 3 -->
<!-- SPECKIT_TEMPLATE_SOURCE: decision-record | v2.2 -->

---

<!-- ANCHOR:adr-001 -->
## ADR-001: Coverage is enforced by a gate with a reasoned allowlist

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-22 |
| **Deciders** | Claude, operator |

---

<!-- ANCHOR:adr-001-context -->
### Context

006 produced a catalog; nothing kept it complete. A catalog decays by default — someone adds a
component, does not add a story, and coverage drops with no signal. Six months later the catalog
describes an app that no longer exists, and nobody trusts it enough to use it.

### Constraints

- Some components genuinely cannot have a standalone story: compositional sub-parts, context
  providers that render no visual of their own, and one component whose required prop is
  loader-injected.
- The codebase bans casts and type suppressions, so "just add a story" is not always available.
<!-- /ANCHOR:adr-001-context -->

---

<!-- ANCHOR:adr-001-decision -->
### Decision

**We chose**: an enforcing coverage gate whose allowlist requires a written reason per entry.

**How it works**: `scripts/story-coverage.mjs` walks the renderable components, subtracts the
allowlist and fails if anything is left. `scripts/story-coverage-allowlist.json` holds each exclusion
with its reason, so an exclusion is a decision somebody wrote down rather than an absence nobody
noticed. Coverage stands at 74/74 with 22 allowlisted.
<!-- /ANCHOR:adr-001-decision -->

---

<!-- ANCHOR:adr-001-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Enforcing gate with reasoned allowlist** | Decay becomes a build failure; exclusions stay legible | Needs an allowlist maintained alongside the code | 9/10 |
| Reporting only, as in 006 | Zero friction | Reports nobody reads; coverage silently drops | 3/10 |
| Hard rule with no exclusions | Simplest possible rule | Forces casts and suppressions the codebase bans, or fake stories | 2/10 |

**Why this one**: the failure mode is silent drift, so the fix has to be something that fails loudly.
An allowlist without reasons would just relocate the silence.
<!-- /ANCHOR:adr-001-alternatives -->

---

<!-- ANCHOR:adr-001-consequences -->
### Consequences

**What improves**:
- Coverage moved from partial to 74/74 and cannot regress unnoticed.
- Every one of the 22 exclusions carries a stated reason.

**What it costs**:
- The allowlist needs updating when a component's situation changes. Mitigation: the gate names the
  offending path, so the update is mechanical.

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| The allowlist becomes a dumping ground for anything inconvenient | M | Reasons are mandatory and reviewed in the diff; a reason like "hard to test" would not survive review |
| A story exists but is empty, so the gate passes on nothing | H | ADR-002 — the render test |
<!-- /ANCHOR:adr-001-consequences -->

---

<!-- ANCHOR:adr-001-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | 006 left coverage unenforced and it was already incomplete |
| 2 | **Beyond Local Maxima?** | PASS | Reporting-only and no-exclusions rules both considered and rejected |
| 3 | **Sufficient?** | PASS | One script plus one JSON file; no framework |
| 4 | **Fits Goal?** | PASS | The catalog is the designer-editability deliverable; a stale catalog fails the goal |
| 5 | **Open Horizons?** | PASS | The gate is framework-agnostic — it walks files, not Storybook internals |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-001-five-checks -->

---

<!-- ANCHOR:adr-001-impl -->
### Implementation

**What changes**:
- `scripts/story-coverage.mjs` — the gate.
- `scripts/story-coverage-allowlist.json` — 22 reasoned entries.
- `scripts/new-story.mjs` — the scaffold that makes compliance cheaper than skipping.

**How to roll back**: delete the three scripts and remove the `story:coverage` and `story:new` entries
from the root `package.json`. Nothing else references them, and no app code changes.
<!-- /ANCHOR:adr-001-impl -->
<!-- /ANCHOR:adr-001 -->

---

<!-- ANCHOR:adr-002 -->
## ADR-002: A render test closes the smoke gate's empty-frame blind spot

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-22 |
| **Deciders** | Claude |

---

<!-- ANCHOR:adr-002-context -->
### Context

`catalog-smoke-cdp.mjs` fails on a thrown exception or a console error and treats an empty frame as a
pass — by design. That leaves a real defect invisible: a story that renders *nothing* is green.

The defect was not hypothetical. Storybook's `decorateStory` reduces the decorator array starting from
the story, so the **last** decorator is the **outermost** wrapper. Ordering a context provider and a
story host as `[Provider, Host]` mounts the host outside the provider; the context lookup returns its
empty default; the component renders nothing and throws nothing. Both the coverage gate and the smoke
gate passed on it.

### Constraints

- The check must exercise Storybook's real decorator pipeline, not a reimplementation of it, or it
  proves nothing about the actual stories.
- `@storybook/svelte` ships raw `.svelte` internals, so it must be inlined in the vitest config.
<!-- /ANCHOR:adr-002-context -->

---

<!-- ANCHOR:adr-002-decision -->
### Decision

**We chose**: a vitest test that composes the real stories and asserts specific roles are present.

**How it works**: `story-render.svelte.test.ts` uses `composeStories` from `@storybook/svelte`, so the
actual decorator pipeline runs, then asserts identifiable roles — the rail's `role="list"` named
`/draft photos/i`, and the dialog's `role="dialog"`. An empty render fails on a missing role.
<!-- /ANCHOR:adr-002-decision -->

---

<!-- ANCHOR:adr-002-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **`composeStories` render test** | Runs the real pipeline; fails on empty | Needs `@storybook/svelte` inlined in the vitest config | 9/10 |
| Make the smoke gate fail on empty frames | One instrument instead of two | Many stories legitimately render little; a pixel threshold is arbitrary and flaky | 4/10 |
| Screenshot comparison | Catches visual drift too | Under CSP a headless render is unstyled, so the baseline would be a broken page | 1/10 |

**Why this one**: it asserts something specific and true about each story rather than measuring how
much was painted.
<!-- /ANCHOR:adr-002-alternatives -->

---

<!-- ANCHOR:adr-002-consequences -->
### Consequences

**What improves**:
- A silently-empty story now fails a gate rather than passing three of them.
- The decorator-order rule is captured in an executable check, not just a comment.

**What it costs**:
- Only the stories the test names are protected. Mitigation: the named ones are the context-dependent
  surfaces, which is where the failure mode lives.

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| New context-dependent stories are added without a matching assertion | M | The decorator rule is documented in the story host and in `svelte-conventions.md` |
| `@storybook/svelte` internals change and break the inline config | L | The failure is loud at test time, not silent |
<!-- /ANCHOR:adr-002-consequences -->

---

<!-- ANCHOR:adr-002-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | A real bug passed both existing gates |
| 2 | **Beyond Local Maxima?** | PASS | Empty-frame thresholds and screenshots both considered |
| 3 | **Sufficient?** | PASS | One test file, no new tooling |
| 4 | **Fits Goal?** | PASS | A catalog that shows nothing fails the editability goal silently |
| 5 | **Open Horizons?** | PASS | `composeStories` is Storybook's own supported API |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-002-five-checks -->

---

<!-- ANCHOR:adr-002-impl -->
### Implementation

**What changes**:
- `app-mobile/tests/story-render.svelte.test.ts` — the test.
- `vitest.web.svelte.config.ts` — `@storybook/svelte` added to `server.deps.inline`, for the same
  reason bits-ui is: it ships raw `.svelte` internals.

**How to roll back**: delete the test file and remove the inline entry. No app code is involved.
<!-- /ANCHOR:adr-002-impl -->
<!-- /ANCHOR:adr-002 -->

---

<!-- ANCHOR:adr-003 -->
## ADR-003: Visual regression via Chromatic is declined

### Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-22 |
| **Deciders** | Claude, operator |

---

<!-- ANCHOR:adr-003-context -->
### Context

Storybook's usual companion is a hosted visual-regression service. The spec asked for the Chromatic
decision to be *recorded* rather than assumed either way.

### Constraints

- The app renders unstyled in a headless browser under its own CSP, so a naive screenshot baseline
  captures a broken page.
- The program already has a stricter instrument for the thing visual regression would protect: the
  token-identity resolver, which resolves every custom property and diffs against a frozen snapshot.
<!-- /ANCHOR:adr-003-context -->

---

<!-- ANCHOR:adr-003-decision -->
### Decision

**We chose**: decline Chromatic, and record the reason in `STORYBOOK.md` so it does not resurface as
an open question.

**How it works**: value-level regression is covered by `token-identity.mjs` at 0 diffs across three
themes; structural regression by the CDP gate at 390px in both themes; render regression by the smoke
gate and ADR-002's test.
<!-- /ANCHOR:adr-003-decision -->

---

<!-- ANCHOR:adr-003-alternatives -->
### Alternatives Considered

| Option | Pros | Cons | Score |
|--------|------|------|-------|
| **Decline, rely on token-identity plus CDP** | Stricter than pixels; already built and green | No coverage of purely visual drift that preserves token values | 8/10 |
| Adopt Chromatic | Catches genuine visual drift | External service and cost; CSP makes headless baselines unreliable | 4/10 |
| Local screenshot baselines | No external service | Same CSP problem, plus baseline churn on every font or platform difference | 2/10 |

**Why this one**: the resolver proves value identity directly rather than inferring it from pixels,
and it cannot be defeated by the CSP rendering problem.
<!-- /ANCHOR:adr-003-alternatives -->

---

<!-- ANCHOR:adr-003-consequences -->
### Consequences

**What improves**:
- No external dependency or recurring cost.
- The regression story stays browser-free and therefore fast and deterministic.

**What it costs**:
- Purely visual drift that preserves every token value would go unnoticed. Mitigation: the migration's
  invariant is that no rendered value changes at all, so such a drift would itself be a violation
  caught elsewhere.

**Risks**:

| Risk | Impact | Mitigation |
|------|--------|------------|
| A future redesign phase genuinely needs visual diffing | M | The decision is recorded, not baked in; revisit when a packet actually changes rendered values |
<!-- /ANCHOR:adr-003-consequences -->

---

<!-- ANCHOR:adr-003-five-checks -->
### Five Checks Evaluation

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | **Necessary?** | PASS | The spec required the decision to be recorded either way |
| 2 | **Beyond Local Maxima?** | PASS | Hosted and local screenshot options both considered |
| 3 | **Sufficient?** | PASS | Existing gates already cover value and structural regression |
| 4 | **Fits Goal?** | PASS | The goal forbids rendered-value change; the resolver proves that directly |
| 5 | **Open Horizons?** | PASS | Recorded as a decision to revisit, not a permanent ban |

**Checks Summary**: 5/5 PASS
<!-- /ANCHOR:adr-003-five-checks -->

---

<!-- ANCHOR:adr-003-impl -->
### Implementation

**What changes**:
- `STORYBOOK.md` records the decision and its reasoning alongside the addon list.

**How to roll back**: adopting Chromatic later needs an account, a CI token and a baseline run; no
code here blocks it.
<!-- /ANCHOR:adr-003-impl -->
<!-- /ANCHOR:adr-003 -->
