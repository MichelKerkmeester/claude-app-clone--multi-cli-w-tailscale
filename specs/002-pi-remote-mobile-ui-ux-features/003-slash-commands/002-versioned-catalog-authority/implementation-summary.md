# Implementation Summary — Versioned catalog authority and fail-closed submission

## Final state

Complete and verified. The relay/protocol is now the sole authority for command availability: a versioned, session-scoped, path-free command catalog and a revision-checked, fail-closed slash-submission boundary. No visual surface; the existing `+` browser and ordinary prompt flow are unchanged. Implemented by DeepSeek v4 Flash Max (via the Devin CLI, dangerous mode); orchestrated and verified by Claude.

## What shipped (protocol + relay + web transport)

- **Protocol** (`packages/pi-rpc-protocol/`): `CommandCatalogDto` carries host epoch, session identity, session revision, and catalog revision; added the selected-command binding and a slash-aware expected-revision submission shape; aliases + argument hints are opt-in fields. Strict guards reject unknown fields, cross-session, control-character, bidi-override, oversized, incompatible, and stale shapes, plus non-canonical/path-like/privileged names. New exports + positive/negative fixtures.
- **Relay** (`redaction.ts`, `commands/command-service.ts`, `http/server.ts`, `prompt/prompt-service.ts`, `auth/policy.ts`, `index.ts`): `canonicalCommandName` enforces path-free/control-free/bidi-free names; the projection emits only bounded approved fields with NO fallback catalog. The command service produces complete bounded snapshots with host/session/catalog revisions and wires the availability lifecycle. `/api/commands/list` stays authenticated + read-only. Slash submission consumes ONE fresh one-use ticket, checks the authenticated principal + current host/session/catalog revisions, and fails closed before any Pi RPC (never retried, never forwarded on mismatch); slash commands stay out of implicit steer/followUp. Policy authorizes only the new slash-submit action.
- **Web** (`apps/pi-remote-web/src/relay.ts`): parses the versioned catalog + slash-submit responses through the protocol guards; ordinary `submitPrompt` retained. No UI change.

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, **167 passed (167)** (+20 new: protocol guards, relay commands, `slash-submit.test.ts`, `negative-controls` +59). Zero regressions.
- `npm run test:web` → exit 0, 176 passed (176) — ordinary prompt + `+` insertion unchanged.
- Security review (Claude read the diffs): fail-closed revalidation before Pi forwarding; one fresh one-use ticket per slash send; redaction drops paths/filenames/prompt bodies/secrets/raw errors/unsafe+bidi+control names; no fallback catalog; separate authorization with no other broadening.

## Frozen contracts

- Design untouched (no visual change).
- Security strengthened, never weakened: authenticated read-only catalog; fail-closed revision-checked slash submission; redaction hardened; existing approval/mutation/plan-mode boundaries intact.

## Deferred

- True-390px CDP captures ride the feature-003 visual checkpoint (after the inline autocomplete UI phase); this phase changes no visible surface (composer/`+` browser render unchanged, `test:web` green).
