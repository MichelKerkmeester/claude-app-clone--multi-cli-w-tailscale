# Implementation Summary — Phase 1 — Authoritative rich-block contract and redacted projection

## Final state

Complete and verified. The protocol and relay now expose relay-authored rich-block identity, lifecycle, completeness, and text-artifact metadata behind strict guards, while every rich value is redacted before persistence, replay, broadcast, cache fixtures, logs, and errors. Legacy clients and cached blocks stay on their existing safe renderers; no rich UI, endpoint, ticket, or host operation is added. This is Phase 1 of feature 006 (rich-content-blocks). Implemented by GPT-5.6 Luna Max (via the Cursor CLI); orchestrated and verified by Claude.

## What shipped (protocol + relay + web compat; no UI)

- **Protocol** (`packages/pi-rpc-protocol/`): bounded rich-capable fields on tool-call/tool-result blocks — opaque `callId`, authoritative shell genre, lifecycle + terminal checkpoint, output completeness/truncation, block identity + monotonic revision — plus a relay-authored `TextArtifactBlock`. Strict guards reject invalid call identity, missing rich identity, unknown lifecycle/checkpoint/completeness, oversized source, malformed artifact labels, invalid revisions, and malformed redaction metadata BEFORE the web reducer; legacy shapes stay valid but non-rich-eligible. Barrel preserved so imports can't bypass the guard boundary. New guard fixtures.
- **Relay projection** (`store/transcript-projector.ts`): one stable `callId` carried through `tool_execution_start/update/end`, `bash_execution_update`, assistant tool-call, and tool-result events across every revision; stable block key + monotonic revision preserved. Shell genre, terminal checkpoint, lifecycle, and truncation come from event/protocol metadata — never derived from output wording. Result-before-call evidence retained with a safe unmatched result when identity can't be proven (no adjacency matching). Text artifacts projected only from trusted relay metadata; fenced-code parsing left for the future web normalizer.
- **Redaction** (`store/redaction.ts`, `store/relay-store.ts`, `replay/sync.ts`): command input, output, text-artifact source, tool names, and metadata are redacted before persistence and before replay/broadcast; only bounded provenance (policy version, fields-redacted count, reason categories) is retained. Store + sync serialization never emit an unredacted projection.
- **Web compat** (`relay.ts`, `state.ts`, `cache.ts`): guarded fields accepted; `relay`/`cache`/`optimistic` provenance preserved; a cache entry lacking identity/revision/redaction metadata stays on the legacy safe path (never upgraded by guesswork).
- **Fixtures + baseline CDP** (`fixtures/rich-content-redacted.json`, `scripts/rich-content-cdp.mjs`): deterministic redacted fixtures (Bash success/failure/streaming, non-shell tools, text artifacts, secrets, paths, URL credentials, bidi, ANSI, malformed, legacy) using sentinels the redactor replaces; a `legacy-activity` CDP fixture proving the existing Activity/prose layout is unchanged.

## Verification (Claude, in the worktree, OUTSIDE the cursor session)

- Blast check: main checkout untouched (cursor ran `--force --sandbox disabled` inside the worktree).
- `npm run build` → exit 0; `npm run typecheck` → exit 0.
- `npm test` → exit 0, **256 passed (32 files)** (+10: protocol rich guards, projector call-identity, redaction rich-field, sync, security negative-controls). The known `auth.test.ts` socket-close race passed this run (intermittent).
- `npm run test:web` → exit 0, **511 passed (34 files)** — unchanged; no legacy-renderer regression.
- CDP: `rich-content-cdp.mjs --fixture legacy-activity --theme {light,dark}` → both exit 0, exactly 390 CSS px, zero page overflow, "Activity/prose/composer unchanged."
- Security review (Claude read the diffs): guards strictly gate `callId` (opaque), lifecycle (enum set), and `TextArtifactBlock`; redaction tests assert the sentinel is absent (only the redaction marker survives) at serialization, boundary, and log listeners; negative controls confirm no new route/ticket/host-op and `server.ts` unchanged.

## Frozen contracts

- Design: no change (internal phase); frozen tokens untouched.
- Security strengthened: rich values are redacted at every persistence/replay/broadcast/cache/log/error boundary; strict guards reject malformed rich fields before rendering; the read-only `/api/sessions/:sessionId/transcript` + `/api/sync` transport gains no endpoint, ticket, mutation, or filesystem lookup.

## Deferred

- Rich UI (inline cards, Copy, F6 Open, syntax highlighting) is Phase 2/3; the legacy Activity/prose/safe-fallback renderers remain the visible behavior until Phase 2 enables the cards.
