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

## Adversarial review resolutions (MUST-FIX — mandatory enforcement mechanisms)

The pre-build adversarial security review (`../adversarial-security-review.md`) confirmed the properties above
but found the spec asserted them without mandating the mechanisms the shipped `change-model` lane uses to
enforce them. The following are now REQUIRED and are the authoritative enforcement contract for this phase.
"MUST" mechanisms mirror the exact shipped patterns cited.

- **MF1 — Two separated representations; display content never touches the persist/redact path.** The only
  thing that flows through `SyncHub.publish` → `appendEnvelope` → `redactEnvelope` is the **metadata-only**
  `AskQuestionTranscriptMeta` block (ids/revision/lifecycle/attention class only). The display payload
  (prompt, option labels/descriptions, free-text placeholder) MUST be produced by a **dedicated strict
  allowlist projector** (the `projectRuntimeModelCatalog` pattern in `store/redaction.ts` — allowlist emit,
  never a generic key-scan) and delivered over a **non-persisted, authenticated, on-demand read** keyed by
  `questionId`+`revision` (mirroring the `artifact:read` lane), NEVER through `redactEnvelope`/`appendEnvelope`.
  No object that can reach `redactEnvelope` may carry a `prompt` key. The projector is the single redaction
  authority for display content and MUST be at least as strict as the generic policy.
- **MF2 — Single-flight answer lane + atomic settle prevents double-answer via two distinct valid tickets.**
  The answer commit MUST run in a **per-question single-flight lane** mirroring `RuntimeService.enqueueMutation`,
  and MUST **atomically transition the question out of `pending` (→ `settling`) before any `await`**, so every
  concurrent or later commit observes `question-already-answered` and is rejected **before** handoff. Ticket
  consumption MUST be atomic — synchronous validate-and-mark-consumed with no `await` between, exactly like
  `consumeRuntimeModelTicket` (the ticket is deleted before the binding is compared, so a mismatched attempt
  still burns it). One-use is per-ticket and is NOT sufficient on its own.
- **MF3 — Fresh authoritative re-read immediately before extension handoff.** Inside the single-flight lane
  (MF2), immediately before the privileged handoff, the host MUST **re-verify from authoritative state**
  (mirroring `refreshExecutionPrecondition`) that the question is still pending at exactly the ticket-bound
  revision, failing closed (`revision-mismatch`/`question-withdrawn`) otherwise. The extension adapter MUST
  independently re-validate the answer against Pi's current pending question and reject if superseded.
- **MF4 — Unambiguous digest basis + canonical multi-select ordering.** The host MUST compute
  `recompute = sha256(canonicalizeJson(receivedAnswer))` and accept ONLY if `recompute === ticket.boundDigest`;
  the transmitted `answerDigest` is never the comparison basis (accept it only as a redundant equality check).
  `optionIds` MUST be canonically ordered (sorted) before hashing so a multi-select answer has one stable
  digest (`canonicalizeJson` sorts object keys but not array elements). The hashed payload MUST bind
  `questionId` + `expectedRevision` + `principal` (mirroring `canonicalizeApprovalAction`) as defence-in-depth.
- **MF5 — Terminal `delivery-unknown`, never retried.** The result reason enum MUST include a distinct
  **terminal** `delivery-unknown` (mirroring the shipped runtime `delivery-unknown` status). A clean
  pre-handoff rejection (bad ticket / stale revision / validation failure — no host effect) may be retried
  with a fresh ticket; a post-handoff `delivery-unknown` is terminal and reconcile-only (idempotency /
  mutation-status lookup by `clientMutationId`) — never auto-retried, never re-minted. The state machine MUST
  NOT route `delivery-unknown` into `error → submitting`.

### Also required (folded from SHOULD-FIX)

- **Mint-time freshness (SF1):** issue the answer ticket only after a fresh re-read confirms the question is
  pending at the requested revision (mirroring `validateFreshModelTicketRequest`).
- **Exact-key DTO bounds (SF2):** all new guards use `hasOnlyKeys` allowlists and cap `options` length,
  `optionIds` length (with uniqueness), `freeText` bytes, and prompt/label/description/placeholder lengths;
  validate `answerDigest` with the `DIGEST_PATTERN` (`^[a-f0-9]{64}$`); reject unknown
  `reason`/`selectionMode`/`status` ordinals.
- **Foreground + rate-limit on both answer routes (SF4):** the answer-ticket and answer routes require a
  foreground device and a per-device rate limiter, exactly as the runtime ticket/control routes do.
- **Structural fail-closed persistence (SF5):** the `ask-question` transcript guard uses `hasOnlyKeys` so a
  block carrying `display`/`answer`/`ticket`/`digest` throws at `appendEnvelope` rather than leaking.
- **Selection-count semantics (SF3):** single ⇒ exactly 1; multiple ⇒ host-supplied min/max; empty only via an
  explicit host "skip" option — host-enforced.
- **`policyVersion` type (SF8):** pick one type (number) and have the guard reject the other.

### Open integration assumption (SF6 — verify before real enablement, not a build blocker)

The real Pi ask-question event/answer-callback names and their ack/rejection/`already-answered` semantics are
NOT in the repo (only `on('tool_call', …)` is confirmed). Build the adapter against a documented assumed
contract that maps the callback outcome to `accepted` / `rejected` / `delivery-unknown` (MF5), and mark the
exact Pi event names as an integration-time verification item. The capability is gated and this lane is
verified before real use, so this is an assumption to confirm at integration — it does not block this phase.
