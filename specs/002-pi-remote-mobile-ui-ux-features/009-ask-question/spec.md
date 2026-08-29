---
title: "F9 — Ask-Question"
description: "F9 — Ask-Question"
trigger_phrases:
  - "f9 — ask-question"
  - "ask question spec requirements"
  - "ask question packet"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/002-pi-remote-mobile-ui-ux-features/009-ask-question"
    last_updated_at: "2026-08-16T12:00:00Z"
    last_updated_by: "gpt-5.6-luna"
    recent_action: "Synthesized research and authored feature spec plus implementation phases"
    next_safe_action: "Build sub-phase 002 protocol and redaction"
    blockers: []
    key_files:
      - "spec.md"
    completion_pct: 0
    open_questions: []
    answered_questions: []
---
<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: phase -->

# F9 — Ask-Question

One-line summary: Add a redacted inline question card to the Pi Remote transcript that commits answers only after host-confirmed, one-use, revision-bound mutation success.

> **Release-blocking security gate.** This feature adds a new host-affecting answer mutation. Before Phase 1 build starts, an adversarial security/redaction review of this spec must sign off (see `roadmap.md` → Hard gates §3) — on par with `007`/`008`. No build phase is scheduled until that sign-off, even though the answer reuses the shipped ticket path rather than adding a binary lane.

## Decision

Build one inline `AskQuestionCard` inside the existing transcript renderer and chronological activity flow. It presents the agent prompt, visible option rows, and an optional free-text field without a modal, full scrim, blocking sheet, route change, or page-level focus trap. The transcript remains readable and authoritative while the question is pending.

Use React Aria Components primitives with full-row `Button` options, a semantic option collection with roving focus, and the existing `SessionComposer` session and connection context. The question uses Source Serif 4; explanatory copy, options, errors, status, labels, and actions use Inter. Selection is local form state only. An option tap or key press never submits an answer.

Answering is a mutation. Submission requests or consumes a one-use ticket bound to the exact session, question, enrolled device, mutation scope, answer digest, and host revision. The host validates the answer, enforces plan mode and policy, consumes the ticket once, and invokes the extension callback only after all checks pass. The UI does not collapse, remove, or mark the question answered until the host and extension confirm acceptance.

The feature reuses the current typed RPC envelope, authenticated relay, redaction policy, sync stream, content-free push, and mutation boundary. The visual system remains ink-on-parchment: bone `#f8f8f6`, carbon ink, and clay `#d97757` as the only accent, with Inter and Source Serif 4 in light and dark themes and WCAG AA contrast.

## Problem and goal

Pi can pause while waiting for an operator decision. The current transcript and composer surfaces do not provide a typed, inline answer interaction for that pause, and the phone must not become an execution authority merely because it displays the question.

The goal is to let an enrolled operator answer a pending question in place, using touch or keyboard, while preserving transcript chronology, preventing optimistic state, and keeping all execution authority on the host and extension.

The feature must make the distinction between local selection and accepted mutation visible and mechanically enforceable:

- Selecting an option changes only volatile browser state.
- Submitting creates a canonical answer intent and enters the existing ticketed mutation lane.
- Only an accepted host result, after extension handoff, produces the immutable answered state.
- Every other outcome remains pending, retryable, expired, superseded, or unknown according to authoritative host state.

## Current state

The current repository provides the foundations required for this feature:

- `packages/pi-rpc-protocol/src/types.ts` defines the versioned `Envelope`, RPC commands, responses, sync messages, and transcript block union, but it has no typed ask-question event or metadata-only ask-question block.
- `packages/pi-rpc-protocol/src/guards.ts` validates protocol DTOs and opaque identifiers. `packages/pi-rpc-protocol/src/approval.ts` provides canonical JSON serialization and SHA-256 digest helpers that must be reused for answer binding.
- `apps/pi-remote-relay/src/auth/auth-service.ts` owns enrolled sessions and one-use tickets. `apps/pi-remote-relay/src/auth/policy.ts` is the allowlist for authenticated actions.
- `apps/pi-remote-relay/src/http/server.ts` owns authenticated HTTP routing, ticket consumption, prompt mutations, runtime mutations, and extension authority routes.
- `apps/pi-remote-relay/src/store/redaction.ts` applies canonical redaction. `apps/pi-remote-relay/src/store/relay-store.ts` redacts before persistence, and `apps/pi-remote-relay/src/replay/sync.ts` broadcasts only committed envelopes.
- `apps/pi-remote-relay/src/store/transcript-projector.ts` projects Pi events into typed transcript blocks. It currently has no ask-question projection.
- `apps/pi-remote-relay/src/push/push-service.ts` stores attention metadata and sends content-free push hints.
- `apps/pi-remote-web/src/App.tsx` renders a virtualized transcript and `ActivityGroup` disclosures. `apps/pi-remote-web/src/state.ts` normalizes transcript blocks and handles sync barriers. `apps/pi-remote-web/src/turns.ts` derives chronological turns.
- `apps/pi-remote-web/src/relay.ts` owns browser-to-relay calls and already obtains one-use tickets for existing mutations.
- `apps/pi-remote-web/src/cache.ts` persists a read-only transcript cache and must never receive ask-question display content, answer text, tickets, or digests.
- `apps/pi-remote-web/src/SessionComposer.tsx` is the ordinary message composer and remains the normal session input.
- `extensions/pi-remote-approval/src/index.ts` implements the final host-to-extension approval boundary and fails closed when the relay or authority is unavailable.
- `apps/pi-remote-web/public/fonts/` already contains Inter and Source Serif 4 assets.

The exact Pi extension ask-question payload and callback names are not established by the supplied repository. The implementation must add a typed adapter at the existing extension boundary after confirming the real Pi callback contract; it must not expose raw extension payloads to the browser or create a second authority path.

## Desired end state

A host-owned pending question produces an authenticated, redacted `session.ask-question.presented` event. The event is rendered as one standalone inline card at its chronological transcript position. The card’s display data is held only in an in-memory ephemeral store keyed by `questionId` and revision.

The persisted transcript contains only metadata:

- question and session identifiers;
- activity identity;
- presented revision;
- lifecycle status;
- ordinary transcript ordering fields.

The persisted transcript never contains the prompt, option labels, option descriptions, free-text placeholder, answer text, ticket, digest, raw callback arguments, or extension command values.

The end-to-end interaction is:

1. The host validates the incoming Pi question, assigns a question identity and revision, applies redaction, and publishes the display-safe event.
2. The web client validates the event and renders the card without mutating the canonical transcript.
3. The operator selects options or enters free text locally.
4. Explicit submission canonicalizes the answer and computes the existing protocol digest.
5. The host issues or validates a one-use answer ticket bound to the exact question, revision, device, scope, and digest.
6. The relay and host revalidate every binding and reject malformed, stale, expired, consumed, withdrawn, superseded, or policy-blocked requests.
7. The extension receives the answer only through the controlled host callback and confirms acceptance.
8. The host emits the accepted result and the client changes the card to an immutable answered line.
9. Any uncertain delivery remains non-accepted until an authoritative result or idempotency lookup confirms the outcome.

## Authority and protocol contract

The feature uses the existing `Envelope` transport and authentication model. The event type below is the allowlisted payload contract; it is not a new WebSocket or direct extension protocol.

```ts
type AskQuestionOption = Readonly<{
  id: string;
  label: string;
  description?: string;
}>;

type AskQuestionPresentedEvent = Readonly<{
  type: "session.ask-question.presented";
  sessionId: string;
  questionId: string;
  activityId: string;
  revision: number;

  display: Readonly<{
    prompt: string;
    options: readonly AskQuestionOption[];
    freeText: Readonly<{
      allowed: boolean;
      required: boolean;
      placeholder?: string;
      maxLength?: number;
    }>;
  }>;

  selectionMode: "single" | "multiple";

  answerCapability: Readonly<{
    scope: "ask-question.answer";
    ticketRef: string;
    boundRevision: number;
    expiresAt: string;
  }>;

  redaction: Readonly<{
    applied: true;
    policyVersion: number;
    contentAvailability: "available" | "partially-redacted" | "unavailable";
    redactedFields: readonly (
      | "prompt"
      | "option-label"
      | "option-description"
      | "free-text-placeholder"
    )[];
  }>;

  requiresReadOnlyHint: boolean;
}>;
```

`display.prompt` and all option and placeholder strings are already redacted, bounded, plain text. They are never raw extension values. `ticketRef` is an opaque capability reference and correlation value; it is not a reusable authority grant. The client must not derive authority from it or display it.

The host rejects a presentation with an empty or invalid question ID, duplicate option ID, empty option set when no free text is allowed, duplicate question identity at the same revision, invalid selection mode, invalid free-text constraints, invalid timestamps, or unavailable required display content. Option IDs are opaque identifiers. The browser submits IDs only; the host maps them to authoritative answer values.

The metadata-only transcript representation is:

```ts
type AskQuestionTranscriptMeta = Readonly<{
  kind: "ask-question";
  id: string;
  revision: number;
  seq: number;
  occurredAt: string;
  activityId: string;
  questionId: string;
  sessionId: string;
  presentedRevision: number;
  status:
    | "presented"
    | "submitting"
    | "answered"
    | "error"
    | "expired"
    | "superseded";
}>;
```

The generic transcript serializer must refuse to serialize `display`, `answerCapability`, ticket values, digest values, answer text, or raw extension data. The ephemeral display store is separate from transcript state and is never written to `localStorage`, IndexedDB, service-worker caches, URLs, browser titles, push payloads, or structured logs.

The answer intent and ticket request are:

```ts
type AskQuestionAnswer = Readonly<{
  optionIds: readonly string[];
  freeText?: string;
}>;

type AskQuestionAnswerTicketRequest = Readonly<{
  type: "session.ask-question.answer-ticket";
  sessionId: string;
  questionId: string;
  expectedRevision: number;
  answerDigest: string;
  clientMutationId: string;
}>;

type AskQuestionAnswerRequest = Readonly<{
  type: "session.ask-question.answer";
  sessionId: string;
  questionId: string;
  expectedRevision: number;
  ticket: string;
  answer: AskQuestionAnswer;
  answerDigest: string;
  clientMutationId: string;
}>;
```

The answer is canonicalized with the existing `canonicalizeJson` and digest helpers from `packages/pi-rpc-protocol/src/approval.ts`. No feature-specific digest encoding may be introduced when the existing helper can represent the answer. The host recomputes the digest from the received answer and rejects any mismatch.

The ticket is one-use, short-lived, device-bound, question-bound, revision-bound, scope-bound, and digest-bound. The existing `AuthService` ticket machinery is extended or adapted for these bindings; the feature must not create a parallel ticket service. If the existing transport combines ticket preparation and commit, the same binding fields and checks still apply.

The host rejects the answer when any of the following is true:

- The authenticated device, principal, session, or origin does not match.
- The mutation scope is not exactly `ask-question.answer`.
- The ticket is missing, malformed, expired, consumed, or bound to another device.
- The ticket is bound to another session, question, revision, or answer digest.
- The expected revision differs from the current host revision.
- The question is withdrawn, superseded, already settled, or no longer pending.
- An option ID is unknown or duplicated.
- The selection mode, required free-text rule, maximum length, or host content policy is violated.
- The host or extension cannot prove the current plan-mode and mutation policy state.
- The host cannot safely determine whether the mutation was accepted.

The result contains status and safe reason metadata only:

```ts
type AskQuestionAnswerResult = Readonly<{
  type: "session.ask-question.answer-result";
  sessionId: string;
  questionId: string;
  revision: number;
  clientMutationId: string;
  status: "accepted" | "rejected";
  reason?:
    | "invalid-ticket"
    | "ticket-expired"
    | "ticket-used"
    | "revision-mismatch"
    | "question-withdrawn"
    | "question-already-answered"
    | "plan-mode-blocked"
    | "redaction-policy-blocked"
    | "validation-failed"
    | "host-unavailable";
}>;
```

An accepted result is emitted only after the extension confirms that Pi accepted the answer. Ticket consumption alone is not an accepted answer. A lost response must be reconciled through the existing idempotency or mutation-status mechanism; the client must not resend a consumed ticket or infer acceptance from a timeout.

The host emits lifecycle events for terminal question changes:

```ts
type AskQuestionLifecycleEvent = Readonly<{
  type:
    | "session.ask-question.withdrawn"
    | "session.ask-question.expired"
    | "session.ask-question.superseded";
  sessionId: string;
  questionId: string;
  revision: number;
  reason?: "host-cancelled" | "revision-moved" | "session-ended" | "timeout";
}>;
```

## In scope

- Typed inbound ask-question presentation, lifecycle, answer, ticket, and result DTOs in `packages/pi-rpc-protocol`.
- Strict runtime guards and allowlisted serialization for every new DTO.
- Host-owned pending-question state with question identity, revision, lifecycle, redaction, and idempotency.
- A ticketed answer mutation using the existing authenticated relay and one-use ticket boundary.
- Host and extension validation of answer values, plan mode, mutation policy, revision, and callback handoff.
- Metadata-only transcript projection and an in-memory display store.
- An inline `AskQuestionCard` rendered through the existing virtualized transcript.
- Single and multiple option selection, optional or required free text, explicit submission, and non-optimistic state transitions.
- Touch-only operation, keyboard navigation, semantic focus, live-region status, dynamic text sizing, RTL layout, reduced motion, and WCAG AA verification.
- Content-free attention and push behavior for a pending question.
- Protocol, relay, extension, web, redaction, cache, accessibility, and device-level tests.

## Out of scope: v1 non-goals

- Modal, dialog, popover, bottom-sheet, full-screen scrim, drag handle, or page-level focus trap.
- A second WebSocket, direct PWA-to-extension connection, or PWA-owned authority service.
- Optimistic transcript mutation, optimistic answered state, automatic retry, or ticket reuse.
- Persisting question content, option labels, free-text answers, tickets, digests, or raw callback values in any durable or observable boundary.
- A client-generated skip action. A skip choice is supported only when the host supplies it as an ordinary opaque option.
- Editing, reopening, changing, or resubmitting an answered immutable line.
- Enabling plan mode, disabling plan mode, granting `--full-access`, or exposing any operator-only authority to the phone.
- Replacing `SessionComposer` or changing ordinary prompt submission behavior.
- Rendering question content as Markdown, HTML, shell syntax, extension commands, or executable data.
- Supporting concurrent pending questions beyond the lifecycle model explicitly supplied by the host.
- Solving generic transcript replay by adding question content to transcript snapshots.
- Introducing new accent colors, success colors, error colors, or reference-product visual tokens.

## User-facing behavior

### Presentation and options

A valid presentation appears as one standalone inline card at the event’s chronological transcript position. It remains visually distinct from ordinary transcript copy without blocking the transcript or changing route.

The card is a semantic `section` associated with its question heading. It contains a small typographic question marker, the Source Serif 4 prompt, a concise explanatory line, the optional muted-ink `read-only until confirmed` hint, the option collection, optional free-text input, status text, and an explicit submit action.

Options are full-width rows with a minimum 44px CSS hit area. The entire row is tappable. Long labels wrap naturally and are never ellipsized when truncation would hide answer content. Descriptions are optional and are rendered as redacted plain text.

For `single` selection, choosing an option clears the previous option. For `multiple` selection, choosing an option toggles only that option. Selection is local state and never submits by itself. The browser submits opaque option IDs, never labels or host values.

The card does not infer semantic meaning from option text. A skip, cancel, or decline path exists only if supplied by the host as an ordinary option.

### Free-text and submission

The free-text field is rendered only when `freeText.allowed` is true. It uses React Aria Components `TextField`, `Label`, `Input`, description, and validation message primitives.

Required free text keeps submit disabled until the local structural validation passes. The client applies the host-provided `maxLength` as a usability limit, but the host remains authoritative for byte limits, content policy, length, and valid option/text combinations.

Free text is plain text only. The browser does not interpret Markdown, HTML, shell syntax, extension commands, or instruction-like content as executable instructions.

Submitting is always explicit. A valid Return in a single-line field may submit, but blur and option selection never submit. The card requests or consumes a fresh exact ticket, then submits the full answer over the authenticated mutation path. The card enters `submitting` immediately and remains visible until a host result arrives.

A successful host and extension confirmation changes the card to a compact answered-immutable transcript line. A retryable rejection preserves the local answer, shows safe localized error copy, and re-enables controls only when the host confirms that the question remains answerable.

### Input, touch, and keyboard behavior

Every option row, input, and submit action has a minimum 44px CSS hit area. Adjacent rows have sufficient separation to reduce accidental taps. The card is fully usable with touch alone and does not require swipe, drag, long press, hover, or hidden gestures.

The default keyboard sequence is:

`first option → next option → last option → free-text input when present → submit`

Option rows use roving `tabIndex`; exactly one option has `tabIndex="0"` and all others have `tabIndex="-1"`. Up and Down move focus without changing selection. Home and End move to the first and last options. Tab and Shift+Tab move through the explicit answer stops.

Enter and Space on an option perform the same selection action as a tap. Space remains a space in free text. Return submits valid single-line free text only when IME composition is not active. Keyboard handlers are scoped to the card and never capture unrelated transcript controls.

The first option receives focus after initial arrival when the operator is not already typing or interacting elsewhere. The card must not steal focus from an active free-text field or unrelated control. Focus remains visible with the clay focus ring in both themes.

When the virtual keyboard opens, the focused field is scrolled into view without changing route or disabling the transcript. Unmounting a virtualized card must preserve its mutation ID and must not trigger a second submission.

### Complete UI state model

The card uses one explicit state machine rather than independent booleans.

| State | Meaning and behavior |
|---|---|
| `presented` | A valid question is displayed and the form is untouched. |
| `selecting` | The operator has changed an option or free-text value, or is actively interacting with the answer stops. |
| `submitting` | A ticketed mutation has begun; options, input, and submit are disabled; status text and a progress hairline are visible. |
| `answered-immutable` | The host and extension confirmed acceptance. The card is replaced by a compact immutable answered line. |
| `error` | The last attempt failed, but the host says the question remains answerable. Local values are preserved. |
| `expired` | The host ended the answer window through expiry, withdrawal, session end, or another terminal lifecycle event. |
| `superseded` | The host revision advanced or the question was replaced. Stale submission is impossible. |

Allowed transitions are:

- `presented → selecting` on local interaction.
- `selecting → presented` only when the form is restored to its untouched initial state.
- `selecting → submitting` only after explicit valid submission.
- `submitting → answered-immutable` only after an accepted host result following extension confirmation.
- `submitting → error` for retryable validation or transport failure.
- `submitting → expired` for expiry or withdrawal.
- `submitting → superseded` for revision mismatch or revision lifecycle change.
- `error → submitting` only with a fresh valid ticket and a still-current question.
- Any active state → `expired` or `superseded` on the corresponding authoritative lifecycle event.

A retry never resends a consumed ticket. An unknown delivery result remains non-accepted until idempotency or mutation status confirms the host outcome.

An identical `questionId` and revision is deduplicated. A higher revision supersedes the older card and renders the new presentation. A withdrawn question remains as a compact lifecycle line rather than disappearing from history. A disconnected relay preserves local values while selecting and disables submission until capability state is revalidated.

### Visual, layout, and motion requirements

Use the existing ink-on-parchment token system:

- Light mode uses bone `#f8f8f6` and carbon ink.
- Dark mode uses the existing dark parchment and carbon ink tokens.
- Clay `#d97757` is the only accent.
- Source Serif 4 is used for the question.
- Inter is used for explanatory copy, labels, options, status, errors, and actions.

The card uses a hairline carbon-ink border, the existing radius token, and the existing spacing scale. It fills the available transcript width without exceeding the readable content width.

Unselected rows use a hairline ink outline. Selected rows use a carbon-ink fill with a contrasting check glyph and explicit selected text for assistive technology. Clay is never used as the selected-row fill.

The enabled submit action uses clay. Disabled controls use the existing neutral disabled treatment. Errors use clay emphasis and safe text rather than a new error color. The answered line communicates status through text and glyph as well as contrast; color is never the only state signal.

The submitting state shows `Submitting…` and a thin progress hairline. Only short insertion and collapse opacity or transform transitions are allowed. Reduced motion removes movement and progress animation while retaining status text and focus behavior.

The card has no full-screen scrim, modal shadow, drag handle, or bottom-sheet treatment.

### Accessibility and internationalization

The card exposes a labelled region associated with its question heading. The option collection has a programmatic label such as `Answer options`. Each option is represented as a list item containing a React Aria Components `Button` with `aria-pressed="true"` or `aria-pressed="false"`.

The question, explanatory line, option list, input, error, and status are connected with `aria-labelledby` and `aria-describedby`. Arrival uses a concise polite live-region announcement. Submission status uses a polite status region. The final answered state is announced once and remains visible.

Screen readers never receive ticket values, answer digests, internal revision details, session secrets, raw host diagnostics, or extension errors. Safe localized reason codes are used for errors.

Use logical CSS properties for spacing, borders, alignment, and direction. RTL preserves the localized option order and never reverses opaque option IDs. The check glyph does not need directional mirroring.

Use rem-based type and existing responsive tokens. Prompt, labels, option descriptions, input, and errors wrap naturally under browser zoom and large-text settings. Rows have no fixed height that can clip translated content.

Localized strings are separate entries for `Submitting…`, `Answered`, expired and superseded states, errors, read-only hints, labels, and descriptions. Dynamic question text is never concatenated into localized sentences.

Contrast is verified at WCAG AA in light and dark themes, including the clay focus ring on both parchment surfaces and selected carbon rows with labels and check glyphs.

## Acceptance criteria

| # | Pass condition | Objective proof method |
|---:|---|---|
| 1 | A valid `session.ask-question.presented` event renders exactly one inline card at the event’s chronological position. | Fixture-driven DOM inspection and screenshot show one card, no route change, no modal, no scrim, and no focus trap. |
| 2 | Invalid presentations are rejected before rendering or persistence. | Protocol and relay tests cover empty IDs, duplicate option IDs, invalid selection mode, invalid free-text constraints, and unavailable required display content. |
| 3 | The question uses Source Serif 4 and supporting UI uses Inter. | Computed-style assertions and light/dark screenshots verify the font family assignment. |
| 4 | Every option row has a full-row interactive target at least 44px high. | DOM measurement asserts height and width; touch-oriented screenshot verifies the whole row is tappable. |
| 5 | Single-selection mode retains only one selected option. | Component test selects two rows and asserts exactly one `aria-pressed="true"` value. |
| 6 | Multiple-selection mode retains independent selections. | Component test selects two rows and asserts both buttons expose `aria-pressed="true"`. |
| 7 | Free text appears only when allowed. | Fixture test renders allowed and disallowed payloads and asserts input presence or absence. |
| 8 | Required free text keeps submit disabled until structurally valid local input exists. | DOM and state tests assert disabled, enabled, and whitespace-only cases. |
| 9 | Blur never submits. | Interaction test blurs the field and asserts no ticket request or answer RPC was sent. |
| 10 | Option selection never submits. | Interaction test taps and keys options before submit and asserts no mutation request occurred. |
| 11 | Return submits valid single-line free text but not during IME composition. | Keyboard tests cover valid Return and `isComposing` Return paths. |
| 12 | Arrow, Home, End, Tab, and Shift+Tab follow the declared card-local focus sequence. | Keyboard automation records the focused element after every key and asserts no unrelated transcript control receives focus. |
| 13 | Touch alone can complete a valid answer. | A touch-only test or device run selects an option, enters free text where required, and submits without keyboard-only controls. |
| 14 | Focus-visible styling is present in both themes and is clay-based. | Light/dark screenshots and computed-style assertions prove a visible clay focus ring and no removed outline. |
| 15 | Submission enters `submitting` immediately and disables all answer controls. | State test and screenshot assert disabled options, disabled input, disabled submit, `Submitting…`, and the progress hairline. |
| 16 | Two rapid submit taps produce one mutation identity and one commit. | Integration test asserts one `clientMutationId`, one ticket consumption, and one extension callback. |
| 17 | An accepted result produces an immutable answered line only after host and extension confirmation. | Relay fixture delays extension confirmation; DOM remains actionable before confirmation and becomes non-actionable afterward. |
| 18 | A retryable rejection preserves local selections and free text. | Integration test asserts values remain, safe inline error is shown, controls re-enable only when allowed, and no answered state appears. |
| 19 | Revision mismatch, withdrawal, expiry, and session end produce terminal lifecycle states. | Host-event tests assert `superseded` or `expired`, disabled controls, and no subsequent answer request. |
| 20 | A replayed question with the same ID and revision is deduplicated. | Sync/reducer test applies the same presentation twice and asserts one rendered card. |
| 21 | A higher revision supersedes the older card. | Sync/reducer test applies a higher revision and asserts the old card is terminal and the new card is rendered. |
| 22 | The generic transcript serializer contains metadata only. | Serialization test asserts prompt, labels, descriptions, placeholder, answer, ticket, digest, and callback fields are absent. |
| 23 | Cache, push, logs, telemetry, and diagnostics contain no question content. | Boundary tests serialize each output and assert only identifiers, revision, lifecycle status, redaction metadata, and safe reason codes remain. |
| 24 | Malformed, stale, expired, consumed, cross-device, cross-question, cross-revision, and digest-mismatched tickets fail closed. | Relay security tests cover every binding failure and assert no extension callback occurs. |
| 25 | Plan-mode and `--full-access` authority cannot be enabled by the phone. | Negative-control tests assert no ask-question DTO or route accepts plan-mode changes, full-access fields, or extension bypass values. |
| 26 | Reduced motion retains status and focus behavior without animation. | Reduced-motion screenshot and computed-style test assert no progress or collapse animation while text status remains visible. |
| 27 | The card remains usable at a true 390px viewport with the virtual keyboard open. | CDP device run captures light and dark states, focuses the field, opens the keyboard, and verifies the focused control is visible without route change. |
| 28 | Semantic labels, live regions, RTL order, large text, and contrast meet the accessibility contract. | Accessibility inspection, RTL fixture, browser zoom run, and WCAG AA contrast assertions pass in both themes. |

## Security and redaction requirements

The phone is an enrolled operator device, not the authority that owns Pi execution. Tailscale or private transport context does not grant mutation permission.

The relay may authenticate the device, authorize the session, route messages, apply redaction, and enforce the existing boundary. It must not answer the question on behalf of the host. The host owns the pending question, revision, lifecycle, validation, and callback handoff.

Answering always uses the exact `ask-question.answer` mutation scope and carries `sessionId`, `questionId`, `expectedRevision`, ticket, answer digest, and `clientMutationId`. The ticket is one-use, short-lived, device-bound, question-bound, revision-bound, and digest-bound.

The host fails closed when any binding is absent, malformed, stale, expired, consumed, unverifiable, or inconsistent. Unknown option IDs, duplicate IDs, invalid combinations, invalid free text, withdrawn questions, superseded revisions, and unavailable plan state are rejected before extension handoff.

The extension receives the answer only through the existing controlled host callback. The narrow plaintext exception is the authorized in-memory browser render path and the authorized host-to-extension handoff required to perform the answer. No raw extension payload, callback argument, filesystem path, secret, command value, or answer digest enters the browser-visible transcript.

All serializable, persisted, cached, pushed, logged, or observable representations are redacted. `apps/pi-remote-relay/src/store/redaction.ts` remains the canonical redaction boundary before persistence or broadcast.

Question prompts, option labels, descriptions, placeholders, answer text, ticket values, digests, and raw RPC payloads must not enter:

- Transcript JSON or generic snapshots.
- `localStorage`, IndexedDB, service-worker caches, cache keys, URLs, query strings, browser titles, notification bodies, or push payloads.
- Structured logs, diagnostics, error stacks, or telemetry content fields.
- Extension-to-host or host-to-relay audit records.

The PWA may hold redacted display strings and operator-entered free text in volatile memory while the card is active. The answer and display content are released when the card reaches accepted, terminal rejection, expiration, or superseded state, unless the live render requires a bounded value temporarily.

Push remains content-free. A pending-question attention hint may contain only opaque lookup/session metadata and an attention class. It must not contain the prompt, options, answer, extension command, ticket, digest, or secret-bearing context.

Telemetry may distinguish presented, submit-started, accepted, rejected, expired, and superseded states, but must not contain question text, option text, answer text, tickets, digests, or raw payloads. UI errors map stable reason codes to safe localized copy and never show host stack traces or extension error objects.

Plan mode remains host- and extension-enforced. The phone cannot enable or disable plan mode through this feature and cannot enable operator-only `--full-access`. When `requiresReadOnlyHint` is true, the card shows muted-ink `read-only until confirmed` copy without implying that selection has been transmitted.

## Dependencies and affected areas

- `packages/pi-rpc-protocol/src/types.ts` — add ask-question presentation, lifecycle, metadata, answer, ticket, and result DTOs while preserving the existing envelope.
- `packages/pi-rpc-protocol/src/guards.ts` — add strict allowlist guards for IDs, revisions, selection mode, free-text constraints, redaction metadata, answer shape, and result reasons.
- `packages/pi-rpc-protocol/src/index.ts` — export the new types and guards.
- `packages/pi-rpc-protocol/src/approval.ts` — reuse `canonicalizeJson` and `sha256`; change this file only if a generic typed answer digest adapter is required.
- `packages/pi-rpc-protocol/tests/guards.test.ts` and a new `packages/pi-rpc-protocol/tests/ask-question.test.ts` — cover valid DTOs, malformed payloads, canonicalization, and serializer exclusion.

- `apps/pi-remote-relay/src/auth/policy.ts` — authorize the answer-ticket and answer actions explicitly.
- `apps/pi-remote-relay/src/auth/auth-service.ts` — extend the existing one-use ticket binding to support exact question, revision, digest, device, and mutation scope.
- `apps/pi-remote-relay/src/http/server.ts` — add authenticated answer-ticket and answer routes, safe status mapping, rate limiting, and fail-closed ticket consumption.
- `apps/pi-remote-relay/src/ask-question/ask-question-service.ts` — add host-owned pending-question lifecycle, validation, idempotency, ticket binding, extension handoff, and accepted-result publication.
- `apps/pi-remote-relay/src/store/redaction.ts` — add allowlisted redacted display projection and content-free lifecycle projection.
- `apps/pi-remote-relay/src/store/relay-store.ts` — persist metadata-only ask-question blocks and reject display content at the storage boundary.
- `apps/pi-remote-relay/src/store/transcript-projector.ts` — project the host lifecycle into metadata-only transcript blocks without serializing the display payload.
- `apps/pi-remote-relay/src/replay/sync.ts` — deliver redacted presentation and lifecycle events through the existing sync path.
- `apps/pi-remote-relay/src/push/push-service.ts` — emit only content-free attention hints.
- `apps/pi-remote-relay/src/rpc/demux.ts` and `apps/pi-remote-relay/src/rpc/supervisor.ts` — route and serialize the confirmed Pi callback through the existing host RPC boundary.
- `apps/pi-remote-relay/tests/mutation-lane.test.ts`, `redaction.test.ts`, `sync.test.ts`, `push.test.ts`, `authority-loop.test.ts`, and a new `apps/pi-remote-relay/tests/ask-question.test.ts` — cover authority, redaction, idempotency, replay, lifecycle, and negative controls.

- `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` — own inline presentation, lifecycle state, focus entry, and submission orchestration.
- `apps/pi-remote-web/src/features/ask-question/AskQuestionPrompt.tsx` — render question marker, prompt, explanatory copy, and read-only hint.
- `apps/pi-remote-web/src/features/ask-question/AskQuestionOptionList.tsx` and `AskQuestionOptionRow.tsx` — render semantic options, selection, and roving focus.
- `apps/pi-remote-web/src/features/ask-question/AskQuestionFreeText.tsx` — render optional or required free text.
- `apps/pi-remote-web/src/features/ask-question/AskQuestionSubmitButton.tsx` and `AskQuestionStatus.tsx` — render explicit submission and safe status.
- `apps/pi-remote-web/src/features/ask-question/useAskQuestionState.ts` — own form validation and explicit state transitions.
- `apps/pi-remote-web/src/features/ask-question/useAskQuestionKeyboardNavigation.ts` — own card-local keyboard navigation.
- `apps/pi-remote-web/src/features/ask-question/useAskQuestionMutation.ts` — adapt the existing relay and ticket boundary.
- `apps/pi-remote-web/src/features/ask-question/askQuestionEphemeralStore.ts` and `askQuestionTypes.ts` — hold display content in memory and define the web-safe view model.
- `apps/pi-remote-web/src/App.tsx` — map ask-question metadata to the card while preserving virtualized focus and chronological placement.
- `apps/pi-remote-web/src/state.ts` and `apps/pi-remote-web/src/turns.ts` — normalize metadata-only blocks and preserve turn ordering.
- `apps/pi-remote-web/src/relay.ts` — add typed ticket, answer, lifecycle, and status calls using the existing session transport.
- `apps/pi-remote-web/src/cache.ts` — explicitly exclude ask-question display and answer content from read-only cache.
- `apps/pi-remote-web/src/style.css` — implement existing tokens, typography, 44px targets, focus ring, dark mode, responsive layout, and reduced motion.
- `apps/pi-remote-web/src/SessionComposer.tsx` — retain ordinary composer behavior and shared connection/session context.
- `apps/pi-remote-web/tests/App.test.tsx`, `tests/contrast.test.tsx`, and new ask-question component/state tests — cover rendering, state, keyboard, redaction boundaries, and visual tokens.

- `extensions/pi-remote-approval/src/index.ts` — add the typed adapter for the real Pi ask-question callback while retaining the existing final boundary and fail-closed behavior.
- `extensions/pi-remote-approval/tests/final-boundary.test.ts` — add answer handoff, policy, plan-mode, unavailable-host, stale-ticket, and callback-confirmation fixtures.
