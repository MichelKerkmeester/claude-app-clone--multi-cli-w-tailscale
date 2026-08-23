---
title: "AI Council charter — final cross-repo synthesis for the Pi Remote SvelteKit program"
description: "Council charter for the terminal synthesis of the five-repo context research sweep. Records the selected lenses, vantage targets, evidence inputs, convergence rule, and the scope constraints that bound the run."
trigger_phrases:
  - "ai council charter"
  - "council strategy context research"
importance_tier: "supporting"
contextType: "research"
---

# Council charter

## Purpose

Produce the FINAL cross-repo synthesis for the Pi Remote SvelteKit program: one integrated
target architecture, a ranked recommendation set verified against the shipped codebase, a
dependency-ordered build sequence, and an honest account of cost, dissent and open questions.

## Task framing

The prior pass (`recommendations.md`, R-01..R-13) counted repo agreement and tiered by it.
That is a counting exercise, not a synthesis. This council must reconcile five sources into one
design, separate what transfers to a browser PWA from native platform artefacts, and verify every
"already satisfied" claim against `app-mobile/**`, `app-relay/**`, and `packages/pi-rpc-protocol/**`
rather than trusting the prior document.

## Selected lenses and seats

Five lenses were mandated by the dispatch. The agent contract caps a council round at three seats,
so the run is staged across two dispatch rounds plus adjudication.

| Round | Seat | Lens | Mandate |
|---|---|---|---|
| 1 | seat-001 protocol | Analytical | Wire contract, replay, ordering, reconnect correctness |
| 1 | seat-002 security | Critical | Loopback/tailnet posture, authority, redaction, fail-closed |
| 1 | seat-003 mobile-ux | Holistic | Transcript, composer, disclosure, attention, a11y-neutrality |
| 2 | seat-004 skeptic | Pragmatic | Argue items DOWN; blast radius vs payoff for a single-user app |
| 2 | seat-005 verification | Research | What test catches each item regressing; is it gate-visible |
| 3 | adjudication | — | Reconcile, rank, sequence, record surviving dissent |

## Vantage targets

Native `Agent`-dispatched seats on this runtime. No external AI system was invoked; all seats are
native dispatches with distinct mandates and independent file evidence, not simulated lenses.

## Evidence inputs

- `goal.md` (frozen invariants — the veto authority for every recommendation)
- Five research syntheses under `010-context-repo-research/<repo>/research/research.md`
- `recommendations.md` (treated as hypothesis, not baseline)
- Shipped source: `app-mobile/src/**`, `app-relay/src/**`, `packages/pi-rpc-protocol/src/**`

## Convergence rule

`two-of-three-agree` per round, with adjudication required where Round 2 materially moves a
Round 1 position. Dissent that survives adjudication is recorded, not hidden.

## Constraints

- `specs/context/**` is READ-ONLY. No writes, no git operations.
- No scaffolding: no phase folders, no edits to any other packet's spec docs.
- Council writes are confined to `010-context-repo-research/ai-council/**` plus the two named
  deliverables in the packet root.
