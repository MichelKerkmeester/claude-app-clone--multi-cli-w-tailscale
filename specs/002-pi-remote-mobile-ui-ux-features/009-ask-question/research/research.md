# F9-ask-question — Synthesis

## 1. Decision

Build one inline `AskQuestionCard` rendered inside the existing transcript and `ActivityGroup`, using React Aria Components primitives and the existing `SessionComposer` session context. The card presents the agent’s prompt, selectable options, and an optional free-text field without a modal, full scrim, or blocking bottom sheet. The transcript remains readable and chronologically authoritative.

Use `Button`, `TextField`, `Input`, `Label`, `Text`, and a semantic option-list structure with roving focus. The option rows are full-width, thumb-sized targets with typographic selected states. The question uses Source Serif 4; supporting copy, options, errors, and actions use Inter. This combines the inline transcript precedent from [Flo](https://refero.design/screens/167ba376-9401-4354-a5b3-c2d75822659d), [Grok](https://refero.design/screens/a0adc2f0-e148-4950-85f6-2ab5a8d6c5c2), and [Coinbase](https://refero.design/screens/d2b32a76-ef17-497f-b2ed-444a1e1a2f4c) with the structured card treatment from [Chance AI](https://refero.design/screens/7e6f655c-8ea5-48c5-b2b9-497c3761ce70).

Answering an agent question is a mutation. Selecting an option is only local form state; the answer is not accepted, removed, or represented as complete until the host confirms the one-use, revision-bound ticketed mutation. The PWA must never call the extension directly, mint authority, bypass plan mode, enable `--full-access`, or optimistically collapse the question.

The feature reuses the shipped loopback relay, typed RPC, enrollment/authentication, redaction, sync, content-free push, and mutation-approval foundation. The visual treatment remains ink-on-parchment: bone `#f8f8f6`, carbon ink, and clay `#d97757` as the only accent. The warm, serif-led direction is informed by [Claude](https://refero.design/screens/ae30091c-0a6b-4316-b7c2-8f1506ca88ae), but its surface color is not copied because Pi Remote’s frozen tokens take precedence.

## 2. Build spec

### 2.1 Protocol and host authority

The typed contract belongs in `packages/pi-rpc-protocol`.

The relay remains a transport and authorization boundary.

The host or extension remains the owner of the pending question, its revision, its lifecycle, and the answer callback.

The PWA receives a redacted, display-safe, ephemeral representation.

The PWA never mutates the canonical transcript to answer the question.

I'M UNCERTAIN ABOUT THIS: the repository’s exact RPC envelope and pi extension symbol names were not supplied in the brief. The DTOs below define the feature contract and must be mapped onto the existing typed envelope without creating a second protocol or authorization path.

Use a discriminated inbound event named `session.ask-question.presented`.

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
    policyVersion: string;
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

`display.prompt` and option strings are already passed through the existing redaction policy.

They are not the raw extension payload.

They are delivered only to the enrolled, authenticated device that is authorized to view the session.

The display payload is held in volatile client state and is not written to transcript JSON, local storage, IndexedDB, service-worker caches, push payloads, or structured logs.

The host must reject a presentation with an empty question ID, duplicate option ID, duplicate question ID at the same revision, invalid selection mode, or an invalid free-text constraint.

Option IDs are opaque identifiers.

The PWA submits option IDs, not labels or extension values.

The host maps option IDs to the authoritative answer values.

Do not expose extension command values, filesystem paths, bytes, secrets, or raw callback parameters to the browser.

The transcript persistence representation is metadata-only.

```ts
type AskQuestionTranscriptMeta = Readonly<{
  kind: "ask-question";
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

The generic transcript serializer must refuse to serialize `display`, `answerCapability`, ticket values, or answer text.

The ephemeral display store is keyed by `questionId` and is separate from transcript state.

On reconnect, the client may receive a fresh redacted presentation for an active question through the authenticated interaction channel.

A generic transcript snapshot must contain only `AskQuestionTranscriptMeta`.

If the current sync implementation cannot replay an active question without embedding content in transcript JSON, the UI must show an unavailable state and request a fresh ephemeral presentation.

Do not silently broaden transcript persistence to solve reconnect behavior.

The answer intent is canonicalized before the ticket request.

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
```

`answerDigest` must use the canonicalization and digest helper already established by the mutation-approval boundary.

Do not introduce a feature-specific digest format if the protocol already has one.

The host issues a one-use ticket for the exact question, session, revision, enrolled device, mutation scope, and answer digest.

The PWA does not mint or broaden the ticket.

The commit request carries the full answer only across the authenticated, authorized mutation path.

```ts
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

The host recomputes the canonical answer digest.

The host rejects the commit if the digest does not match the ticket.

The host rejects the commit if the question is no longer pending.

The host rejects the commit if `expectedRevision` differs from the current host revision.

The host rejects the commit if the ticket is expired, already consumed, bound to another device, bound to another question, or scoped to another mutation.

Use a result that contains status and reason metadata, never an answer echo.

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

An accepted result must be emitted only after the extension confirms that the answer was accepted by pi.

A ticket consumption acknowledgement alone is not sufficient to show `answered` if the host has not confirmed the extension handoff.

The host emits a separate lifecycle event for withdrawal, expiration, or supersession.

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

The feature must use the shipped ticket handshake.

If the existing implementation combines ticket preparation and commit, preserve the same binding fields and enforce the same checks.

If the existing implementation separates preparation and commit, use the two DTOs above.

Do not create a PWA-only approval flow.

### 2.2 Component breakdown

Place the feature under `apps/pi-remote-web/src/features/ask-question/`.

The following names are component contracts; align exact filenames with the existing web surface conventions.

`AskQuestionCard.tsx` owns the inline panel, lifecycle state, focus entry, and submit orchestration.

`AskQuestionPrompt.tsx` renders the question marker, Source Serif 4 prompt, explanatory line, and read-only hint.

`AskQuestionOptionList.tsx` renders the semantic option collection and owns option focus order.

`AskQuestionOptionRow.tsx` renders one full-width option row as a React Aria Components `Button`.

`AskQuestionFreeText.tsx` renders the optional `TextField`, `Label`, `Input`, description, and validation message.

`AskQuestionSubmitButton.tsx` renders the clay submit action and its disabled, submitting, and error affordances.

`AskQuestionStatus.tsx` renders the live status text, progress hairline, and inline error.

`useAskQuestionState.ts` owns local selection, free-text, validation, and lifecycle transitions.

`useAskQuestionKeyboardNavigation.ts` owns roving focus and the card-local keyboard sequence.

`useAskQuestionMutation.ts` adapts the existing session RPC and ticketed mutation boundary.

`askQuestionEphemeralStore.ts` stores display content only in memory and exposes no transcript serializer.

`askQuestionTypes.ts` contains the web-safe view model derived from the typed protocol DTOs.

The root card should render as an inline `section` associated with the activity’s question heading.

The card should not use `Dialog`, `Modal`, `Popover`, `Sheet`, or a page-level focus trap.

The card should not add a second WebSocket or a second session transport.

The existing transcript renderer maps `kind: "ask-question"` to `AskQuestionCard`.

The `ActivityGroup` supplies chronological placement and stable `activityId` keys.

The card must remain keyed by `questionId` and `revision` so duplicate presentations are deduplicated.

`SessionComposer` remains the normal session composer.

It should not be replaced with the answer field.

It may remain available for ordinary user messages unless existing host session state already marks the session as unavailable.

The card’s answer field uses the same session identity and connection status as `SessionComposer`.

The card must not disable the whole transcript while it is pending.

When a card is focused inside a virtualized transcript, the renderer must preserve the focused card long enough to complete the interaction.

Unmounting an active card must not discard its mutation ID or cause a second submission.

### 2.3 Interaction: options, free-text, insertion

The host controls whether selection is single or multiple.

For `single`, selecting one option clears any previous option.

For `multiple`, selecting an option toggles only that option.

Selection is local form state until explicit submission.

A tap on an option row selects or toggles it.

An option row must not submit by itself.

Do not add a client-generated “skip” action.

If skipping is supported, the host must provide it as an ordinary option with its own opaque ID.

The card must not infer skip semantics from option text.

Option descriptions are optional and remain part of the redacted display payload.

Long labels wrap within the row.

Labels must not be truncated with an ellipsis when truncation would hide the answer.

If the host disallows free text, no input is rendered.

If free text is allowed and optional, the user may submit selected options, text, or both according to the protocol’s validation rules.

If free text is required, the submit action remains disabled until the trimmed value satisfies the local minimum validation.

The host remains authoritative for length, content, and answer validity.

The PWA should apply the host-provided `maxLength` as a usability limit, but must not treat it as a security boundary.

Free text is plain text only.

Do not interpret Markdown, HTML, shell syntax, or extension commands in the browser.

The placeholder is muted ink and must not carry required instructions that are absent from the label.

The submit button is disabled until the local answer is structurally valid.

Pressing Return in the single-line free-text field submits when the value is valid.

Return must not submit while an IME composition is active.

Blur never submits.

Selecting an option never submits.

The submit button enters `submitting` immediately after the ticketed request begins.

The card disables options, input, and submit while the current mutation is in flight.

A successful host confirmation collapses the card to a compact immutable `Answered` activity line.

An error preserves the user’s local answer, shows an inline clay error treatment, and re-enables the controls only if the host indicates the question remains answerable.

A revision mismatch, withdrawal, or expiration is terminal for that card.

The card must not silently retry a consumed ticket.

### 2.4 State model

Use an explicit state machine rather than independent booleans.

`presented` means the event is valid, no answer has been submitted, and no local interaction has changed the form.

`selecting` means the user has focused or changed an option or free-text value.

`submitting` means the card has begun the ticketed mutation flow and is waiting for host confirmation.

`answered` means the host and extension have confirmed the answer.

`error` means the last submission failed but the question may still be answerable.

`expired` means the host has ended the answer window.

`superseded` means the question’s revision no longer matches the current host state.

The allowed initial transition is:

`presented → selecting`.

A local selection or valid text edit moves the card to `selecting`.

The user may return from `selecting` to `presented` only if the form is restored to its untouched initial state.

The submit action moves `selecting → submitting`.

No transcript status changes to `answered` before the host result arrives.

An accepted host result moves `submitting → answered`.

An ordinary validation or transport failure moves `submitting → error`.

A host `invalid-ticket` result moves to `error` only if the question remains current and a fresh ticket may be requested.

A host `ticket-expired` result moves to `expired` unless a fresh presentation is received.

A host `revision-mismatch` result moves to `superseded`.

A host `question-withdrawn` result moves to `expired`.

A host `question-already-answered` result moves to `answered` only if the host also supplies the authoritative lifecycle confirmation.

A host `plan-mode-blocked` result moves to `error` with the controls disabled until the host supplies a new valid capability.

The `answered` state is immutable.

The answered line cannot be expanded to edit, resubmit, or change the response.

If an identical `questionId` and revision is replayed after `answered`, deduplicate it.

If the same question ID arrives with a higher revision, mark the older card `superseded` and render the new presentation at the new activity position.

If the host revision moves before submission, disable the card and show “Question changed on Mac.”

If the question is withdrawn, retain a compact immutable lifecycle line rather than deleting history.

If the session ends, mark the active question `expired`.

If the relay disconnects while selecting, preserve local form state but disable submit until the capability can be revalidated.

If the relay disconnects while submitting, do not automatically resend the same ticket.

Use the existing mutation status or idempotency query to determine whether the host accepted the request.

If no authoritative result is available, show an error that requires a fresh ticket or fresh presentation.

Do not tell the user that the answer was accepted based only on a network timeout.

### 2.5 Touch, gestures, and keyboard

Every option row, input, and submit action must have a minimum 44px CSS hit area, matching the iPhone thumb-target requirement.

The tappable region must include the full row, not only the label or check glyph.

Keep sufficient vertical separation between adjacent rows to reduce accidental taps.

Do not require a swipe, long press, drag, or hidden gesture to answer.

The card is fully usable with touch alone.

The default keyboard sequence is:

`first option → next option → last option → free-text input when present → submit`.

Use roving `tabIndex` for option rows.

At most one option row has `tabIndex="0"` at a time.

All other option rows have `tabIndex="-1"`.

Up and Down move the active option focus without changing selection.

Home moves to the first option.

End moves to the last option.

Tab and Shift+Tab move through the card’s explicit answer stops.

At the last option, Tab moves to free text when present, otherwise to submit.

From free text, Tab moves to submit.

Shift+Tab reverses that sequence.

Enter or Space on an option performs the same selection action as a tap.

Enter in free text submits when valid and not composing.

Space in free text remains a space.

Do not capture keyboard events from unrelated transcript controls.

Do not use a global focus trap.

When the question arrives, focus the first option after the card mounts if the user is not already typing or interacting elsewhere.

Do not steal focus from an active free-text field.

Use a visible clay focus ring that is not removed by theme or `outline: none`.

On touch-only devices, focus styling may follow the browser’s focus behavior, but all actions must remain visible through selected or status text.

Do not make the question depend on hover.

### 2.6 Visual, layout, and motion

Use the existing ink-on-parchment token system without adding colors.

Light mode uses bone `#f8f8f6` and carbon ink tokens.

Dark mode uses the existing dark parchment and ink tokens.

Clay `#d97757` is the only accent.

Do not introduce blue focus, green success, red error, purple status, or a second accent color.

Use Source Serif 4 for the question.

Use Inter for explanatory text, option labels, status text, field labels, and actions.

The question marker is small and typographic.

The card uses a hairline carbon-ink border and the existing radius token.

The card is visually distinct from ordinary transcript text without becoming a modal.

The card fills the available transcript width and does not exceed the existing readable content width.

Use the existing spacing scale rather than one-off layout constants.

Place the explanatory line between the question and options.

Render options as full-width elongated rows.

Unselected rows use a hairline ink outline.

Selected rows use a carbon-ink fill with a contrasting check glyph and explicit selected text for assistive technology.

Never use clay as the selected-row fill.

Use the existing neutral disabled treatment for disabled controls.

The submit action uses clay when enabled.

The submit action is visibly disabled when the answer is incomplete.

The free-text field shares the card’s border language.

The input must remain visible above the iPhone virtual keyboard.

When the keyboard opens, scroll the focused field into view without moving the transcript to a new route.

The submitting state shows the quiet word “Submitting…” and a thin progress hairline.

The progress hairline may animate only when motion is allowed.

The answered state is a compact line with a status glyph and text.

The answered line must remain understandable without color.

The card has no full-screen scrim.

The card has no modal shadow treatment.

The card has no drag handle.

The card does not imitate the full bottom-sheet treatment seen in [Meta AI](https://refero.design/screens/d64c8144-60b7-4f07-a9cc-4f2f14c7e5ad) or [Revolut](https://refero.design/screens/0ab3cc34-a1c1-4703-80c5-c2cecbdb9e09).

Use short opacity or transform transitions only for insertion and collapse.

Under `prefers-reduced-motion: reduce`, remove movement and progress animation while retaining the text status.

### 2.7 Accessibility and internationalization

The card exposes a labelled region associated with the question heading.

The option collection has a programmatic label such as “Answer options.”

Each option row is represented as a list item containing a React Aria Components `Button`.

Each option button exposes `aria-pressed="true"` or `aria-pressed="false"`.

The selected state is also represented in visible text or a check glyph with an accessible name.

Do not rely on fill, border, or clay alone to communicate selection.

The card’s question, explanatory line, option list, input, error, and status are connected with `aria-labelledby` and `aria-describedby`.

The arriving-question announcement uses a polite live region.

The announcement should identify that the agent is waiting for an answer without reading sensitive answer content twice.

The first option receives focus on initial arrival when doing so does not interrupt active typing.

The submitting status uses a polite status region.

The final answered state is announced once and remains visible in the transcript.

Errors are associated with the input or card and are announced without exposing ticket values or raw host diagnostics.

Do not expose the mutation ticket, answer digest, session secrets, or internal revision details to screen readers.

Use text labels that remain meaningful when option rows are read out of visual order.

Use logical CSS properties for margins, padding, borders, and alignment.

RTL layouts must preserve option order from the localized display payload and must not reverse opaque option IDs.

The check glyph does not need directional mirroring.

Use rem-based type and existing responsive tokens.

Support browser text zoom and large-text settings without clipping the prompt, option labels, input, or error.

Long translated prompts and options must wrap naturally.

Do not use fixed-height rows that clip multi-line labels.

Do not concatenate localized strings around dynamic question text.

Localize “Submitting…”, “Answered”, error messages, expired states, and read-only hints as separate strings.

Apply max length defensively by Unicode-aware user-perceived characters where the existing input utilities support it.

The host remains authoritative for byte limits and answer validity.

Verify WCAG AA contrast in both light and dark themes.

Verify the clay focus ring against both parchment surfaces.

Verify that selected carbon rows preserve AA contrast for labels and check glyphs.

### 2.8 Pass/fail acceptance checks

1. Given a valid `session.ask-question.presented` event, the transcript shows one inline `AskQuestionCard` at the event’s chronological position; a DOM inspection and screenshot show no modal, full scrim, or route change.

2. The card renders the prompt in Source Serif 4 and supporting copy in Inter; computed styles and a screenshot prove the typography assignment.

3. Every option row has a minimum 44px CSS height and a full-row interactive target; DOM inspection proves the minimum height and screenshot proves the hit-area layout.

4. In single-selection mode, selecting a second option clears the first option; a component test proves only one option has `aria-pressed="true"`.

5. In multiple-selection mode, selecting two options preserves both selections; a component test proves both buttons expose `aria-pressed="true"`.

6. A free-text field appears only when `freeText.allowed` is true; a fixture test proves the field is absent when false.

7. The submit button is disabled for an empty required free-text value and becomes enabled only after valid local input; DOM inspection proves the disabled state.

8. Blurring the input never submits; an interaction test proves no ticket or answer RPC is sent on blur.

9. Return submits valid single-line free text, while Return during IME composition does not submit; keyboard tests prove both paths.

10. Up, Down, Home, End, Tab, and Shift+Tab move through the declared option/input/submit sequence without leaving the card unexpectedly; keyboard automation records the focused element after each key.

11. Enter and Space on an option select or toggle that option without sending an answer mutation; RPC mocks prove no answer commit occurs before explicit submit.

12. The focus-visible state uses the clay focus ring and remains visible in both themes; screenshots prove the ring is not colorless or removed.

13. Submit enters `submitting`, disables the controls, shows “Submitting…”, and draws the progress hairline; a state test and screenshot prove all four conditions.

14. Two rapid taps on submit produce one `clientMutationId` and one mutation commit; an integration test proves no duplicate ticket consumption or extension callback.

15. An accepted host result collapses the card into one immutable answered line; a screenshot and DOM inspection prove the options and input are no longer actionable.

16. A rejected but retryable result preserves entered values, shows an inline error, and re-enables the controls; an integration fixture proves no optimistic answered state.

17. A revision mismatch or withdrawal disables the card and renders an expired or superseded lifecycle state; a host-event test proves no new answer request is possible.

18. The generic transcript serializer contains no prompt, option label, placeholder, answer text, ticket, or digest; a serialization test proves those keys and values are absent.

19. Push, structured logs, browser cache adapters, and telemetry fixtures contain only question/session identifiers, revision, lifecycle status, and redacted reason codes; boundary tests prove no content leakage.

20. With reduced motion enabled, the card retains status text and focus behavior but does not animate the progress hairline or collapse movement; a reduced-motion screenshot proves the static treatment.

## 3. Consensus vs divergence

### Consensus

The question belongs inline in the conversation rather than in a blocking overlay.

This is directly supported by the transcript-based option patterns in [Flo](https://refero.design/screens/167ba376-9401-4354-a5b3-c2d75822659d), [Grok](https://refero.design/screens/a0adc2f0-e148-4950-85f6-2ab5a8d6c5c2), and [Coinbase](https://refero.design/screens/d2b32a76-ef17-497f-b2ed-444a1e1a2f4c).

The card should use a question hierarchy rather than a colorful status banner.

[Chance AI](https://refero.design/screens/7e6f655c-8ea5-48c5-b2b9-497c3761ce70) and [WURRD](https://refero.design/screens/0a64c469-0028-4199-9ca0-a214529cab92) both show that a strong serif question and calm supporting copy can carry the interaction.

Options should be rows or pills, not a dropdown.

The full-width choice treatment is easier to hit with a thumb and makes the complete answer set visible.

The selected state should be typographic and structural.

[Fable](https://refero.design/screens/3c659c24-a5e1-440d-bcab-d550f6564000) provides a useful filled-versus-outlined precedent, but Pi Remote’s selected fill is carbon ink rather than a new chromatic token.

Free text belongs in the same question card.

[Rewind](https://refero.design/screens/d97afd4c-66ad-4ec7-a757-804e96f64a7d) and [Airbnb](https://refero.design/screens/77ea7b13-0d13-43df-82d2-7c6f589c0e95) support a direct input with concise guiding microcopy.

Submission must be explicit.

The card should communicate a quiet submitting state and wait for host confirmation.

The answer must not disappear immediately after a tap.

The card needs a compact terminal state that preserves transcript continuity.

[BoldVoice](https://refero.design/screens/cee551de-75f4-426d-aeb7-acd1a7a3c9db) supports retaining structured task and confirmation cues, translated here into the immutable answered line and progress hairline.

### Resolved divergences

Inline card versus modal is resolved in favor of inline.

The question is part of the transcript and must not use a full scrim or focus trap.

A bottom-sheet or permission-style treatment is rejected for this feature even though [Meta AI](https://refero.design/screens/d64c8144-60b7-4f07-a9cc-4f2f14c7e5ad), [Genie](https://refero.design/screens/e0f5f23c-991e-41a5-90b3-2db267ed171d), and [Revolut](https://refero.design/screens/0ab3cc34-a1c1-4703-80c5-c2cecbdb9e09) show credible alternatives.

Dropdown versus visible options is resolved in favor of visible rows.

The agent’s complete set of choices should be available without an additional opening gesture.

Choice selection versus submission is resolved as two separate actions.

A tap or key press selects locally.

Only the explicit submit action enters the mutation path.

Optimistic collapse versus host confirmation is resolved in favor of host confirmation.

A pending ticket is not an answer.

A network request is not an answer.

Only the accepted host and extension result is an answer.

Colorful success/error versus typographic status is resolved in favor of typography and existing clay usage.

Clay is reserved for the submit action, focus ring, and inline error emphasis.

No new success or failure color is introduced.

The phone versus host authority boundary is resolved in favor of the existing relay and ticket system.

The PWA renders and requests.

The host validates, authorizes, consumes, and hands off.

### Minority ideas worth retaining

Retain the optional skip-path concept from [Chance AI](https://refero.design/screens/7e6f655c-8ea5-48c5-b2b9-497c3761ce70) only when pi supplies skip as an explicit option.

Retain the assistant-message-plus-replies rhythm from [Flo](https://refero.design/screens/167ba376-9401-4354-a5b3-c2d75822659d) and [Coinbase](https://refero.design/screens/d2b32a76-ef17-497f-b2ed-444a1e1a2f4c) as the transcript insertion model.

Retain the calm centered microcopy discipline from [Genie](https://refero.design/screens/e0f5f23c-991e-41a5-90b3-2db267ed171d), but keep the card inline.

Retain the progress and confirmation cue from [BoldVoice](https://refero.design/screens/cee551de-75f4-426d-aeb7-acd1a7a3c9db), but represent it as a hairline and status line rather than a large task box.

Retain the calm option-bubble spacing from [Kin](https://refero.design/screens/a2eb19b9-e18b-45ae-ae81-bad865d414d5), translated into Pi Remote’s hairline-row system.

Retain the warm parchment mood of [Claude](https://refero.design/screens/ae30091c-0a6b-4316-b7c2-8f1506ca88ae) without copying its surface token.

## 4. Security & redaction

The phone is an enrolled operator device, not the authority that owns pi execution.

Tailscale provides private transport context, not permission to mutate.

The relay may authenticate, authorize the enrolled session, route messages, and enforce the existing boundary.

The relay must not answer the extension question on behalf of the host.

The host owns the pending question and validates every lifecycle transition.

The extension callback is invoked only after host validation and accepted ticket consumption.

Answering a question is always scoped as `ask-question.answer`.

The mutation must carry `sessionId`, `questionId`, `expectedRevision`, ticket, answer digest, and client mutation ID.

The ticket must be one-use.

The ticket must be bound to the enrolled device or existing device principal.

The ticket must expire.

The ticket must be bound to the exact question and host revision.

The ticket must not grant `--full-access`.

The ticket must not change plan mode.

The ticket must not be reusable for another question.

The ticket must not be accepted after the question is withdrawn or superseded.

The host must fail closed when any binding is absent, malformed, stale, or unverifiable.

The PWA must not optimistically update the canonical transcript.

Local selection is not a security decision.

The host must revalidate the answer against the authoritative option set.

Unknown option IDs must be rejected.

Duplicate option IDs must be rejected unless the protocol explicitly permits them.

Multiple free-text and option combinations must be validated by the host, not only the browser.

The host must enforce the final maximum length and content policy.

The extension must receive the answer only through the host’s existing controlled callback.

The narrow plaintext exception is the authorized in-memory render path and the authorized host-to-extension handoff required to perform the answer.

All serializable, observable, persisted, cached, pushed, or logged representations must use redacted content.

The extension-to-host raw payload must not enter relay logs.

The host-to-relay display payload must use the existing redaction helper before transmission.

The relay-to-PWA display payload must contain only redacted, authorized display strings.

The PWA-to-relay answer request may contain operator-entered free text only because the host must consume it, but relay logs and diagnostics must redact it.

The host-to-extension answer handoff must not be written to transcript JSON or telemetry.

The answer text should be released from client memory after accepted, terminal rejection, expiration, or supersession.

The raw question and option text should be released from the ephemeral store when the card reaches a terminal state unless the existing transcript view still requires a live render.

Do not write question text, option labels, free-text answers, ticket values, or answer digests to local storage.

Do not put question text or option labels in URLs, query strings, push payloads, browser titles, service-worker cache keys, or notification bodies.

Content-free push may identify that a session requires attention using session and question metadata only.

Push must not contain the prompt, options, answer, extension command, or secret-bearing context.

Structured logs may include lifecycle status, revision, question ID, session ID, redaction policy version, reason code, and latency.

Structured logs must not include prompt text, option text, free text, tickets, digests, or raw RPC payloads.

Error messages shown in the UI must use stable reason codes mapped to safe localized copy.

Do not surface host stack traces or extension error objects.

Telemetry must distinguish presented, submit-started, accepted, rejected, expired, and superseded without content fields.

A client retry must use a fresh ticket if the original ticket was consumed or its status is unknown.

The existing idempotency mechanism may return metadata for the same `clientMutationId`.

Any idempotency record must contain no answer text.

Plan-mode enforcement remains host- and extension-enforced.

The phone cannot enable operator-only `--full-access`.

A question that would cause a state change must show the muted-ink “read-only until confirmed” hint when `requiresReadOnlyHint` is true.

The hint explains the boundary without implying that a selection has already been sent.

## 5. Open questions + risks

The exact pi ask-question extension payload and callback contract are UNKNOWN from the supplied brief.

Map the feature DTO to the extension’s real single-choice, multi-choice, free-text, cancellation, and validation semantics before implementation.

The existing typed RPC envelope names are UNKNOWN from the supplied brief.

Reuse the package’s current envelope, schema validation, error conventions, and revision type.

The existing ticket API’s exact prepare-versus-commit sequence is UNKNOWN.

Confirm whether the ticket is pre-issued with the presentation or requested after the user creates an answer digest.

Do not invent a parallel ticket service.

The ticket lifetime is UNKNOWN.

Choose a short host-controlled lifetime that accommodates reading and keyboard entry without allowing stale questions to remain answerable indefinitely.

The host revision increment rules are UNKNOWN.

Confirm whether every session event advances the revision or only mutations and question lifecycle changes.

The active-question replay behavior after relay restart is UNKNOWN.

Define whether the host replays the pending question through an ephemeral channel or requires a fresh presentation event.

Do not add question content to generic transcript snapshots to solve this gap.

Concurrent pending questions are UNKNOWN.

Prefer one active answerable question per session unless pi explicitly supports multiple pending prompts.

If multiple questions are supported, each card needs an independent ticket, revision, lifecycle, and focus entry.

Redaction can make a prompt or option unusable.

If the redaction policy removes required display content, show a safe unavailable state and prevent submission.

Do not attempt to reconstruct redacted text on the phone.

Untrusted or extremely long prompt text can destabilize the layout.

Use plain-text rendering, host-side bounds, natural wrapping, and overflow-safe layout.

Do not render prompt text as HTML or Markdown.

An agent question can contain instruction-like text.

Treat it as display content, not as a new instruction to the PWA or operator.

The phone keyboard can cover the lower part of the card.

Use the existing viewport and scroll-into-view behavior, and verify on an installed iPhone PWA with the keyboard open.

A user may leave the card while a mutation is submitting.

Keep the state visible in the transcript and prevent a second submission on return.

A lost network response can leave the ticket status unknown.

Use the existing idempotency or mutation-status mechanism; never infer acceptance from a timeout.

A host revision can change while the operator is composing free text.

Supersede the card visibly and preserve no path for stale submission.

A screen reader may receive both the live arrival announcement and the focused option label.

Keep the announcement concise and test the order with VoiceOver-style semantic inspection where available.

Large-text settings may make the card tall.

Do not force a fixed-height card or fixed-height option rows.

RTL may expose assumptions in arrow, padding, and status alignment.

Use logical properties and test both direction modes.

The target bar references OpenCode, Claude, and Codex ask-question experiences, but no direct mobile capture of the full terminal interaction was supplied.

Mobile adaptation is therefore derived from adjacent inline question, choice, input, permission, and confirmation patterns.

There are no Mobbin captures.

Mobbin returned zero on all queries, so no Mobbin URL is cited.

There are no true terminal-style CLI ask captures in the supplied evidence.

There are no direct Dot, Manus, or Pi mobile captures in the supplied evidence.

There is no mobile capture of keyboard Arrow/Tab option navigation.

There is no mobile capture of the host-confirmed, revision-bound ticket state machine.

Those keyboard and ticket-state decisions are specification decisions grounded in the adjacent reference patterns and frozen Pi Remote security contracts.

The references are directional evidence, not claims that the cited products use Pi Remote’s security model.

The frozen ink-on-parchment system overrides the exact colors or typography of every reference screen.

## 6. Sources

### Pi and Pi Remote

- Frozen Pi Remote product context supplied for this packet.
- `packages/pi-rpc-protocol` typed RPC surface described in the product context.
- `apps/pi-remote-relay` loopback relay and host authority described in the product context.
- `apps/pi-remote-web` React 19, Vite, Tailwind 4, React Aria Components, transcript, `ActivityGroup`, and `SessionComposer` surface described in the product context.
- `extensions/pi-remote-approval` and the shipped one-use, revision-bound mutation-approval boundary described in the product context.
- Frozen ink-on-parchment design system: bone `#f8f8f6`, carbon ink, clay `#d97757`, Inter, Source Serif 4, light and dark themes, WCAG AA.
- Frozen security contracts: read-only by default, host-confirmed mutations, redaction everywhere, content-free push, host-enforced plan mode, and phone-inaccessible `--full-access`.

### Interaction and implementation

- React Aria Components primitives already specified by the Pi Remote web stack: `Button`, `TextField`, `Input`, `Label`, `Text`, and semantic focus/selection behavior.
- Tailwind 4 token and responsive styling conventions already specified by the Pi Remote web stack.
- Existing transcript and `ActivityGroup` insertion model described in the product context.
- Existing `SessionComposer` session context and transport ownership described in the product context.
- Reference-backed interaction synthesis from the fourteen Refero captures listed below.

### Accessibility, iPhone, and web platform

- WCAG AA is a frozen Pi Remote product requirement.
- iPhone PWA behavior is a product constraint, including thumb-sized targets, virtual keyboard occlusion, touch-only operation, and installed-PWA viewport behavior.
- Reduced-motion support is a product requirement.
- Dynamic text sizing, RTL layout, semantic focus, live-region announcements, and non-color state communication are build requirements in this synthesis.
- No external accessibility, iPhone, or web-platform URL is cited because the brief supplied no approved URL for this packet.

### Mobile interaction references

- [Chance AI — inline question card with choice options](https://refero.design/screens/7e6f655c-8ea5-48c5-b2b9-497c3761ce70)
- [Flo — chat question with tappable choices](https://refero.design/screens/167ba376-9401-4354-a5b3-c2d75822659d)
- [Fable — free text with pill multi-select](https://refero.design/screens/3c659c24-a5e1-440d-bcab-d550f6564000)
- [Grok — inline selectable choices](https://refero.design/screens/a0adc2f0-e148-4950-85f6-2ab5a8d6c5c2)
- [Rewind — direct free-text Ask surface](https://refero.design/screens/d97afd4c-66ad-4ec7-a757-804e96f64a7d)
- [Meta AI — inline bottom-sheet action card](https://refero.design/screens/d64c8144-60b7-4f07-a9cc-4f2f14c7e5ad)
- [Genie — editorial permission and confirmation ask](https://refero.design/screens/e0f5f23c-991e-41a5-90b3-2db267ed171d)
- [Revolut — question modal with drag handle and options](https://refero.design/screens/0ab3cc34-a1c1-4703-80c5-c2cecbdb9e09)
- [Claude — warm parchment chat with serif prompt](https://refero.design/screens/ae30091c-0a6b-4316-b7c2-8f1506ca88ae)
- [WURRD — typographic quiz question card](https://refero.design/screens/0a64c469-0028-4199-9ca0-a214529cab92)
- [Airbnb — free-text Ask surface with guiding microcopy](https://refero.design/screens/77ea7b13-0d13-43df-82d2-7c6f589c0e95)
- [BoldVoice — structured task, progress, and confirmation](https://refero.design/screens/cee551de-75f4-426d-aeb7-acd1a7a3c9db)
- [Kin — calm option-bubble layout](https://refero.design/screens/a2eb19b9-e18b-45ae-ae81-bad865d414d5)
- [Coinbase — assistant prompt followed by tappable replies](https://refero.design/screens/d2b32a76-ef17-497f-b2ed-444a1e1a2f4c)
