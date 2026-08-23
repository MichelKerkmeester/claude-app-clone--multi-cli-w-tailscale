---
title: "AI Council round 2 critique — attacks on the Round 1 plan"
description: "The adversarial pass over Round 1's candidate set: each attack, the evidence, whether it landed, and whether the finding blocks convergence."
trigger_phrases:
  - "council round 2 critique"
importance_tier: "supporting"
contextType: "research"
---

# Round 2 critique

## Prior-round plan under attack

Round 1 produced seventeen candidates: three conformance defects (approval routes ungated,
projection sequence desync, un-rotated epoch), a missing heartbeat, two client transport detectors,
five UX items, a risk classifier, an envelope re-taxonomy, a lint rule, and four hygiene items.

## Critique prompts issued

To seat-004: which items would you decline outright *because the failure cannot occur here*; which
survive at lower priority; which collide with 012's whole-tree rename; which add permanent
maintenance surface; make the strongest case against the two biggest asks; and which single item
would you ship if only one were approved.

To seat-005: for each item, what exact assertion would a test make, does that test exist, which file
does it belong in, is any of the nine gates able to see it fail, and where is the test harder than
the fix.

## New findings

| Finding | Severity | Blocks convergence? |
|---|---|---|
| The `pi.*` recommendation's premise is false — `demux.ts:77-83` + `guards.ts:189-212` pin the event vocabulary at a closed 22-name allowlist | High | No — it removes an item |
| The store throws on non-contiguous append (`relay-store.ts:262-268`), so the client contiguity branch guards a fault with no origin | High | No — demotes an item to a test |
| The live epoch-gap guard is unreachable: `index.ts:68` is the only sync-epoch mint site | Med | No |
| No Svelte lint toolchain exists; ESLint parses zero `.svelte` files | Med | No — removes the mechanics, keeps the doctrine |
| `/api/approvals` is a read; gating it is a behaviour regression | Med | No — narrows an item |
| `Retry-After` consumer already shipped (`relay.ts:256-264`, `:1714`, `useRuntime.svelte.ts:112-119`) | Med | No — adds an item |
| Epoch rotation *worsens* storage growth without cross-epoch GC | Med | No — bundles an obligation |
| All four `TranscriptList` suites mock away the virtualizer; no test has exercised the real one | High | No — adds a precondition |
| `vitest.web.logic.config.ts:22-38` is an allowlist that has already killed four tests | High | No — adds a precondition |
| `/api/prompt/submit` is foreground-gated only when the prompt carries attachments (`server.ts:815-823`) | Med | No — extends an item |

## Attacks that did not land

- **Against the projection sequence desync.** seat-004 went looking to deflate it and instead found
  the first-party trigger, strengthening it. It is the top item.
- **Against `Retry-After` uniformity.** Sent to kill it; could not, and upgraded it.
- **Against the disclosure hoist.** Survived, but with a cost the finder had not priced: it is a
  fence-crossing edit subject to the unchanged-fence-TEXT diff and the fence-count gate.

## Convergence assessment

No surviving high-severity finding contradicts the Round 1 plan's *direction*; every landed attack
either removed an item, narrowed one, or added a precondition. The three residual disagreements are
operator-decidable, not evidence-resolvable. **Convergence declared.**
