# Implementation Summary — Phase 1 — Protocol Contracts and Fail-Closed Capability Gate

## Final state

Complete and verified (automated gates + Claude diff review + 390px light/dark CDP); the installed-PWA
physical-device pass is operator-required. This phase defines the entire media-upload protocol surface and
a default-off capability gate WITHOUT accepting or decoding a single image byte, so every later phase is
frozen against a fixed, fail-closed contract. The product stays text-only: `PI_REMOTE_MEDIA_ENABLED` is
OFF, no attachment route is registered, and no photo affordance exists. Implemented by GPT-5.6 Luna Max
(via the Codex CLI, `--sandbox workspace-write`); orchestrated and verified by Claude. Built directly on
`main` (operator choice; no worktree — isolation substituted by a clean committed baseline `d476fb9`, a
full-diff scope review, and independent out-of-sandbox verification).

## What shipped (protocol + relay + web)

- **Protocol DTOs** (`packages/pi-rpc-protocol/src/types.ts`): a bounded `MediaPolicyDto` encoding every
  fixed limit from the research decision (still-image only; JPEG/PNG/WebP/HEIC/HEIF source, JPEG/PNG
  output; 4 images/turn; 15 MiB/image, 30 MiB/batch; 60 MP / 12,000 px source; 2,000 px / 2 MiB / 8 MiB
  normalized; 2 parallel; 10 min / 90 s / 120 s TTLs; 12 per 5 min + 120 MiB/hr rate; 30 MiB/device +
  256 MiB relay-wide quarantine) plus a `DEFAULT_MEDIA_POLICY` that `satisfies` it; `RuntimeMediaCapabilityDto`
  (`{enabled, imageIn, policy}`); the attachment-set manifest, part ticket/status, cancellation, and
  submission-result DTOs; a reference-only `PromptAttachmentReference`; a host-only `NormalizedPiImage`;
  and a metadata-only `RedactedAttachmentBlock` transcript kind. `PromptSubmitCommand` gains only optional
  `expectedPromptRevision` / `attachmentSetId` / `attachmentIds`; `RuntimeSnapshotDto` gains optional `media`.
- **Fail-closed guards** (`packages/pi-rpc-protocol/src/guards.ts`): exact-key, bounded guards for every new
  DTO. `isPromptSubmitCommand` is an exact-key allowlist — any pixel/base64/filename/path/unknown key is
  structurally rejected; attachment-referencing submissions require a bounded `expectedPromptRevision` and a
  duplicate-free, ≤4 reference set. `isNormalizedPiImage` accepts only JPEG/PNG output, rejects `data:` URLs
  and over-size payloads, and never decodes. `isRedactedAttachmentBlock` allows only metadata keys with
  `previewRetained === false`. `isAttachmentSetManifest` enforces contiguous ordinals, unique client IDs,
  and the batch byte ceiling. `isMediaPolicyDto` clamps every field to the protocol ceiling with cross-field
  consistency (batch ≥ image, turn ≥ image, relay-wide ≥ device). The `attachment` transcript kind routes
  through `isRedactedAttachmentBlock`; unknown kinds stay rejected.
- **Barrel** (`packages/pi-rpc-protocol/src/index.ts`): exports the new types, constants, and guards.
- **Protocol tests** (`packages/pi-rpc-protocol/tests/guards.test.ts`): +5 boundary tests (unknown-key
  rejection, attachment-reference-only submission accepted, pixel/base64/duplicate rejection, redacted-block
  allowlisting, safe unknown transcript kinds, normalized-image data-URL rejection). Protocol suite 35 → 40.
- **Relay capability + gate**: `runtime/runtime-service.ts` publishes `media` on the snapshot, deriving
  `imageIn` from the authoritative model `input` kinds array (text-only ⇒ `false`) — never from a model
  label — and carrying the host policy. `auth/policy.ts` adds the `attachment:{reserve,upload,status,cancel}`
  action vocabulary and a strict `isMediaFeatureEnabled()` (`=== '1'`). `http/server.ts` returns **404 on any
  attachment route unless `mediaEnabled === true`** (checked before auth, body discarded), and
  `actionForRequest` independently returns `null` for those routes when disabled (defense in depth); no live
  attachment handler is registered. `index.ts` reads the flag once at boot and threads it to both.
- **Web (data layer only)**: `relay.ts` parses `media` via the guard in both demo and live snapshot paths;
  `state.ts` routes the metadata-only attachment block to the existing unknown-display path — preserving it
  without assuming any media/pixel field. No JSX, CSS, or component changed.

## Verification (Claude, on `main`, OUTSIDE the codex sandbox)

- Scope: `git status` shows exactly the 10 allowed files changed; no stray files (pre-existing untracked
  `specs/` metadata left untouched); `main` app code otherwise clean.
- `npm run build` → exit 0; `npm run typecheck` → exit 0.
- `npm test` → **266 passed / 32 files** on re-run (+5 protocol tests vs the 261 baseline). The first run
  showed the single known non-deterministic `auth.test.ts` socket-close race (`expected 201 to be 403`,
  documented pre-existing flake); it passed on immediate re-run and Phase 1 touched no
  foreground-registration/ticket-consumption code. The codex in-sandbox run reported false `listen EPERM`
  failures (its `workspace-write` sandbox blocks loopback) — not reproduced in this out-of-sandbox run.
- `npm run test:web` → exit 0, **545 passed / 44 files** (delta 0; no web tests added — data-layer change).
- CDP: 390 CSS px in light AND dark on the demo composer/transcript → composer present, no horizontal
  overflow, zero media affordances (`input[type=file]`, photo/attach/camera/image labels, attachment-rail,
  photo-row all absent). Screenshots inspected: ink-on-parchment intact both themes, existing composer and
  cards unchanged, no photo row / attachment rail.
- Security review (Claude read every diff): exact-key allowlist rejects pixel-bearing prompt submissions;
  route gate fail-closed (404) unless the host env flag is exactly `1`; capability sourced only from the
  runtime snapshot's model input-kinds; redacted transcript block structurally metadata-only; normalized
  image guard refuses `data:` URLs and never decodes; web preserves the block as unknown.

## Frozen contracts

- Design: no UI added; ink-on-parchment tokens, WCAG AA, and ≥44px targets untouched (CDP-confirmed both themes).
- Security preserved: read-only by default; no mutation route and no byte ingress introduced; every new DTO
  guard is a fail-closed exact-key allowlist; capability is host-authoritative (never inferred from a model
  label); redaction is structural (pixels are unrepresentable in the durable transcript DTO); the phone
  cannot enable media. No decoder work (that, with the two adversarial-review MUST-FIX items, is Phase 2).

## Deferred / operator-required (NOT fabricated)

- The installed-PWA physical-device checklist on the oldest supported iPhone (Safari standalone, VoiceOver,
  external keyboard, RTL, 200% text, reduced motion) cannot run headlessly and is operator-required. No
  device/VoiceOver evidence is claimed; automated DOM/CDP checks are in place.
- `PI_REMOTE_MEDIA_ENABLED` stays OFF until the feature's Phase 5 enablement sign-off.
- Repo-wide `eslint .` / `prettier` debt in pre-existing unmodified files remains a separate, feature-independent cleanup.
