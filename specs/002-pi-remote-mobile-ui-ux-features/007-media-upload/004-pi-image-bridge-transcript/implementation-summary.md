# Implementation Summary — Phase 3 — Normalized Pi Image Bridge and Redacted Transcript

## Final state

Complete and verified for this phase's scoped deliverables (automated gates + Claude security sign-off +
390px light/dark CDP), with two honest, spec-consistent carry-forwards to Phase 5 (below). This phase adds
the final host-to-Pi capability boundary (`PiImageBridge`) that revalidates ownership/readiness/expiry/
`imageIn`/plan/expected-revision immediately before loading each normalized derivative and builds base64
ONLY inside the single host-to-Pi request; a structural redacted-attachment transcript projector; the
prompt-service seam + revision coordinator for ordered image submission with idempotency and acknowledgement
handling; tightened normalized-image protocol constraints; and the pinned-Pi persistence/echo probe.
`PI_REMOTE_MEDIA_ENABLED` stays OFF. Implemented by GPT-5.6 Luna Max (via the Codex CLI); orchestrated,
security-reviewed, and verified by Claude on `main`.

## What shipped

- **`attachments/pi-image-bridge.ts`** — the one place that sends an image-bearing RPC. `assertFinalGate`
  re-checks revision == expected, snapshot sessionId + `media.enabled` + `media.imageIn`, plan policy,
  reservation ownership/binding/expiry, `status==='ready'`, and per-part ordinals — immediately before EACH
  derivative load (never reused across an async boundary). base64 is constructed only at `pi-image-bridge.ts:143`
  and the source bytes are zeroed right after. Supervisor-send failure ⇒ `delivery-unknown` (no resend);
  success ⇒ `acknowledgeDelivered`; ack failure ⇒ `delivery-unknown`. Replay-guarded. The bridge consumes a
  `PiImageAttachmentSource` interface (byte-load + ack capabilities) rather than the concrete store.
- **`attachments/attachment-transcript-projector.ts`** — a structural allowlist (`REDACTED_ATTACHMENT_ALLOWLIST`:
  kind/id/revision/seq/occurredAt/role/mediaKind/ordinal/status/previewRetained) that constructs a redacted
  card from safe identity fields only — pixels/metadata are unrepresentable.
- **`prompt/prompt-service.ts`** + **`prompt/prompt-revision-coordinator.ts`** — ordered image submission,
  duplicate-Send idempotency, acknowledgement → redacted card; the coordinator advances on accepted user/
  runtime mutations, not token events, so stale sets are rejected before invocation.
- **`store/transcript-projector.ts`**, **`store/redaction.ts`**, **`store/relay-store.ts`** — attachment-card
  projection + image-field filtering + post-redaction schema enforcement so pixels/base64/metadata cannot
  enter durable envelopes, sync, exports, push, logs, or SQLite.
- **`packages/pi-rpc-protocol/src/{types,guards}.ts`** — `NormalizedPiImage` is now a strict own shape
  (`{type:'image', data, mimeType: JPEG|PNG}`, host-only) and `prompt`/`steer`/`follow_up` images are typed
  `NormalizedPiImage[]`; the browser `PromptSubmitCommand` stays reference-only (no image data).
- Tests: prompt/transcript-projector/redaction/security suites extended; a new pinned-Pi probe + a 1 MiB
  framed event-record cap test.

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- Scope: 4 new files + 10 modified, all within the phase's allowed paths; no stray files; no dependency change.
- `npm run build` 0; `npm run typecheck` 0.
- `npm test` → **299 passed / 36 files** (+12 over the 287 baseline; the known `auth.test.ts` flake passed;
  codex's in-sandbox EPERM/spawn-block artifacts not reproduced outside the sandbox).
- `npm run test:web` → 0, **545 passed** (delta 0).
- CDP: 390 px light + dark, flag off → composer + transcript unchanged, no overflow, zero media affordances.
- Security sign-off (Claude read every security-critical diff): base64 built only in the bridge (grep-clean
  elsewhere; the `transcript-projector.ts` `base64` reference is a redaction *check*, not construction); the
  redacted projector is a structural allowlist; the final revalidation gate precedes every load; ambiguous
  ack ⇒ delivery-unknown, no auto-resend; the browser DTO stays reference-only.

## Carry-forwards to Phase 5 (honest — NOT completed here; spec scoped these files out of Phase 3)

1. **Live pinned-Pi persistence/echo probe did NOT run its assertions.** The installed `pi` (0.84.2) does not
   accept image input in RPC mode, so the probe **skips honestly** (explicitly "not treated as a pass"); the
   media flag correctly stays OFF (fail-closed). The 1 MiB framing cap test passes for real. A genuine
   no-persistence/no-echo pass requires an image-capable pinned Pi at Phase-5 enablement.
2. **Production wiring is deferred.** `PiImageBridge` is not yet constructed in `index.ts`; the concrete
   `PiImageAttachmentSource` methods (`loadNormalizedDerivative` / `acknowledgeDelivered` /
   `markDeliveryUnknown`) on the Phase-2 `attachment-service.ts`, and pre-frame supervisor echo suppression
   in `rpc/supervisor.ts`, are NOT added — the phase spec's affected-areas list deliberately excluded
   `attachment-service.ts`, `supervisor.ts`, and `index.ts`. The bridge is fully unit-tested via its
   interface + a probe source; Phase 5 (end-to-end + enablement) wires it live before flipping the flag.

## Frozen contracts

- Design: no UI added; ink-on-parchment untouched (CDP-confirmed both themes).
- Security preserved: base64 host-to-Pi-request-local; durable/outbound records carry only the redacted
  allowlist; image content stays untrusted (host-enforced authority); read-only-by-default holds; flag OFF.
