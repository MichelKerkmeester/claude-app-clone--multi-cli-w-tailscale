# Adversarial Security Review — 007 media-upload (HARD GATE)

Reviewer: Claude (orchestrator). Scope: `spec.md` + `implementation-phases.md`. This review is the required pre-build gate for the new binary lane (photos, user → pi). Verdict is recorded before any build phase is dispatched.

## Verdict

**APPROVED TO BUILD** — the spec is genuinely security-first and the architecture is sound. Two items are **MUST-FIX** during the phase they land in (not spec blockers); several are VERIFY-DURING-BUILD. The controlled-exception design (host-flag-gated, phone-can-never-enable, explicit-Send mutation, allowlist redaction, one-use bound tickets, quarantine + decode/re-encode normalization, fail-closed everywhere, enablement gated on a pinned-Pi persistence/echo probe) holds up under adversarial analysis.

## Attack surfaces evaluated

| Surface | Spec coverage | Verdict |
|---|---|---|
| Pixel/secret leak → transcript/cache/logs/SQLite/SW/workspace | Allowlist (not blocklist) redaction; enumerated forbidden fields; logs limited to code+count+coarse-bucket; SW bypass; cache rejects attachment objects; base64 only in host→Pi request | SOUND |
| Upload-lane abuse (ticket bypass, quota, overflow) | One-use tickets bound to principal/device/origin/session/epoch/revision/submissionId/ordinal/byteLength/digest/mediaClass; **ticket consumed before body read**; exact Content-Length + byte-counter + overflow; per-device rate/quota + relay-wide pressure | SOUND |
| Malicious file (polyglot, active, animated, truncated, bomb) | MIME sniff + **full decode required**; decode→re-encode from pixels strips embedded payload; reject active/animated/polyglot/truncated; 60MP/12000px/4-channel/1-frame ceilings | SOUND (see MUST-FIX #1, #2) |
| Quarantine escape / path traversal | Outside webroot/repo/SQLite/static; `0700`/`0600`; opaque extensionless names; no partial object addressable; opaque set/part IDs via exact-key guards | SOUND (verify ID guards) |
| Read-only-posture weakening | Media routes registered only under `PI_REMOTE_MEDIA_ENABLED=1` (phone can't set); flag off → fail-closed 404; explicit Send is the only mutation; host-authoritative `imageIn`; host-sole plan-mode policy | SOUND |
| Prompt injection via image content | Image content declared untrusted; cannot grant tool/permission/approval/policy/mode authority; host/extension enforces plan-mode + FS/process approvals **independently** of model behavior | SOUND — defense is at the host, not the model |
| Pi/provider boundary (persist/echo) | base64 forbidden from JSONL/stdout/logs/etc.; **enablement blocked until pinned-Pi probe proves no persistence + no echo**; echo suppression before the framed relay path; 1MiB JSONL-cap path checked; provider-retention disclosed | SOUND — correctly fails closed |
| Lifecycle/cleanup | Reaper on TTL/cancel/logout/revocation/epoch/shutdown/startup-crash/delivery-ambiguity; source deleted post-derivative; honest "unlink not forensic-erase" | SOUND |
| Idempotency/atomicity | Atomic batch (no partial send); submission-id idempotency (conflict on changed content, prior-result on identical); duplicate Send → one prompt; delivery-unknown → reconcile, **no auto-resend** | SOUND |

## MUST-FIX (enforce during the owning phase; block that phase's security sign-off otherwise)

1. **Decoder must run in a real OS-level sandbox, not a Node `worker_threads` worker.** HEIC/HEIF/WebP decoders (libheif et al.) have a history of memory-corruption CVEs. A `worker_thread` shares the relay process's memory and provides **no security boundary** — a decoder RCE would own the relay. The "unprivileged resource-limited decoder/worker or process adapter" (Phase 2) MUST be a **separate process** with OS resource limits (rlimits/seccomp/cgroups) or a **WASM-sandboxed** decoder. Phase-2 security review must confirm the isolation boundary, not just wall-clock/dimension limits.
2. **Enforce dimension/channel/frame ceilings at header-parse time, BEFORE allocating the full decode buffer.** 60 MP × 4 channels ≈ 240 MB/image decoded; a bomb that passes header checks but is rejected only after full allocation still exhausts memory. Reject from the parsed header before bitmap allocation (Phase 2). Pair with a hard per-decode memory cap in the sandboxed decoder.

## VERIFY-DURING-BUILD

- Opaque `setId`/`partId` are validated as opaque IDs (charset/length), never used as path segments — no traversal into quarantine (Phase 2 guards + route).
- `status` reconciliation route enforces set→device ownership so a device can only query its own sets (Phase 2).
- The pinned-Pi echo/persistence probe (Phase 3) exercises stdout events AND the JSONL record path AND the 1MiB-cap failure path; echo suppression sits before the framed relay path, not in a downstream projector. Keep `PI_REMOTE_MEDIA_ENABLED` OFF until it demonstrably passes.
- App-switcher/background covering actually hides local thumbnails on iOS (Phase 4/5 device check).
- Strict-Mode object-URL/XHR/timer leak spies pass (Phase 4/5).

## Notes / accepted residuals

- Browser-side local preview uses the platform (WebKit) image decoder — same risk as viewing any image on the device; out of Pi Remote's control and not a lane it introduces.
- Provider-side retention after relay deletion is disclosed to the user (first-use disclosure), an honest product boundary, not a technical gap.
- Secure erasure is not promised (unlink, not overwrite) — honestly stated.

## Gate result

Adversarial review COMPLETE. Build may proceed in dependency order (Phase 1 → 2 → 3 → 5; Phase 4 parallel to 2/3). Phase 2 and Phase 3 each carry their own REQUIRED security review per the implementation-phases; this document seeds those with the two MUST-FIX items above. `PI_REMOTE_MEDIA_ENABLED=1` stays off until Phase 5's blocking review signs off with negative-test output, quarantine-cleanup evidence, route/ticket audit, the pinned-Pi probe, log/storage scans, workspace-snapshot diff, SW inspection, CDP screenshots, and real-device results.
