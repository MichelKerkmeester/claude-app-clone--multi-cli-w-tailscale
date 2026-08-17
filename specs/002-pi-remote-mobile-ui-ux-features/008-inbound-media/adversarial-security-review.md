# Adversarial Security Review — 008 inbound-media (HARD GATE, feature-level)

Reviewer: Claude (orchestrator). Scope: `spec.md` + `implementation-phases.md` + the F6 (005) /
007-media-upload code this feature reuses. Required pre-build gate for the new INBOUND lane (pi → phone
image previews). Verdict recorded before any build phase is dispatched.

## Verdict

**APPROVED TO BUILD (capability stays OFF).** The architecture is genuinely security-first and holds under
adversarial analysis: metadata-only durable transcript (`inbound_image`), a separate extension-only ticketed
publication lane (never PWA-reachable), full relay-side decode→redact→re-encode→hash→store BEFORE any PWA
fetch, authenticated exact-revision read-only reads (`POST /api/artifacts/read`, no-store/nosniff/digest/
ETag/rate-limited), memory-only browser store with ref-counted object-URL revocation on every lifecycle
event, SW network-only for the artifact route, and fail-closed everywhere (any uncertainty ⇒ `withheld`,
no retrievable pixels). Reads never mutate/invoke pi; `artifact:read` is read-only even in Plan mode.
Two items are MUST-FIX (inherited from 007); several are VERIFY-DURING-BUILD; enablement is WITHHELD.

## Attack surfaces evaluated

| Surface | Spec coverage | Verdict |
|---|---|---|
| Pixel/secret leak → transcript/JSONL/sync/SQLite/cache/logs | Metadata-only durable block; enumerated forbidden fields; allowlist projection; logs = code+count+coarse bucket; SW network-only; no bytes in stdout/JSONL/sync | SOUND |
| Malicious image (polyglot, animated, bomb, spoofed MIME, truncated) | Magic-byte + decoder-detected format (ignore claimed MIME); full decode required; 1-frame/4-channel/60MP/12000px ceilings; decode→re-encode strips payload | SOUND (see MUST-FIX #1,#2) |
| Publication-lane abuse (ticket bypass, wrong context, replay) | One-use `artifact:publish` ticket bound to principal/extension/session/run/turn/blockId/submissionId/expected-revision/length/media-family/90s; consumed before body read; extension-only route, browser-origin rejected | SOUND |
| Read-lane abuse | Exact session/artifactId/revision/variant tuple; rejects latest/paths/URLs/digest-as-authority/cross-session/redirects/unknown fields/mutation tickets; 404/409/410/429; rate-limited | SOUND |
| Read-only-posture weakening | Viewing (open/zoom/pan/retry/details/close) mints no ticket, invokes no pi, writes no workspace; inbound pixels never auto-sent back to pi; no F5 attachment IDs minted | SOUND |
| Prompt injection via image content (OCR text / QR / visible instructions) | Image content declared untrusted; grants no fs/shell/process/network/approval/mode/capture authority; host/extension enforces independently | SOUND — defense at the host, not the model |
| Browser/lifecycle isolation | Memory-only ≤20 thumbs + 1 full; revoke on close/unmount/revision/session/logout/revocation/background/pagehide/privacy-cover; visibilitychange curtain; CSP img-src self blob: | SOUND |
| Redaction honesty | UI says "Processed / Redactions applied", never "Safe"; residual risks (OCR misses, screen capture, WebKit snapshot) disclosed | SOUND — honest, not over-claimed |

## MUST-FIX (enforce in the owning phase — Phase 2 = `003-...`; block that phase's sign-off otherwise)

1. **Decoder in a real memory-isolated sandbox, NOT a Node `worker_threads` worker and NOT in-process
   native FFI.** The spec says "worker"; a worker_thread shares the relay heap (no boundary). REUSE the
   already-shipped, operator-approved 007 WASM decoder (`apps/pi-remote-relay/src/attachments/attachment-decoder.ts`,
   `@jsquash/jpeg|png|webp` in bounded `WebAssembly.Memory`) — the accepted formats (JPEG/PNG/static WebP)
   match exactly. No new decoder dependency.
2. **Header-parse ceilings before bitmap allocation.** REUSE the 007 header sniffer (magic-byte + dimension/
   channel/frame rejection) to reject >60MP / >12000px / >4ch / animated / spoofed-MIME BEFORE the codec
   allocates, paired with a per-decode wall-clock cap. Static-WebP only (reject animated VP8X ANIM).

## VERIFY-DURING-BUILD (bind the owning phase's sign-off)

- Publish ticket consumed BEFORE the body is read; interrupted bodies deleted; processing→ready/withheld via
  expected-revision CAS preserving block ID/sequence; abandoned processing → withheld at 60s.
- Extension-only publish route rejects browser-origin requests; the host adapter rejects Markdown paths,
  repo paths, symlinks, and unapproved source tools; opaque artifact IDs are never filesystem path segments.
- Quarantine outside repo/webroot/SQLite/pi-workspace; 0700 dirs / 0600 files; random names; source +
  intermediate buffers deleted after derivative commit; revocation/expiry purge.
- Exact-read auth (session/Origin/principal/device/membership/`artifact:read`/exact tuple); no-store +
  nosniff + Content-Digest + immutable ETag; a flipped served byte ⇒ no object-URL, corrupt, zero pixels.
- Durable/outbound records carry ONLY the safe allowlist; no pixels/base64/URL/path/filename/EXIF/OCR/
  digest-as-authority/ticket/decoder-error; push content-free; browser stores nothing in Cache/IDB/localStorage.

## Decisions & enablement gates (WITHHELD — operator/environment-required; capability stays OFF)

- **OCR secret-detection engine + detectors** (spec §430 requires a security-owner to approve OCR detectors,
  thresholds, uncertain-match policy). Build decision (mirrors 007's "enablement gated" pattern): implement
  the full sanitizer with the OCR-scan step **fail-closed to "scanning unavailable ⇒ withheld"** — no new
  dependency, smallest attack surface, and exactly the spec's step-10 default. A real OCR engine + approved
  detectors + confidence/uncertain-match policy are an operator-approved enablement follow-up; until then
  every image publishes `withheld` (safe). The structural sanitization (decode/orient/sRGB/metadata-strip/
  re-encode/hash) is fully built and tested.
- **Pinned cli-pi 0.95/0.20 pre-stdout interception seam** — the publisher must intercept image-bearing
  output before pi stdout/session persistence. Installed pi is **0.84.2**, so the seam is unavailable ⇒ the
  host advertises NO inbound-media capability and the relay accepts no publication (fail-closed). Real
  end-to-end enablement needs pi 0.95 + the device matrix.
- **Physical-device matrix** (Safari/installed-PWA, VoiceOver, background privacy, oldest iPhone) —
  operator-required.

## Gate result

Adversarial review COMPLETE. Build may proceed in dependency order (Phase 1→2→3→4→5→6), capability OFF
throughout; Phase 2 (`003-...`) carries the two MUST-FIX items and its own required security review. No
transport limit (pi JSONL / sync / HTTP-JSON) is raised. Enablement (OCR engine + pi-0.95 seam + device
matrix) is WITHHELD and is an explicit operator action.
