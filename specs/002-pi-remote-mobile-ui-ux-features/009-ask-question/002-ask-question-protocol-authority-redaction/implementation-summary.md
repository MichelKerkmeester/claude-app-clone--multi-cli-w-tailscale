# Implementation Summary — 009 Phase 1 (ask-question protocol, host authority, redaction)

## Final state — COMPLETE

The typed, host-owned ask-question answer-mutation lane is built and verified: strict protocol DTOs + guards,
one-use revision/device/digest-bound ticketing, a single-flight host commit lane with fresh pre-handoff
re-read, metadata-only redacted persistence with a separate volatile display read, content-free push, and a
confirmed host→extension callback boundary. No web card UI (Phase 2). Built by GPT-5.6 Luna Max (Codex CLI);
orchestrated, security-reviewed, and independently verified by Claude on `main` outside the codex sandbox.
This phase followed the hard-gate: a pre-build adversarial security review (`../adversarial-security-review.md`)
found 5 MUST-FIX gaps; their resolutions were folded into the spec (committed `861b74c`) and implemented here.

## The 5 MUST-FIX, as implemented (mirroring the shipped change-model lane)

- **MF1 — display never touches the persist/redact path.** `store/redaction.ts` THROWS
  (`isAskQuestionDisplayCarrier`) if any `display`-bearing payload reaches `appendEnvelope`; only the
  metadata-only `AskQuestionTranscriptMeta` block is persisted/redacted. Display (prompt/labels/placeholder)
  is emitted solely by the `projectAskQuestionDisplay` allowlist projector over an authenticated **volatile
  read** keyed by question+revision — never through `redactEnvelope`.
- **MF2 — single-flight + atomic settle stops the two-distinct-ticket double-answer.** `ask-question-service.ts`
  `enqueueQuestionMutation` serializes commits per question; the `pending → settling` transition is
  **synchronous with no `await` above it** (the double-answer barrier), and `consumeAskQuestionTicket` deletes
  the ticket before comparing the binding (atomic one-use).
- **MF3 — fresh authoritative re-read before handoff.** Inside the lane, `readFreshQuestion` re-verifies the
  question is still pending at the ticket-bound revision immediately before handoff, failing closed on any
  move; the extension adapter independently re-validates against Pi's current pending question.
- **MF4 — unambiguous digest.** `askQuestionAnswerDigest = sha256(canonicalizeAskQuestionAnswer(answer, {questionId, expectedRevision, principal}))`
  with `optionIds` sorted before hashing; the host compares its recompute to `ticket.boundDigest`, not the
  transmitted digest.
- **MF5 — terminal `delivery-unknown`.** A lost/exception handoff settles as terminal `delivery-unknown`
  (question leaves `pending`, so no re-answer), reconciled only by `clientMutationId`; a clean rejection
  reverts to `pending` (retryable). The state machine never routes `delivery-unknown` back to submitting.

Folded SHOULD-FIX: mint-time freshness (SF1), exact-key DTO bounds + `DIGEST_PATTERN` (SF2), foreground +
rate-limit on both answer routes (SF4), structural fail-closed transcript guard (SF5), selection-count
semantics (SF3), `policyVersion:number` (SF8). SF6 (real Pi callback names) is a documented integration-time
assumption in the adapter — capability gated, verified before real use.

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- **Scope:** only the plan's allowed paths (protocol types/guards/index/approval + tests; relay auth/http/
  store/sync/rpc + new `ask-question-service.ts`; extension boundary; relay/protocol tests). **No web file
  touched** (Phase 2). `push-service.ts` intentionally unchanged (`serializePushHint` already content-free).
- **Gates (final state, outside sandbox):** `npm run build` 0; `npm run typecheck` 0; `npm test`
  **360 passed / 47 files** (+17 over 343 — ask-question + mutation-lane + negative controls; the in-sandbox
  `listen EPERM` 302/57 is a false loopback artifact, all pass outside); `npm run test:web` **613 passed**
  (unchanged). ESLint on changed files: 0.
- **Negative controls (pass in the 360):** two-distinct-ticket double-answer rejected before handoff;
  stale-revision-at-handoff rejected; answer-swap (wrong bytes / matching transmitted digest) rejected;
  multi-select order-independence; terminal delivery-unknown (no retry); duplicate identity; callback
  supersession; and **display-content leakage** (a `prompt`/`answer`-bearing block throws at persistence).
- **Security sign-off (diffs read):** MF1–MF5 as above; `ask-question.answer` is phone-grantable but NOT
  host-authoritative in the default-deny `policy.ts`; plan mode + `--full-access` remain phone-inaccessible;
  redaction-before-persistence + content-free push confirmed.

## Continuation

Next: Phase 2 (`003-inline-card-options-freetext-state-machine`) — the web inline card + option controls +
free-text + client state machine that consumes this lane (the volatile display read, the ticket/answer routes,
and the accepted/rejected/delivery-unknown result states). Phase 3 (`004-...`) is keyboard/a11y/release
hardening.
