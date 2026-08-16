<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Phase 1 — Ask-question protocol, host authority, and redaction

## Summary

This phase establishes the typed, host-owned ask-question mutation lane before any card UI is built. It adds strict protocol validation, one-use revision-bound ticketing, redacted projections, content-free observability, and confirmed host-to-extension handoff. Answering remains a non-optimistic mutation whose accepted state is emitted only after Pi confirms acceptance.

## Problem & Goal

The feature cannot safely render or submit questions until the protocol distinguishes display-safe presentation data from authoritative host state. The relay must authenticate and route the mutation without becoming the authority, while transcript, cache, push, logs, telemetry, and diagnostics remain content-free.

The goal is to make question identity, revision, lifecycle, answer digest, device, scope, ticket consumption, redaction, and extension confirmation mechanically enforceable through the existing envelope, relay, store, sync, push, and extension boundaries.

## Scope

### In scope

- Typed presentation, lifecycle, metadata-only transcript, answer, ticket, and result DTOs.
- Strict guards for IDs, revisions, option uniqueness, free-text constraints, redaction metadata, and safe result reasons.
- Reuse of canonical JSON and SHA-256 answer digest helpers.
- Host-owned pending-question lifecycle, idempotency, validation, redaction, and accepted-result publication.
- One-use tickets bound to the exact session, question, revision, enrolled device, mutation scope, digest, and expiry.
- Authenticated ticket and answer handling with fail-closed status and reason metadata.
- Metadata-only transcript persistence, redacted replay, content-free push, and safe operational output.
- Confirmed Pi callback routing through the existing extension boundary.
- Protocol, relay, and extension negative-control coverage.

### Out of scope

- The inline web card, option controls, free-text input, and visual styling.
- Keyboard, touch, screen-reader, responsive, PWA, or 390px device hardening.
- A second ticket service, direct browser-to-extension channel, or phone-owned authority.
- Optimistic answer state, automatic retry, ticket reuse, or raw extension payload exposure.
- Changes to ordinary session composition or unrelated mutation lanes.

## User-facing behavior + states

N/A — internal protocol/authority phase.

Existing transcript, composer, authenticated relay, sync, push, plan-mode enforcement, and extension-boundary behavior remain unchanged for non-ask-question traffic.

## Acceptance criteria

- A valid `session.ask-question.presented` event is typed, guarded, redacted, and delivered through the existing envelope and authenticated relay.
- The host owns pending-question lifecycle and rejects malformed, duplicate, stale, withdrawn, expired, superseded, and unavailable questions.
- An answer-ticket request binds the exact digest, question, revision, enrolled device, mutation scope, and expiry.
- Answer commit recomputes the digest, consumes the ticket once, checks the current revision, and rejects mismatches before extension handoff.
- The extension callback runs only after host validation and accepted ticket consumption.
- Accepted state is emitted only after Pi confirms the answer; unknown delivery remains non-accepted and does not trigger automatic retry.
- Transcript, cache-facing sync, push, logs, telemetry, and diagnostics contain no question content, answer text, tickets, digests, or raw callback data.
- Plan mode and operator-only `--full-access` remain host- and extension-enforced and cannot be enabled by the phone.
