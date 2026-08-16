# Checklist — Ask-question protocol, host authority, and redaction

- [ ] **Prerequisite:** the release-blocking adversarial security/redaction review (`roadmap.md` → Hard gates §3) is signed off before this phase begins.
- [ ] `npm run typecheck` exits 0.
- [ ] `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- [ ] `npx vitest run extensions/pi-remote-approval/tests/final-boundary.test.ts` exits 0.
- [ ] A valid presentation passes guards, receives redaction metadata, and travels through the existing authenticated envelope and relay.
- [ ] Malformed, duplicate, stale, withdrawn, expired, superseded, unavailable, and policy-blocked questions fail closed.
- [ ] Ticket requests bind the exact session, question, revision, device, scope, digest, and expiry, and consumed tickets cannot be reused.
- [ ] Answer commit recomputes the digest and prevents extension handoff on binding, revision, validation, or authority failure.
- [ ] Accepted results occur only after Pi confirmation; unknown delivery remains non-accepted without automatic retry.
- [ ] Transcript, sync, push, logs, telemetry, diagnostics, and extension fixtures contain no question content, answer text, ticket, digest, or raw callback data.
- [ ] Security review confirms plan-mode enforcement, content-free push, redaction-before-persistence, and phone-inaccessible `--full-access`.
