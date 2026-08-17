# Adversarial Security Review — Phase 3: Pi Image Bridge & Redacted Transcript (REQUIRED, per-phase)

Reviewer: Claude (orchestrator). Scope: this phase's `spec.md` + `plan.md` + `tasks.md` + `checklist.md`,
the feature research (§ Pi bridge / redaction), and the existing relay prompt/redaction/supervisor code.
Required pre-build gate for the host-to-Pi image boundary. Verdict recorded before any build dispatch.

## Verdict

**APPROVED TO BUILD.** The Pi/provider boundary was already assessed SOUND at the feature level (correctly
fails closed). This phase's design — open normalized bytes only after a final ownership/readiness/expiry/
`imageIn`/plan-policy/revision revalidation; build base64 ONLY inside the host-to-Pi request; project only
a fixed allowlist of redacted card fields; block enablement until a pinned-Pi persistence/echo probe passes
— holds up. No new dependency and no architecture fork (unlike Phase 2's decoder). The items below are
VERIFY-DURING-BUILD and bind this phase's security sign-off.

## Attack surfaces (Phase-3 specific)

| Surface | Required property | Verdict |
|---|---|---|
| base64 leak to browser/sync/SQLite/JSONL/logs | base64 constructed ONLY in the host-to-Pi request object; never in a browser HTTP response, sync frame, durable envelope, log line, analytics, or workspace path | must VERIFY in diff |
| Durable transcript redaction | transcript projector emits ONLY the fixed redacted-card allowlist (kind/role/mediaKind/ordinal/status/previewRetained); no pixels/base64/filename/path/hash/URL/EXIF/OCR/provider-payload/decoder-error | must VERIFY (allowlist projector, not blocklist) |
| Unauthorized/stale Pi invocation | a stale/mismatched/expired/replayed/text-only-model/plan-invalid set causes NO Pi invocation — checked immediately before load, not just at reserve time | must VERIFY (revision coordinator advances on accepted mutations, NOT token events) |
| Acknowledgement ambiguity | positive ack deletes host bytes + publishes cards; ambiguous ack = `delivery-unknown`, NEVER auto-resend | must VERIFY |
| Pi/provider persist or echo | echo suppression sits BEFORE the framed relay path (not a downstream projector); probe exercises stdout events AND session JSONL AND the 1 MiB event-record cap | must VERIFY via the probe |
| Prompt injection via image | image content stays untrusted; cannot grant fs/process/network/shell/edit/approval/mode authority (host/extension enforces independently) | inherited SOUND (host-enforced, not model-trusted) |

## VERIFY-DURING-BUILD (bind sign-off)

1. base64 is built only in the pi-image-bridge host-to-Pi request; grep the diff proves no base64/pixel
   field reaches `relay-store`, `transcript-projector`, `redaction` output, sync frames, push text, or logs.
2. The redacted attachment projector is an explicit allowlist (drops everything not enumerated), mirroring
   the existing `projectRuntimeSnapshot`-style structural projection — a leak is structurally impossible.
3. Final revalidation (ownership/readiness/expiry/`imageIn`/plan/expectedRevision) happens immediately
   before loading each derivative; the prompt revision coordinator advances on accepted user/runtime
   mutations only, and stale sets are rejected before Pi invocation.
4. Ambiguous acknowledgement yields `delivery-unknown` with no auto-resend; positive ack deletes host bytes.
5. Workspace immutability: no image byte or path is written to any Pi-visible workspace file.

## Pinned-Pi probe — environment note (not a build blocker)

A real `pi` (0.84.2) is present and the supervisor spawns it in RPC mode, so the persistence/echo probe can
target it. But whether this pi build accepts image input in RPC and whether it persists/echoes payloads is
exactly what the probe determines. Correct fail-closed behavior: if the probe cannot run (no image-capable
pi) or fails, `PI_REMOTE_MEDIA_ENABLED` stays OFF — enablement is a Phase-5 gate, not a Phase-3 blocker.
Phase 3 must still BUILD the probe fixture and the relay-side guarantees (which do not depend on Pi
behavior) must be independently proven by the negative-control tests. Flag stays OFF regardless.

## Gate result

Adversarial review COMPLETE. Build may proceed. The five VERIFY-DURING-BUILD items bind this phase's
security sign-off; the relay-side no-leak guarantees must hold in the diff + negative controls independent
of the live pinned-Pi probe. Enablement remains a Phase-5 decision.
