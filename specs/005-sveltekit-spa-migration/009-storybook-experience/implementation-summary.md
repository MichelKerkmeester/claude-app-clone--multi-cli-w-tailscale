---
title: "Child 009 implementation summary — Storybook experience"
description: "What turned the catalog from something that exists into something that stays complete, the decorator-order bug that passed two gates, and the one addon still missing."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/009-storybook-experience"
    last_updated_at: "2026-08-24T17:58:13.546Z"
    last_updated_by: "claude-opus-5"
    recent_action: "R4 story-upkeep rule live at v1.4.0.0; addon-vitest deferral recorded."
    next_safe_action: "None — the packet is complete with a documented deferral."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Child 009 implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `005-sveltekit-spa-migration` |
| Level | 3 |
| Status | Complete — addon-vitest deferred as a documented duplicate of catalog-smoke |
| Requirements shipped | REQ-001, REQ-003 … REQ-007; REQ-002 partial |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

**Coverage that cannot silently drop.** `scripts/story-coverage.mjs` fails when a renderable component
has no story, and `story-coverage-allowlist.json` holds the 22 legitimate exclusions, each with a
written reason. Coverage went to **74/74**. `npm run story:new` scaffolds a story, so complying is
cheaper than skipping.

**A launch a non-developer can use.** `npm run storybook` at the repo root, plus `STORYBOOK.md`, which
opens with how to see it rather than how to configure it.

**A render test that closes the smoke gate's blind spot.**
`app-mobile/tests/story-render.svelte.test.ts` uses `composeStories` to run Storybook's real decorator
pipeline and asserts identifiable roles are present, so a story that renders nothing now fails.

**Story typing repaired back to zero.** `svelte-check` had gone red on story files. Two recipes were
proven on single files before being applied: `const meta: Meta<typeof X>` together with
`type Story = StoryObj<typeof Component>` — not `typeof meta`, which breaks arg inference — and
`Object.freeze<TypeName>({…})` to contextually type a whole literal.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Gates and scripts by Claude; story authoring dispatched per surface. The typing repair was dispatched
only after the recipes were verified on single files, because an earlier round of unproven fixes made
the error count worse rather than better.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Exclusions must carry reasons.** An allowlist without them just relocates the silence the gate
exists to remove. "Compositional sub-part — no standalone render" is a decision a reviewer can
disagree with; a bare path is not. See ADR-001.

**A third instrument was added because a real bug passed the other two.** See ADR-002. Storybook's
`decorateStory` reduces the decorator array starting from the story, so the **last** decorator is the
**outermost** wrapper. Ordering a context provider and a story host as `[Provider, Host]` mounts the
host outside the provider; the context lookup returns its empty default; the component renders nothing
and throws nothing. Coverage passed, smoke passed, and the story showed an empty box.

**Visual regression was declined, and the reason recorded.** See ADR-003. Under the app's CSP a
headless render is unstyled, so a screenshot baseline captures a broken page — and the token-identity
resolver already proves value identity directly rather than inferring it from pixels.

**A component was allowlisted rather than forced into a story.** `PdfPage.svelte` needs a live
`PDFDocumentProxy` that only a CSF loader can supply, and Storybook's arg typing cannot express a
loader-injected required prop without a cast or a suppression — both banned here. Its rendering is
exercised through `PdfPreview`'s story instead.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| `node scripts/story-coverage.mjs` | 74/74, 22 allowlisted, exit 0 |
| Coverage gate negative control | fails on a component without a story; `story:new` fixes it |
| `npm run build-storybook -w @pi-remote/web` | exit 0 |
| `node scripts/catalog-smoke-cdp.mjs` | 0 throws, both themes |
| `npm run typecheck` | 0 errors, 1123 files |
| `story-render.svelte.test.ts` | pass — real decorator pipeline, role assertions |
| Backend and migration board | green |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

**`@storybook/addon-vitest` is not installed.** REQ-002 asked for the stories to run as interaction
tests through the Vitest browser provider. Three of the four addons are in place and the Chromatic
decision is recorded, but this one is outstanding and noted as planned in `STORYBOOK.md`. It is the
only open item in the packet.

**The render test protects the stories it names, not all of them.** It asserts roles for the
context-dependent surfaces, which is where the empty-render failure mode lives, but a new
context-dependent story added without a matching assertion is unprotected. The decorator-order rule is
documented, which is weaker than a check.

**The self-maintenance loop is only half wired.** The scaffold command exists, but the half of REQ-004
that instructs the executor to update a component's story whenever the component changes lives in the
`sk-code` surface — and that surface's refactor sits on an unmerged branch in 008. Until it merges, the
instruction is written but not in force.
<!-- /ANCHOR:limitations -->
