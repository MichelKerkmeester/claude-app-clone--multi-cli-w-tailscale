# Implementation Summary — Phase 5 — End-to-End Submission, Reconciliation, and Release Enablement

## Final state

The end-to-end media-upload lane is BUILT, verified, and security-signed-off (engineering complete);
`PI_REMOTE_MEDIA_ENABLED` stays OFF and **enablement is WITHHELD** pending operator/environment-gated
evidence (below). This phase connects the Phase-4 local draft to the Phase-2 relay lane and the Phase-3 Pi
bridge: worker SHA-256 hashing over exact transfer bytes, a bounded reference manifest, one-use ticketed
XHR PUT uploads (≤2 concurrent) with determinate progress, client HEIC→JPEG conversion, an atomic-commit
client submission state machine that fails closed on every lifecycle path, and the relay-side wiring that
was deferred from Phase 3. Implemented by GPT-5.6 Luna Max (via the Codex CLI, in two dispatches);
orchestrated, security-reviewed, and verified by Claude on `main`.

## What shipped

**Relay wiring (the Phase-3 deferrals, now live):**
- `index.ts` — constructs `PiImageBridge` (`:116`) over the attachment service (as `PiImageAttachmentSource`)
  + runtime snapshot + revision coordinator + plan policy, and injects it into the prompt service (`:133`).
- `attachments/attachment-service.ts` — `loadNormalizedDerivative` (reads the committed normalized
  quarantine bytes, byte-length-checked, replay-guarded), `acknowledgeDelivered` (deletes host bytes + blocks
  replay), `markDeliveryUnknown`.
- `rpc/supervisor.ts` — `stripImagePayloadFromEventFrame` runs in `acceptFramedRecord` BEFORE the
  demultiplexer (pre-frame echo suppression), recursively removing `images`/image-valued keys.
- `http/server.ts` + `prompt/prompt-service.ts` — attachment ticketing + commit reconciliation +
  stale/error mapping; atomic attachment submission through the bridge with delivery-unknown handling.

**Client (web):**
- `attachments/attachment-hash.worker.ts` — worker SHA-256 over the exact `Blob` bytes to be uploaded.
- `attachments/attachment-client.ts` — bounded manifest (sha256/byteLength/ordinal/declaredType, no
  filename/pixels), HEIC/HEIF→JPEG via WebKit `createImageBitmap`→canvas before hashing, ticketed XHR PUT,
  ≤2 concurrency, cancellation, read-only status reconciliation, commit, bounded error mapping.
- `attachments/useAttachmentSubmission.ts` — the submission state machine (waiting-for-connection →
  authorizing → uploading → server-checking → committing → sent; failed-retryable/stale/expired, canceled,
  delivery-unknown). Generation tokens + abort controllers + lifecycle listeners invalidate late callbacks
  on removal/model/revision/session change, logout, revocation, page-hide, shutdown, and duplicate Send;
  ambiguous commit ⇒ delivery-unknown, never auto-resent.
- `AttachmentDraftProvider.tsx` — added `getFile(id)` so the submission hashes/converts from the raw `File`
  (fixes end-to-end HEIC, which the provider withholds an object URL for); serializable state still carries
  no File/filename/URL.
- `SessionComposer.tsx` / `App.tsx` — explicit Send routed through the submission machine with existing
  revision + Steer/Later behavior; process-death restores text only ("Photos need to be attached again").

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- Scope: 6 modified relay + 3 modified web + 3 new web attachment files + 3 new tests (+ the follow-up's 5
  files); all within the phase's allowed paths; no stray files; no dependency change; no hardcoded flag enable.
- `npm run build` 0; `npm run typecheck` 0.
- `npm test` → **303 passed** on re-run (+4 over the 299 baseline: relay attachment-flow + kill-point
  attachment-recovery; the known `auth.test.ts` socket-close flake blipped once and passed on re-run).
- `npm run test:web` → **581 passed** (+9 over the 572 baseline: submission lifecycle + HEIC/getFile tests).
- CDP (flag off): 390px light + dark → composer unchanged, no overflow, zero media affordances.
- Security sign-off (Claude read the security-critical diffs): base64 stays only in `pi-image-bridge`
  (Phase-3 locality preserved); pre-frame supervisor echo suppression; explicit-Send-only with no
  module-scope/eager fetch; worker hashing; fail-closed lifecycle + no auto-resend (tested); host bytes
  deleted on delivery with replay guard; flag off.

## Enablement — WITHHELD (operator/environment-gated; NOT fabricated)

The blocking review approved the build with the flag OFF and **withheld enablement**. These gates cannot be
satisfied in this environment, so `PI_REMOTE_MEDIA_ENABLED` stays 0:
- **Live pinned-Pi persistence/echo probe** — the installed `pi` 0.84.2 rejects image input in RPC, so the
  probe skips honestly; a real pass needs an image-capable pinned Pi.
- **Real-device Safari / installed-PWA matrix** (physical iPhone: Photo Library, camera, HEIC/HEIF,
  VoiceOver, orientation, backgrounding, process death, app lock, reconnection) — cannot run headlessly.
- **ON-state pixel CDP** for the success/failure submission states — enabling the demo photo UI would be app
  code (the iron constraint forbids Claude editing `apps/`); the states are DOM-tested at 390px. Flag-off is CDP-verified.

Turning the flag on is an explicit operator action on a host that has passed every gate; rollback is the
flag/configuration change plus quarantine cleanup (the reaper, covered by the kill-point tests).

## Frozen contracts

- Design: submission states reuse the Phase-4 composer/rail language in the frozen tokens; AA + ≥44px (DOM-asserted).
- Security preserved: explicit Send is the only mutation; reference-only ticketed transfer; base64
  host-to-Pi-local; fail-closed on every lifecycle path; no raw media persisted; read-only-by-default +
  host-enforced plan mode unchanged; flag OFF.
