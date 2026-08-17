# Adversarial Security Review — Phase 5: End-to-End Submission & Release (REQUIRED / BLOCKING)

Reviewer: Claude (orchestrator). Scope: this phase's `spec.md` + `plan.md` + `tasks.md` + `checklist.md`,
the feature research, and the Phases 1–4 code now on `main`. This is the BLOCKING enablement review — the
host flag may be turned on only after it (plus the operator-gated evidence below) passes.

## Verdict

**APPROVED TO BUILD the end-to-end lane (flag stays OFF). ENABLEMENT is WITHHELD in this environment.**
The end-to-end design — worker SHA-256 over exact transfer bytes, bounded reserve manifest, one-use
ticketed XHR PUTs (≤2 concurrent), atomic commit that re-checks capability/model/revision/ownership/
readiness/expiry/plan/foreground, read-only status reconciliation, no auto-resend on ambiguity, and
fail-closed cleanup on every lifecycle path — is sound and inherits the SOUND Phase-2 (upload) and Phase-3
(Pi/provider) verdicts. The engineering is buildable and verifiable with the flag OFF. The final flag flip
is **not** grantable here (see Enablement gates).

## Build-time bindings (VERIFY-DURING-BUILD; block this phase's build sign-off)

1. **Explicit Send is the ONLY attachment mutation.** No eager/background upload; selection/preview/removal
   stay local until Send (Phase-4 contract preserved).
2. **Client hashing + reference-only transfer.** SHA-256 runs in a worker over the exact bytes to be PUT;
   the browser sends only the bounded reference manifest; image bodies go via one-use-ticketed XHR PUT and
   never enter JSON, the sync socket, or persistent storage.
3. **Client HEIC→JPEG conversion is platform-based (WebKit canvas), no new dependency** (the operator-approved
   Phase-2 architecture). If the browser cannot decode HEIC, the item is rejected client-side; the relay
   independently rejects raw HEIC. Normalized bytes hashed/uploaded are JPEG/PNG/WebP only.
4. **Atomic commit re-checks everything** (capability, model `imageIn`, prompt revision, ownership, readiness,
   expiry, plan policy, foreground) and freezes caption/order; duplicate Send suppressed; a batch is atomic
   (no partial commit).
5. **Fail-closed everywhere:** removal-during-upload, model switch, revision change, logout, revocation,
   epoch change, shutdown, process death, and ambiguous acknowledgement preserve only allowed local/text
   state, clean raw+normalized bytes, and never auto-resend. On process death only text is restored
   ("Photos need to be attached again").
6. **This phase wires the Phase-3 deferrals:** construct `PiImageBridge` in `index.ts`; implement the
   `PiImageAttachmentSource` load/ack/mark methods on `attachment-service`; add pre-frame supervisor echo
   suppression. base64 stays host-to-Pi-request-local; durable output remains the fixed redacted card.
7. **No new durable surface:** no path fallback, silent omission, object/public storage, persistent raw
   media, cache entry, unsafe log field, or workspace change.

## Enablement gates (WITHHELD — operator/environment-required; the flag must NOT flip until ALL pass)

- **Pinned-Pi persistence/echo probe must PASS against an image-capable Pi.** Installed `pi` 0.84.2 rejects
  image input in RPC, so the probe cannot pass here → capability stays disabled (fail-closed, by design).
- **Real-device matrix** (physical iPhone): Safari + installed-PWA, Photo Library + camera, HEIC/HEIF,
  VoiceOver, orientation, backgrounding/process-death, app-lock, keyboard, reconnection — cannot run headlessly.
- **Final-state scans on the enabling host:** storage/log/service-worker/workspace snapshot diffs clean.
- Rollback is a configuration change (flag off) plus quarantine cleanup.

Because the probe and the device matrix cannot be satisfied in this environment, **`PI_REMOTE_MEDIA_ENABLED`
stays 0.** Turning it on is an explicit operator action on a host that has passed every gate above.

## Gate result

Adversarial (blocking) review COMPLETE. Build may proceed with the flag OFF; bindings 1–7 bind the build
sign-off. Enablement is WITHHELD pending the operator-gated evidence. This review, together with the
Phase-2 and Phase-3 reviews, is the security record the operator uses when deciding to enable media on an
approved host.
