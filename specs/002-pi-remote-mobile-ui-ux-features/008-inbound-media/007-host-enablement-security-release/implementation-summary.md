# Implementation Summary — 008 Phase 6 (host enablement + security release machinery)

## Final state — MACHINERY CODE-COMPLETE + automated-verified; capability OFF; operator/security-owner items PENDING

The host-enablement and security-release machinery is built and verified: the relay separates
`artifact:publish` from `artifact:read` (neither phone-grantable), the extension publish path is
snapshot-gated and allowlist-only, Plan mode denies publication, the emergency disable clears mutation
families with a kill-switch and no fallback, and a full negative-control suite rejects every specified attack
vector. **The inbound-media capability stays OFF (default-deny) — this phase does NOT enable the feature.**
Built by GPT-5.6 Luna Max (Codex CLI); orchestrated, security-reviewed, and independently verified by Claude
on `main` outside the codex sandbox. Physical-device, real-pinned-host, and security-owner items are
deliberately left PENDING (Phase-6 enablement prerequisites) — not fabricated.

## What shipped

- **`apps/pi-remote-relay/src/auth/policy.ts`** — `READ_ONLY_ACTIONS = ['artifact:read']` and
  `HOST_AUTHORITATIVE_ACTIONS = ['artifact:publish']` as distinct action classes. `isPhoneGrantableAction`
  excludes BOTH publish (host-authoritative) and read (read-only) — the phone can grant neither.
- **`apps/pi-remote-relay/src/policy/mutation-policy.ts`** — emergency disable sets `enabled=false`, CLEARS all
  mutation families, emits a `kill-switch` disable event, and returns with NO fallback (no stdout/path/URL/
  base64/raised-limit/persistence). Fail-closed.
- **`extensions/pi-remote-inbound-media/src/index.ts`** — the publish seam is gated on the runtime snapshot
  (`media.enabled === true && media.imageIn === true`); absent/disabled ⇒ never subscribes or publishes.
  `ALLOWLISTED_INBOUND_MEDIA_SOURCES = ['tool_result','assistant_output','extension']` — only these publish.
  The publish ticket (`issueArtifactPublishTicketForExtension`/`consumeArtifactPublishTicket`) is one-use,
  extension-only, and bound to origin+principal+hostExtension+revision.
- **`extensions/pi-remote-plan/src/index.ts`** — Plan-mode action split; host-authoritative media tools are
  denied in Plan mode; unknown tools stay default-deny.
- **`scripts/release-verify.mjs`** — the release/rollback/kill-switch boundary gate (read-only /
  protected-mutation / optional-push readiness), with a no-committed-media sweep and no sensitive-value logging.
- **Tests:** `apps/pi-remote-relay/tests/security/negative-controls.test.ts` (wrong origin/principal/device,
  stale revision, replayed/expired ticket, path injection, symlink, polyglot bytes, scanner timeout, forced
  byte flip — all REJECTED); `apps/pi-remote-relay/tests/inbound-media-publish.test.ts` (deterministic
  synthetic host-to-relay lifecycle: pre-stdout interception → processing → ready/withheld → exact read →
  revocation → expiry); extension `publish.test.ts` / `publisher-boundary.test.ts`.
- **`scripts/inbound-media-cdp.mjs`** — an `end-to-end` fixture (see Known gaps: it currently hangs on init).
- **Untouched:** relay web SW/CSP/`main.tsx`/`index.html` — no white-screen surface changed.

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- **Scope:** only the plan's allowed paths (extension seam + relay policy + relay/extension tests +
  release-verify + CDP harness). No web SW/CSP/main.tsx/dependency touched; no committed media/binary/cache.
- **Gates (final state):** `npm run build` 0; `npm run typecheck` 0; `npm test` **343 passed / 45 files**
  (+7 over 336 — the new negative controls + publish-ticket + policy tests; the in-sandbox `listen EPERM`
  285/57 the model saw is a false loopback artifact, all pass outside the sandbox); `npm run test:web`
  **613 passed / 60 files**. ESLint on the changed files: 0 (two unused imports the model introduced were
  removed).
- **Security sign-off (diffs read):** publish/read separated + non-phone-grantable (CHK-004); snapshot-gated,
  allowlist-only publish (CHK-003); emergency-disable clears families + kill-switch + no fallback (CHK-002);
  one-use origin/principal/extension/revision-bound publish ticket; negative controls reject every vector
  (CHK-011); no sensitive logging; Plan-mode publication denied.
- **Backend end-to-end (CHK-005):** the synthetic host-to-relay lifecycle test (ready + withheld settlement,
  exact read, revocation, expiry) passes in the 343.
- **Release/kill-switch (CHK-009):** the release boundary gates pass (9/9, 13/13, 12/12) with no sensitive-value
  logging; `npm run release:verify` correctly reports NOT-READY overall — the epic release gate stays
  fail-closed until the operator/security-owner items and release-wide thresholds are met (this is the gate
  working, not a defect).
- **Real-path mount check:** PASS (no web-facing change; no white-screen).

## Known gaps / operator-pending

- **PENDING (operator / security-owner / physical — left unchecked, not fabricated):** CHK-006 physical-device
  end-to-end; CHK-008 & CHK-022 security-owner sign-off/approval; CHK-013 physical Safari/installed-PWA
  verification; and CHK-001's REAL pinned cli-pi 0.95/0.20 host publish (the capability stays OFF, so CHK-001's
  "or the capability remains disabled" clause holds). These are the enablement prerequisites; the feature stays
  OFF until they complete.
- **`end-to-end` CDP fixture hangs on init** (dev-server/enrollment step) and did not produce a UI pass. Its
  coverage is redundant: the ready/withheld/expiry/revocation states are verified by the backend synthetic
  lifecycle test + `inbound-image-states.test.tsx`, and 390px light/dark UI geometry by the Phase-4/5 CDP.
  Flagged as a harness follow-up; CHK-014/018/019 (P1 screenshots) carry this caveat.

## Continuation

008 (P1–P6) is now code-complete with the capability OFF. Enablement (flip ON) requires the operator to
complete the physical device matrix (this phase's CHK-006/013 + Phase-5 CHK-012), the security-owner sign-off
(CHK-008/022), and the real pinned-host verification (CHK-001) — after which the release gate can move to
READY. Next epic-002 work: feature 009 (ask-question) and 010 (todos).
