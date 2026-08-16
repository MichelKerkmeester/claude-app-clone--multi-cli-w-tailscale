<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Phase 1 — Todo projection protocol, host authority, and redaction

## Summary

This phase establishes the typed, host-authoritative todo projection contract before any UI work. It adds validated snapshots and deltas, stable identities, capability negotiation, redaction, authenticated replay, and explicit read-only guarantees. Legacy transcript behavior and existing authority boundaries remain unchanged.

## Problem & Goal

The existing transcript plan representation cannot safely serve as the authoritative todo model because it lacks the full state contract and could encourage inference from transcript content. The goal is to normalize the authoritative host todo source into a redacted projection that the relay validates and synchronizes without enriching, reconstructing, or mutating it.

## Scope

### In scope

- Define versioned snapshot and delta DTOs with closed task states.
- Add runtime guards for identities, revisions, order, timestamps, and capabilities.
- Normalize the authoritative host todo source with stable opaque task identities.
- Preserve host order and state while discarding task detail.
- Redact titles and groups before DTO construction, persistence, replay, logging, or broadcast.
- Publish projections through the existing authenticated synchronization path.
- Prove capability negotiation, replay safety, and absence of mutation paths.

### Out of scope

- Building or styling the todo panel.
- Inferring todo state from transcript text, terminal output, or legacy `PlanBlock` data.
- Adding todo commands, HTTP mutation routes, tickets, approvals, or phone-originated RPCs.
- Changing plan-mode enforcement or operator-only `--full-access` authority.
- Creating a second synchronization channel.

## User-facing behavior + states

N/A — internal projection/authority phase.

Existing transcript behavior, authenticated read-only subscription behavior, content-free push behavior, plan-mode enforcement, and operator-only `--full-access` boundaries are preserved.

## Acceptance criteria

- Valid host snapshots and deltas pass protocol guards and are accepted as `todo.snapshot.v1` and `todo.delta.v1`.
- Unknown states, duplicate IDs, invalid revisions or order values, missing fields, and malformed timestamps fail closed.
- A complete snapshot is published after subscription or reconnect.
- A mismatched delta `baseRevision` does not invent, merge, or advance an invalid revision chain.
- Task detail is absent from DTOs, persisted envelopes, replay payloads, diagnostic logs, and push payloads.
- Titles and group labels are redacted before relay persistence and broadcast.
- The authenticated capability response exposes `todoProjection: 1`, while absent capability is treated as unsupported.
- No todo mutation command, HTTP route, ticket, approval, or phone-originated RPC is introduced.
- Existing plan-mode and `--full-access` authority boundaries remain unchanged.
