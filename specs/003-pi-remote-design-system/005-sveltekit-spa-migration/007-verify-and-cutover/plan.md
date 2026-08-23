---
title: "Child 007 plan — verification migration and cutover"
description: "How the cutover was made provable: the oracle strategy, the barrier model, why faithfulness verification is separate from a green suite, and the gate board that authorised the irreversible React deletion."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "003-pi-remote-design-system/005-sveltekit-spa-migration/007-verify-and-cutover"
    last_updated_at: "2026-08-23T09:10:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Cutover shipped; 007-EXT sectioning complete at 95 files."
    next_safe_action: "Close XB.3 styling wayfinding, then XE.1 hook enforcement."
    blockers: []
    completion_pct: 92
---

<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 007 plan — verification migration and cutover

---

<!-- ANCHOR:summary -->
## 1. SUMMARY

The migration's whole claim is "nothing rendered or behaved differently." That claim is worthless as
an assertion and only worth something as a *measurement*, so this child's real job is building the
instruments before performing the irreversible act.

Three workstreams reach green independently — CSS decomposition, test-migration parity, and the
page-centric reorg — and only then does the React runtime get deleted. The deletion is last and
gated on an explicit human go-ahead, because it is the one step with no cheap undo.
<!-- /ANCHOR:summary -->

---

<!-- ANCHOR:quality-gates -->
## 2. QUALITY GATES

| Gate | Result at cutover |
|---|---|
| `npm run build` | 0 |
| `npm run typecheck` (`svelte-check`) | 0 |
| `npm test` (backend, leak detector) | 365/366 — the known `auth.test.ts` timing flake |
| `npm run test:web` | 528 Svelte + 182 logic |
| token-identity, 3 themes | 0 / 0 / 0 |
| CSS corpus + contrast | 4,343 declarations reproduced · 77/77 pairs |
| `@ds guardrail:` fences | 277 present, floor is 76 |
| CDP 390px, both themes | pass, zero horizontal overflow |
| catalog smoke | 404 frames, 0 throws |
| `validate.sh --strict` | child and parent |

**One caveat that invalidates most historical readings of gate 9.** Invoked through the `.opencode`
symlink — the form the framework documents — `validate.sh` prints nothing and exits 0 even on a
failing packet. Only the realpath invocation runs the underlying node orchestrator. Any gate-9 result
recorded without that form should be treated as unmeasured.
<!-- /ANCHOR:quality-gates -->

---

<!-- ANCHOR:architecture -->
## 3. ARCHITECTURE

**The oracle strategy.** Every gate exists to answer a different question, and they were deliberately
chosen so that no single failure mode hides in all of them at once:

- *token-identity* resolves every custom property to its final value per theme and diffs against the
  pre-migration snapshot. It is blind to comments, whitespace and fence content — which is exactly why
  the 007-EXT comment work needed a separate per-file fence-text diff.
- *css-corpus-equivalence* is an independent, non-token check that all 4,343 declarations survived the
  decomposition. Two oracles disagreeing is informative; one oracle agreeing with itself is not.
- *CDP at 390px* is structural, against the built preview. It catches layout breakage that value-level
  checks cannot see.
- *the backend suite* is a leak detector. The relay and protocol are framework-independent, so if a
  Svelte rewrite reddens them, the change escaped its workspace.

**Why faithfulness verification is separate from a green suite.** A ported test suite can pass because
its assertions were weakened. This happened repeatedly and was caught each time by comparing `it`
counts, `expect` counts and call counts against the React oracle — `>=1` substituted for an exact
count, `mockRejectedValueOnce` widened to `mockRejectedValue`, `getAllByRole('radio')` filtered to hide
a failing element. Two of those masks were concealing genuine source regressions. A suite is evidence
only once someone has checked it still asks the original questions.

**What no gate could see.** The react-aria→Bits/Melt swap silently dropped a11y behaviour — AT-tree
hiding, focus traps, roles, dismissal. Token-identity, CDP and the backend suite are all structurally
incapable of noticing. That gap was closed by a dedicated audit plus four adversarial verifier groups,
not by adding another automated gate, because the failure is semantic rather than measurable.
<!-- /ANCHOR:architecture -->

---

<!-- ANCHOR:phases -->
## 4. IMPLEMENTATION PHASES

### Phase 1: Instruments and CSS decomposition — Done

Carve `app.css` out of the 7,932-line `style.css`, removing a rule only when every one of its
selectors is reproduced by a component's scoped `<style>`, and never splitting a grouped selector.
Stand up the token-identity gate and the corpus builder, and capture the baselines.

### Phase 2: Test-migration parity — Done

Port 31 React-rendering files and 317 behaviour tests, cluster by cluster, each one independently
verified for faithfulness before the next begins. Clusters are bounded so a masked assertion cannot
travel far before it is caught.

### Phase 3: Page-centric reorg — Done

Dissolve `lib/` into `pages/` and `shared/` by deterministic codemod — 191 files moved, 480 imports
rewritten — then re-verify the whole board from the new layout.

### Phase 4: Barrier and cutover — Done

Full nine-gate board, adversarial deep-review, explicit operator go-ahead, then the irreversible
delete of the React runtime.

### Phase 5: 007-EXT editability pass — Substantially done

Make the byte-identical app genuinely editable: section every file, complete the marker coverage,
rewrite the onboarding docs, add per-folder READMEs, land the `$shared` alias. Two items remain open
(XB.3 styling wayfinding, XE.1 hook enforcement).
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:testing -->
## 5. TESTING STRATEGY

Ports run cluster by cluster, never in one sweep, so a masked assertion is caught within a bounded
diff. Each cluster is checked three ways: the suite passes, the counts match the oracle, and a
separate reader confirms no assertion was softened.

Two categories of failure are accepted rather than fixed, and both are documented at the point of
skip. **jsdom limitations** — bits-ui focus-trap redirect and interact-outside dismissal cannot run
under jsdom, and the React oracle passed those tests vacuously for the same reason; the real behaviour
is covered by the CDP gate. **Known flakes** — `auth.test.ts` is timing-sensitive at baseline. Neither
is called a regression, and neither is used to justify weakening an assertion.

Harness-side adaptation is legitimate; source-side value guards are not. When
`@testing-library/svelte`'s `rerender` re-fires an unchanged prop where React's `renderHook` would
skip it, the absorption belongs in an equality-checked intermediate `$state` in the harness. Putting
that guard in the source would change the product to suit the test.
<!-- /ANCHOR:testing -->

---

<!-- ANCHOR:dependencies -->
## 6. DEPENDENCIES

- All prior layers, 001 through 006 — this is the final barrier.
- The pre-migration token snapshot from L0, without which nothing here is provable.
- The React tree itself, which stays in place as the live oracle until C5 deletes it.
<!-- /ANCHOR:dependencies -->

---

<!-- ANCHOR:rollback -->
## 7. ROLLBACK PLAN

Everything before C5 is ordinary `git revert` territory: no schema, no protocol, no persisted state
changes in this child.

C5 is the exception and the reason it is sequenced last. Deleting the React runtime — 60 `.tsx`
files, `style.css`, 53 oracle test files — removes the only independent reference for "what it used
to do." Recovery is still possible via `git checkout` of the parent commit, since nothing is
history-rewritten, but the *oracle* is gone: after C5 the token snapshot and the ported suite are the
only surviving record. That is why C5 required a fresh green board and an explicit human go-ahead
with screenshots shown, rather than a gate result alone.
<!-- /ANCHOR:rollback -->
