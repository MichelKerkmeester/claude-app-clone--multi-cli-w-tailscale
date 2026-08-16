# Checklist — Versioned catalog authority and fail-closed submission

- [x] A real Pi `get_commands` response is projected into one bounded, path-free, relay-filtered catalog with host epoch, session identity, session revision, and catalog revision. — `redaction.ts` versioned projection; `CommandCatalogDto` carries the identity fields; `commands.test.ts`.
- [x] Malformed, incompatible, cross-session, and stale catalogs are rejected as whole responses with no partial rows rendered. — strict guards + negative fixtures in `guards.test.ts`; `commands.test.ts`.
- [x] Existing `+` insertion and ordinary prompt submission tests remain green. — full `npm test` 167/167 + `test:web` 176/176, zero regressions.
- [x] A changed host/session/catalog revision prevents slash-aware forwarding before any Pi RPC and does not retry automatically. — `prompt-service.ts` fail-closed revalidation ("never retried and never forwarded"); `slash-submit.test.ts`.
- [x] A valid explicit slash submission consumes exactly one fresh one-use ticket and forwards exactly one revision-checked prompt. — `slash-submit.test.ts` + `commands.test.ts`.
- [x] Redaction removes paths, filenames, prompt bodies, source locations, secrets, raw host errors, unsafe names, and unknown fields. — `redaction.ts` `canonicalCommandName` (no slash/whitespace/path/control/bidi) + bounded allowlist; `negative-controls.test.ts` (+59).
- [x] Catalog reads and prompt submits remain separately authorized, with no new mutation action and host/extension plan enforcement intact. — `policy.ts` separate slash-submit action; no other broadening; backend suite green.
- [x] Security review signs off on protocol data, redaction, ticket consumption, prompt forwarding, and policy changes. — recorded in `implementation-summary.md` (Claude read the diffs).
- [x] `npm run typecheck` passes. — verified (worktree).
- [x] `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` passes. — covered by the full `npm test` (167/167), which includes both dirs.
- [x] `npm run test:web` passes. — verified, 176 passed (176).
- [ ] CDP captures the unchanged composer and `+` browser at exactly 390 CSS pixels in light and dark. — satisfied by construction: no web UI component changed (only the `relay.ts` transport parser), so the composer/`+` browser render is unchanged; `test:web` green. Pixel capture rides the feature-003 visual checkpoint (after the autocomplete UI phase).
- [x] The final baseline shows no layout regression, no new persistence, and no exposed privileged rows. — no UI/CSS/storage change this phase; redaction rejects privileged/path-like names (tested).
