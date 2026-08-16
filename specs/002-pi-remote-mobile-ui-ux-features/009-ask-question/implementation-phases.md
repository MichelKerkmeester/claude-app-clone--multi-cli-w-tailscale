# F9 — Implementation phases

## Phase 1 — Ask-question protocol, host authority, and redaction

> **Gated — release-blocking.** The adversarial security/redaction review (`roadmap.md` → Hard gates §3) must sign off on this spec before this phase begins. It is a prerequisite, not just an exit check.

### Objective

Establish the complete non-visual ask-question mutation lane first: typed presentation and lifecycle contracts, host-owned pending-question state, exact one-use ticket binding, revision checks, redaction, content-free push, and confirmed extension handoff.

### Scope

This phase covers `packages/pi-rpc-protocol`, `apps/pi-remote-relay`, and `extensions/pi-remote-approval`. It does not build the card UI. The implementation must reuse the existing `Envelope`, `AuthService`, `ApprovalService` patterns, `RelayStore`, `SyncHub`, redaction policy, and final extension boundary.

### Concrete tasks

- Update `packages/pi-rpc-protocol/src/types.ts` with the ask-question presentation, lifecycle, metadata-only transcript, answer, ticket request, answer request, and result DTOs.
- Update `packages/pi-rpc-protocol/src/guards.ts` and `src/index.ts` with strict guards and exports for every new DTO. Reject duplicate option IDs, invalid IDs, invalid revisions, invalid free-text constraints, malformed redaction metadata, and unknown reason values.
- Reuse `packages/pi-rpc-protocol/src/approval.ts` canonical JSON and SHA-256 helpers for `answerDigest`. Add only a generic adapter if the existing helper cannot represent the typed answer; do not create a parallel digest format.
- Add protocol coverage in `packages/pi-rpc-protocol/tests/guards.test.ts` and a new `packages/pi-rpc-protocol/tests/ask-question.test.ts`.
- Add `apps/pi-remote-relay/src/ask-question/ask-question-service.ts` for pending-question ownership, question identity, revision lifecycle, redacted presentation, answer validation, idempotency, and host-confirmed extension handoff.
- Extend `apps/pi-remote-relay/src/auth/policy.ts` and `src/auth/auth-service.ts` with explicit answer-ticket and answer actions and exact ticket bindings for session, question, revision, device, mutation scope, digest, expiry, and one-use consumption.
- Add authenticated answer-ticket and answer handling in `apps/pi-remote-relay/src/http/server.ts`. The route must consume the ticket only after request-shape validation and must return safe status/reason metadata without answer echoes or raw host diagnostics.
- Route the host’s real Pi ask-question event and answer callback through `apps/pi-remote-relay/src/rpc/demux.ts` and `src/rpc/supervisor.ts` without exposing raw extension payloads to the browser.
- Update `apps/pi-remote-relay/src/store/redaction.ts` with an allowlisted display projection and content-free lifecycle projection. Redact before persistence and before broadcast.
- Update `apps/pi-remote-relay/src/store/relay-store.ts` and `src/store/transcript-projector.ts` so transcript persistence contains only `AskQuestionTranscriptMeta`; reject `display`, answer text, tickets, digests, and raw callback fields.
- Update `apps/pi-remote-relay/src/replay/sync.ts` to deliver fresh redacted presentations and lifecycle events through the existing authenticated sync channel.
- Update `apps/pi-remote-relay/src/push/push-service.ts` so pending-question attention hints contain only opaque metadata and lifecycle class.
- Extend `extensions/pi-remote-approval/src/index.ts` with the confirmed adapter for the real Pi ask-question callback. The extension must reject unavailable authority, stale revision, invalid plan state, invalid answer values, and any attempt to enable `--full-access`.
- Add relay tests in `apps/pi-remote-relay/tests/ask-question.test.ts`, `mutation-lane.test.ts`, `redaction.test.ts`, `sync.test.ts`, `push.test.ts`, and `authority-loop.test.ts`.
- Extend `extensions/pi-remote-approval/tests/final-boundary.test.ts` with negative controls proving that ticket consumption, host confirmation, and extension acceptance are all required.

### Verification gate

- `npm run typecheck` exits 0.
- `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- Security review for this mutation lane confirms one-use ticketing, exact revision and digest binding, device binding, fail-closed behavior, redaction before persistence/broadcast, content-free push, host/extension plan-mode enforcement, and phone-inaccessible `--full-access`.
- The serialized transcript, push payload, logs, telemetry fixtures, and extension handoff fixtures contain no question content, answer text, ticket, digest, or raw callback data.

### Acceptance

- A valid host presentation is typed, guarded, redacted, and delivered through the existing envelope and authenticated relay.
- The host owns pending-question lifecycle and rejects malformed, duplicate, stale, withdrawn, expired, superseded, or unavailable questions.
- The answer-ticket request binds the exact digest, question, revision, device, and scope.
- The answer commit recomputes the digest, consumes the ticket once, checks the current revision, and rejects any mismatch before extension handoff.
- The extension callback runs only after host validation and accepted ticket consumption.
- Accepted state is emitted only after Pi confirms the answer.
- Unknown delivery is non-accepted and does not trigger an automatic retry.
- Transcript, cache-facing sync, push, logs, telemetry, and diagnostics remain content-free outside the authorized volatile render and host-to-extension handoff paths.

## Phase 2 — Inline ask-question card, options, free-text, and non-optimistic state machine

### Objective

Render the host-confirmed presentation as an inline transcript card with local option/free-text state and an explicit, non-optimistic answer mutation flow.

### Scope

This phase covers the web feature implementation and its integration with the existing transcript, virtualizer, `ActivityGroup` placement, session context, and relay client. It establishes the complete `presented`, `selecting`, `submitting`, `answered-immutable`, `error`, `expired`, and `superseded` behavior before device hardening.

### Concrete tasks

- Add `apps/pi-remote-web/src/features/ask-question/askQuestionTypes.ts` for the web-safe view model derived from the guarded protocol DTOs.
- Add `apps/pi-remote-web/src/features/ask-question/askQuestionEphemeralStore.ts` for volatile display content keyed by `questionId` and revision. Expose no transcript serializer and no persistence adapter.
- Add `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` as the inline `section` that owns lifecycle state, local form state, focus entry, and submit orchestration.
- Add `AskQuestionPrompt.tsx`, `AskQuestionOptionList.tsx`, `AskQuestionOptionRow.tsx`, `AskQuestionFreeText.tsx`, `AskQuestionSubmitButton.tsx`, and `AskQuestionStatus.tsx` under `apps/pi-remote-web/src/features/ask-question/`.
- Add `useAskQuestionState.ts` for single/multiple selection, required free-text validation, local restoration to `presented`, retryable errors, terminal lifecycle states, and immutable answered state.
- Add `useAskQuestionMutation.ts` to adapt the existing authenticated relay and ticketed mutation boundary. It must deduplicate by `clientMutationId`, never retry a consumed ticket, and never infer acceptance from timeout.
- Update `apps/pi-remote-web/src/relay.ts` with guarded answer-ticket, answer-commit, and lifecycle/status calls using the existing `postJson` and session identity.
- Update `apps/pi-remote-web/src/state.ts` to accept metadata-only ask-question blocks and preserve question identity and revision through sync normalization.
- Update `apps/pi-remote-web/src/App.tsx` to render `AskQuestionCard` at the correct transcript position, keep the card standalone rather than folding it into routine evidence, and preserve focused cards during virtualized measurement and updates.
- Update `apps/pi-remote-web/src/turns.ts` only as needed to keep ask-question blocks in chronological turn order without mutating or dropping existing blocks.
- Update `apps/pi-remote-web/src/cache.ts` so cached read-only snapshots exclude ephemeral display and answer state.
- Update `apps/pi-remote-web/src/style.css` with the existing parchment, carbon, clay, typography, spacing, border, selected-row, disabled, focus, status, and responsive tokens. Do not add accent colors.
- Keep `apps/pi-remote-web/src/SessionComposer.tsx` as the ordinary session composer and reuse its session/connection context without replacing or globally disabling it.
- Add component and state coverage in `apps/pi-remote-web/tests/ask-question.test.tsx` and extend `apps/pi-remote-web/tests/App.test.tsx` and `tests/contrast.test.tsx`.
- Verify option selection, free-text appearance, disabled submit, no-submit-on-blur, no-submit-on-selection, host-confirmed collapse, retryable error preservation, terminal lifecycle states, and duplicate-submit prevention.

### Verification gate

- `npm run typecheck` exits 0.
- `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- `npm run test:web` exits 0.
- A true-390px CDP run passes in light and dark themes with the card inline, options fully visible, no modal or route change, and the focused free-text field scrolled above the virtual keyboard.
- Web tests prove that selection stays local until explicit submit and that accepted state appears only after the host result.

### Acceptance

- A valid presentation renders as one inline card inside the existing transcript renderer.
- The card presents the redacted prompt, options, optional descriptions, optional free text, read-only hint, and explicit submit action.
- Single and multiple selection semantics match the host-provided selection mode.
- Required free text validates locally without becoming the host’s security boundary.
- Selection, blur, and free-text edits never send an answer mutation.
- Submit enters `submitting`, disables card controls, and displays safe status.
- Retryable errors preserve local values and do not collapse the card.
- Accepted host confirmation produces one answered-immutable line with no actionable controls.
- Revision mismatch, withdrawal, expiry, and supersession remain terminal and block stale submission.
- The normal transcript, composer, cache, and push behavior remain intact.

## Phase 3 — Keyboard and thumb navigation, accessibility, visual, and iPhone/PWA release hardening

### Objective

Harden the completed card for keyboard, touch, screen reader, visual, responsive, reduced-motion, RTL, large-text, installed-PWA, and release-boundary behavior.

### Scope

This phase covers the interaction details that depend on the completed card and protocol lane: roving focus, initial focus, keyboard composition behavior, semantic announcements, WCAG AA contrast, 390px iPhone layout, virtual keyboard occlusion, dark mode, reduced motion, RTL, browser zoom, and PWA cache/push review.

### Concrete tasks

- Add `apps/pi-remote-web/src/features/ask-question/useAskQuestionKeyboardNavigation.ts` with card-local roving focus, Home/End, Up/Down, Tab/Shift+Tab, Enter/Space, IME-aware Return, and focus restoration.
- Complete `apps/pi-remote-web/src/features/ask-question/AskQuestionCard.tsx` focus entry so initial arrival does not interrupt active typing or unrelated transcript controls.
- Update `apps/pi-remote-web/src/style.css` with visible clay focus rings, logical properties, no fixed-height text rows, responsive spacing, virtual-keyboard-safe scroll behavior, reduced-motion media handling, and light/dark token checks.
- Extend `apps/pi-remote-web/tests/ask-question.test.tsx`, `tests/App.test.tsx`, and `tests/contrast.test.tsx` with semantic roles, `aria-pressed`, labelled regions, live regions, error associations, focus order, large text, RTL, reduced motion, and non-color state checks.
- Verify `apps/pi-remote-web/public/fonts/font-assets.json`, `public/manifest.webmanifest`, and `public/service-worker.js` do not introduce a second font token, cache question content, or place question data in notification or cache boundaries.
- Run true-390px CDP checks in light and dark themes with touch-sized options, long translated labels, required free text, keyboard open, submission in progress, error, answered, expired, and superseded states.
- Run browser zoom and large-text checks to confirm prompt, labels, options, input, errors, and status wrap without clipping.
- Run RTL checks to confirm logical spacing and localized option order without reversing opaque option IDs.
- Run reduced-motion checks to confirm status and focus remain visible while progress and collapse motion are removed.
- Re-run `apps/pi-remote-relay/tests/redaction.test.ts`, `push.test.ts`, `sync.test.ts`, `authority-loop.test.ts`, and `apps/pi-remote-relay/tests/ask-question.test.ts` after the web release hardening changes.
- Re-run `extensions/pi-remote-approval/tests/final-boundary.test.ts` and confirm the phone still cannot enable plan-mode changes or operator-only `--full-access`.

### Verification gate

- `npm run typecheck` exits 0.
- `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- `npm run test:web` exits 0.
- True-390px CDP verification passes in light and dark themes with keyboard-open and touch-only paths.
- Keyboard, screen-reader semantics, RTL, large-text, reduced-motion, and WCAG AA contrast checks pass.
- The final cache, push, log, telemetry, transcript, and extension-boundary sweep contains no task-created question content, answer text, ticket, digest, or raw callback residue.

### Acceptance

- The declared option/input/submit keyboard sequence works without leaving the card unexpectedly.
- Touch targets are at least 44px and remain usable at a true 390px viewport.
- Initial focus is helpful and never steals focus from active typing or unrelated controls.
- `aria-pressed`, labels, descriptions, status, errors, and live announcements expose the complete state without secrets.
- Light and dark themes use only bone/parchment, carbon ink, and clay accent tokens with WCAG AA contrast.
- Selected rows use carbon ink rather than clay and communicate selection without color alone.
- Large text, browser zoom, long translations, and RTL layouts do not clip or reorder answer meaning.
- Reduced motion removes movement while preserving status, focus, and completion feedback.
- The virtual keyboard never obscures the focused field or submit action.
- The PWA remains read-only by default, uses content-free push, and cannot mint authority, bypass plan mode, or enable `--full-access`.
- The complete protocol, relay, extension, web, accessibility, visual, and device gates pass from the final state.
