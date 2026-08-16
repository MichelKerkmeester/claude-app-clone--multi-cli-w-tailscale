<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Phase 2 — Inline ask-question card, options, free-text, and non-optimistic state machine

## Summary

This phase renders the host-confirmed presentation as one standalone inline transcript card. It adds volatile option and free-text state, explicit submission, safe relay mutation orchestration, and the complete non-optimistic lifecycle model. The existing transcript, composer, cache, and content-free boundaries remain intact.

## Problem & Goal

Phase 1 establishes a safe presentation and mutation authority, but the web client still has no inline interaction for selecting opaque options or entering optional free text. The card must clearly separate local editing from accepted mutation and must remain visible and actionable until authoritative host and extension confirmation.

The goal is to provide a chronological, touch-usable card with single and multiple selection semantics, local required-text validation, explicit submission, retryable errors, terminal lifecycle handling, and immutable answered state without adding a modal, route change, or optimistic transcript mutation.

## Scope

### In scope

- A web-safe ask-question view model derived from guarded protocol DTOs.
- A volatile display store keyed by question identity and revision with no persistence adapter.
- The inline `AskQuestionCard` and its prompt, option, free-text, submit, and status components.
- Single and multiple option selection using opaque option IDs.
- Optional and required free-text input with local structural validation.
- Explicit `presented`, `selecting`, `submitting`, `answered-immutable`, `error`, `expired`, and `superseded` states.
- Ticketed mutation calls through the existing authenticated relay and session context.
- Mutation deduplication by `clientMutationId`, no consumed-ticket retry, and no timeout-based acceptance.
- Chronological transcript placement, virtualizer-safe identity, read-only cache exclusion, and existing ink-on-parchment styling.
- Component, state, transcript, contrast, and mutation-boundary coverage.

### Out of scope

- Host authority, ticket issuance policy, redaction ownership, or extension callback implementation.
- A modal, dialog, bottom sheet, scrim, route change, or page-level focus trap.
- Full keyboard-navigation hardening, screen-reader release review, RTL, browser zoom, reduced-motion, PWA cache, or final 390px release certification.
- Persisting display content, answer text, tickets, or digests.
- Replacing `SessionComposer` or changing ordinary prompt submission behavior.
- Optimistic answered state, automatic retry, ticket reuse, or semantic interpretation of option labels.

## User-facing behavior + states

A valid presentation appears once at its chronological transcript position as a standalone inline card. The card contains the redacted prompt, optional descriptions, option rows, optional free text, read-only hint, safe status, and an explicit submit action without blocking the surrounding transcript.

Selection is local only. Single-selection mode retains one option; multiple-selection mode toggles independent options. Blur, free-text edits, and option interaction never send an answer mutation. Required free text keeps submit disabled until local structural validation passes, while host policy remains authoritative.

The card uses one explicit state machine: `presented` for untouched content, `selecting` for local edits, `submitting` for an in-flight ticketed mutation, `answered-immutable` after host and extension acceptance, `error` for retryable failure, and `expired` or `superseded` for terminal lifecycle changes. Submission disables all answer controls, preserves the card until a result arrives, and never infers acceptance from timeout.

Retryable errors preserve local values and keep the card actionable only when authoritative state permits. Accepted confirmation replaces actionable controls with one immutable answered line; terminal lifecycle events disable submission and prevent stale mutation.

## Acceptance criteria

- A valid presentation renders exactly one inline card at its chronological transcript position with no modal, scrim, route change, or page-level focus trap.
- The card presents the redacted prompt, options, optional descriptions, optional free text, read-only hint, safe status, and explicit submit action.
- Single-selection mode retains only one selected option, while multiple-selection mode retains independent selections.
- Free text appears only when allowed, and required free text blocks submit until structurally valid local input exists.
- Selection, blur, and free-text edits never send a ticket request or answer mutation; submission is always explicit.
- Submit enters `submitting`, disables all card controls, and displays safe status without optimistic acceptance.
- Retryable errors preserve local selections and free text, while accepted host confirmation produces one immutable answered line with no actionable controls.
- Revision mismatch, withdrawal, expiry, and supersession remain terminal and block stale submission.
- Duplicate submissions produce one mutation identity and one commit, and ordinary transcript, composer, cache, and push behavior remain intact.
