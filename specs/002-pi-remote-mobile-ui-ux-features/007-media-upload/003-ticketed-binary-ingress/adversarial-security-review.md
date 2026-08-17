# Adversarial Security Review — Phase 2: Ticketed Binary Ingress (REQUIRED, per-phase)

Reviewer: Claude (orchestrator). Scope: this phase's `spec.md` + `plan.md` + `tasks.md` + `checklist.md`,
the feature research decoder decision, and the codebase decoder/isolation landscape. This is the required
pre-build gate for the first byte-handling phase. Verdict recorded before any build dispatch.

## Verdict

**APPROVED TO BUILD — conditional on an operator decision on the decoder-isolation architecture (below).**
The relay-lane design (ephemeral reservation, one-use operation-specific tickets consumed before body
read, exact Content-Length + byte-count + digest, extensionless `0600` quarantine outside the webroot,
decode→re-encode normalization, source deletion, TTL/lifecycle reaping, per-device quotas, coarse-only
logging, host-flag default-off) is sound and materially unchanged from the feature-level review. The two
MUST-FIX items land in THIS phase and are **sign-off blockers**. The isolation mechanism is
under-specified in a way that permits a non-compliant implementation, so it must be pinned before dispatch.

## The decoder-isolation problem (why this needs an explicit decision)

- **Nothing decodes JPEG/WebP/HEIC server-side today.** The only server image code is a hand-rolled
  PNG decoder in `store/artifact-sanitizer.ts` (zlib + crypto, no native/WASM). Any Phase-2 decoder for
  the source set (JPEG/PNG/WebP/HEIC/HEIF) is a **net-new dependency**, regardless of approach.
- **The spec permits a non-compliant decoder.** `spec.md`/`plan.md` say "resource-limited **worker/process**
  adapter." A Node `worker_threads` worker shares the relay heap → **no memory boundary** → a decoder CVE
  = relay RCE. MUST-FIX #1 forbids it. The research's own lean (Sharp/libvips, `research.md:475/538-540`)
  is a **native in-process FFI addon** that also shares the relay heap — same defect unless it is run in a
  separate process.
- **The "real OS-level process sandbox" branch is not feasible on this platform.** macOS (Darwin, arm64,
  Node 25): seccomp/cgroups are Linux-only; `sandbox-exec` is deprecated; Node exposes no `setrlimit` and
  Darwin's `RLIMIT_AS` is unreliable. An OS-sandbox decoder would be Linux-only and untestable on the dev
  machine (dev/prod divergence).
- **WASM is the only portable mechanism giving a real memory boundary** that runs identically on macOS
  arm64 and Linux, with a hard per-decode cap via `WebAssembly.Memory({ maximum })`. WASM is already a
  proven primitive in this repo (`pdfjs-dist` ships WASM in the web app).
- **MUST-FIX #2 needs a net-new header sniffer.** WASM (and native) codecs allocate their decode buffer
  internally, so the 60 MP / 12,000 px / 4-channel / 1-frame ceilings must be enforced by a lightweight,
  format-specific header parser (JPEG SOFn, PNG IHDR, WebP VP8/VP8L/VP8X, HEIC `ispe`/`ftyp`) that rejects
  **before** any bytes reach the decoder. The existing `artifact-sanitizer.ts` IHDR gate (pre-allocation
  dimension check) is the exact template.

## MUST-FIX (block this phase's security sign-off otherwise)

1. **Decoder in a real memory-isolated sandbox — NOT a `worker_threads` worker and NOT in-process native
   FFI.** Acceptable: a WASM-sandboxed codec with a bounded `WebAssembly.Memory`, or a separate spawned
   process running the codec with a hard memory/CPU/wall-clock cap. The build's security sign-off must
   demonstrate the isolation boundary (a decoder crash/OOM cannot corrupt or exhaust the relay process),
   not merely wall-clock/dimension limits.
2. **Header-parse ceilings before buffer allocation.** A net-new sniffer rejects over-ceiling
   dimensions/channels/frames from the parsed header before the codec allocates any bitmap, paired with a
   hard per-decode memory cap inside the sandbox. Prove rejection of a decompression bomb whose header is
   in-range enough to pass a naive check but whose decoded size is not.

## VERIFY-DURING-BUILD (Phase 2 specific)

- Opaque `setId`/`partId` validated as opaque IDs (charset/length) and NEVER used as a filesystem path
  segment — quarantine names are relay-generated opaque tokens; no client string reaches a path.
- `status` route enforces set→device ownership (a device can only query its own sets).
- Ticket consumed BEFORE the body is read; the binary handler bypasses the global JSON reader; exact
  Content-Length + running byte counter + digest compare; abort retains no usable bytes.
- Quarantine is outside webroot/repo/SQLite/static, extensionless, `0600` file / `0700` dir; no partial
  object is addressable; source deleted after normalized commit.
- Reaper fires on every listed lifecycle event; a killed relay's startup crash-recovery removes orphans.
- No source/normalized bytes or attachment identifiers/hashes enter SQLite, transcript, sync, SW cache,
  or logs (logs limited to code + count + coarse bucket).

## Decision required before dispatch

The decoder architecture + its net-new dependency + HEIC handling must be chosen by the operator (a
security-critical dependency acquisition and a Logic-Sync between the research's Sharp lean and MUST-FIX
#1). Options and the recommendation are carried to the operator alongside this review. `PI_REMOTE_MEDIA_ENABLED`
stays OFF regardless; enablement remains gated on Phase 5.

## Gate result

Adversarial review COMPLETE. Build may proceed once the decoder-isolation architecture is selected; the
two MUST-FIX items are bound as security-sign-off blockers for this phase. All other surfaces are sound
and inherit the feature-level review.
